import { redirect } from 'next/navigation';

/**
 * Editing a draft expense happens in the EditExpenseModal on the expense detail page. This route
 * stays only so old links and bookmarks keep working: it opens the detail page with the modal up,
 * keeping any tenant drill-down query.
 */
export default async function EditExpenditureRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, id } = await params;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') query.set(k, v);
  }
  query.set('edit', '1');
  redirect(`/${orgSlug}/expenses/${id}?${query.toString()}`);
}
