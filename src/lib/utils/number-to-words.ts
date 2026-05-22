const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + chunkToWords(n % 100) : '');
}

const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

/**
 * Converts a non-negative integer to English words.
 * e.g. 361800 → "Three Hundred Sixty One Thousand Eight Hundred"
 */
export function numberToWords(amount: number, currency = 'Shillings'): string {
  const int = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - int) * 100);

  if (int === 0 && cents === 0) return `Zero ${currency} Only`;

  const chunks: number[] = [];
  let n = int;
  while (n > 0) { chunks.push(n % 1000); n = Math.floor(n / 1000); }

  const parts: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const w = chunkToWords(chunks[i]);
    if (w) parts.push(w + (SCALES[i] ? ' ' + SCALES[i] : ''));
  }

  let result = parts.join(' ') + ' ' + currency;
  if (cents > 0) result += ` and ${chunkToWords(cents)} Cents`;
  return (result + ' Only').trim();
}
