import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/pages/PublicPortfolio.tsx', 'utf8');

assert.equal(source.includes("useState<'works' | 'pricing'>('works')"), true);
assert.equal(source.includes("setActiveSection('works')"), true);
assert.equal(source.includes("setActiveSection('pricing')"), true);
assert.equal(source.includes("activeSection === 'works'"), true);
assert.equal(source.includes("activeSection === 'pricing'"), true);
assert.equal(source.includes('作品库'), true);
assert.equal(source.includes('价格参考'), true);
assert.equal(source.includes('max-h-[62vh]'), true);
assert.equal(source.includes('object-contain'), true);
assert.equal(source.indexOf('价格参考') < source.lastIndexOf('pricing.length'), true);

console.log('public portfolio tab assertions passed');
