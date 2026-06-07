# Batch Work Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow artists to select multiple images and upload them sequentially while preserving single-image title behavior and reporting partial failures.

**Architecture:** Add a focused batch-upload helper that owns title selection, sequential execution, Blob fallback, and result aggregation. `ArtistDashboard` will own only UI state, pass the existing upload/create functions into the helper, and render selection and progress feedback.

**Tech Stack:** React 19, TypeScript, Vite, existing Vercel Blob and works API helpers, Node assert scripts via `tsx`.

---

### Task 1: Batch Upload Logic

**Files:**
- Create: `src/lib/batchWorkUpload.ts`
- Create: `scripts/test-batch-work-upload.ts`

- [ ] **Step 1: Write the failing behavior test**

Create `scripts/test-batch-work-upload.ts` with assertions that:

```ts
import assert from 'node:assert/strict';
import { uploadWorkBatch } from '../src/lib/batchWorkUpload';

const files = [
  { name: 'living-room.jpg' },
  { name: 'bedroom.png' },
] as File[];
const createdTitles: string[] = [];

const result = await uploadWorkBatch({
  files,
  title: 'Ignored for a batch',
  description: 'Shared description',
  uploadImage: async (file) => {
    if (file.name === 'bedroom.png') throw new Error('blob unavailable');
    return { url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` };
  },
  createInlineImage: async (file) => `data:image/jpeg;base64,${file.name}`,
  createWork: async (input) => {
    createdTitles.push(input.title);
    return { id: input.title, ...input } as never;
  },
});

assert.deepEqual(createdTitles, ['living-room', 'bedroom']);
assert.equal(result.succeeded.length, 2);
assert.equal(result.usedInlineFallback, true);
```

Also assert that a one-file batch uses the provided title and that a failed `createWork` increments `failed` while the next file still runs.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd tsx scripts\test-batch-work-upload.ts`

Expected: FAIL because `src/lib/batchWorkUpload.ts` does not exist.

- [ ] **Step 3: Implement the minimal sequential helper**

Create `src/lib/batchWorkUpload.ts` with:

```ts
export async function uploadWorkBatch(options: BatchUploadOptions): Promise<BatchUploadResult> {
  const succeeded: Work[] = [];
  let failed = 0;
  let usedInlineFallback = false;

  for (const [index, file] of options.files.entries()) {
    options.onProgress?.({ current: index + 1, total: options.files.length, percentage: 0 });
    try {
      let image;
      try {
        image = await options.uploadImage(file, (percentage) =>
          options.onProgress?.({ current: index + 1, total: options.files.length, percentage })
        );
      } catch {
        image = {
          url: await options.createInlineImage(file),
          pathname: `inline:${Date.now()}-${file.name}`,
        };
        usedInlineFallback = true;
      }

      succeeded.push(
        await options.createWork({
          title: getWorkTitle(file, options.files.length, options.title),
          description: options.description.trim(),
          imageUrl: image.url,
          imagePath: image.pathname,
        })
      );
    } catch {
      failed += 1;
    }
  }

  return { succeeded, failed, usedInlineFallback };
}
```

Define the exact dependency types in the same file and derive titles by stripping only the final file extension.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx.cmd tsx scripts\test-batch-work-upload.ts`

Expected: `batch work upload assertions passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/batchWorkUpload.ts scripts/test-batch-work-upload.ts
git commit -m "feat: add sequential work batch uploader"
```

### Task 2: Artist Dashboard Batch UI

**Files:**
- Modify: `src/pages/ArtistDashboard.tsx`

- [ ] **Step 1: Replace single-file state**

Replace `workFile: File | null` with `workFiles: File[]`, and add current batch position state:

```ts
const [workFiles, setWorkFiles] = useState<File[]>([]);
const [uploadPosition, setUploadPosition] = useState({ current: 0, total: 0 });
```

- [ ] **Step 2: Connect the batch helper**

Call `uploadWorkBatch` with the existing `uploadWorkImage`, `createInlineImageDataUrl`, and `createWork` functions. Prepend all successful works to the work list, clear the selected files after processing, and display:

```ts
`${result.succeeded.length} 张上传成功`
`${result.failed} 张上传失败`
```

Include the local storage note when `usedInlineFallback` is true.

- [ ] **Step 3: Update file selection and progress UI**

Set `multiple` on the work file input and store `Array.from(event.target.files || [])`. Disable selection while uploading. Render one filename for a single selection, otherwise render `已选择 N 张`. During upload render `正在上传 current/total · percentage%`.

- [ ] **Step 4: Run static verification**

Run: `npm.cmd run lint`

Expected: TypeScript exits with code 0.

Run: `npm.cmd run build`

Expected: Vite production build exits with code 0.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/ArtistDashboard.tsx
git commit -m "feat: support batch work selection"
```

### Task 3: Browser Verification

**Files:**
- No production file changes expected.

- [ ] **Step 1: Verify multi-file selection**

Use Playwright against `http://127.0.0.1:3000/#/dashboard/artist`, log in with a temporary artist account if needed, select two generated image files through the hidden input, and assert the UI contains `已选择 2 张`.

- [ ] **Step 2: Verify batch completion**

Click `上传作品`, wait for completion, and assert both generated titles appear in the artist work list and the public `/api/works` response.

- [ ] **Step 3: Clean test data**

Delete the two generated works through `DELETE /api/works/:id` and remove the temporary artist account from Neon.

- [ ] **Step 4: Run final verification**

Run:

```powershell
npx.cmd tsx scripts\test-batch-work-upload.ts
npx.cmd tsx --env-file=.env.local scripts\test-work-image-validation.ts
npm.cmd run lint
npm.cmd run build
git status --short
```

Expected: all checks pass and only intentional files are committed.
