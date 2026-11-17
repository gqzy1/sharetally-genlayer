import type { Currency, Member } from '../../../sdk/types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

export function formatMinorUnits(minor: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOL[currency];
  const major = (minor / 100).toFixed(2);
  return `${sym}${major} (${minor} minor)`;
}

export function formatMajorShort(minor: number, currency: Currency): string {
  return `${CURRENCY_SYMBOL[currency]}${(minor / 100).toFixed(2)}`;
}

export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function maskToMemberNames(mask: number, members: Member[]): string[] {
  const names: string[] = [];
  for (let i = 0; i < members.length; i++) {
    if (mask & (1 << i)) {
      names.push(members[i].name);
    }
  }
  return names;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatExactFraction(numerator: number, denominator: number): string {
  const d = gcd(numerator, denominator);
  const n = numerator / d;
  const den = denominator / d;
  return den === 1 ? `${n}` : `${n}/${den}`;
}
