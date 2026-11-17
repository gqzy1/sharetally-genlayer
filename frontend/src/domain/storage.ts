import type { Book } from '../../../sdk/types';
import type { DraftBookInput } from './validation';

const DRAFT_KEY = 'sharetally.draft.v1';
const LOCAL_BOOKS_KEY = 'sharetally.offline_books.v1';

export interface StoredDraft {
  savedAt: string;
  draft: DraftBookInput;
}

export interface LocalDemoBook {
  provenance: 'OFFLINE_DEMO_DRAFT';
  createdAt: string;
  book: Book;
}

export function createInitialDraft(): DraftBookInput {
  return {
    tag: 'shared-print-2026',
    organizerAddress: '0x1111111111111111111111111111111111111111',
    specification: {
      title: 'Shared exhibitor print run',
      currency: 'GBP',
      quotation:
        'Standalone total prices in minor units: Ada = 150; Bo = 150; Ada,Bo = 180. Setup fee 120 plus 30 per member.',
      source_locator: 'Declared supplier PDF quote #Q-104 (not independently fetched)',
      members: [
        {
          name: 'Ada',
          address: '0x1111111111111111111111111111111111111111',
          description: 'Standard exhibitor booth print pack',
        },
        {
          name: 'Bo',
          address: '0x2222222222222222222222222222222222222222',
          description: 'Standard exhibitor booth print pack',
        },
      ],
    },
  };
}

export function saveDraft(draft: DraftBookInput, storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): StoredDraft {
  const payload: StoredDraft = {
    savedAt: new Date().toISOString(),
    draft,
  };
  if (storage) {
    storage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function loadDraft(storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): StoredDraft | null {
  if (!storage) return null;
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.draft?.specification || !Array.isArray(parsed.draft.specification.members)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(storage: Pick<Storage, 'removeItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): void {
  if (storage) storage.removeItem(DRAFT_KEY);
}

export function loadLocalDemoBooks(storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): LocalDemoBook[] {
  if (!storage) return [];
  const raw = storage.getItem(LOCAL_BOOKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalDemoBook[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalDemoBook(
  draft: DraftBookInput,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): LocalDemoBook {
  const owner = (draft.organizerAddress || draft.specification.members[0]?.address || '0x1111111111111111111111111111111111111111').toLowerCase() as `0x${string}`;
  const id = `${owner}:${draft.tag}`;
  const entry: LocalDemoBook = {
    provenance: 'OFFLINE_DEMO_DRAFT',
    createdAt: new Date().toISOString(),
    book: {
      id,
      owner,
      input: {
        ...draft.specification,
        members: draft.specification.members.map((m) => ({
          ...m,
          address: m.address.toLowerCase() as `0x${string}`,
        })),
      },
      input_hash: 'offline-preview-unsealed',
      revision: 0,
      state: 'SEALED',
      approvals: [],
    },
  };
  if (storage) {
    const existing = loadLocalDemoBooks(storage).filter((b) => b.book.id !== id);
    storage.setItem(LOCAL_BOOKS_KEY, JSON.stringify([entry, ...existing]));
  }
  return entry;
}
