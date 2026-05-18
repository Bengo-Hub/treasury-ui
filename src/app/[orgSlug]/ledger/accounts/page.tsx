import { redirect } from 'next/navigation';

export default function LedgerAccountsRedirect({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/accounts`);
}
