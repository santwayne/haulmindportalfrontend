// Sound and browser notification for incoming driver messages.
// Browsers block audio and notification prompts until the user has interacted
// with the page, so unlockMessageAlerts must run from a click or key press.

let audioContext: AudioContext | null = null;

export const unlockMessageAlerts = () => {
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch {
    audioContext = null;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
};

// Two short rising tones, generated so no audio file is needed.
export const playMessageSound = () => {
  const ctx = audioContext;
  if (!ctx || ctx.state !== 'running') return;
  try {
    [
      { frequency: 660, start: 0 },
      { frequency: 880, start: 0.16 },
    ].forEach(({ frequency, start }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + start;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.15);
    });
  } catch {
    // An alert sound must never break message handling
  }
};

// Only shown while the tab is in the background; the on-page pop-up covers the rest.
export const showBrowserNotification = ({ title, body, tag, onClick }: {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
}) => {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    // The tag stops several open tabs from each showing the same message
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  } catch {
    // Some mobile browsers do not allow the Notification constructor
  }
};
