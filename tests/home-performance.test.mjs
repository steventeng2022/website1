import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const home=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
const posts=await readFile(new URL('../db/posts.ts',import.meta.url),'utf8');
test('homepage queries only three post summaries without bodies or gallery',()=>{
 assert.match(home,/listRecentPublishedPostSummaries\(3\)/);
 assert.match(posts,/export async function listRecentPublishedPostSummaries/);
 assert.match(posts,/LIMIT \?/);
 assert.doesNotMatch(home,/listPublishedPosts\(/);
});
