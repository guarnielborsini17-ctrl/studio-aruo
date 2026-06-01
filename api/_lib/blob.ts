import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

function isAllowedImagePath(pathname: string) {
  const lower = pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function createBlobUploadResponse(body: HandleUploadBody, userId: string) {
  return handleUpload({
    body,
    request: new Request('http://localhost/api/blob/upload-token', { method: 'POST' }),
    onBeforeGenerateToken: async (pathname) => {
      if (!isAllowedImagePath(pathname)) {
        throw new Error('Only image uploads are allowed');
      }

      return {
        allowedContentTypes: [...IMAGE_CONTENT_TYPES],
        tokenPayload: JSON.stringify({ userId }),
      };
    },
    onUploadCompleted: async () => {},
  });
}
