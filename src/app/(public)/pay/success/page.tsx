'use client';

import { sendToParent } from '@/lib/embed-messages';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Suspense } from 'react';

function PaySuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firedRef = useRef(false);

  const payment = searchParams.get('payment') ?? 'succeeded';
  const reference = searchParams.get('reference') ?? '';
  const returnUrl = searchParams.get('return_url') ?? '';
  const embed = searchParams.get('embed') === 'true';
  const intentId = searchParams.get('intent_id') ?? '';
  const amount = Number(searchParams.get('amount') ?? 0);
  const channel = searchParams.get('channel') ?? 'paystack';

  const isSuccess = payment === 'succeeded';

  // In embed mode, fire treasury:payment_confirmed once so the outer modal handles success.
  useEffect(() => {
    if (!embed || firedRef.current) return;
    firedRef.current = true;
    if (isSuccess) {
      sendToParent({
        type: 'treasury:payment_confirmed',
        intentId,
        amount,
        reference,
        channel,
      });
    } else {
      sendToParent({
        type: 'treasury:payment_failed',
        intentId,
        error: 'Payment was not completed.',
      });
    }
  }, [embed, isSuccess, intentId, amount, reference, channel]);

  // In embed mode let the outer TreasuryPaymentModal handle the success display.
  // Show a minimal spinner while the postMessage propagates.
  if (embed) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleReturn = () => {
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
          {isSuccess ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {isSuccess ? 'Payment Successful' : 'Payment Failed'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isSuccess
              ? 'Your payment has been processed successfully.'
              : 'Something went wrong processing your payment. Please try again.'}
          </p>
        </div>

        {reference && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="text-gray-500 text-xs mb-1">Reference</p>
            <p className="font-mono text-gray-800 break-all">{reference}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {returnUrl ? (
            <button
              onClick={handleReturn}
              className="w-full py-3 px-6 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              Return to App
            </button>
          ) : (
            <button
              onClick={() => window.close()}
              className="w-full py-3 px-6 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400">Powered by CodeVertex Treasury</p>
      </div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense>
      <PaySuccessContent />
    </Suspense>
  );
}
