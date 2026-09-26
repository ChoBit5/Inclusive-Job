import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat().filter((file) => /\.(js|jsx)$/.test(file));
}

test('el front-end no contiene clientes ni URLs de servicios', async () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const files = await sourceFiles(root);
  const text = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(text, /\bfetch\(|https?:\/\/|emailjs|@react-oauth\/google/i);
});
