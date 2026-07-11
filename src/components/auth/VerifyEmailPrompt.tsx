'use client';

import { VerifyEmailBanner, type EmailVerificationState } from '@bengo-hub/shared-ui-lib/auth';
import { useAuthStore } from '@/store/auth';

const ACCOUNTS_VERIFY_URL =
  (process.env.NEXT_PUBLIC_ACCOUNTS_URL || 'https://accounts.codevertexitsolutions.com') +
  '/dashboard/profile';

/**
 * Graduated verify-email banner, driven by the email_verification block auth-api's /me
 * returns (treasury-ui fetches SSO /me directly). Verification is completed in the
 * accounts portal (deep-linked), so no cross-origin verify calls are made here.
 */
export function VerifyEmailPrompt() {
  const user = useAuthStore((s) => s.user);
  const state = user?.email_verification as EmailVerificationState | undefined;
  if (!state || state.verified) return null;
  return <VerifyEmailBanner state={state} verifyUrl={ACCOUNTS_VERIFY_URL} />;
}
