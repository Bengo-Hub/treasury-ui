'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A single row action. `visible` lets a caller hide an action per-row (e.g. only
 * show "Issue Reward" for type_a referrals). `destructive` styles it in the
 * destructive token.
 */
export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: ReactNode;
  destructive?: boolean;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

/**
 * RowActionMenu is the shared, clip-safe "..." row action menu. It renders the
 * menu into a viewport-fixed portal (document.body) so it escapes the table's
 * horizontal-scroll / overflow container — a plain absolutely-positioned dropdown
 * gets clipped at the table edge. The menu right-aligns to the trigger and flips
 * up when there isn't room below, and closes on scroll/resize so it never detaches.
 *
 * This is the same positioning pattern the quotations document list uses; both the
 * shared document list and the referrals table consume it so there is one source of
 * truth for row-action behavior.
 */
export function RowActionMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const visible = actions.filter((a) => !a.visible || a.visible(row));

  // Position the menu in a viewport-fixed portal so it escapes the table's
  // horizontal scroll container (which otherwise clips an absolutely-positioned
  // dropdown). Align the menu's right edge to the trigger and flip up when there
  // isn't room below.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const GAP = 6;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = menuRef.current?.offsetWidth ?? 224;
    const menuH = menuRef.current?.offsetHeight ?? 320;
    let left = rect.right - menuW; // right-align to trigger
    if (left < 8) left = Math.min(rect.left, window.innerWidth - menuW - 8);
    left = Math.max(8, left);
    let top = rect.bottom + GAP; // open downward
    if (top + menuH > window.innerHeight - 8) {
      const above = rect.top - GAP - menuH; // flip up if no room below
      top = above >= 8 ? above : Math.max(8, window.innerHeight - menuH - 8);
    }
    setPos({ top, left });
  }, [open]);

  // Close on scroll/resize so the fixed menu never detaches from its trigger.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[61] bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-52 max-w-[min(18rem,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] overflow-y-auto"
              style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                visibility: pos ? 'visible' : 'hidden',
              }}
            >
              {visible.map((a) => {
                const isDisabled = a.disabled?.(row) ?? false;
                return (
                  <button
                    key={a.label}
                    role="menuitem"
                    type="button"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDisabled) return;
                      a.onClick(row);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none',
                      a.destructive
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-accent',
                    )}
                  >
                    {a.icon && <span className="shrink-0">{a.icon}</span>}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
