'use client';

import { Check, Copy, Pencil, X } from 'lucide-react';
import { useState } from 'react';

/**
 * One integration URL: label above the value (wraps on phones), copy, and optional inline edit.
 */
export function CopyableUrl({ label, url, onSave, hint }: { label: string; url?: string; onSave?: (newUrl: string) => void; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(url ?? '');

  if (!url && !editing) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(url ?? editValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const save = () => {
    if (onSave && editValue.trim()) onSave(editValue.trim());
    setEditing(false);
  };
  const cancel = () => {
    setEditValue(url ?? '');
    setEditing(false);
  };
  const iconBtn = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground" title={hint}>{label}</p>
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <input
              type="url"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              aria-label={label}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') cancel();
              }}
            />
            <button type="button" onClick={save} className={iconBtn} aria-label="Save URL"><Check className="h-4 w-4 text-green-600" /></button>
            <button type="button" onClick={cancel} className={iconBtn} aria-label="Cancel"><X className="h-4 w-4" /></button>
          </>
        ) : (
          <>
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs" title={url}>{url}</code>
            <button type="button" onClick={copy} className={iconBtn} aria-label={`Copy ${label}`}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
            {onSave && (
              <button type="button" onClick={() => { setEditValue(url ?? ''); setEditing(true); }} className={iconBtn} aria-label={`Edit ${label}`}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
