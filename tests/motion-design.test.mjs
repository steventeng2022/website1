import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
const music=await readFile(new URL('../app/music-player.css',import.meta.url),'utf8');
test('motion system gives each section a restrained entry and respects reduced motion',()=>{
 assert.match(css,/\.motion-reveal \{/);
 assert.match(css,/@keyframes gentle-reveal/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.motion-reveal[^}]*animation:none!important/);
});
test('interactive cards and controls move with transforms instead of layout padding',()=>{
 assert.match(css,/\.project-card:hover[^}]*translateY/);
 assert.doesNotMatch(css,/\.project-card:hover[^}]*padding-left/);
 assert.match(css,/\.primary-button:hover[^}]*translateY/);
});
test('music panel remains usable without motion and photo swap is restrained',()=>{
 assert.match(music,/prefers-reduced-motion: reduce/);
 assert.match(css,/@keyframes photo-swap/);
});
