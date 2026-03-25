import { apiClient } from '@/lib/api-client';

export async function getSignedMediaUrl(
  s3Key: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!s3Key) return null;

  try {
    const response = await apiClient.media.getPresignedGetUrl({
      s3Key,
      expiresInSeconds,
    });
    return response.data?.signedGetUrl ?? null;
  } catch {
    return null;
  }
}
