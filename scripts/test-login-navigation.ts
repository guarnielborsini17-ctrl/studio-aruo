import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/App.tsx', 'utf8');

assert.equal(source.includes("const isLoginPage = location.pathname === '/login'"), true);
assert.equal(source.includes('const visibleLinks = isLoginPage'), false);
assert.equal(source.includes('{!isLoginPage ? ('), true);
assert.equal(source.includes('links.map((link)'), true);

console.log('login navigation assertions passed');
