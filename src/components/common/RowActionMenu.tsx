import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** Draw a divider line above this item */
  dividerBefore?: boolean;
  danger?: boolean;
  hidden?: boolean;
}

interface RowActionMenuProps {
  actions: RowAction[];
  title?: string;
  width?: number;
}

/**
 * "⋯" button + menu for table rows.
 *
 * The menu is rendered in a portal on document.body with fixed positioning,
 * so a table wrapper with `overflow-hidden` / `overflow-x-auto` can't clip it
 * (the old inline menus opened upward and were cut off on the first rows).
 * It opens below the button and flips above when there is no room.
 */
const RowActionMenu = ({ actions, title = 'More Actions', width = 208 }: RowActionMenuProps) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = actions.filter(a => !a.hidden);

  const place = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? visible.length * 40 + 8;
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow >= menuH + gap || r.top < menuH + gap
      ? r.bottom + gap
      : r.top - menuH - gap;
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    setPos({ top: Math.max(8, top), left });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-secondary hover:text-primary p-1 rounded transition-colors"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed bg-card rounded-lg shadow-xl border border-theme py-1"
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            width,
            zIndex: 1100, // above page content and the app header, below antd modals' messages
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          {visible.map((a, i) => (
            <div key={`${a.label}-${i}`}>
              {a.dividerBefore && i > 0 && <div className="border-t border-theme my-1" />}
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[rgba(15,31,23,0.05)] flex items-center gap-2 transition-colors ${a.danger ? 'text-red-400' : 'text-primary'}`}
              >
                {a.icon}
                <span>{a.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default RowActionMenu;
