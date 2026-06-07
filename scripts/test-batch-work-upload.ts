import assert from 'node:assert/strict';
import { uploadWorkBatch } from '../src/lib/batchWorkUpload';
import type { Work } from '../src/types/platform';

function fakeFile(name: string) {
  return { name } as File;
}

function fakeWork(input: { title: string; description?: string; imageUrl: string; imagePath?: string }): Work {
  return {
    id: input.title,
    userId: 'artist-1',
    title: input.title,
    description: input.description || '',
    imageUrl: input.imageUrl,
    imagePath: input.imagePath || '',
    createdAt: '',
    updatedAt: '',
  };
}

async function testBatchUsesFileNamesAndContinuesThroughBlobFallback() {
  const createdTitles: string[] = [];
  const progress: string[] = [];

  const result = await uploadWorkBatch({
    files: [fakeFile('living-room.jpg'), fakeFile('bedroom.png')],
    title: 'Ignored for a batch',
    description: 'Shared description',
    uploadImage: async (file, onProgress) => {
      onProgress?.(40);
      if (file.name === 'bedroom.png') {
        throw new Error('blob unavailable');
      }
      return { url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` };
    },
    createInlineImage: async (file) => `data:image/jpeg;base64,${file.name}`,
    createWork: async (input) => {
      createdTitles.push(input.title);
      return fakeWork(input);
    },
    onProgress: (state) => progress.push(`${state.current}/${state.total}:${Math.round(state.percentage)}`),
  });

  assert.deepEqual(createdTitles, ['living-room', 'bedroom']);
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.usedInlineFallback, true);
  assert.ok(progress.includes('1/2:40'));
  assert.ok(progress.includes('2/2:0'));
}

async function testSingleFileUsesManualTitle() {
  const result = await uploadWorkBatch({
    files: [fakeFile('manual-title-source.webp')],
    title: 'Manual Gallery Title',
    description: '',
    uploadImage: async (file) => ({ url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` }),
    createInlineImage: async (file) => `data:image/jpeg;base64,${file.name}`,
    createWork: async (input) => fakeWork(input),
  });

  assert.equal(result.succeeded[0]?.title, 'Manual Gallery Title');
}

async function testCreateFailureDoesNotStopRemainingFiles() {
  const attemptedTitles: string[] = [];

  const result = await uploadWorkBatch({
    files: [fakeFile('first.jpg'), fakeFile('second.jpg'), fakeFile('third.jpg')],
    title: '',
    description: '',
    uploadImage: async (file) => ({ url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` }),
    createInlineImage: async (file) => `data:image/jpeg;base64,${file.name}`,
    createWork: async (input) => {
      attemptedTitles.push(input.title);
      if (input.title === 'second') {
        throw new Error('database unavailable');
      }
      return fakeWork(input);
    },
  });

  assert.deepEqual(attemptedTitles, ['first', 'second', 'third']);
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed, 1);
}

await testBatchUsesFileNamesAndContinuesThroughBlobFallback();
await testSingleFileUsesManualTitle();
await testCreateFailureDoesNotStopRemainingFiles();

console.log('batch work upload assertions passed');
