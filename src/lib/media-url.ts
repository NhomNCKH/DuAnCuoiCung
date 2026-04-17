import { apiClient } from '@/lib/api-client';

export async function getSignedMediaUrl(
  s3Key: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!s3Key) return null;

  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await apiClient.media.getPresignedGetUrl({
        s3Key,
        expiresInSeconds,
      });
      return response.data?.signedGetUrl ?? null;
    } catch (error: any) {
      attempt += 1;

      const status = Number(error?.statusCode ?? error?.status ?? 0);
      const isThrottled = status === 429;

      if (!isThrottled || attempt >= maxAttempts) {
        return null;
      }

      const backoffMs = 250 * Math.pow(2, attempt - 1); // 250, 500, 1000
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  return null;
}
