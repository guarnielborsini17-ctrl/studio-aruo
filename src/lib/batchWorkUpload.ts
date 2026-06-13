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

      const work = await options.createWork({
        title: getBatchWorkTitle(file, options.files.length, options.title),
        description: options.description.trim(),
        imageUrl: image.url,
        imagePath: image.pathname,
      });

      succeeded.push(work);
    } catch (error) {
      failed.push({
        fileName: file.name,
        reason: error instanceof Error ? error.message : 'upload_failed',
      });
    }
  }

  return { succeeded, failed };
}
