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
import type {
  LearnerAttemptResultData,
  LearnerAttemptSessionData,
  LearnerExamAttemptHistoryItem,
  LearnerExamTemplateSummary,
  PaginatedData,
} from '@/types/learner-exam';
import type { AdminDashboardData } from '@/types/admin-dashboard';
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthSession,
} from '@/lib/auth-session';

// Chọn base URL theo env
function getBaseURL(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const localApiBase = process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL;

  // Ưu tiên biến môi trường chính thức
  if (apiBase && apiBase.trim() !== '') {
    return apiBase;
  }

  // Khi chạy dev local, cho phép dùng biến local base URL
  if (process.env.NODE_ENV !== 'production' && localApiBase && localApiBase.trim() !== '') {
    return localApiBase;
  }

  if (process.env.NODE_ENV === 'production') {
    return '/api/proxy/api/v1';
  }

  return 'http://localhost:3001/api/v1';
}

function getHealthURL(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const localApiUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL;
  const base =
    (apiUrl && apiUrl.trim() !== '' && apiUrl) ||
    (process.env.NODE_ENV !== 'production' && localApiUrl && localApiUrl.trim() !== '' ? localApiUrl : '') ||
    (process.env.NODE_ENV === 'production' ? '/api/proxy' : 'http://localhost:3001');
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

    updateMe: (data: {
      name?: string;
      phone?: string;
      birthday?: string;
      address?: string;
      bio?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
    }): Promise<ApiResponse<{ success: boolean; message: string; data: any }>> =>
      this.request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

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
    dashboard: {
      getSummary: (): Promise<ApiResponse<AdminDashboardData>> =>
        this.request('/admin/dashboard/summary', { method: 'GET' }),
    },

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
        keyword?: string;
        search?: string;
        status?: string;
        part?: string;
        objectiveOnly?: boolean;
      }): Promise<ApiResponse> => {
        const keyword = params?.keyword ?? params?.search;
        const queryParams = {
          page: params?.page,
          limit: params?.limit,
          keyword,
          status: params?.status,
          part: params?.part,
          objectiveOnly: params?.objectiveOnly,
        };
        const qs = params
          ? '?' + new URLSearchParams(
              Object.fromEntries(
                Object.entries(queryParams)
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

      previewImport: (groups: unknown[], sourceFileName?: string): Promise<ApiResponse> =>
        this.request('/admin/question-groups/import/preview', {
          method: 'POST',
          body: JSON.stringify({ groups, sourceFileName }),
        }),

      commitImport: (groups: unknown[], sourceFileName?: string): Promise<ApiResponse> =>
        this.request('/admin/question-groups/import/commit', { method: 'POST', body: JSON.stringify({ groups, sourceFileName }) }),

      presignAsset: (id: string, data: { kind: string; contentType: string; fileName?: string }): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets/presign`, { method: 'POST', body: JSON.stringify(data) }),

      attachAsset: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets`, { method: 'POST', body: JSON.stringify(data) }),

      deleteAsset: (id: string, assetId: string): Promise<ApiResponse> =>
        this.request(`/admin/question-groups/${id}/assets/${assetId}`, { method: 'DELETE' }),
    },

    vocabulary: {
      listDecks: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        cefrLevel?: string;
        published?: boolean;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.cefrLevel) query.cefrLevel = params.cefrLevel;
          if (params.published !== undefined) query.published = String(params.published);
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/vocabulary-decks${qs}`, { method: 'GET' });
      },

      createDeck: (data: {
        title: string;
        cefrLevel: string;
        description?: string;
        published?: boolean;
        sortOrder?: number;
      }): Promise<ApiResponse> =>
        this.request('/admin/vocabulary-decks', { method: 'POST', body: JSON.stringify(data) }),

      getDeck: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${id}`, { method: 'GET' }),

      updateDeck: (
        id: string,
        data: {
          title?: string;
          cefrLevel?: string;
          description?: string | null;
          published?: boolean;
          sortOrder?: number;
        },
      ): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteDeck: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${id}`, { method: 'DELETE' }),

      listItems: (
        deckId: string,
        params?: {
          page?: number;
          limit?: number;
          keyword?: string;
          sort?: string;
          order?: 'ASC' | 'DESC';
        },
      ): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/vocabulary-decks/${deckId}/items${qs}`, { method: 'GET' });
      },

      createItem: (
        deckId: string,
        data: {
          word: string;
          wordType: string;
          meaning: string;
          pronunciation?: string | null;
          exampleSentence: string;
          sortOrder?: number;
        },
      ): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${deckId}/items`, { method: 'POST', body: JSON.stringify(data) }),

      bulkItems: (
        deckId: string,
        data: {
          items: {
            word: string;
            wordType: string;
            meaning: string;
            pronunciation?: string | null;
            exampleSentence: string;
            sortOrder?: number;
          }[];
        },
      ): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${deckId}/items/bulk`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      updateItem: (
        deckId: string,
        itemId: string,
        data: {
          word?: string;
          wordType?: string;
          meaning?: string;
          pronunciation?: string | null;
          exampleSentence?: string;
          sortOrder?: number;
        },
      ): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${deckId}/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),

      deleteItem: (deckId: string, itemId: string): Promise<ApiResponse> =>
        this.request(`/admin/vocabulary-decks/${deckId}/items/${itemId}`, { method: 'DELETE' }),
    },

    skillTasks: {
      listWriting: (params?: { page?: number; limit?: number; level?: string; status?: string; keyword?: string }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.level) query.level = params.level;
          if (params.status) query.status = params.status;
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
        return this.request(`/admin/toeic-writing-tasks${qs}`, { method: "GET" });
      },
      createWriting: (data: {
        code: string;
        title: string;
        taskType: "part1_sentence" | "part2_email" | "part3_essay";
        level: "easy" | "medium" | "hard" | "expert";
        status?: "draft" | "published" | "archived";
        prompt: string;
        minWords?: number;
        maxWords?: number;
        timeLimitSec?: number;
        tips?: string[];
        rubric?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-tasks`, { method: "POST", body: JSON.stringify(data) }),
      updateWriting: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      deleteWriting: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-tasks/${id}`, { method: "DELETE" }),

      // ---- Writing Sets (Bộ đề) ----
      listWritingSets: (params?: { page?: number; limit?: number; level?: string; status?: string; keyword?: string }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.level) query.level = params.level;
          if (params.status) query.status = params.status;
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
        return this.request(`/admin/toeic-writing-sets${qs}`, { method: "GET" });
      },
      createWritingSet: (data: {
        code: string;
        title: string;
        level: "easy" | "medium" | "hard" | "expert";
        status?: "draft" | "published" | "archived";
        timeLimitSec?: number;
        metadata?: Record<string, unknown>;
      }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets`, { method: "POST", body: JSON.stringify(data) }),
      getWritingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets/${id}`, { method: "GET" }),
      updateWritingSet: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      deleteWritingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets/${id}`, { method: "DELETE" }),
      addWritingSetItems: (id: string, data: { taskIds: string[] }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets/${id}/items`, { method: "POST", body: JSON.stringify(data) }),
      removeWritingSetItem: (setId: string, itemId: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-writing-sets/${setId}/items/${itemId}`, { method: "DELETE" }),

      listSpeaking: (params?: { page?: number; limit?: number; level?: string; status?: string; keyword?: string }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.level) query.level = params.level;
          if (params.status) query.status = params.status;
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
        return this.request(`/admin/toeic-speaking-tasks${qs}`, { method: "GET" });
      },
      createSpeaking: (data: {
        code: string;
        title: string;
        taskType: "read_aloud" | "describe_picture" | "express_opinion" | "respond_to_questions";
        level: "easy" | "medium" | "hard" | "expert";
        status?: "draft" | "published" | "archived";
        prompt: string;
        targetSeconds?: number;
        timeLimitSec?: number;
        tips?: string[];
        rubric?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-tasks`, { method: "POST", body: JSON.stringify(data) }),
      updateSpeaking: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      deleteSpeaking: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-tasks/${id}`, { method: "DELETE" }),

      // ---- Speaking Sets (Bộ đề) ----
      listSpeakingSets: (params?: { page?: number; limit?: number; level?: string; status?: string; keyword?: string }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.level) query.level = params.level;
          if (params.status) query.status = params.status;
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
        return this.request(`/admin/toeic-speaking-sets${qs}`, { method: "GET" });
      },
      createSpeakingSet: (data: {
        code: string;
        title: string;
        level: "easy" | "medium" | "hard" | "expert";
        status?: "draft" | "published" | "archived";
        timeLimitSec?: number;
        metadata?: Record<string, unknown>;
      }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets`, { method: "POST", body: JSON.stringify(data) }),
      getSpeakingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets/${id}`, { method: "GET" }),
      updateSpeakingSet: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      deleteSpeakingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets/${id}`, { method: "DELETE" }),
      addSpeakingSetItems: (id: string, data: { taskIds: string[] }): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets/${id}/items`, { method: "POST", body: JSON.stringify(data) }),
      removeSpeakingSetItem: (setId: string, itemId: string): Promise<ApiResponse> =>
        this.request(`/admin/toeic-speaking-sets/${setId}/items/${itemId}`, { method: "DELETE" }),
    },

    // ---- Admin: Exam Templates (/admin/exam-templates) ----
    examTemplate: {
      list: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        status?: string;
        mode?: string;
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword && params.keyword.trim() !== '') query.keyword = params.keyword.trim();
          if (params.status && params.status !== 'all') query.status = params.status;
          if (params.mode && params.mode !== 'all') query.mode = params.mode;
        }
        const qs = Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/exam-templates${qs}`, { method: 'GET' });
      },

      stats: (): Promise<ApiResponse> =>
        this.request('/admin/exam-templates/stats', { method: 'GET' }),

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
      listRoles: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        isSystem?: boolean;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword && params.keyword.trim() !== '') query.keyword = params.keyword.trim();
          if (params.isSystem !== undefined) query.isSystem = String(params.isSystem);
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/rbac/roles${qs}`, { method: 'GET' });
      },

      createRole: (data: { code: string; name: string; description?: string }): Promise<ApiResponse> =>
        this.request('/admin/rbac/roles', { method: 'POST', body: JSON.stringify(data) }),

      updateRole: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/rbac/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteRole: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/rbac/roles/${id}`, { method: 'DELETE' }),

      listPermissions: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        module?: string;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword && params.keyword.trim() !== '') query.keyword = params.keyword.trim();
          if (params.module && params.module.trim() !== '') query.module = params.module.trim();
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/rbac/permissions${qs}`, { method: 'GET' });
      },

      createPermission: (data: { code: string; name: string; module?: string; description?: string }): Promise<ApiResponse> =>
        this.request('/admin/rbac/permissions', { method: 'POST', body: JSON.stringify(data) }),

      updatePermission: (id: string, data: Record<string, unknown>): Promise<ApiResponse> =>
        this.request(`/admin/rbac/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deletePermission: (id: string): Promise<ApiResponse> =>
        this.request(`/admin/rbac/permissions/${id}`, { method: 'DELETE' }),

      replaceRolePermissions: (roleId: string, permissions: string[]): Promise<ApiResponse> =>
        this.request(`/admin/rbac/roles/${roleId}/permissions`, {
          method: 'PATCH',
          body: JSON.stringify({ permissions }),
        }),

      createUser: (data: {
        name: string;
        email: string;
        password: string;
        status?: string;
      }): Promise<ApiResponse> =>
        this.request('/admin/rbac/users', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      updateUser: (
        userId: string,
        data: { name?: string; email?: string; status?: string; password?: string },
      ): Promise<ApiResponse> =>
        this.request(`/admin/rbac/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),

      deleteUser: (userId: string): Promise<ApiResponse> =>
        this.request(`/admin/rbac/users/${userId}`, { method: 'DELETE' }),

      listUsers: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        search?: string;
        role?: string;
        status?: string;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.role && params.role !== 'all') query.role = params.role;
          if (params.status && params.status !== 'all') query.status = params.status;
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;

          // BE expects `keyword`; keep `search` for backward compatibility in callers.
          const keyword = params.keyword ?? params.search;
          if (keyword && keyword.trim() !== '') query.keyword = keyword.trim();
        }

        const qs = Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/admin/rbac/users${qs}`, { method: 'GET' });
      },

      replaceUserRoles: (userId: string, roles: string[]): Promise<ApiResponse> =>
        this.request(`/admin/rbac/users/${userId}/roles`, { method: 'PATCH', body: JSON.stringify({ roles }) }),
    },
  };

  // ---- Learner: Exam Attempts (/learner/exam-attempts) ----
  learner = {
    // Published exam templates visible to students
    listPublishedTemplates: (params?: { mode?: string; keyword?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedData<LearnerExamTemplateSummary>>> => {
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

    officialExam: {
      listSessions: (): Promise<ApiResponse<{
        dates: Array<{
          date: string; // yyyy-mm-dd (local)
          sessions: Array<{
            examDate: string; // ISO
            template: {
              id: string;
              code: string;
              name: string;
              totalDurationSec: number;
              totalQuestions: number;
            };
          }>;
        }>;
      }>> => this.request('/learner/official-exams/sessions', { method: 'GET' }),

      listRegistrations: (): Promise<ApiResponse<{
        items: Array<{
          id: string;
          status: string;
          examDate: string;
          registeredAt: string;
          confirmationSentAt: string | null;
          reminderSentAt: string | null;
          emailError?: string | null;
          template: {
            id: string;
            code: string;
            name: string;
            totalDurationSec: number;
            totalQuestions: number;
          } | null;
        }>;
      }>> => this.request('/learner/official-exams/registrations', { method: 'GET' }),

      register: (data: { examTemplateId: string }): Promise<ApiResponse<{
        registered: boolean;
        alreadyRegistered: boolean;
        registrationId: string;
        examDate: string;
        emailSent?: boolean;
        emailError?: string | null;
      }>> => this.request('/learner/official-exams/registrations', { method: 'POST', body: JSON.stringify(data) }),
    },

    skillTasks: {
      listSpeakingSets: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        level?: string;
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.level) query.level = params.level;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/toeic-speaking-sets${qs}`, { method: 'GET' });
      },

      getSpeakingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/learner/toeic-speaking-sets/${id}`, { method: 'GET' }),

      listWritingSets: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        level?: string;
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.level) query.level = params.level;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/toeic-writing-sets${qs}`, { method: 'GET' });
      },

      getWritingSet: (id: string): Promise<ApiResponse> =>
        this.request(`/learner/toeic-writing-sets/${id}`, { method: 'GET' }),
    },

    examAttempt: {
      listHistory: (params?: {
        examTemplateId?: string;
        status?: string;
        page?: number;
        limit?: number;
      }): Promise<ApiResponse<PaginatedData<LearnerExamAttemptHistoryItem>>> => {
        const qs = params
          ? '?' +
            new URLSearchParams(
              Object.fromEntries(
                Object.entries(params)
                  .filter(([, value]) => value !== undefined && value !== '')
                  .map(([key, value]) => [key, String(value)]),
              ),
            ).toString()
          : '';
        return this.request(`/learner/exam-attempts/history${qs}`, {
          method: 'GET',
        });
      },

      start: (
        data: {
          examTemplateId: string;
          forceNew?: boolean;
          metadata?: Record<string, unknown>;
        },
      ): Promise<ApiResponse<LearnerAttemptSessionData>> =>
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
      ): Promise<ApiResponse<unknown>> =>
        this.request(`/learner/exam-attempts/${attemptId}/answers`, { method: 'PUT', body: JSON.stringify(data) }),

      submit: (
        attemptId: string,
        data?: Record<string, unknown>,
      ): Promise<ApiResponse<LearnerAttemptResultData>> =>
        this.request(`/learner/exam-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      getResult: (attemptId: string): Promise<ApiResponse<LearnerAttemptResultData>> =>
        this.request(`/learner/exam-attempts/${attemptId}/result`, { method: 'GET' }),
    },

    flashcards: {
      listDecks: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword && params.keyword.trim() !== '') query.keyword = params.keyword.trim();
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/flashcard-decks${qs}`, { method: 'GET' });
      },

      createDeck: (data: { title: string; description?: string }): Promise<ApiResponse> =>
        this.request('/learner/flashcard-decks', { method: 'POST', body: JSON.stringify(data) }),

      getDeck: (deckId: string): Promise<ApiResponse> =>
        this.request(`/learner/flashcard-decks/${deckId}`, { method: 'GET' }),

      updateDeck: (deckId: string, data: { title?: string; description?: string }): Promise<ApiResponse> =>
        this.request(`/learner/flashcard-decks/${deckId}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteDeck: (deckId: string): Promise<ApiResponse> =>
        this.request(`/learner/flashcard-decks/${deckId}`, { method: 'DELETE' }),

      listCards: (deckId: string, params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword && params.keyword.trim() !== '') query.keyword = params.keyword.trim();
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/flashcard-decks/${deckId}/flashcards${qs}`, { method: 'GET' });
      },

      createCard: (deckId: string, data: { front: string; back: string; note?: string; tags?: string[] }): Promise<ApiResponse> =>
        this.request(`/learner/flashcard-decks/${deckId}/flashcards`, { method: 'POST', body: JSON.stringify(data) }),

      updateCard: (cardId: string, data: { front?: string; back?: string; note?: string; tags?: string[] }): Promise<ApiResponse> =>
        this.request(`/learner/flashcards/${cardId}`, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteCard: (cardId: string): Promise<ApiResponse> =>
        this.request(`/learner/flashcards/${cardId}`, { method: 'DELETE' }),

      getStudyQueue: (params: { deckId: string; limit?: number; newLimit?: number }): Promise<ApiResponse> => {
        const qs = `?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        ).toString()}`;
        return this.request(`/learner/flashcards/study/queue${qs}`, { method: 'GET' });
      },

      submitReview: (data: { flashcardId: string; rating: 'again' | 'hard' | 'good' | 'easy'; timeMs?: number }): Promise<ApiResponse> =>
        this.request('/learner/flashcards/study/review', { method: 'POST', body: JSON.stringify(data) }),
    },

    vocabulary: {
      listDecks: (params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        cefrLevel?: string;
        sort?: string;
        order?: 'ASC' | 'DESC';
      }): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.cefrLevel) query.cefrLevel = params.cefrLevel;
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/vocabulary-decks${qs}`, { method: 'GET' });
      },

      getDeck: (id: string): Promise<ApiResponse> =>
        this.request(`/learner/vocabulary-decks/${id}`, { method: 'GET' }),

      listItems: (
        deckId: string,
        params?: {
          page?: number;
          limit?: number;
          keyword?: string;
          sort?: string;
          order?: 'ASC' | 'DESC';
        },
      ): Promise<ApiResponse> => {
        const query: Record<string, string> = {};
        if (params) {
          if (params.page !== undefined) query.page = String(params.page);
          if (params.limit !== undefined) query.limit = String(params.limit);
          if (params.keyword?.trim()) query.keyword = params.keyword.trim();
          if (params.sort) query.sort = params.sort;
          if (params.order) query.order = params.order;
        }
        const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        return this.request(`/learner/vocabulary-decks/${deckId}/items${qs}`, { method: 'GET' });
      },
    },

    ai: {
      explain: (data: {
        skill: 'listening' | 'reading' | 'writing' | 'speaking';
        question: string;
        userAnswer?: string;
        correctAnswer?: string;
        language?: string;
      }): Promise<ApiResponse<{ model: string; text: string }>> =>
        this.request('/learner/ai/explain', { method: 'POST', body: JSON.stringify(data) }),

      gradeWriting: (data: {
        prompt: string;
        essay: string;
        language?: string;
        taskType?: string;
      }): Promise<
        ApiResponse<{
          model: string;
          text: string;
          formatVersion?: string;
          result?: {
            overallScore?: number;
            criteria?: {
              grammar?: number;
              vocabulary?: number;
              coherence?: number;
              taskFulfillment?: number;
            };
            summary?: string;
            strengths?: string[];
            weaknesses?: string[];
            evidence?: string[];
            actionPlan?: string[];
            correctedVersion?: string;
          };
        }>
      > =>
        this.request('/learner/ai/writing/grade', { method: 'POST', body: JSON.stringify(data) }),

      gradeSpeaking: (data: {
        prompt: string;
        transcript: string;
        durationSeconds?: number;
        language?: string;
        taskType?: string;
      }): Promise<
        ApiResponse<{
          model: string;
          text: string;
          formatVersion?: string;
          result?: {
            overallScore?: number;
            criteria?: {
              pronunciation?: number;
              fluency?: number;
              grammar?: number;
              vocabulary?: number;
              relevance?: number;
            };
            summary?: string;
            strengths?: string[];
            weaknesses?: string[];
            evidence?: string[];
            actionPlan?: string[];
            betterAnswer?: string;
          };
        }>
      > =>
        this.request('/learner/ai/speaking/grade', { method: 'POST', body: JSON.stringify(data) }),

      lookupVocabulary: (data: {
        expression: string;
        context?: string;
        language?: string;
      }): Promise<
        ApiResponse<{
          model: string;
          text: string;
          formatVersion?: string;
          result?: {
            expression?: string;
            partOfSpeech?: string;
            pronunciation?: string;
            meaningVi?: string;
            meaningEn?: string;
            phrasalVerbs?: string[];
            synonyms?: string[];
            antonyms?: string[];
            examples?: Array<{ en?: string; vi?: string }>;
            note?: string;
          };
        }>
      > =>
        this.request('/learner/ai/vocabulary/lookup', { method: 'POST', body: JSON.stringify(data) }),
    },
  };
}

export const apiClient = new ApiClient();

// backward compat
export const api = apiClient;
