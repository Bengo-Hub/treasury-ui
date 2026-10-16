'use client';

/**
 * PresentationSection: this document's own number format and line columns. Off, the document
 * prints with the tenant's layout for its type (Settings > Document Presentation); on, the
 * choice is stored in metadata.presentation and wins over it.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PresentationEditor, PresentationPreview } from '../PresentationEditor';
import { getSettingValue, useSettings } from '@/hooks/use-settings';
import {
  PRESENTATION_SETTING_KEY,
  parsePresentationDefaults,
  type Presentation,
} from '@/lib/documents/presentation';

export function PresentationSection({
  tenant,
  docType,
  value,
  onChange,
}: {
  tenant: string;
  /** treasury-api document type (invoice, quotation, ...). */
  docType: string;
  value: Presentation | null;
  onChange: (v: Presentation | null) => void;
}) {
  const orgSlug = useParams()?.orgSlug as string;
  // Reading tenant settings needs treasury.config.view; without it the default is unknown here.
  const { data, isError } = useSettings(tenant);
  const tenantLayout = parsePresentationDefaults(getSettingValue(data?.settings, PRESENTATION_SETTING_KEY, {}))[docType] ?? {};

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-foreground">Layout</p>
          <p className="text-[10px] text-muted-foreground">
            Number format and line columns on the PDF and exports.{' '}
            <Link href={`/${orgSlug}/settings/document-presentation`} className="underline hover:text-foreground">
              Change the default
            </Link>
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked ? { ...tenantLayout } : null)}
          />
          Custom layout for this document
        </label>
      </div>
      {value ? (
        <PresentationEditor value={value} onChange={onChange} />
      ) : isError ? (
        <p className="text-[11px] text-muted-foreground">Prints with your organisation&apos;s layout for this document type.</p>
      ) : (
        <PresentationPreview value={tenantLayout} />
      )}
    </div>
  );
}
