import { useState, useEffect, useCallback, useRef } from 'react';

import { useLocation } from 'react-router-dom';


export type NotificationCategory = 'vehicle_doc' | 'employee_doc' | 'driver_doc' | 'maintenance' | 'test_approval';

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  subtitle: string;
  daysLeft?: number;       // negative = overdue
  urgency: 'critical' | 'high' | 'medium' | 'low';
  navigateTo: string;
  rawData?: any;
}

interface UseNotificationsOptions {
  categories: NotificationCategory[];
  pollInterval?: number;
  /** Role-aware base path e.g. '/fleetmaintenance' or '/Management' */
  basePath?: string;
}

const POLL_DEFAULT = 5 * 60 * 1000;

function urgencyFromDays(days: number): Notification['urgency'] {
  if (days < 0)   return 'critical';
  if (days <= 7)  return 'critical';
  if (days <= 14) return 'high';
  return 'medium';
}

function daysUntil(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
}

export function useNotifications(options: UseNotificationsOptions) {
  const { categories, pollInterval = POLL_DEFAULT, basePath = '' } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);


  const location = useLocation();

  const fetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);

    const results: Notification[] = [];
    const tasks: Promise<void>[] = [];

    // ── Vehicle documents ───────────────────────────────────────────────────
    if (categories.includes('vehicle_doc')) {
      tasks.push(
        import('../axios/api/compilance.vehicledoc')
          .then(m => m.getExpiringVehicleDocuments(30))
          .then(res => {
            if (!mountedRef.current) return;
            for (const doc of (res?.data ?? [])) {
              const d = daysUntil(doc.expiryDate);
              const isTrailer = doc.assetType === 'trailer';

              // Backend normalizes vehicle/trailer info into doc.vehicle
              const vehicle = doc.vehicle;
              const plate      = vehicle?.plateNumber ?? '';
              const internalId = vehicle?.internalId  ?? '';
              const make       = vehicle?.make        ?? '';
              const model      = vehicle?.model       ?? '';

              const parts: string[] = [];
              if (isTrailer) parts.push('Trailer');
              else if (make || model) parts.push(`${make} ${model}`.trim());
              if (plate)      parts.push(`#${plate}`);
              if (internalId) parts.push(`ID: ${internalId}`);

              // Navigate to trucks or trailers page based on asset type
              const nav = isTrailer
                ? `${basePath}/trailers`
                : `${basePath}/trucks`;

              results.push({
                id:         `vdoc-${doc._id}`,
                category:   'vehicle_doc',
                title:      doc.documentType?.replace(/_/g, ' ') ?? 'Vehicle Document',
                subtitle:   parts.join(' · ') || 'Unknown asset',
                daysLeft:   d,
                urgency:    urgencyFromDays(d),
                navigateTo: nav,
                rawData:    doc,
              });
            }
          })
          .catch(() => {/* silent */})
      );
    }

    // ── Employee & Driver documents (same endpoint, split by role) ──────────
    const needsEmpDoc    = categories.includes('employee_doc');
    const needsDriverDoc = categories.includes('driver_doc');

    if (needsEmpDoc || needsDriverDoc) {
      tasks.push(
        import('../axios/api/employeeDocument')
          .then(m => m.getExpiringDocuments(30))
          .then(res => {
            if (!mountedRef.current) return;
            for (const doc of (res?.data ?? [])) {
              const d          = daysUntil(doc.expiryDate);
              const isDriver   = doc.employee?.role === 'driver';
              const namePart   = doc.employee?.name ?? '';
              const idPart     = doc.employee?.internalId ? `ID: ${doc.employee.internalId}` : '';
              const subtitle   = [namePart, idPart].filter(Boolean).join(' · ') || (isDriver ? 'Driver' : 'Employee');

              if (isDriver && needsDriverDoc) {
                results.push({
                  id:         `ddoc-${doc._id}`,
                  category:   'driver_doc',
                  title:      doc.documentType ?? 'Driver Document',
                  subtitle,
                  daysLeft:   d,
                  urgency:    urgencyFromDays(d),
                  navigateTo: `${basePath}/drivers`,
                  rawData:    doc,
                });
              } else if (!isDriver && needsEmpDoc) {
                results.push({
                  id:         `edoc-${doc._id}`,
                  category:   'employee_doc',
                  title:      doc.documentType ?? 'Employee Document',
                  subtitle,
                  daysLeft:   d,
                  urgency:    urgencyFromDays(d),
                  navigateTo: `${basePath}/documents`,
                  rawData:    doc,
                });
              }
            }
          })
          .catch(() => {/* silent */})
      );
    }

    // ── Driver test approvals ───────────────────────────────────────────────
    if (categories.includes('test_approval')) {
      tasks.push(
        import('../axios/api/driver')
          .then(m => m.getTestResults())
          .then(res => {
            if (!mountedRef.current) return;
            const all: any[] = Array.isArray(res?.data)
              ? res.data
              : (res?.testResults ?? []);

            for (const t of all.filter((t: any) => t.passed && !t.hrApproved && !t.hrRejected)) {
              const driverName = t.driverId?.name ?? t.driver?.name ?? 'Driver';
              const driverId   = t.driverId?.internalId ?? t.driverId?._id ?? '';
              const testName   = t.testType?.displayName ?? t.testType?.name ?? 'Test';

              const subtitle = driverId
                ? `Driver ID: ${driverId} · Review & approve`
                : 'Review & approve';

              results.push({
                id:         `test-${t._id}`,
                category:   'test_approval',
                title:      `${driverName} completed ${testName}`,
                subtitle,
                urgency:    'high',
                navigateTo: `${basePath}/drivers`,
                rawData:    t,
              });
            }
          })
          .catch(() => {/* silent */})
      );
    }

    await Promise.allSettled(tasks);

    if (mountedRef.current) {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      results.sort((a, b) => {
        const u = order[a.urgency] - order[b.urgency];
        if (u !== 0) return u;
        if (a.daysLeft !== undefined && b.daysLeft !== undefined) return a.daysLeft - b.daysLeft;
        return 0;
      });
      setNotifications(results);
      setLoading(false);
    }
  }, [categories.join(','), basePath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    const timer = setInterval(fetch, pollInterval);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, [fetch, pollInterval]);

  // Refetch after navigation (user may have acted on a notification)
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      fetch();
    }
  }, [location.pathname, fetch]);

  // Refetch when a test approval/rejection is performed on the same page
  useEffect(() => {
    const handler = () => { if (mountedRef.current) fetch(); };
    window.addEventListener('notification:refetch', handler);
    return () => window.removeEventListener('notification:refetch', handler);
  }, [fetch]);

  const totalCount    = notifications.length;
  const criticalCount = notifications.filter(n => n.urgency === 'critical').length;

  return { notifications, loading, totalCount, criticalCount, refetch: fetch };
}
