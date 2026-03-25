// ============================================================
// Centralized API client - aligned với ToeicBoost_BE
// Base URL: /api/v1  |  Auth prefix: /auth
// ============================================================
import type {
  ApiResponse,
  LoginData,
  RegisterData,
  RefreshTokenData,
  LoginApiResponse,
  RegisterApiResponse,
  RefreshApiResponse,
  LogoutApiResponse,
  MeApiResponse,
} from '@/types/api';
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthSession,
} from '@/lib/auth-session';

// Chọn base URL theo env
function getBaseURL(): string {
  // Ưu tiên biến môi trường NEXT_PUBLIC_API_BASE_URL
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // Mặc định kết nối server nếu không có cấu hình khác
  return 'http://144.91.104.237:3001/api/v1';
}

function getHealthURL(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://144.91.104.237:3001';
  return `${base}/health`;
}

class ApiClient {
  readonly baseURL = getBaseURL();
  private healthURL = getHealthURL();
  private refreshPromise: Promise<boolean> | null = null;

  private getAuthHeaders(): Record<string, string> {
    const token = getStoredAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthSession();
        return false;
      }

      const data = await response.json();
      const tokens = data?.data?.data || data?.data || data;

      if (!tokens?.accessToken || !tokens?.refreshToken) {
        clearAuthSession();
        return false;
      }

      persistAuthSession(tokens);
      return true;
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const isRefreshRequest = endpoint === '/auth/refresh';
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers ?? {}),
    };

    const execute = () =>
      fetch(url, {
        ...options,
        headers,
      });

    let response = await execute();

    if (response.status === 401 && !isRefreshRequest) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...(options.headers ?? {}),
          },
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw {
        statusCode: response.status,
        message: data?.message || 'Request failed',
        error: data?.error,
        ...data,
      };
    }

    return data as T;
  }

  // ---- Health ----
  async health() {
    const res = await fetch(this.healthURL);
    return res.json();
  }

  // ---- Auth endpoints (/auth/*) ----
  auth = {
    register: (data: RegisterData): Promise<RegisterApiResponse> =>
      this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: LoginData): Promise<LoginApiResponse> =>
      this.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    refreshToken: (data: RefreshTokenData): Promise<RefreshApiResponse> =>
      this.request('/auth/refresh', { method: 'POST', body: JSON.stringify(data) }),

    logout: (data: RefreshTokenData): Promise<LogoutApiResponse> =>
      this.request('/auth/logout', { method: 'POST', body: JSON.stringify(data) }),

    getMe: (): Promise<MeApiResponse> =>
      this.request('/auth/me', { method: 'GET' }),

    /**
     * POST /auth/me/avatar  (multipart/form-data)
     * Upload file ảnh trực tiếp, BE tự upload lên S3 và cập nhật DB
     */
    uploadAvatar: (file: File): Promise<ApiResponse<{ avatarUrl: string; s3Key: string }>> => {
      const token = getStoredAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${this.baseURL}/auth/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw { statusCode: res.status, message: data?.message || 'Upload failed', ...data };
        return data;
      });
    },

    /**
     * GET /auth/me/avatar
     * Lấy avatarUrl hiện tại của user
     */
    getAvatar: (): Promise<ApiResponse<{ avatarUrl: string | null; s3Key: string | null }>> =>
      this.request('/auth/me/avatar', { method: 'GET' }),

    /**
     * POST /auth/me/avatar/s3
     * Gắn avatar từ s3Key đã upload trước bằng presigned URL
     */
    attachAvatarFromS3: (s3Key: string): Promise<ApiResponse> =>
      this.request('/auth/me/avatar/s3', { method: 'POST', body: JSON.stringify({ s3Key }) }),
  };

  // ---- Media endpoints (/media/*) ----
  media = {
    /**
     * POST /media/upload
     * Tạo presigned PUT URL để FE upload file trực tiếp lên S3
     * Returns: { signedPutUrl, s3Key }
     */
    getPresignedUploadUrl: (data: {
      fileName: string;
      contentType: string;
      category?: string;
      expiresInSeconds?: number;
    }): Promise<ApiResponse<{ signedPutUrl: string; s3Key: string }>> =>
      this.request('/media/upload', { method: 'POST', body: JSON.stringify(data) }),

    /**
     * POST /media/presign-get
     * Tạo presigned GET URL để xem file
     * Returns: { signedGetUrl }
     */
    getPresignedGetUrl: (data: {
      s3Key: string;
      expiresInSeconds?: number;
    }): Promise<ApiResponse<{ signedGetUrl: string }>> =>
      this.request('/media/presign-get', { method: 'POST', body: JSON.stringify(data) }),
  };

  // ---- Admin: Question Bank (/admin/question-groups, /admin/tags) ----
  admin = {
    questionBank: {
      // Tags
      listTags: (): Promise<ApiResponse> =>
        this.request('/admin/tags', { method: 'GET' }),

      createTag: (data: { category: string; code: string; label: string; description?: string }): Promise<ApiResponse> =>
        this.request('/admin/tags', { method: 'POST', body: JSON.stringify(data) }),

      updateTag: (id: string, data: { category?: string; code?: string; label?: string; description?: string }): Promise<ApiResponse> =>
        this.request(`/admin/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteTag: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/tags/${id}`, { method: 'DELETE' }),

      // Question Groups
      listQuestionGroups: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        part?: string;
      }): Promise<ApiResponse> => {
        const qs = params
          ? '?' + new URLSearchParams(
              Object.fromEntries(
                Object.entries(params)
                  .filter(([, v]) => v !== undefined && v !== '')
                  .map(([k, v]) => [k, String(v)])
              )
            ).toString()
          : '';
        return this.request(`/admin/question-groups${qs}`, { method: 'GET' });
      },

      createQuestionGroup: (data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request('/admin/question-groups', { method: 'POST', body: JSON.stringify(data) }),

      getQuestionGroup: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}`, { method: 'GET' }),

      updateQuestionGroup: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteQuestionGroup: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}`, { method: 'DELETE' }),

      submitReview: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/submit-review`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      approve: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/approve`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      reject: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/reject`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      publish: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/publish`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      archive: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/archive`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      bulkTag: (questionGroupIds: string[], tagCodes: string[]): Promise<ApiResponse> =>
        this.request('/admin/question-groups/bulk-tag', { method: 'POST', body: JSON.stringify({ questionGroupIds, tagCodes }) }),

      bulkStatus: (questionGroupIds: string[], status: string): Promise<ApiResponse> =>
        this.request('/admin/question-groups/bulk-status', { method: 'POST', body: JSON.stringify({ questionGroupIds, status }) }),

      presignImport: (data: { contentType: string; fileName?: string }): Promise<ApiResponse> =>
        this.request('/admin/question-groups/import/presign', { method: 'POST', body: JSON.stringify(data) }),

      previewImport: (groups: unknown[]): Promise<ApiResponse> =>
        this.request('/admin/question-groups/import/preview', { method: 'POST', body: JSON.stringify({ groups }) }),

      commitImport: (groups: unknown[], sourceFileName?: string): Promise<ApiResponse> =>
        this.request('/admin/question-groups/import/commit', { method: 'POST', body: JSON.stringify({ groups, sourceFileName }) }),

      presignAsset: (id: string, data: { kind: string; contentType: string; fileName?: string }): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets/presign`, { method: 'POST', body: JSON.stringify(data) }),

      attachAsset: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets`, { method: 'POST', body: JSON.stringify(data) }),

      deleteAsset: (id: string, assetId: string): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets/${assetId}`, { method: 'DELETE' }),
    },

    // ---- Admin: Exam Templates (/admin/exam-templates) ----
    examTemplate: {
      list: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        type?: string;
      }): Promise<ApiResponse> => {
        const qs = params
          ? '?' + new URLSearchParams(
              Object.fromEntries(
                Object.entries(params)
                  .filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
                  .map(([k, v]) => [k, String(v)])
              )
            ).toString()
          : '';
        return this.request(`/admin/exam-templates${qs}`, { method: 'GET' });
      },

      create: (data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request('/admin/exam-templates', { method: 'POST', body: JSON.stringify(data) }),

      get: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}`, { method: 'GET' }),

      update: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      delete: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}`, { method: 'DELETE' }),

      replaceSections: (id: string, sections: unknown[]): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/sections`, { method: 'PUT', body: JSON.stringify({ sections }) }),

      replaceRules: (id: string, rules: unknown[]): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/rules`, { method: 'PUT', body: JSON.stringify({ rules }) }),

      addManualItems: (id: string, items: unknown[]): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/items/manual`, { method: 'POST', body: JSON.stringify({ items }) }),

      reorderItems: (id: string, items: { itemId: string; order: number }[]): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/items/reorder`, { method: 'PATCH', body: JSON.stringify({ items }) }),

      deleteItem: (id: string, itemId: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/items/${itemId}`, { method: 'DELETE' }),

      autoFillItems: (id: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/items/auto-fill`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      validate: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/validate`, { method: 'POST' }),

      preview: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/preview`, { method: 'GET' }),

      publish: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/publish`, { method: 'POST' }),

      archive: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/archive`, { method: 'POST' }),

      duplicate: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/exam-templates/${id}/duplicate`, { method: 'POST' }),
    },

    // ---- Admin: RBAC (/admin/rbac/*) - chỉ SUPERADMIN ----
    rbac: {
      listRoles: (): Promise<ApiResponse> =>
        this.request('/admin/rbac/roles', { method: 'GET' }),

      createRole: (data: { name: string; description?: string }): Promise<ApiResponse> =>
        this.request('/admin/rbac/roles', { method: 'POST', body: JSON.stringify(data) }),

      updateRole: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/rbac/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteRole: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/rbac/roles/${id}`, { method: 'DELETE' }),

      listPermissions: (): Promise<ApiResponse> =>
        this.request('/admin/rbac/permissions', { method: 'GET' }),

      createPermission: (data: { name: string; description?: string }): Promise<ApiResponse> =>
        this.request('/admin/rbac/permissions', { method: 'POST', body: JSON.stringify(data) }),

      updatePermission: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/rbac/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deletePermission: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/rbac/permissions/${id}`, { method: 'DELETE' }),

      listUsers: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        status?: string;
      }): Promise<ApiResponse> => {
        const qs = params
          ? '?' + new URLSearchParams(
              Object.fromEntries(
                Object.entries(params)
                  .filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
                  .map(([k, v]) => [k, String(v)])
              )
            ).toString()
          : '';
        return this.request(`/admin/rbac/users${qs}`, { method: 'GET' });
      },

      replaceUserRoles: (userId: string, roles: string[]): Promise<ApiResponse> =>
        this.request(`/admin/rbac/users/${userId}/roles`, { method: 'PATCH', body: JSON.stringify({ roles }) }),
    },
  };

  // ---- Learner: Exam Attempts (/learner/exam-attempts) ----
  learner = {
    // Published exam templates visible to students
    listPublishedTemplates: (params?: { mode?: string }): Promise<ApiResponse> => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)])
            )
          ).toString()
        : '';
      return this.request(`/learner/exam-templates${qs}`, { method: 'GET' });
    },

    examAttempt: {
      start: (data: { examTemplateId: string; mode?: string }): Promise<ApiResponse> =>
        this.request('/learner/exam-attempts', { method: 'POST', body: JSON.stringify(data) }),

      saveAnswers: (
        attemptId: string,
        data: {
          answers: {
            questionId: string;
            selectedOptionKey?: string | null;
            answeredAt?: string;
            timeSpentSec?: number | null;
            answerPayload?: Record<string, unknown>;
          }[];
        },
      ): Promise<ApiResponse> =>
        this.request(`/learner/exam-attempts/${attemptId}/answers`, { method: 'PUT', body: JSON.stringify(data) }),

      submit: (attemptId: string, data?: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/learner/exam-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      getResult: (attemptId: string): Promise<ApiResponse> =>
        this.request(`/learner/exam-attempts/${attemptId}/result`, { method: 'GET' }),
    },
  };
}

export const apiClient = new ApiClient();

// backward compat
export const api = apiClient;
