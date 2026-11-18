const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const below100 = (n: number): string =>
  n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');

/** British English words for 0..1000, with "and" after the hundreds: 305 -> "three hundred and five". */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new RangeError(`numberToWords expects an integer 0..1000, got ${n}`);
  if (n === 1000) return 'one thousand';
  if (n < 100) return below100(n);
  const hundreds = `${ONES[Math.floor(n / 100)]} hundred`;
  return n % 100 === 0 ? hundreds : `${hundreds} and ${below100(n % 100)}`;
}
