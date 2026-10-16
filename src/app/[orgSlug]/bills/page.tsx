'use client';

import { BillsListView } from '@/components/bills/BillsListView';

/** Supplier bills, including supplementary bills; vendor credits have their own page. */
export default function BillsPage() {
  return <BillsListView documentType="bill" />;
}
