import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const hero = await readFile(new URL('../app/hero-character-tabs.tsx', import.meta.url), 'utf8');

test('alternate hero art is deferred and decodes only after selection', () => {
  assert.match(hero, /loading=\{isSteven \? "eager" : "lazy"\}/);
  assert.match(hero, /decoding="async"/);
  assert.match(hero, /flower\.webp/);
  assert.doesNotMatch(hero, /flower\.png/);
});

test('optimized alternate art is substantially smaller than original', async () => {
  const original = await stat(new URL('../public/flower.png', import.meta.url));
  const optimized = await stat(new URL('../public/flower.webp', import.meta.url));
  assert.ok(optimized.size < original.size * 0.3, `${optimized.size} is not < 30% of ${original.size}`);
});
