import type { Work } from '../types/platform';

export type WorkImageUploadResult = {
  url: string;
  pathname: string;
};

export type WorkCreateInput = {
  title: string;
  description: string;
  imageUrl: string;
  imagePath: string;
};

export type BatchUploadProgress = {
  current: number;
  total: number;
  percentage: number;
};

export type BatchUploadOptions = {
  files: File[];
  title: string;
  description: string;
  uploadImage: (file: File, onProgress?: (percentage: number) => void) => Promise<WorkImageUploadResult>;
  createInlineImage: (file: File) => Promise<string>;
  createWork: (input: WorkCreateInput) => Promise<Work>;
  onProgress?: (progress: BatchUploadProgress) => void;
};

export type BatchUploadResult = {
  succeeded: Work[];
  failed: number;
  usedInlineFallback: boolean;
};

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim() || '未命名作品';
}

export function getBatchWorkTitle(file: File, fileCount: number, manualTitle: string) {
  if (fileCount === 1 && manualTitle.trim()) {
    return manualTitle.trim();
  }

  return titleFromFileName(file.name);
}

export async function uploadWorkBatch(options: BatchUploadOptions): Promise<BatchUploadResult> {
  const succeeded: Work[] = [];
  let failed = 0;
  let usedInlineFallback = false;

  for (const [index, file] of options.files.entries()) {
    const current = index + 1;
    options.onProgress?.({ current, total: options.files.length, percentage: 0 });

    try {
      let image: WorkImageUploadResult;

      try {
        image = await options.uploadImage(file, (percentage) => {
          options.onProgress?.({ current, total: options.files.length, percentage });
        });
      } catch {
        image = {
          url: await options.createInlineImage(file),
          pathname: `inline:${Date.now()}-${file.name}`,
        };
        usedInlineFallback = true;
      }

      const work = await options.createWork({
        title: getBatchWorkTitle(file, options.files.length, options.title),
        description: options.description.trim(),
        imageUrl: image.url,
        imagePath: image.pathname,
      });

      succeeded.push(work);
    } catch {
      failed += 1;
    }
  }

  return { succeeded, failed, usedInlineFallback };
}
