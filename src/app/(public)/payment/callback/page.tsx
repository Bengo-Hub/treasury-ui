'use client';

import { Button, Card } from '@/components/ui/base';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Flexible Paystack callback page (public).
 * Query params: reference (from Paystack), redirect_url, button_text.
 * See shared-docs/paystack-callback-page.md. Reuse this pattern in ordering-frontend, subscription-ui, etc.
 */
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const redirectUrl = searchParams.get('redirect_url') || '/';
  const buttonText = searchParams.get('button_text') || 'Continue';

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const verifyUrl = process.env.NEXT_PUBLIC_PAYMENT_VERIFY_URL;

  const verify = useCallback(async () => {
    if (!reference) {
      setStatus('failed');
      setErrorMessage('No payment reference');
      return;
    }
    if (!verifyUrl) {
      setStatus('success');
      return;
    }
    try {
      const url = `${verifyUrl}${verifyUrl.includes('?') ? '&' : '?'}reference=${encodeURIComponent(reference)}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (data.success) setStatus('success');
      else if (data.status === 'pending') setStatus('pending');
      else {
        setStatus('failed');
        setErrorMessage(data.message || 'Verification failed');
      }
    } catch {
      setStatus('pending');
      setErrorMessage('Payment is being processed. You can continue below.');
    }
  }, [reference, verifyUrl]);

  useEffect(() => {
    const t = setTimeout(verify, 800);
    return () => clearTimeout(t);
  }, [verify]);

  const href = redirectUrl.startsWith('http') ? redirectUrl : redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Verifying payment</h1>
            <p className="text-muted-foreground">Please wait…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Payment received</h1>
            <p className="text-muted-foreground mb-6">Thank you. Your transaction has been completed.</p>
            {reference && (
              <p className="text-xs text-muted-foreground mb-6 font-mono">Ref: {reference}</p>
            )}
            <Link href={href}>
              <Button className="w-full" variant="primary">
                {buttonText}
              </Button>
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Payment issue</h1>
            <p className="text-muted-foreground mb-6">{errorMessage || 'Something went wrong. Please try again.'}</p>
            {reference && (
              <p className="text-xs text-muted-foreground mb-6 font-mono">Ref: {reference}</p>
            )}
            <div className="flex flex-col gap-3">
              <Button variant="primary" className="w-full" onClick={() => window.history.back()}>
                Try again
              </Button>
              <Link href={href}>
                <Button variant="outline" className="w-full">{buttonText}</Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Processing</h1>
            <p className="text-muted-foreground mb-6">
              {errorMessage || 'Your payment is being processed. It may take a moment to reflect.'}
            </p>
            {reference && (
              <p className="text-xs text-muted-foreground mb-6 font-mono">Ref: {reference}</p>
            )}
            <Link href={href}>
              <Button className="w-full" variant="primary">{buttonText}</Button>
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          Having issues? Contact support.
        </div>
      </Card>
    </div>
  );
}
