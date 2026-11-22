import { useEffect, useRef, useState, useCallback } from 'react';
import { Coffee, Play, Clock, Timer } from 'lucide-react';
import { getCurrentSession, startBreak, endBreak, clockIn } from '../../axios/api/attendance';

type Status = 'loading' | 'working' | 'break' | 'none';

const fmt = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};

export default function AttendanceWidget() {
  const [status, setStatus] = useState<Status>('loading');
  const [workSecs, setWorkSecs] = useState(0);
  const [breakSecs, setBreakSecs] = useState(0);
  const [acting, setActing] = useState(false);

  // Refs to avoid stale closures in interval
  const statusRef = useRef<Status>('loading');
  const breakStartRef = useRef<Date | null>(null);
  const loginTimeRef = useRef<Date | null>(null);
  const totalBreakMinRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDateRef = useRef<string>(new Date().toDateString());
  // Ref to hold latest loadSession without creating circular useCallback deps
  const loadSessionRef = useRef<() => void>(() => {});

  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const now = new Date();

      // Detect day boundary — when date changes, reload session from server
      const todayStr = now.toDateString();
      if (todayStr !== currentDateRef.current) {
        currentDateRef.current = todayStr;
        // Server will close yesterday's session and start today's automatically
        loadSessionRef.current();
        return;
      }

      if (loginTimeRef.current) {
        const totalElapsedSecs = Math.floor((now.getTime() - loginTimeRef.current.getTime()) / 1000);
        const breakSecsSoFar = totalBreakMinRef.current * 60 +
          (statusRef.current === 'break' && breakStartRef.current
            ? Math.floor((now.getTime() - breakStartRef.current.getTime()) / 1000)
            : 0);
        setWorkSecs(Math.max(0, totalElapsedSecs - breakSecsSoFar));
      }
      if (statusRef.current === 'break' && breakStartRef.current) {
        setBreakSecs(Math.floor((now.getTime() - breakStartRef.current.getTime()) / 1000));
      }
    }, 1000);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await getCurrentSession();
      if (!res?.success || !res?.data) {
        setStatus('none');
        statusRef.current = 'none';
        return;
      }
      const { loginTime, onBreak, workMinutes, totalBreakMinutes, currentBreakStart } = res.data;
      loginTimeRef.current = new Date(loginTime);
      totalBreakMinRef.current = totalBreakMinutes;

      if (onBreak) {
        breakStartRef.current = currentBreakStart ? new Date(currentBreakStart) : new Date();
        setStatus('break');
        statusRef.current = 'break';
        setBreakSecs(Math.floor((Date.now() - breakStartRef.current.getTime()) / 1000));
      } else {
        breakStartRef.current = null;
        setStatus('working');
        statusRef.current = 'working';
      }
      setWorkSecs(workMinutes * 60);
      startTick();
    } catch {
      setStatus('none');
      statusRef.current = 'none';
    }
  }, [startTick]);

  // Keep loadSessionRef current so startTick can call it without a stale closure
  useEffect(() => {
    loadSessionRef.current = loadSession;
  }, [loadSession]);

  useEffect(() => {
    loadSession();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadSession]);

  const handleStart = async () => {
    if (acting) return;
    setActing(true);
    try {
      const res = await clockIn();
      if (res?.success) {
        loginTimeRef.current = new Date(res.data.loginTime);
        totalBreakMinRef.current = 0;
        breakStartRef.current = null;
        setStatus('working');
        statusRef.current = 'working';
        setWorkSecs(0);
        startTick();
      }
    } catch {
      // silent
    } finally {
      setActing(false);
    }
  };

  const handleBreak = async () => {
    if (acting) return;
    setActing(true);
    try {
      await startBreak();
      breakStartRef.current = new Date();
      setStatus('break');
      statusRef.current = 'break';
      setBreakSecs(0);
    } catch {
      // silent
    } finally {
      setActing(false);
    }
  };

  const handleResume = async () => {
    if (acting) return;
    setActing(true);
    try {
      await endBreak();
      // Add elapsed break time to total break minutes
      if (breakStartRef.current) {
        totalBreakMinRef.current += Math.floor((Date.now() - breakStartRef.current.getTime()) / 60000);
      }
      breakStartRef.current = null;
      setStatus('working');
      statusRef.current = 'working';
      setBreakSecs(0);
    } catch {
      // silent
    } finally {
      setActing(false);
    }
  };

  if (status === 'loading') return null;

  if (status === 'none') {
    return (
      <button
        onClick={handleStart}
        disabled={acting}
        title="Start your work session"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{
          backgroundColor: 'rgba(5,150,105,0.1)',
          border: '1px solid rgba(5,150,105,0.25)',
          color: 'var(--accent-blue)',
        }}
      >
        <Timer size={13} />
        Start Work
      </button>
    );
  }

  if (status === 'break') {
    return (
      <div className="flex items-center gap-2">
        {/* Status pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            color: '#d97706',
          }}
        >
          <Coffee size={12} />
          <span>Break</span>
          <span className="font-mono opacity-80">{fmt(breakSecs)}</span>
        </div>

        {/* Resume button */}
        <button
          onClick={handleResume}
          disabled={acting}
          title="Resume work"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: 'rgba(5,150,105,0.1)',
            border: '1px solid rgba(5,150,105,0.25)',
            color: '#059669',
          }}
        >
          <Play size={11} />
          Resume
        </button>
      </div>
    );
  }

  // Working state
  return (
    <div className="flex items-center gap-2">
      {/* Status pill */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: 'rgba(5,150,105,0.08)',
          border: '1px solid rgba(5,150,105,0.2)',
          color: '#059669',
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#059669', boxShadow: '0 0 5px #059669' }}
        />
        <Clock size={11} />
        <span className="font-mono">{fmt(workSecs)}</span>
      </div>

      {/* Break button */}
      <button
        onClick={handleBreak}
        disabled={acting}
        title="Take a break"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
        style={{
          backgroundColor: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.25)',
          color: '#d97706',
        }}
      >
        <Coffee size={11} />
        Break
      </button>
    </div>
  );
}
