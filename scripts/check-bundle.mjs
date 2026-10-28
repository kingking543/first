import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', root), 'utf8'));
const entry = Object.keys(manifest).find(key => manifest[key].isEntry);
assert.ok(entry, 'Production entry must exist');
const initial = new Set();
function visit(key) {
  if (initial.has(key)) return;
  initial.add(key);
  for (const imported of manifest[key].imports ?? []) visit(imported);
}
visit(entry);
let initialBytes = 0;
let initialGzipBytes = 0;
const chunks = [];
for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.file.endsWith('.js')) continue;
  const code = await readFile(new URL(chunk.file, root));
  const row = { file: chunk.file, bytes: code.length, gzipBytes: gzipSync(code).length, initial: initial.has(key) };
  chunks.push(row);
  if (row.initial) { initialBytes += row.bytes; initialGzipBytes += row.gzipBytes; }
  assert.ok(row.bytes < 500000, 'Every JavaScript chunk must remain below 500 KB: ' + row.file);
}
console.log(JSON.stringify({ initialBytes, initialGzipBytes, chunks }, null, 2));
assert.ok(initialBytes < 400000, 'Initial JavaScript must stay below 400 KB');
assert.ok(initialGzipBytes < 140000, 'Initial compressed JavaScript must stay below 140 KB');
assert.ok(chunks.some(chunk => !chunk.initial), 'Analysis code must load separately from the initial page');
