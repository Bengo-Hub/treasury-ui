'use client';

import { BillsListView } from '@/components/bills/BillsListView';

/** Vendor credits: credits raised against a bill and purchase-return credits (Zoho Books "Vendor Credits"). */
export default function VendorCreditsPage() {
  return <BillsListView documentType="credit_note" />;
}
