"use client";

import { Play } from "lucide-react";
import { BULK_UPLOAD_CONTENT } from "./bulk-upload-content";
import { BRAND_GRADIENT } from "./bulk-upload-shared";

interface Props {
  docType: string;
}

/**
 * Landing/help block shown at the top of the Bulk Upload "Select File" step:
 * the descriptive copy and the "Watch Demo Video" tutorial card. Content is
 * doc-type specific and restored 1:1 from the original sales pages. The card
 * uses the fixed dark blue/black brand gradient (not the tenant primary theme).
 */
export function BulkUploadIntro({ docType }: Props) {
  const content = BULK_UPLOAD_CONTENT[docType];
  if (!content) return null;

  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-sm text-muted-foreground">{content.description}</p>

      {content.videoUrl && (
        <a
          href={content.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative mt-6 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl transition-shadow hover:shadow-lg ${BRAND_GRADIENT}`}
        >
          {content.showDemoBadge && (
            <div className="absolute left-3 top-3 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f172a]">
              Demo Video
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            {content.generatorLabel && (
              <span className="text-lg font-bold text-white/80">
                {content.generatorLabel}
              </span>
            )}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 translate-x-0.5 fill-[#0f172a] text-[#0f172a]" />
            </div>
            <span className="text-sm font-semibold text-white">
              Watch Demo Video
            </span>
          </div>
        </a>
      )}
    </div>
  );
}
