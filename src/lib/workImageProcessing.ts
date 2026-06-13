const MAX_LONG_EDGE = 2560;
const OUTPUT_QUALITY = 0.88;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function calculateDisplaySize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('invalid_image_dimensions');
  }

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

async function decodeBrowserImage(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
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

export async function processWorkImage(
  file: File,
  runtime: WorkImageRuntime = browserRuntime
) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
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
