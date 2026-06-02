// Per-doc-type landing/help content for the Bulk Upload stepper.
// Strings and demo-video URLs are restored 1:1 from the original sales pages.

export interface BulkUploadContent {
  /** Heading shown above the description. */
  title: string;
  /** Descriptive instructions — verbatim from the original EmptyState. */
  description: string;
  /** YouTube demo/tutorial URL. */
  videoUrl: string;
  /** Optional large label rendered inside the video thumbnail. */
  generatorLabel?: string;
  /** Whether to show the amber "Demo Video" badge on the thumbnail. */
  showDemoBadge: boolean;
}

export const BULK_UPLOAD_CONTENT: Record<string, BulkUploadContent> = {
  credit_note: {
    title: "Credit Notes",
    description:
      "Provide Rebates To Customers With Credit Notes. Create, Share, Track, and Manage All Credit Notes In One Place.",
    videoUrl: "https://youtu.be/4P6FsYHdN8M?si=KE0PRlIBPbEXtVIz",
    generatorLabel: "Credit Note Generator",
    showDemoBadge: true,
  },
  proforma_invoice: {
    title: "Proforma Invoices",
    description:
      "Create Proforma Invoices With Customisable Templates. 1-click Share via PDF, Print, or Link over WhatsApp or Email. Record & Track Payments. And more...",
    videoUrl: "https://youtu.be/6TS_cmxB_Tc?si=jn4yxnb1vsN0hB7R",
    generatorLabel: "Proforma Invoice Generator",
    showDemoBadge: true,
  },
  sales_order: {
    title: "Sales Order",
    description:
      "Create, Share, and Track Sales Orders. Anticipate Future Revenues and Keep Track of Order Fulfillment.",
    videoUrl: "https://youtu.be/R7Z8w1eXXXs?si=dL4yAC7MOtQji163",
    showDemoBadge: false,
  },
  payment_receipt: {
    title: "Payment Receipts",
    description:
      "Create, edit and share receipt for the payment received from the clients.",
    videoUrl: "https://youtu.be/R7Z8w1eXXXs?si=dL4yAC7MOtQji163",
    showDemoBadge: false,
  },
};
