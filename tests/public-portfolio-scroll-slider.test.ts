import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/pages/PublicPortfolio.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('public portfolio uses a restrained vertical slider to control page scroll', () => {
  assert.match(source, /const \[scrollProgress, setScrollProgress\] = useState\(0\)/);
  assert.match(source, /const handleScrollSliderChange = \(event: ChangeEvent<HTMLInputElement>\)/);
  assert.match(source, /window\.scrollTo\(\{/);
  assert.match(source, /type="range"/);
  assert.match(source, /value=\{scrollProgress\}/);
  assert.match(source, /onChange=\{handleScrollSliderChange\}/);
  assert.match(source, /public-scroll-slider/);
  assert.match(source, /public-scroll-rail/);
  assert.match(source, /bg-white\/10/);
  assert.match(source, /h-\[64vh\]/);
  assert.match(source, /min-h-\[440px\]/);
  assert.doesNotMatch(source, /from-accent-blue\/80 via-glass-border to-accent-orange\/70/);
  assert.match(css, /\.public-scroll-slider/);
  assert.match(css, /\.public-scroll-rail/);
});
