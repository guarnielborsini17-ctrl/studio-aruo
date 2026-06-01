import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest } from '@vercel/node';
import type { IncomingMessage } from 'node:http';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAXIMUM_SIZE_IN_BYTES = 8 * 1024 * 1024;

function isAllowedImagePath(pathname: string) {
  const lower = pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function createBlobUploadResponse(
  body: HandleUploadBody,
  userId: string,
  request: VercelRequest | IncomingMessage
) {
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!isAllowedImagePath(pathname)) {
        throw new Error('Only image uploads are allowed');
      }

      return {
        allowedContentTypes: [...IMAGE_CONTENT_TYPES],
        maximumSizeInBytes: MAXIMUM_SIZE_IN_BYTES,
        tokenPayload: JSON.stringify({ userId }),
      };
    },
    onUploadCompleted: async () => {},
  });
}
