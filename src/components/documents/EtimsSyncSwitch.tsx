'use client';

/**
 * The "Transmit to KRA eTIMS" switch shared by the invoice Send dialog and the expense Submit
 * dialog, with the note explaining what will happen.
 */
export function EtimsSyncSwitch({
  checked,
  onToggle,
  label = 'Transmit to KRA eTIMS',
  note,
}: {
  checked: boolean;
  onToggle: () => void;
  label?: string;
  note: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-left"
    >
      <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-accent'}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        <span className="block text-muted-foreground">{note}</span>
      </span>
    </button>
  );
}
