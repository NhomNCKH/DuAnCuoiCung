// src/hooks/useAvatarUpload.ts
import { useState } from 'react';
import { api } from '@/services/api';

export const useAvatarUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Bước 1: Lấy pre-signed URL để upload
      const fileName = `avatars/${userId}/${Date.now()}_${file.name}`;
      const presignedRes = await api.media.getPresignedUploadUrl({
        fileName,
        fileType: file.type
      });

      if (presignedRes.statusCode !== 200) {
        throw new Error(presignedRes.message || 'Không thể lấy pre-signed URL');
      }

      setProgress(30);

      // Bước 2: Upload trực tiếp lên S3
      const uploadRes = await fetch(presignedRes.data.url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Upload lên S3 thất bại');
      }

      setProgress(80);

      // Bước 3: Xác nhận với backend
      const confirmRes = await api.auth.confirmAvatarUpload({
        s3Key: presignedRes.data.key || fileName
      });

      if (confirmRes.statusCode !== 200) {
        throw new Error(confirmRes.message || 'Xác nhận upload thất bại');
      }

      setProgress(100);

      // Trả về avatar URL (có thể là presigned URL hoặc public URL)
      return confirmRes.data?.avatarUrl || null;
      
    } catch (err: any) {
      setError(err.message || 'Upload avatar thất bại');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadAvatar, uploading, progress, error };
};