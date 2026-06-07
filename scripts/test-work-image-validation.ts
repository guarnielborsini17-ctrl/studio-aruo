import assert from 'node:assert/strict';
import { isAcceptedWorkImageInput } from '../api/works/index';

function run() {
  assert.equal(
    isAcceptedWorkImageInput('https://store.public.blob.vercel-storage.com/works/demo.png'),
    true,
    'public blob URLs should be accepted'
  );

  assert.equal(
    isAcceptedWorkImageInput('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'),
    true,
    'inline image data URLs should be accepted for local fallback uploads'
  );

  assert.equal(
    isAcceptedWorkImageInput('https://example.com/image.png'),
    false,
    'non-blob remote URLs should be rejected'
  );
}

run();
console.log('work image validation assertions passed');
