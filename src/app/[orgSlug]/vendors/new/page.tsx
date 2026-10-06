import { redirect } from 'next/navigation';

/**
 * Vendors are added in the VendorFormDialog (Vendors page, and inline on the expense and bill
 * forms). This route stays only so old links keep working: it opens the Vendors page with the
 * dialog up, keeping any tenant drill-down query.
 */
export default async function AddVendorRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') query.set(k, v);
  }
  query.set('add', '1');
  redirect(`/${orgSlug}/vendors?${query.toString()}`);
}
