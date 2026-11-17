import type { Book } from '../../../sdk/types';
import rawFixtures from '../../../examples/offline-fixtures.json';

export interface OfflineFixture {
  provenance: 'OFFLINE_AUTHORED';
  label: string;
  book: Book;
}

export const OFFLINE_FIXTURES = rawFixtures as OfflineFixture[];

export function getOfflineFixture(label: string): OfflineFixture | undefined {
  return OFFLINE_FIXTURES.find((f) => f.label === label);
}
