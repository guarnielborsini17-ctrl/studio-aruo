import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const frontendFiles = [
  'src/pages/DesignerDashboard.tsx',
  'src/pages/Guide.tsx',
  'src/pages/Register.tsx',
  'src/pages/ArtistProfile.tsx',
];

const forbidden = ['加鸡腿', '鸡腿', '充值', 'topUpBalance', 'giveChickenLeg', 'Drumstick', 'Wallet'];

for (const file of frontendFiles) {
  const source = await readFile(file, 'utf8');
  for (const term of forbidden) {
    assert.equal(source.includes(term), false, `${file} should not expose ${term}`);
  }
}

console.log('hidden chicken leg UI assertions passed');
