import type { Currency, Member, Specification } from '../../../sdk/types';

export const PROTOCOL_LIMITS = {
  TAG_MIN: 3,
  TAG_MAX: 32,
  TITLE_MIN: 3,
  TITLE_MAX: 120,
  QUOTATION_MIN: 20,
  QUOTATION_MAX: 6000,
  LOCATOR_MAX: 300,
  MEMBER_MIN: 2,
  MEMBER_MAX: 4,
  NAME_MIN: 1,
  NAME_MAX: 50,
  DESC_MIN: 3,
  DESC_MAX: 240,
  MAX_COST_MINOR: 1_000_000_000,
} as const;

export interface DraftBookInput {
  tag: string;
  organizerAddress: string;
  specification: Specification;
}

export interface ValidationErrors {
  tag?: string;
  organizerAddress?: string;
  title?: string;
  currency?: string;
  quotation?: string;
  source_locator?: string;
  membersGeneral?: string;
  members: Array<{
    name?: string;
    address?: string;
    description?: string;
  }>;
}

const TAG_RE = /^[a-z0-9-]{3,32}$/;
const HEX_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDR_RE = /^0x0{40}$/i;

export function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 && value[i] !== '\n' && value[i] !== '\t') {
      return true;
    }
  }
  return false;
}

export function isValidAddress(value: string): boolean {
  const trimmed = value.trim();
  return HEX_ADDR_RE.test(trimmed) && !ZERO_ADDR_RE.test(trimmed);
}

export function isValidTag(value: string): boolean {
  return TAG_RE.test(value);
}

export function parseMajorToMinor(raw: string): { ok: true; minor: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Amount is required.' };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: 'Enter a nonnegative amount with at most 2 decimal places.' };
  }
  const [whole, frac = ''] = trimmed.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > PROTOCOL_LIMITS.MAX_COST_MINOR) {
    return { ok: false, error: `Amount must be between 0 and ${(PROTOCOL_LIMITS.MAX_COST_MINOR / 100).toFixed(2)}.` };
  }
  return { ok: true, minor };
}

export function parseBookInvitation(
  raw: string,
): { ok: true; owner: `0x${string}`; tag: string; bookId: string } | { ok: false; error: string } {
  let cleaned = raw.trim();
  if (!cleaned) return { ok: false, error: 'Enter an owner-qualified book ID (<owner>:<tag>).' };

  // Support pasted route URLs like #/books/0x.../my-tag or /books/0x.../my-tag
  const routeMatch = cleaned.match(/\/books\/(0x[0-9a-fA-F]{40})\/([a-z0-9-]{3,32})\/?$/);
  if (routeMatch) {
    const owner = routeMatch[1].toLowerCase() as `0x${string}`;
    const tag = routeMatch[2];
    if (ZERO_ADDR_RE.test(owner)) return { ok: false, error: 'Zero address cannot own a book.' };
    return { ok: true, owner, tag, bookId: `${owner}:${tag}` };
  }

  const colonIdx = cleaned.indexOf(':');
  if (colonIdx === -1) {
    return { ok: false, error: 'Expected <owner-address>:<tag> (e.g. 0x1111...1111:shared-print).' };
  }
  const ownerRaw = cleaned.slice(0, colonIdx).trim();
  const tag = cleaned.slice(colonIdx + 1).trim();

  if (!isValidAddress(ownerRaw)) {
    return { ok: false, error: 'Owner address must be a valid nonzero 0x40-hex address.' };
  }
  if (!isValidTag(tag)) {
    return { ok: false, error: 'Tag must be 3–32 lowercase letters, digits, or hyphens.' };
  }
  const owner = ownerRaw.toLowerCase() as `0x${string}`;
  return { ok: true, owner, tag, bookId: `${owner}:${tag}` };
}

function validateTextField(value: string, min: number, max: number, label: string): string | undefined {
  if (value !== value.trim()) {
    return `${label} cannot start or end with whitespace.`;
  }
  if (value.length < min || value.length > max) {
    return `${label} must be ${min}–${max} characters (currently ${value.length}).`;
  }
  if (hasControlChars(value)) {
    return `${label} contains unsupported control characters.`;
  }
  return undefined;
}

export function validateDraftBook(draft: DraftBookInput): { valid: boolean; errors: ValidationErrors } {
  const { tag, organizerAddress, specification } = draft;
  const errors: ValidationErrors = { members: [] };

  if (!isValidTag(tag)) {
    errors.tag = 'Tag must be 3–32 lowercase letters, digits, or hyphens (a-z, 0-9, -).';
  }

  errors.title = validateTextField(specification.title, PROTOCOL_LIMITS.TITLE_MIN, PROTOCOL_LIMITS.TITLE_MAX, 'Title');

  if (!(['GBP', 'USD', 'EUR'] as Currency[]).includes(specification.currency)) {
    errors.currency = 'Currency must be GBP, USD, or EUR.';
  }

  errors.quotation = validateTextField(
    specification.quotation,
    PROTOCOL_LIMITS.QUOTATION_MIN,
    PROTOCOL_LIMITS.QUOTATION_MAX,
    'Quotation',
  );

  if (specification.source_locator.length > 0 || specification.source_locator !== specification.source_locator.trim()) {
    errors.source_locator = validateTextField(
      specification.source_locator,
      0,
      PROTOCOL_LIMITS.LOCATOR_MAX,
      'Source locator',
    );
  }

  const members = specification.members;
  if (members.length < PROTOCOL_LIMITS.MEMBER_MIN || members.length > PROTOCOL_LIMITS.MEMBER_MAX) {
    errors.membersGeneral = `Roster must have ${PROTOCOL_LIMITS.MEMBER_MIN}–${PROTOCOL_LIMITS.MEMBER_MAX} members.`;
  }

  const nameCounts = new Map<string, number>();
  const addrCounts = new Map<string, number>();
  for (const m of members) {
    const lowerName = m.name.trim().toLowerCase();
    if (lowerName) nameCounts.set(lowerName, (nameCounts.get(lowerName) ?? 0) + 1);
    const lowerAddr = m.address.trim().toLowerCase();
    if (lowerAddr) addrCounts.set(lowerAddr, (addrCounts.get(lowerAddr) ?? 0) + 1);
  }

  errors.members = members.map((m: Member) => {
    const mErr: { name?: string; address?: string; description?: string } = {};
    mErr.name = validateTextField(m.name, PROTOCOL_LIMITS.NAME_MIN, PROTOCOL_LIMITS.NAME_MAX, 'Name');
    if (!mErr.name && (nameCounts.get(m.name.toLowerCase()) ?? 0) > 1) {
      mErr.name = 'Member names must be unique (case-insensitive).';
    }

    if (!isValidAddress(m.address)) {
      mErr.address = 'Enter a valid nonzero 0x wallet address (42 characters).';
    } else if ((addrCounts.get(m.address.trim().toLowerCase()) ?? 0) > 1) {
      mErr.address = 'Duplicate wallet address in roster.';
    }

    mErr.description = validateTextField(
      m.description,
      PROTOCOL_LIMITS.DESC_MIN,
      PROTOCOL_LIMITS.DESC_MAX,
      'Description',
    );
    return mErr;
  });

  if (organizerAddress.trim()) {
    if (!isValidAddress(organizerAddress)) {
      errors.organizerAddress = 'Organizer address must be a valid nonzero 0x address.';
    } else {
      const orgLower = organizerAddress.trim().toLowerCase();
      const inRoster = members.some((m) => m.address.trim().toLowerCase() === orgLower);
      if (!inRoster) {
        errors.organizerAddress = 'Organizer wallet must be one of the named roster members (OWNER_MUST_BE_MEMBER).';
      }
    }
  }

  const hasMemberErrors = errors.members.some((m) => Boolean(m.name || m.address || m.description));
  const valid =
    !errors.tag &&
    !errors.organizerAddress &&
    !errors.title &&
    !errors.currency &&
    !errors.quotation &&
    !errors.source_locator &&
    !errors.membersGeneral &&
    !hasMemberErrors;

  return { valid, errors };
}
