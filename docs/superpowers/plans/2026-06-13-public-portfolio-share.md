# Public Portfolio Share And Web Image Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each artist generate a revocable public portfolio link and ensure new 4K works are converted to web-sized display images before upload.

**Architecture:** Add share state to `users`, authenticated share-management endpoints, and one public aggregate endpoint that returns only profile, availability, work, and pricing fields. A dedicated hash route renders the aggregate without global navigation or account controls and dynamically applies `noindex`. The upload pipeline gains an injectable browser image processor and sequential stage-aware batch helper; only processed WebP/JPEG display files reach Vercel Blob.

**Tech Stack:** React 19, TypeScript, React Router HashRouter, Vercel Functions, Neon Postgres, Vercel Blob client upload, Canvas APIs, Node assertion scripts via `tsx`.

---

## File Structure

- Modify `api/_lib/db.ts`: migrate and map share fields.
- Create `api/_lib/shareToken.ts`: generate URL-safe cryptographic tokens and map share state.
- Create `api/share-link.ts`: authenticated get/generate/regenerate/disable operations.
- Create `api/public-portfolio.ts`: public token lookup and aggregate portfolio response.
- Modify `scripts/local-api-dev.ts`: expose share routes locally.
- Modify `src/types/platform.ts`: add share and public portfolio contracts.
- Modify `src/lib/platformApi.ts`: add share APIs and processed upload support.
- Create `src/lib/workImageProcessing.ts`: resize and encode one selected image.
- Modify `src/lib/batchWorkUpload.ts`: require processing, report stages, and remove inline/original fallback.
- Modify `src/pages/ArtistDashboard.tsx`: manage share link and show image processing/upload progress.
- Create `src/pages/PublicPortfolio.tsx`: public read-only single page with dynamic robots metadata.
- Modify `src/App.tsx`: add the share route and hide the normal shell on that route.
- Create `scripts/test-public-portfolio-share.ts`: verify token, API, route, and privacy wiring.
- Create `scripts/test-work-image-processing.ts`: verify dimensions, encoding arguments, safe naming, and no original fallback.
- Modify `scripts/test-batch-work-upload.ts`: verify processing stages and per-file continuation.
- Modify `docs/deployment.md`: add migration and public-link smoke checks.

### Task 1: Persist Share State And Generate Strong Tokens

**Files:**
- Modify: `api/_lib/db.ts`
- Create: `api/_lib/shareToken.ts`
- Modify: `src/types/platform.ts`
- Create: `scripts/test-public-portfolio-share.ts`

- [ ] **Step 1: Write failing token and mapping tests**

Create `scripts/test-public-portfolio-share.ts`:

```ts
import assert from 'node:assert/strict';
import { createShareToken, mapShareState } from '../api/_lib/shareToken';

const first = createShareToken();
const second = createShareToken();

assert.notEqual(first, second);
assert.match(first, /^[A-Za-z0-9_-]+$/);
assert.ok(first.length >= 22);

assert.deepEqual(
  mapShareState({
    share_token: first,
    share_enabled: true,
    share_updated_at: '2026-06-13T12:00:00.000Z',
  }),
  {
    token: first,
    enabled: true,
    updatedAt: '2026-06-13T12:00:00.000Z',
  }
);

console.log('public portfolio share assertions passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
```

Expected: FAIL because `api/_lib/shareToken.ts` does not exist.

- [ ] **Step 3: Add the database migration**

In `setupSchema()` in `api/_lib/db.ts`, after the existing `users` alterations, add:

```ts
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_updated_at TIMESTAMPTZ`;
```

Extend `UserRow`:

```ts
share_token?: string | null;
share_enabled?: boolean | null;
share_updated_at?: string | Date | null;
```

Do not add the token to `mapUser()`. Normal authenticated user responses do not need to expose the public credential.

- [ ] **Step 4: Implement token generation and share-state mapping**

Create `api/_lib/shareToken.ts`:

```ts
import crypto from 'node:crypto';

type ShareRow = {
  share_token?: string | null;
  share_enabled?: boolean | null;
  share_updated_at?: string | Date | null;
};

export function createShareToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function mapTimestamp(value: string | Date | null | undefined) {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}

export function mapShareState(row: ShareRow) {
  return {
    token: row.share_token || '',
    enabled: row.share_enabled ?? false,
    updatedAt: mapTimestamp(row.share_updated_at),
  };
}
```

Twenty-four random bytes provide 192 bits of entropy, exceeding the approved 128-bit minimum.

- [ ] **Step 5: Add frontend contracts**

In `src/types/platform.ts`, add:

```ts
export type ShareLinkState = {
  token: string;
  enabled: boolean;
  updatedAt: string;
  url: string;
};

export type PublicPortfolio = {
  artist: {
    displayName: string;
    avatarUrl: string;
    bio: string;
    pricingNote: string;
    isBusy: boolean;
    availableDate: string;
  };
  works: Array<Pick<Work, 'id' | 'title' | 'description' | 'imageUrl' | 'createdAt'>>;
  pricing: Array<Pick<PricingItem, 'id' | 'name' | 'description' | 'price' | 'unit' | 'sortOrder'>>;
};
```

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npm run lint
```

Expected: token assertions pass and TypeScript exits with code 0.

- [ ] **Step 7: Commit share persistence primitives**

```powershell
git add api/_lib/db.ts api/_lib/shareToken.ts src/types/platform.ts scripts/test-public-portfolio-share.ts
git commit -m "feat: persist public portfolio share state"
```

### Task 2: Add Authenticated Share-Link Management

**Files:**
- Create: `api/share-link.ts`
- Modify: `scripts/local-api-dev.ts`
- Modify: `scripts/test-public-portfolio-share.ts`

- [ ] **Step 1: Add failing handler wiring assertions**

Append to `scripts/test-public-portfolio-share.ts`:

```ts
import { readFile } from 'node:fs/promises';

const shareHandlerSource = await readFile('api/share-link.ts', 'utf8');
assert.equal(shareHandlerSource.includes("['GET', 'POST', 'DELETE']"), true);
assert.equal(shareHandlerSource.includes("requireRole(req, res, 'artist')"), true);
assert.equal(shareHandlerSource.includes('createShareToken()'), true);
assert.equal(shareHandlerSource.includes('share_enabled = false'), true);

const localAdapterSource = await readFile('scripts/local-api-dev.ts', 'utf8');
assert.equal(
  localAdapterSource.includes("route('get', '/api/share-link', 'api/share-link.ts')"),
  true
);
assert.equal(
  localAdapterSource.includes("route('post', '/api/share-link', 'api/share-link.ts')"),
  true
);
assert.equal(
  localAdapterSource.includes("route('delete', '/api/share-link', 'api/share-link.ts')"),
  true
);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
```

Expected: FAIL because `api/share-link.ts` is missing.

- [ ] **Step 3: Implement authenticated share management**

Create `api/share-link.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson } from './_lib/http';
import { createShareToken, mapShareState } from './_lib/shareToken';

function publicUrl(req: VercelRequest, token: string) {
  if (!token) return '';
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || req.headers.host || '';
  return host ? `${proto}://${host}/#/share/${encodeURIComponent(token)}` : `/#/share/${encodeURIComponent(token)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST', 'DELETE'])) {
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  const user = await requireRole(req, res, 'artist');
  if (!user) return;

  if (req.method === 'POST') {
    const token = createShareToken();
    const rows = await sql`
      UPDATE users
      SET share_token = ${token},
          share_enabled = true,
          share_updated_at = now(),
          updated_at = now()
      WHERE id = ${user.id}
      RETURNING share_token, share_enabled, share_updated_at
    `;
    const state = mapShareState(rows[0]);
    sendJson(res, 200, { ...state, url: publicUrl(req, state.token) });
    return;
  }

  if (req.method === 'DELETE') {
    const rows = await sql`
      UPDATE users
      SET share_enabled = false,
          share_updated_at = now(),
          updated_at = now()
      WHERE id = ${user.id}
      RETURNING share_token, share_enabled, share_updated_at
    `;
    const state = mapShareState(rows[0]);
    sendJson(res, 200, { ...state, url: publicUrl(req, state.token) });
    return;
  }

  const rows = await sql`
    SELECT share_token, share_enabled, share_updated_at
    FROM users
    WHERE id = ${user.id}
  `;
  const state = mapShareState(rows[0] || {});
  sendJson(res, 200, { ...state, url: publicUrl(req, state.token) });
}
```

`POST` intentionally always rotates the token. The dashboard labels it “生成” when no token exists and “重新生成” otherwise.

- [ ] **Step 4: Expose all methods in local development**

Add to `scripts/local-api-dev.ts`:

```ts
route('get', '/api/share-link', 'api/share-link.ts');
route('post', '/api/share-link', 'api/share-link.ts');
route('delete', '/api/share-link', 'api/share-link.ts');
```

- [ ] **Step 5: Run focused verification**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npm run lint
```

Expected: assertions and TypeScript pass.

- [ ] **Step 6: Commit share management**

```powershell
git add api/share-link.ts scripts/local-api-dev.ts scripts/test-public-portfolio-share.ts
git commit -m "feat: manage artist public share links"
```

### Task 3: Add The Public Portfolio Aggregate Endpoint

**Files:**
- Create: `api/public-portfolio.ts`
- Modify: `scripts/local-api-dev.ts`
- Modify: `scripts/test-public-portfolio-share.ts`

- [ ] **Step 1: Add failing privacy and route assertions**

Append to `scripts/test-public-portfolio-share.ts`:

```ts
const publicHandlerSource = await readFile('api/public-portfolio.ts', 'utf8');
assert.equal(publicHandlerSource.includes('share_enabled = true'), true);
assert.equal(publicHandlerSource.includes('password_hash'), false);
assert.equal(publicHandlerSource.includes('username'), false);
assert.equal(publicHandlerSource.includes('balance'), false);
assert.equal(publicHandlerSource.includes("error: 'portfolio_not_found'"), true);
assert.equal(
  localAdapterSource.includes(
    "route('get', '/api/public-portfolio', 'api/public-portfolio.ts')"
  ),
  true
);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
```

Expected: FAIL because the public endpoint is missing.

- [ ] **Step 3: Implement an allowlisted aggregate query**

Create `api/public-portfolio.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, sendJson, textValue } from './_lib/http';

function queryText(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

function dateOnly(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) return;

  res.setHeader('Cache-Control', 'no-store');
  const token = queryText(req.query.token);
  if (!token) {
    sendJson(res, 404, { error: 'portfolio_not_found' });
    return;
  }

  const artistRows = await sql`
    SELECT
      id,
      display_name,
      avatar_url,
      bio,
      pricing_note,
      is_busy,
      available_date
    FROM users
    WHERE share_token = ${token}
      AND share_enabled = true
      AND role = 'artist'
    LIMIT 1
  `;
  const artist = artistRows[0];
  if (!artist) {
    sendJson(res, 404, { error: 'portfolio_not_found' });
    return;
  }

  const [works, pricing] = await Promise.all([
    sql`
      SELECT id, title, description, image_url, created_at
      FROM works
      WHERE user_id = ${artist.id}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, name, description, price, unit, sort_order
      FROM pricing_items
      WHERE artist_id = ${artist.id}
      ORDER BY sort_order ASC
    `,
  ]);

  sendJson(res, 200, {
    artist: {
      displayName: artist.display_name,
      avatarUrl: artist.avatar_url || '',
      bio: artist.bio || '',
      pricingNote: artist.pricing_note || '',
      isBusy: artist.is_busy ?? true,
      availableDate: dateOnly(artist.available_date),
    },
    works: works.map((work) => ({
      id: work.id,
      title: work.title,
      description: work.description || '',
      imageUrl: work.image_url,
      createdAt: work.created_at || '',
    })),
    pricing: pricing.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price || 0),
      unit: item.unit || 'piece',
      sortOrder: Number(item.sort_order || 0),
    })),
  });
}
```

Keep the response as an explicit allowlist. Do not reuse `mapUser()` because it includes internal identifiers and the username.

- [ ] **Step 4: Expose the public route locally**

Add:

```ts
route('get', '/api/public-portfolio', 'api/public-portfolio.ts');
```

to `scripts/local-api-dev.ts`.

- [ ] **Step 5: Run focused verification**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npm run lint
```

Expected: all checks pass.

- [ ] **Step 6: Commit the public aggregate**

```powershell
git add api/public-portfolio.ts scripts/local-api-dev.ts scripts/test-public-portfolio-share.ts
git commit -m "feat: expose public artist portfolios"
```

### Task 4: Build Browser-Side Web Image Processing

**Files:**
- Create: `src/lib/workImageProcessing.ts`
- Modify: `src/lib/platformApi.ts`
- Create: `scripts/test-work-image-processing.ts`

- [ ] **Step 1: Write failing pure and injected-runtime tests**

Create `scripts/test-work-image-processing.ts`:

```ts
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
const calls: unknown[] = [];
const processed = await processWorkImage(source, {
  decode: async () => ({ source: {} as CanvasImageSource, width: 3840, height: 2160, close: () => {} }),
  encode: async (input) => {
    calls.push(input);
    return new Blob(['processed'], { type: input.mimeType });
  },
  supportsWebp: () => true,
});

assert.equal(processed.type, 'image/webp');
assert.equal(processed.name, 'web-image.webp');
assert.deepEqual(calls, [
  {
    source: {},
    width: 2560,
    height: 1440,
    mimeType: 'image/webp',
    quality: 0.88,
  },
]);

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

console.log('work image processing assertions passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-work-image-processing.ts
```

Expected: FAIL because `src/lib/workImageProcessing.ts` does not exist.

- [ ] **Step 3: Implement deterministic dimensions and safe naming**

Create `src/lib/workImageProcessing.ts` with:

```ts
const MAX_LONG_EDGE = 2560;
const OUTPUT_QUALITY = 0.88;

export function calculateDisplaySize(width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error('invalid_image_dimensions');
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function safeDisplayFileName(_originalName: string, extension: 'webp' | 'jpg') {
  return `web-image.${extension}`;
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

type EncodeInput = {
  source: CanvasImageSource;
  width: number;
  height: number;
  mimeType: 'image/webp' | 'image/jpeg';
  quality: number;
};

export type WorkImageRuntime = {
  decode: (file: File) => Promise<DecodedImage>;
  encode: (input: EncodeInput) => Promise<Blob>;
  supportsWebp: () => boolean;
};
```

- [ ] **Step 4: Implement the browser runtime**

In the same file, add:

```ts
async function decodeBrowserImage(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('image_encode_failed'))),
      mimeType,
      quality
    );
  });
}

async function encodeBrowserImage(input: EncodeInput) {
  const canvas = document.createElement('canvas');
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas_unavailable');
  context.drawImage(input.source, 0, 0, input.width, input.height);
  return canvasToBlob(canvas, input.mimeType, input.quality);
}

function browserSupportsWebp() {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

const browserRuntime: WorkImageRuntime = {
  decode: decodeBrowserImage,
  encode: encodeBrowserImage,
  supportsWebp: browserSupportsWebp,
};
```

- [ ] **Step 5: Implement processing without original fallback**

Add:

```ts
export async function processWorkImage(
  file: File,
  runtime: WorkImageRuntime = browserRuntime
) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('unsupported_image_type');
  }

  const decoded = await runtime.decode(file);
  try {
    const size = calculateDisplaySize(decoded.width, decoded.height);
    const useWebp = runtime.supportsWebp();
    const mimeType = useWebp ? 'image/webp' : 'image/jpeg';
    const extension = useWebp ? 'webp' : 'jpg';
    const blob = await runtime.encode({
      source: decoded.source,
      ...size,
      mimeType,
      quality: OUTPUT_QUALITY,
    });
    return new File([blob], safeDisplayFileName(file.name, extension), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    decoded.close();
  }
}
```

If decode or encode fails, allow the error to propagate. Never return the input file.

- [ ] **Step 6: Make Blob paths independent of original names**

In `src/lib/platformApi.ts`, change `uploadWorkImage()` to use:

```ts
const extension = file.type === 'image/webp' ? 'webp' : 'jpg';
const uniqueName =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const result = await upload(`works/${uniqueName}.${extension}`, file, {
```

Keep avatar upload behavior unchanged.

- [ ] **Step 7: Run processing and type tests**

Run:

```powershell
npx tsx scripts/test-work-image-processing.ts
npm run lint
```

Expected: processing assertions pass; TypeScript exits with code 0.

- [ ] **Step 8: Commit image processing**

```powershell
git add src/lib/workImageProcessing.ts src/lib/platformApi.ts scripts/test-work-image-processing.ts
git commit -m "feat: preprocess portfolio images for web"
```

### Task 5: Replace Batch Upload Fallback With Processing Stages

**Files:**
- Modify: `src/lib/batchWorkUpload.ts`
- Modify: `scripts/test-batch-work-upload.ts`
- Modify: `src/pages/ArtistDashboard.tsx`

- [ ] **Step 1: Rewrite the failing batch expectations**

Update `scripts/test-batch-work-upload.ts` so the primary test passes:

```ts
const stages: string[] = [];
const uploadedNames: string[] = [];

const result = await uploadWorkBatch({
  files: [fakeFile('living-room.jpg'), fakeFile('broken.png'), fakeFile('bedroom.png')],
  title: '',
  description: 'Shared description',
  processImage: async (file) => {
    stages.push(`${file.name}:processing`);
    if (file.name === 'broken.png') throw new Error('decode_failed');
    return { ...file, name: `processed-${file.name}` } as File;
  },
  uploadImage: async (file, onProgress) => {
    uploadedNames.push(file.name);
    onProgress?.(50);
    return { url: `https://blob.example/${file.name}`, pathname: `works/${file.name}` };
  },
  createWork: async (input) => fakeWork(input),
  onProgress: (state) => stages.push(`${state.current}:${state.stage}:${Math.round(state.percentage)}`),
});

assert.deepEqual(uploadedNames, ['processed-living-room.jpg', 'processed-bedroom.png']);
assert.equal(result.succeeded.length, 2);
assert.equal(result.failed.length, 1);
assert.equal(result.failed[0]?.fileName, 'broken.png');
assert.equal(stages.includes('2:processing:0'), true);
assert.equal(stages.includes('3:uploading:50'), true);
```

Remove all expectations for `createInlineImage` and `usedInlineFallback`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-batch-work-upload.ts
```

Expected: FAIL because the helper still uses the inline fallback contract.

- [ ] **Step 3: Change the batch contracts**

In `src/lib/batchWorkUpload.ts`, use:

```ts
export type BatchUploadStage = 'processing' | 'uploading' | 'saving';

export type BatchUploadProgress = {
  current: number;
  total: number;
  percentage: number;
  stage: BatchUploadStage;
  fileName: string;
};

export type BatchUploadOptions = {
  files: File[];
  title: string;
  description: string;
  processImage: (file: File) => Promise<File>;
  uploadImage: (file: File, onProgress?: (percentage: number) => void) => Promise<WorkImageUploadResult>;
  createWork: (input: WorkCreateInput) => Promise<Work>;
  onProgress?: (progress: BatchUploadProgress) => void;
};

export type BatchUploadResult = {
  succeeded: Work[];
  failed: Array<{ fileName: string; reason: string }>;
};
```

- [ ] **Step 4: Implement sequential processing, upload, and save**

Replace the loop body with:

```ts
const failed: Array<{ fileName: string; reason: string }> = [];

for (const [index, file] of options.files.entries()) {
  const current = index + 1;
  try {
    options.onProgress?.({
      current,
      total: options.files.length,
      percentage: 0,
      stage: 'processing',
      fileName: file.name,
    });
    const processed = await options.processImage(file);

    options.onProgress?.({
      current,
      total: options.files.length,
      percentage: 0,
      stage: 'uploading',
      fileName: file.name,
    });
    const image = await options.uploadImage(processed, (percentage) => {
      options.onProgress?.({
        current,
        total: options.files.length,
        percentage,
        stage: 'uploading',
        fileName: file.name,
      });
    });

    options.onProgress?.({
      current,
      total: options.files.length,
      percentage: 100,
      stage: 'saving',
      fileName: file.name,
    });
    succeeded.push(
      await options.createWork({
        title: getBatchWorkTitle(file, options.files.length, options.title),
        description: options.description.trim(),
        imageUrl: image.url,
        imagePath: image.pathname,
      })
    );
  } catch (error) {
    failed.push({
      fileName: file.name,
      reason: error instanceof Error ? error.message : 'upload_failed',
    });
  }
}

return { succeeded, failed };
```

- [ ] **Step 5: Connect processing and stage labels in the dashboard**

In `src/pages/ArtistDashboard.tsx`:

1. Import `processWorkImage`.
2. Replace `createInlineImage: createInlineImageDataUrl` with:

```ts
processImage: processWorkImage,
```

3. Track the stage:

```ts
const [uploadStage, setUploadStage] = useState('');
```

4. Map stages:

```ts
const stageLabels = {
  processing: '正在处理',
  uploading: '正在上传',
  saving: '正在保存',
} as const;
```

5. In `onProgress`, set the position, percentage, and `stageLabels[stage]`.
6. Replace the result summary with:

```ts
const summary = `${result.succeeded.length} 张上传成功${
  result.failed.length ? `，${result.failed.length} 张上传失败` : ''
}。`;
const failedNames = result.failed.map((item) => item.fileName).join('、');
setNotice(failedNames ? `${summary} 失败文件：${failedNames}` : summary);
```

7. During upload render:

```tsx
`${uploadStage} ${uploadPosition.current}/${uploadPosition.total} · ${Math.round(uploadProgress)}%`
```

Remove the import and use of `createInlineImageDataUrl` from this workflow. The helper may remain exported temporarily only if another caller still needs it; otherwise delete it and update its tests.

- [ ] **Step 6: Run focused and regression checks**

Run:

```powershell
npx tsx scripts/test-work-image-processing.ts
npx tsx scripts/test-batch-work-upload.ts
npx tsx scripts/test-work-image-validation.ts
npm run lint
npm run build
```

Expected: processing and batch tests pass; existing work-image validation still passes; Vite builds.

- [ ] **Step 7: Commit the new upload pipeline**

```powershell
git add src/lib/batchWorkUpload.ts src/pages/ArtistDashboard.tsx scripts/test-batch-work-upload.ts
git commit -m "feat: upload processed portfolio images sequentially"
```

### Task 6: Add Share APIs To The Frontend And Dashboard

**Files:**
- Modify: `src/lib/platformApi.ts`
- Modify: `src/pages/ArtistDashboard.tsx`
- Modify: `scripts/test-public-portfolio-share.ts`

- [ ] **Step 1: Add failing dashboard/API assertions**

Append to `scripts/test-public-portfolio-share.ts`:

```ts
const platformApiSource = await readFile('src/lib/platformApi.ts', 'utf8');
assert.equal(platformApiSource.includes("'/api/share-link'"), true);
assert.equal(platformApiSource.includes("'/api/public-portfolio?token="), true);

const dashboardSource = await readFile('src/pages/ArtistDashboard.tsx', 'utf8');
assert.equal(dashboardSource.includes('公开作品页'), true);
assert.equal(dashboardSource.includes('生成公开链接'), true);
assert.equal(dashboardSource.includes('复制链接'), true);
assert.equal(dashboardSource.includes('关闭分享'), true);
assert.equal(dashboardSource.includes('重新生成'), true);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
```

Expected: FAIL because the frontend share methods and controls are missing.

- [ ] **Step 3: Add frontend share API methods**

In `src/lib/platformApi.ts`, add:

```ts
export async function fetchShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'GET' });
}

export async function generateShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'POST' });
}

export async function disableShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'DELETE' });
}

export async function fetchPublicPortfolio(token: string): Promise<PublicPortfolio> {
  return platformRequest(
    `/api/public-portfolio?token=${encodeURIComponent(token)}`,
    { method: 'GET' }
  );
}
```

Import `ShareLinkState` and `PublicPortfolio`.

- [ ] **Step 4: Add dashboard state and actions**

In `src/pages/ArtistDashboard.tsx`, add:

```ts
const [share, setShare] = useState<ShareLinkState | null>(null);
const [shareBusy, setShareBusy] = useState(false);
```

Load `fetchShareLink()` with the existing works/pricing load. Add:

```ts
const generateShare = async () => {
  setShareBusy(true);
  try {
    setShare(await generateShareLink());
    setNotice(share?.token ? '已生成新的公开链接，旧链接已失效。' : '公开链接已生成。');
  } catch {
    setNotice('公开链接生成失败。');
  } finally {
    setShareBusy(false);
  }
};

const disableShare = async () => {
  setShareBusy(true);
  try {
    setShare(await disableShareLink());
    setNotice('公开作品页已关闭。');
  } catch {
    setNotice('关闭分享失败。');
  } finally {
    setShareBusy(false);
  }
};

const copyShare = async () => {
  if (!share?.url) return;
  try {
    await navigator.clipboard.writeText(share.url);
    setNotice('公开链接已复制。');
  } catch {
    setNotice('自动复制失败，请手动复制下面的链接。');
  }
};
```

- [ ] **Step 5: Add the share panel**

Add a card below “接单状态”:

```tsx
<div className="rounded-lg border border-glass-border bg-white/[0.035] p-5">
  <h3 className="mb-2 text-lg text-white">公开作品页</h3>
  <p className="mb-4 text-sm leading-relaxed text-text-secondary">
    生成后可发给设计师查看你的资料、作品和价格，不包含登录或工作台。
  </p>
  {share?.url ? (
    <input
      readOnly
      value={share.url}
      className="mb-3 w-full rounded-lg border border-glass-border bg-black/20 px-3 py-2 text-sm text-white"
    />
  ) : null}
  <div className="flex flex-wrap gap-2">
    {!share?.token ? (
      <button onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>
        生成公开链接
      </button>
    ) : (
      <>
        <button onClick={copyShare} disabled={!share.enabled} className={actionButtonClass}>复制链接</button>
        <button onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>重新生成</button>
        {share.enabled ? (
          <button onClick={disableShare} disabled={shareBusy} className={actionButtonClass}>关闭分享</button>
        ) : (
          <button onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>重新开启</button>
        )}
      </>
    )}
  </div>
</div>
```

“重新开启” generates a new token, so a previously disabled link does not silently become valid again.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npm run lint
npm run build
```

Expected: assertions pass and Vite builds.

- [ ] **Step 7: Commit dashboard sharing**

```powershell
git add src/lib/platformApi.ts src/pages/ArtistDashboard.tsx scripts/test-public-portfolio-share.ts
git commit -m "feat: manage public portfolio from dashboard"
```

### Task 7: Build The Navigation-Free Public Portfolio Page

**Files:**
- Create: `src/pages/PublicPortfolio.tsx`
- Modify: `src/App.tsx`
- Modify: `scripts/test-public-portfolio-share.ts`

- [ ] **Step 1: Add failing route, privacy, and shell assertions**

Append:

```ts
const publicPageSource = await readFile('src/pages/PublicPortfolio.tsx', 'utf8');
assert.equal(publicPageSource.includes("meta[name=\"robots\"]"), true);
assert.equal(publicPageSource.includes('noindex,nofollow,noarchive'), true);
assert.equal(publicPageSource.includes('登录'), false);
assert.equal(publicPageSource.includes('注册'), false);
assert.equal(publicPageSource.includes('工作台'), false);

const appSource = await readFile('src/App.tsx', 'utf8');
assert.equal(appSource.includes('path="/share/:token"'), true);
assert.equal(appSource.includes("location.pathname.startsWith('/share/')"), true);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
```

Expected: FAIL because the public page and route are missing.

- [ ] **Step 3: Implement dynamic robots metadata**

Create `src/pages/PublicPortfolio.tsx`. Add:

```ts
function useNoIndex() {
  useEffect(() => {
    const selector = 'meta[name="robots"]';
    let meta = document.head.querySelector<HTMLMetaElement>(selector);
    const existed = Boolean(meta);
    const previous = meta?.content || '';
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex,nofollow,noarchive';

    return () => {
      if (!meta) return;
      if (existed) meta.content = previous;
      else meta.remove();
    };
  }, []);
}
```

- [ ] **Step 4: Load and render only public data**

Use `useParams()` to read `token`, call `fetchPublicPortfolio(token)`, and render:

1. Avatar, display name, and bio.
2. Busy/available label and earliest date.
3. Works using a local read-only card layout or `WorkShowcaseCard`.
4. Pricing cards with the same Chinese unit labels used by `Pricing.tsx`.
5. `pricingNote` preserving line breaks.

Use these empty/error messages:

```tsx
该作品页暂未开放
暂未上传作品
暂未填写价格
```

Do not import `useAuth`, `Link`, or any dashboard action.

- [ ] **Step 5: Add a shell-aware route**

In `src/App.tsx`:

1. Import `PublicPortfolio`.
2. Add:

```tsx
<Route path="/share/:token" element={<PublicPortfolio />} />
```

3. Create an inner shell component under the router:

```tsx
function AppShell() {
  const location = useLocation();
  const isPublicShare = location.pathname.startsWith('/share/');

  return (
    <>
      <div className="fluid-bg" />
      {!isPublicShare ? <Navigation /> : null}
      <main className={isPublicShare ? 'min-h-screen' : 'min-h-screen pt-32 pb-16 px-6 md:px-12 lg:px-24'}>
        <AnimatedRoutes />
      </main>
    </>
  );
}
```

4. Replace the current router children with `<AppShell />`.

- [ ] **Step 6: Run automated verification**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npx tsx scripts/test-artist-only-v1.ts
npx tsx scripts/test-pricing-note-mapping.ts
npm run lint
npm run build
```

Expected: all assertions pass and Vite builds successfully.

- [ ] **Step 7: Apply the local schema migration**

With `dev:api` running:

```powershell
npx tsx -e "import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); const response = await fetch('http://127.0.0.1:3002/api/setup', { method: 'POST', headers: { 'X-Setup-Secret': process.env.SETUP_SECRET ?? '' } }); console.log(await response.text()); if (!response.ok) process.exit(1);"
```

Expected: `{ "ok": true }`.

- [ ] **Step 8: Verify the full share lifecycle in the in-app browser**

1. Log in at `http://127.0.0.1:3000/#/dashboard/artist`.
2. Generate a public link and copy it.
3. Open the link in a signed-out/private browser context.
4. Confirm profile, status, works, pricing, and pricing note appear.
5. Confirm normal navigation, login, registration, and dashboard controls do not appear.
6. Edit pricing or upload a work, refresh the same public link, and confirm it updates.
7. Disable sharing and confirm the old link displays `该作品页暂未开放`.
8. Generate a new link and confirm the old link remains unavailable.
9. Inspect `<meta name="robots">` and confirm `noindex,nofollow,noarchive`.
10. Check desktop and mobile viewports for image overflow, clipped prices, and overlapping text.

- [ ] **Step 9: Commit the public page**

```powershell
git add src/pages/PublicPortfolio.tsx src/App.tsx scripts/test-public-portfolio-share.ts
git commit -m "feat: render navigation-free public portfolios"
```

### Task 8: Browser-Test Typical 4K Uploads And Document Deployment

**Files:**
- Modify: `docs/deployment.md`

- [ ] **Step 1: Create local 4K test fixtures**

Use browser-generated canvas fixtures rather than committing large binaries:

```js
const canvas = document.createElement('canvas');
canvas.width = 3840;
canvas.height = 2160;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#182130';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#ffffff';
ctx.font = '160px sans-serif';
ctx.fillText('Studio Aruo 4K Test', 240, 420);
canvas.toBlob((blob) => {
  const file = new File([blob], 'studio-aruo-4k-test.png', { type: 'image/png' });
  window.__studioAruoTestFile = file;
}, 'image/png');
```

Use the in-app browser file injection capability or save the generated Blob to a temporary file outside the repository.

- [ ] **Step 2: Verify processing and sequential behavior**

At the artist dashboard:

1. Select a 3840×2160 PNG, a portrait 2160×3840 JPEG, and one invalid image file.
2. Confirm the label progresses through `正在处理`, `正在上传`, and `正在保存`.
3. Confirm the invalid file fails while later valid files continue.
4. Confirm the final notice lists the failed filename.
5. Fetch the uploaded Blob images and inspect `naturalWidth`/`naturalHeight`.
6. Confirm neither valid image has a long edge above 2560.
7. Confirm the uploaded content type is `image/webp`, or `image/jpeg` only in a browser that cannot encode WebP.
8. Confirm no new `data:image/...` work row is created.

- [ ] **Step 3: Add deployment migration and smoke instructions**

In `docs/deployment.md`, add:

```text
After deploying this version, call POST /api/setup once to add the share columns.
Generate a public link from the artist dashboard and open it while signed out.
Upload a 4K image and confirm the saved display image has a maximum long edge of 2560 pixels.
Disable and regenerate the link; verify both old-link invalidation paths.
```

- [ ] **Step 4: Run the complete regression suite**

Run:

```powershell
npx tsx scripts/test-public-portfolio-share.ts
npx tsx scripts/test-work-image-processing.ts
npx tsx scripts/test-batch-work-upload.ts
npx tsx scripts/test-work-image-validation.ts
npx tsx scripts/test-artist-availability-status.ts
npx tsx scripts/test-pricing-note-mapping.ts
npx tsx scripts/test-artist-only-v1.ts
npx tsx scripts/test-hidden-chicken-leg-ui.ts
npm run lint
npm run build
git diff --check
git status --short
```

Expected: every test passes; Vite builds; only intentional changes and the two unrelated pre-existing untracked plan files appear.

- [ ] **Step 5: Commit deployment documentation**

```powershell
git add docs/deployment.md
git commit -m "docs: verify public portfolio deployment"
```

- [ ] **Step 6: Deploy and verify production**

Push the completed commits to the Vercel-connected branch, wait for the deployment to finish, call `/api/setup` with `X-Setup-Secret`, and repeat:

1. Generate/copy/open public link while signed out.
2. Update profile/pricing/work and refresh the same link.
3. Disable link and confirm 404-backed unavailable state.
4. Regenerate and confirm only the new link works.
5. Upload a typical 4K render and confirm the portfolio loads the processed display image.
