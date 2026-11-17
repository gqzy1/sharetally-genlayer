import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

function loadTsModule(relPath) {
  let code = fs.readFileSync(path.join(frontendRoot, relPath), 'utf8');
  code = code
    .replace(/^import\s+type\s+[\s\S]*?;\n/gm, '')
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];\n/gm, '')
    .replace(/export\s+interface\s+\w+\s*\{[\s\S]*?\n\}\n/g, '')
    .replace(/export\s+type\s+[^=]+=[^;]+;\n/g, '')
    .replace(/\s+as\s+const\b/g, '')
    .replace(/\s+as\s+`0x\$\{string\}`/g, '')
    .replace(/\s+as\s+LocalDemoBook\[\]/g, '')
    .replace(/\s+as\s+StoredDraft/g, '')
    .replace(/\s+as\s+Currency\[\]/g, '')
    .replace(/\s+as\s+Currency/g, '')
    .replace(/new Map<[^>]+>\(\)/g, 'new Map()')
    .replace(/(\w+)\s*:\s*(?:string|number|boolean|DraftBookInput|Member|ValidationErrors|Pick<[^>]+>\s*\|\s*null)\s*(?=[,)=])/g, '$1')
    .replace(/\): \{ (?:ok: true|valid: boolean)[^\n]+\{/g, ') {').replace(/\): [^{=\n]+\{/g, ') {')
    .replace(/const errors:\s*ValidationErrors\s*=/g, 'const errors =')
    .replace(/const payload:\s*StoredDraft\s*=/g, 'const payload =')
    .replace(/const entry:\s*LocalDemoBook\s*=/g, 'const entry =')
    .replace(/const mErr:\s*\{[^}]+\}\s*=/g, 'const mErr =')
    .replace(/^export\s+/gm, '');

  const exports = {};
  const sandbox = {
    Map, Set, Array, Object, Number, String, Boolean, JSON, Date, RegExp, Math,
    exports,
  };
  const fnNames = [...fs.readFileSync(path.join(frontendRoot, relPath), 'utf8').matchAll(/^export\s+(?:function|const)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  const uniqueNames = [...new Set(fnNames)];
  const script = new vm.Script(`${code}\nObject.assign(exports, { ${uniqueNames.join(', ')} });`);
  script.runInNewContext(sandbox);
  return sandbox.exports;
}

const validation = loadTsModule('src/domain/validation.ts');
const storageMod = loadTsModule('src/domain/storage.ts');

function makeValidDraft() {
  return {
    tag: 'shared-print-2026',
    organizerAddress: '0x1111111111111111111111111111111111111111',
    specification: {
      title: 'Shared exhibitor print run',
      currency: 'GBP',
      quotation: 'Standalone total prices: Ada = 150; Bo = 150; Ada,Bo = 180.',
      source_locator: 'Quote #Q-104',
      members: [
        { name: 'Ada', address: '0x1111111111111111111111111111111111111111', description: 'Print pack A' },
        { name: 'Bo', address: '0x2222222222222222222222222222222222222222', description: 'Print pack B' },
      ],
    },
  };
}

test('1. form validation accepts valid draft and rejects invalid tag/title/quotation', () => {
  const ok = validation.validateDraftBook(makeValidDraft());
  assert.equal(ok.valid, true);

  const badTag = makeValidDraft();
  badTag.tag = 'INVALID_TAG!';
  assert.equal(validation.validateDraftBook(badTag).valid, false);
  assert.ok(validation.validateDraftBook(badTag).errors.tag);

  const badQuote = makeValidDraft();
  badQuote.specification.quotation = 'too short';
  assert.equal(validation.validateDraftBook(badQuote).valid, false);
  assert.ok(validation.validateDraftBook(badQuote).errors.quotation);
});

test('2. member count boundary enforces 2 to 4 members', () => {
  const oneMember = makeValidDraft();
  oneMember.specification.members = [oneMember.specification.members[0]];
  const res1 = validation.validateDraftBook(oneMember);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.membersGeneral);

  const fourMembers = makeValidDraft();
  fourMembers.specification.members.push(
    { name: 'Cy', address: '0x3333333333333333333333333333333333333333', description: 'Pack C' },
    { name: 'Di', address: '0x4444444444444444444444444444444444444444', description: 'Pack D' },
  );
  assert.equal(validation.validateDraftBook(fourMembers).valid, true);

  const fiveMembers = makeValidDraft();
  fiveMembers.specification.members.push(
    { name: 'Cy', address: '0x3333333333333333333333333333333333333333', description: 'Pack C' },
    { name: 'Di', address: '0x4444444444444444444444444444444444444444', description: 'Pack D' },
    { name: 'Ev', address: '0x5555555555555555555555555555555555555555', description: 'Pack E' },
  );
  assert.equal(validation.validateDraftBook(fiveMembers).valid, false);
});

test('3. wallet address validation rejects zero address and malformed hex', () => {
  assert.equal(validation.isValidAddress('0x0000000000000000000000000000000000000000'), false);
  assert.equal(validation.isValidAddress('0x1234'), false);
  assert.equal(validation.isValidAddress('0x1111111111111111111111111111111111111111'), true);
});

test('4. duplicate member names, duplicate wallets, and non-member organizer are rejected', () => {
  const dupName = makeValidDraft();
  dupName.specification.members[1].name = 'ada';
  const resName = validation.validateDraftBook(dupName);
  assert.equal(resName.valid, false);
  assert.ok(resName.errors.members[0].name);

  const dupWallet = makeValidDraft();
  dupWallet.specification.members[1].address = '0x1111111111111111111111111111111111111111';
  const resWallet = validation.validateDraftBook(dupWallet);
  assert.equal(resWallet.valid, false);
  assert.ok(resWallet.errors.members[1].address);

  const badOrg = makeValidDraft();
  badOrg.organizerAddress = '0x9999999999999999999999999999999999999999';
  const resOrg = validation.validateDraftBook(badOrg);
  assert.equal(resOrg.valid, false);
  assert.ok(resOrg.errors.organizerAddress);
});

test('5. draft persistence saves, restores, and clears cleanly', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const draft = makeValidDraft();
  storageMod.saveDraft(draft, mockStorage);
  const restored = storageMod.loadDraft(mockStorage);
  assert.equal(restored.draft.tag, 'shared-print-2026');
  assert.equal(restored.draft.specification.members.length, 2);

  storageMod.saveLocalDemoBook(draft, mockStorage);
  const savedBooks = storageMod.loadLocalDemoBooks(mockStorage);
  assert.equal(savedBooks.length, 1);
  assert.equal(savedBooks[0].provenance, 'OFFLINE_DEMO_DRAFT');
  assert.equal(savedBooks[0].book.state, 'SEALED');

  storageMod.clearDraft(mockStorage);
  assert.equal(storageMod.loadDraft(mockStorage), null);
});

test('6. quote amount precision handles 2-decimal minor units and rejects invalid amounts', () => {
  assert.equal(validation.parseMajorToMinor('1.50').minor, 150);
  assert.equal(validation.parseMajorToMinor('0.01').minor, 1);
  assert.equal(validation.parseMajorToMinor('12').minor, 1200);
  assert.equal(validation.parseMajorToMinor('1.234').ok, false);
  assert.equal(validation.parseMajorToMinor('-5.00').ok, false);
});

test('7. catalogue invitation parser handles owner:tag and route URLs', () => {
  const p1 = validation.parseBookInvitation('0x1111111111111111111111111111111111111111:additive-ready');
  assert.equal(p1.ok, true);
  assert.equal(p1.tag, 'additive-ready');

  const p2 = validation.parseBookInvitation('https://example.com/#/books/0x1111111111111111111111111111111111111111/shared-print');
  assert.equal(p2.ok, true);
  assert.equal(p2.tag, 'shared-print');

  const bad = validation.parseBookInvitation('not-a-valid-invite');
  assert.equal(bad.ok, false);
});
