'use client';

import { toast } from 'sonner';

/** Copies this page's share link. window is read in the handler, never during render (SSR). */
export function CopyLinkButton({ className }: { className?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };
  return (
    <button type="button" onClick={copy} className={className}>
      Copy link
    </button>
  );
}
