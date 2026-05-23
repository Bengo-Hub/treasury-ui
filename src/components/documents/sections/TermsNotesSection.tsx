'use client';

interface TermsNotesSectionProps {
  terms: string;
  onTermsChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

const textareaCls = 'w-full bg-transparent text-xs font-semibold text-foreground resize-none focus:outline-none min-h-[60px]';

export function TermsNotesSection({ terms, onTermsChange, notes, onNotesChange }: TermsNotesSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
        <span className="text-xs font-bold underline block border-b border-border pb-1.5 text-foreground">
          Terms and Conditions
        </span>
        <textarea rows={3} value={terms} onChange={e => onTermsChange(e.target.value)} className={textareaCls} />
      </div>
      <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
        <span className="text-xs font-bold underline block border-b border-border pb-1.5 text-foreground">
          Notes
        </span>
        <textarea rows={3} value={notes} onChange={e => onNotesChange(e.target.value)}
          placeholder="Any additional notes for the customer…"
          className={textareaCls} />
      </div>
    </div>
  );
}
