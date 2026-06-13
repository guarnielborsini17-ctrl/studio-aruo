import assert from 'node:assert/strict';
import {
  calculateDisplaySize,
  processWorkImage,
  safeDisplayFileName,
} from '../src/lib/workImageProcessing';

assert.deepEqual(calculateDisplaySize(3840, 2160), { width: 2560, height: 1440 });
assert.deepEqual(calculateDisplaySize(2160, 3840), { width: 1440, height: 2560 });
assert.deepEqual(calculateDisplaySize(1200, 800), { width: 1200, height: 800 });
assert.equal(safeDisplayFileName('../../客户 王女士/客厅 终稿.PNG', 'webp'), 'web-image.webp');

const source = new File(['original'], '4k-render.png', { type: 'image/png' });
const decodedSource = {} as CanvasImageSource;
const calls: unknown[] = [];
let closed = false;
const processed = await processWorkImage(source, {
  decode: async () => ({
    source: decodedSource,
    width: 3840,
    height: 2160,
    close: () => {
      closed = true;
    },
  }),
  encode: async (input) => {
    calls.push(input);
    return new Blob(['processed'], { type: input.mimeType });
  },
  supportsWebp: () => true,
});

assert.equal(processed.type, 'image/webp');
assert.equal(processed.name, 'web-image.webp');
assert.equal(closed, true);
assert.deepEqual(calls, [
  {
    source: decodedSource,
    width: 2560,
    height: 1440,
    mimeType: 'image/webp',
    quality: 0.88,
  },
]);

const jpegFallback = await processWorkImage(source, {
  decode: async () => ({
    source: decodedSource,
    width: 1200,
    height: 800,
    close: () => {},
  }),
  encode: async (input) => new Blob(['processed'], { type: input.mimeType }),
  supportsWebp: () => false,
});
assert.equal(jpegFallback.type, 'image/jpeg');
assert.equal(jpegFallback.name, 'web-image.jpg');

await assert.rejects(
  processWorkImage(source, {
    decode: async () => {
      throw new Error('decode_failed');
    },
    encode: async () => new Blob(),
    supportsWebp: () => true,
  }),
  /decode_failed/
);

await assert.rejects(
  processWorkImage(new File(['text'], 'notes.txt', { type: 'text/plain' })),
  /unsupported_image_type/
);

console.log('work image processing assertions passed');
