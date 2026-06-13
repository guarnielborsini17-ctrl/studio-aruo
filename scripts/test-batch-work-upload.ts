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

async function testBatchProcessesSequentiallyAndContinuesAfterFailure() {
  const stages: string[] = [];
  const uploadedNames: string[] = [];
  const active: string[] = [];

  const result = await uploadWorkBatch({
    files: [fakeFile('living-room.jpg'), fakeFile('broken.png'), fakeFile('bedroom.png')],
    title: '',
    description: 'Shared description',
    processImage: async (file) => {
      assert.equal(active.length, 0);
      active.push(file.name);
      stages.push(`${file.name}:processing`);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active.pop();
      if (file.name === 'broken.png') throw new Error('decode_failed');
      return { name: `processed-${file.name}` } as File;
    },
    uploadImage: async (file, onProgress) => {
      uploadedNames.push(file.name);
      onProgress?.(50);
      return { url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` };
    },
    createWork: async (input) => fakeWork(input),
    onProgress: (state) =>
      stages.push(`${state.current}:${state.stage}:${Math.round(state.percentage)}`),
  });

  assert.deepEqual(uploadedNames, ['processed-living-room.jpg', 'processed-bedroom.png']);
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0]?.fileName, 'broken.png');
  assert.equal(result.failed[0]?.reason, 'decode_failed');
  assert.equal(stages.includes('2:processing:0'), true);
  assert.equal(stages.includes('3:uploading:50'), true);
  assert.equal(stages.includes('3:saving:100'), true);
}

async function testSingleFileUsesManualTitle() {
  const result = await uploadWorkBatch({
    files: [fakeFile('manual-title-source.webp')],
    title: 'Manual Gallery Title',
    description: '',
    processImage: async (file) => file,
    uploadImage: async (file) => ({
      url: `https://blob.example/${file.name}`,
      pathname: `works/${file.name}`,
    }),
    createWork: async (input) => fakeWork(input),
  });

  assert.equal(result.succeeded[0]?.title, 'Manual Gallery Title');
}

async function testSaveFailureDoesNotStopRemainingFiles() {
  const attemptedTitles: string[] = [];

  const result = await uploadWorkBatch({
    files: [fakeFile('first.jpg'), fakeFile('second.jpg'), fakeFile('third.jpg')],
    title: '',
    description: '',
    processImage: async (file) => file,
    uploadImage: async (file) => ({
      url: `https://blob.example/${file.name}`,
      pathname: `works/${file.name}`,
    }),
    createWork: async (input) => {
      attemptedTitles.push(input.title);
      if (input.title === 'second') {
        throw new Error('database_unavailable');
      }
      return fakeWork(input);
    },
  });

  assert.deepEqual(attemptedTitles, ['first', 'second', 'third']);
  assert.equal(result.succeeded.length, 2);
  assert.deepEqual(result.failed, [{ fileName: 'second.jpg', reason: 'database_unavailable' }]);
}

await testBatchProcessesSequentiallyAndContinuesAfterFailure();
await testSingleFileUsesManualTitle();
await testSaveFailureDoesNotStopRemainingFiles();

console.log('batch work upload assertions passed');
