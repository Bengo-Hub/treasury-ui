export type TreasuryEmbedMessage =
  | { type: 'treasury:payment_initiated'; intentId: string; method: string }
  | { type: 'treasury:payment_confirmed'; intentId: string; amount: number; reference: string; channel: string }
  | { type: 'treasury:payment_failed'; intentId: string; error: string }
  | { type: 'treasury:payment_cancelled'; intentId: string }
  | { type: 'treasury:resize'; height: number };

export function sendToParent(message: TreasuryEmbedMessage) {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin iframe
  }
}
