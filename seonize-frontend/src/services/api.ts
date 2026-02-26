import { uiBus } from '../utils/ui-bus';
import type {
  ProjectCreate,
  ProjectUpdate,
  ProjectState,
  ResearchRequest,
  ResearchResponse,
  KeywordIdeasResponse,
  ResearchHistoryItem,
  TitleGenerationResponse,
  AnalysisResponse,
  WritingResponse,
  SEOCheckResponse,
  WritingSection,
  CompetitionResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API 請求配置
const API_CONFIG = {
  timeout: 30000, // 30 秒超時
  maxRetries: 3, // 最多重試 3 次
  retryDelay: 1000, // 重試延遲 1 秒
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number; // 自定義超時
  retries?: number; // 自定義重試次數
  showLoading?: boolean; // 是否顯示全域 Loading
}

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶有超時控制的 fetch
 */
async function fetchWithTimeout(url: string, config: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('請求超時，請重試');
    }
    throw error;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = API_CONFIG.timeout,
    retries = API_CONFIG.maxRetries,
    showLoading = true,
  } = options;

  // 從 LocalStorage 獲取 Token
  const token = localStorage.getItem('seonize_token');

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  // 自動開啟全域 Loading
  if (showLoading) uiBus.showLoading();

  let lastError: Error | null = null;

  try {
    // 重試邏輯
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, config, timeout);

        if (!response.ok) {
          if (response.status === 401) {
            // Token 失效，清理並跳轉（不重試）
            localStorage.removeItem('seonize_token');
            uiBus.notify('登入逾期，請重新登入', 'warning');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            throw new Error('Unauthorized');
          }

          const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
          const errorMsg = error.detail || `HTTP 錯誤！狀態碼: ${response.status}`;

          // 5xx 錯誤可以重試，4xx 錯誤（除了 401）不重試
          if (response.status >= 500 && attempt < retries) {
            lastError = new Error(errorMsg);
            await delay(API_CONFIG.retryDelay * (attempt + 1)); // 指數退避
            continue;
          }

          // 全域錯誤通知
          uiBus.notify(errorMsg, 'error');
          throw new Error(errorMsg);
        }

        // 成功，返回結果
        return await response.json();
      } catch (err: any) {
        lastError = err;

        // 網路錯誤或超時可以重試
        const isRetriable =
          err.message?.includes('請求超時') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError');

        if (isRetriable && attempt < retries) {
          await delay(API_CONFIG.retryDelay * (attempt + 1));
          continue;
        }

        // 最後一次嘗試失敗，顯示錯誤
        if (!(err instanceof Error) || !err.message || err.message === 'Unauthorized') {
          const msg = attempt > 0
            ? `無法連接至伺服器（已重試 ${attempt} 次），請檢查網路連線`
            : '無法連接至伺服器，請檢查網路連線';
          uiBus.notify(msg, 'error');
        }
        throw err;
      }
    }

    // 如果所有重試都失敗
    throw lastError || new Error('請求失敗');
  } finally {
    // 自動關閉全域 Loading
    if (showLoading) uiBus.hideLoading();
  }
}

// Auth API
export const authApi = {
  login: (password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', 'admin');
    formData.append('password', password);

    return fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || '登入失敗');
      }
      return res.json();
    });
  },
  validate: () => request<{ status: string }>('/api/auth/validate'),
};

// Projects API
export const projectsApi = {
  create: (data: ProjectCreate) =>
    request<ProjectState>('/api/projects/', { method: 'POST', body: data }),

  list: () => request<ProjectState[]>('/api/projects/'),

  get: (projectId: string) => request<ProjectState>(`/api/projects/${projectId}`),

  update: (projectId: string, data: ProjectUpdate) =>
    request<ProjectState>(`/api/projects/${projectId}`, { method: 'PATCH', body: data }),

  delete: (projectId: string) => request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),
};

// Research API
export const researchApi = {
  serp: (data: ResearchRequest) =>
    request<ResearchResponse>('/api/research/serp', { method: 'POST', body: data }),

  crawl: (urls: string[]) =>
    request<{ results: any[] }>('/api/research/crawl', { method: 'POST', body: { urls } }),

  keywordIdeas: (data: {
    keyword: string;
    country?: string;
    language?: string;
    force_refresh?: boolean;
  }) =>
    request<KeywordIdeasResponse>('/api/research/keyword-ideas', { method: 'POST', body: data }),

  getHistory: () => request<ResearchHistoryItem[]>('/api/research/history'),

  deleteHistory: (recordId: number) =>
    request<void>(`/api/research/history/${recordId}`, { method: 'DELETE' }),

  generateTitles: (data: { keyword: string; intent?: string }) =>
    request<TitleGenerationResponse>('/api/research/generate-titles', {
      method: 'POST',
      body: data,
    }),
};

// Analysis API
export const analysisApi = {
  analyzeIntent: (data: { keyword: string; titles: string[]; content_samples?: string[] }) =>
    request<AnalysisResponse>('/api/analysis/intent', { method: 'POST', body: data }),

  generateOutline: (data: {
    project_id: string;
    keyword: string;
    intent: string;
    selected_keywords: string[];
  }) =>
    request<{
      h1: string;
      sections: Array<{
        id: string;
        heading: string;
        level: number;
        description: string;
        keywords: string[];
      }>;
      logic_chain: string[];
    }>('/api/analysis/outline', { method: 'POST', body: data }),
};

// Writing API
export const writingApi = {
  generateSection: (data: {
    project_id: string;
    h1?: string;
    section: WritingSection;
    optimization_mode?: string;
    ai_model?: string;
    target_word_count?: number;
    keyword_density?: number;
  }) => request<WritingResponse>('/api/writing/generate-section', {
    method: 'POST',
    body: data,
    timeout: 120000,
    retries: 0,
    showLoading: false
  }),

  generateFull: (data: {
    project_id: string;
    h1: string;
    sections: WritingSection[];
    optimization_mode?: string;
  }) =>
    request<{
      title: string;
      content: string;
      word_count: number;
      keyword_density: Record<string, number>;
      meta_title: string;
      meta_description: string;
    }>('/api/writing/generate-full', {
      method: 'POST',
      body: data,
      timeout: 120000,
      retries: 0,
      showLoading: false
    }),

  seoCheck: (data: { content: string; primary_keyword: string; secondary_keywords?: string[] }) =>
    request<SEOCheckResponse>('/api/writing/seo-check', { method: 'POST', body: data }),

  analyzeCompetition: (projectId: string) =>
    request<CompetitionResponse>(`/api/writing/projects/${projectId}/analyze-competition`, {
      method: 'POST',
    }),
};

// Kalpa API
export interface KalpaNode {
  id?: string;
  matrix_id?: string;
  entity: string;
  action: string;
  pain_point: string;
  target_title: string;
  status: 'pending' | 'weaving' | 'completed' | 'failed';
  woven_content?: string;
  anchor_used?: string;
  woven_at?: string;
}

export interface KalpaMatrix {
  id: string;
  project_name: string;
  industry: string;
  money_page_url: string;
  entities: string[];
  actions: string[];
  pain_points: string[];
  created_at: string;
  nodes?: KalpaNode[];
}

export const kalpaApi = {
  generate: (data: {
    project_name?: string;
    entities: string[];
    actions: string[];
    pain_points: string[];
    title_template?: string;
    exclusion_rules?: Record<string, string[]>;
  }) => request<KalpaNode[]>('/api/kalpa/generate', { method: 'POST', body: data }),

  save: (data: {
    project_name: string;
    industry: string;
    money_page_url: string;
    entities: string[];
    actions: string[];
    pain_points: string[];
    nodes: KalpaNode[];
  }) => request<{ success: boolean; matrix_id: string }>('/api/kalpa/save', { method: 'POST', body: data }),

  list: () => request<KalpaMatrix[]>('/api/kalpa/list'),

  get: (id: string) => request<KalpaMatrix & { nodes: KalpaNode[] }>(`/api/kalpa/${id}`),

  weave: (nodeId: string) => request<{ success: boolean; node: KalpaNode }>(`/api/kalpa/weave/${nodeId}`, {
    method: 'POST',
    timeout: 120000,
    retries: 0,
    showLoading: false
  }),

  listArticles: (matrixId?: string) =>
    request<(KalpaNode & { project_name: string })[]>(`/api/kalpa/articles/all${matrixId ? `?matrix_id=${matrixId}` : ''}`),

  delete: (id: string) => request<void>(`/api/kalpa/delete/${id}`, { method: 'DELETE' }),

  brainstorm: (topic: string) =>
    request<{
      entities: string[];
      actions: string[];
      pain_points: string[];
      suggested_title_template?: string;
      exclusion_rules?: Record<string, string[]>;
    }>('/api/kalpa/brainstorm', { method: 'POST', body: { topic } }),

  batchWeave: (nodeIds: string[]) =>
    request<{ success: boolean; message: string }>('/api/kalpa/batch-weave', {
      method: 'POST',
      body: { node_ids: nodeIds },
      showLoading: false,
    }),
};

// Health check
export const healthCheck = () => request<{ status: string }>('/api/health');

// Prompts API
export interface PromptTemplate {
  id: number;
  category: string;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const promptsApi = {
  list: (category?: string) =>
    request<PromptTemplate[]>(`/api/prompts/templates${category ? `?category=${category}` : ''}`),

  create: (data: { category: string; name: string; content: string }) =>
    request<PromptTemplate>('/api/prompts/templates', { method: 'POST', body: data }),

  update: (id: number, data: { name?: string; content?: string; is_active?: boolean }) =>
    request<PromptTemplate>(`/api/prompts/templates/${id}`, { method: 'PATCH', body: data }),

  delete: (id: number) =>
    request<{ message: string }>(`/api/prompts/templates/${id}`, { method: 'DELETE' }),
};

// Settings API
export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  description: string;
}

export interface SettingsData {
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
  dataforseo_login: string;
  dataforseo_password: string;
  dataforseo_serp_mode: string;
  system_provided?: string[];
}

export const settingsApi = {
  get: () => request<SettingsData>('/api/settings/'),
  save: (data: Partial<SettingsData>) =>
    request<SettingsData>('/api/settings/', { method: 'POST', body: data }),
  getProviders: () => request<AIProvider[]>('/api/settings/providers'),
  getDbInfo: () => request<{ type: string; is_local: boolean }>('/api/settings/database-info'),
  getCacheInfo: () => request<{ type: string; size?: number }>('/api/settings/cache-info'),
  testAI: (data: { provider: string; api_key: string; model: string }) =>
    request<{ success: boolean; message: string }>('/api/settings/test-ai', {
      method: 'POST',
      body: data,
    }),
  testDataForSEO: (data: { login: string; password: string }) =>
    request<{ success: boolean; message: string }>('/api/settings/test-dataforseo', {
      method: 'POST',
      body: data,
    }),
};
