'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LedgerRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  useEffect(() => {
    router.replace(`/${orgSlug}/transactions`);
  }, [orgSlug, router]);

  return null;
}
