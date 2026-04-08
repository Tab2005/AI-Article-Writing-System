import { uiBus } from '../utils/ui-bus';
import type {
  ProjectCreate,
  ProjectBatchCreate,
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
  CrawlResult,
  KalpaNode,
  KalpaMatrix,
  UserRecord,
  AdminStats,
  ImageSearchResult,
  CMSPublishResponse,
  User,
  TopicalMap,
  TopicalMapDetail,
  CreateTopicalMapRequest,
} from '../types';

// Re-export core types for backward compatibility across the codebase
export type { KalpaNode, KalpaMatrix, TopicalMap, TopicalMapDetail } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API 隢??蔭
const API_CONFIG = {
  timeout: 30000, // 30 蝘???
  maxRetries: 3, // ?憭?閰?3 甈?
  retryDelay: 1000, // ?岫撱園 1 蝘?
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number; // ?芸?蝢抵???
  retries?: number; // ?芸?蝢拚?閰行活??
  showLoading?: boolean; // ?臬憿舐內?典? Loading
}

/**
 * 撱園?賣
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 撣嗆?頞??批??fetch
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
      throw new Error('隢?頞?嚗??岫');
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

  // 敺?LocalStorage ?脣? Token
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

  // ?芸????典? Loading
  if (showLoading) uiBus.showLoading();

  let lastError: Error | null = null;

  try {
    // ?岫?摩
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, config, timeout);

        if (!response.ok) {
          if (response.status === 401) {
            // 憒??舫?霅?瘙?銝銵?歲頧?霈?AuthContext ??
            if (endpoint === '/api/auth/validate') {
              throw new Error('Unauthorized');
            }

            // ?嗡?隢??雁???祉? Token 皜??歲頧?頛?
            localStorage.removeItem('seonize_token');
            uiBus.notify('?餃?暹?嚗???餃', 'warning');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            throw new Error('Unauthorized');
          }

          const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
          let errorMsg = '?潛??航炊';
          
          if (typeof error.detail === 'string') {
            errorMsg = error.detail;
          } else if (error.detail && typeof error.detail === 'object') {
            // FastAPI 422 ?航炊?虜?臬?list
            errorMsg = JSON.stringify(error.detail);
          } else {
            errorMsg = `HTTP ?航炊嚗??Ⅳ: ${response.status}`;
          }

          // 5xx ?航炊?臭誑?岫嚗?xx ?航炊嚗鈭?401嚗??岫
          if (response.status >= 500 && attempt < retries) {
            lastError = new Error(errorMsg);
            await delay(API_CONFIG.retryDelay * (attempt + 1)); // ????
            continue;
          }

          // ?典??航炊?
          uiBus.notify(errorMsg, 'error');
          throw new Error(errorMsg);
        }

        // ??嚗?????
        if (response.status === 204) {
          return null as any;
        }
        return await response.json();
      } catch (err: any) {
        lastError = err;

        // 蝬脰楝?航炊???隞仿?閰?
        const isRetriable =
          err.message?.includes('隢?頞?') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError');

        if (isRetriable && attempt < retries) {
          await delay(API_CONFIG.retryDelay * (attempt + 1));
          continue;
        }

        // ?敺?甈∪?閰血仃??銝???Unauthorized ?航炊嚗?01嚗??＊蝷粹???航炊
        if (err.message !== 'Unauthorized' && (isRetriable || !err.message)) {
          const msg = attempt > 0
            ? `?⊥????喃撩?嚗歇?岫 ${attempt} 甈∴?嚗?瑼Ｘ蝬脰楝???`
            : '?⊥????喃撩?嚗?瑼Ｘ蝬脰楝???';
          uiBus.notify(msg, 'error');
        }
        throw err;
      }
    }

    // 憒????閰阡憭望?
    throw lastError || new Error('隢?憭望?');
  } finally {
    // ?芸????典? Loading
    if (showLoading) uiBus.hideLoading();
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI OAuth2PasswordRequestForm ?身雿輻 'username' 甈?
    formData.append('password', password);

    return fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: '?餃憭望?' }));
        throw new Error(error.detail || '?餃憭望?');
      }
      return res.json();
    });
  },
  register: (data: { email: string; password: string; username?: string }) =>
    request<{ message: string; user_id: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),
  validate: () => request<{ status: string; user: User }>('/api/auth/validate'),
  getMembershipLevels: () => request<Record<string, string>>('/api/auth/membership/levels'),
  getCreditHistory: (page: number = 1, perPage: number = 20) => 
    request<{ logs: any[]; total: number; page: number; per_page: number; total_pages: number }>(
      `/api/auth/credits/history?page=${page}&per_page=${perPage}`
    ),
  updateProfile: (data: { username?: string; old_password?: string; new_password?: string }) =>
    request<{ message: string; user: User }>('/api/auth/profile', { method: 'PATCH', body: data }),
};

// Projects API
export const projectsApi = {
  create: (data: ProjectCreate) =>
    request<ProjectState>('/api/projects/', { method: 'POST', body: data }),

  batchCreate: (data: ProjectBatchCreate) =>
    request<ProjectState[]>('/api/projects/batch', { method: 'POST', body: data }),

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
    request<{ results: CrawlResult[] }>('/api/research/crawl', { method: 'POST', body: { urls } }),

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
    selected_title?: string;
  }) =>
    request<{
      h1: string;
      sections: Array<{
        id: string;
        heading: string;
        level: number;
        description: string;
        keywords: string[];
        image_suggestion?: {
          topic: string;
          search_keywords: string;
          visual_type: string;
        };
      }>;
      logic_chain: string[];
    }>('/api/analysis/outline', { 
      method: 'POST', 
      body: data,
      timeout: 120000, // 憓???120 蝘???蝡?AI 頞??郊
      retries: 0      // ???芸??岫嚗??箏?甈?AI 隢?
    }),

  getContentGap: (projectId?: string, keyword?: string, forceRefresh?: boolean) =>
    request<any>('/api/analysis/content-gap', {
      method: 'POST',
      body: { project_id: projectId, keyword, force_refresh: forceRefresh },
      timeout: 60000 // ?批捆??暺???嚗辣?瑁 60 蝘?
    }),
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
    style_blueprint?: string;
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
      llm_summary: string;
    }>('/api/writing/generate-full', {
      method: 'POST',
      body: data,
      timeout: 300000, // 憓???300 蝘?(5 ??)
      retries: 0,
      showLoading: false
    }),

  seoCheck: (data: { content: string; primary_keyword: string; secondary_keywords?: string[] }) =>
    request<SEOCheckResponse>('/api/writing/seo-check', { method: 'POST', body: data }),

  analyzeCompetition: (projectId: string) =>
    request<CompetitionResponse>(`/api/writing/projects/${projectId}/analyze-competition`, {
      method: 'POST',
    }),

  analyzeQuality: (data: { project_id: string; content: string }) =>
    request<any>('/api/writing/analyze-quality', { method: 'POST', body: data }),

  blueprint: (data: { project_id: string; h1: string; outline: string }) =>
    request<{ blueprint: string; persona: any }>('/api/writing/blueprint', { method: 'POST', body: data }),

  review: (data: { project_id: string; content: string; style_blueprint: string }) =>
    request<{ content: string; optimized: boolean; llm_summary?: string }>('/api/writing/review', { method: 'POST', body: data }),

  refreshSummary: (projectId?: string, nodeId?: string) =>
    request<{ success: boolean; llm_summary: string }>('/api/writing/refresh-summary', {
      method: 'POST',
      body: { project_id: projectId, node_id: nodeId }
    }),
};

// Kalpa API
// kalpaApi moved below

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
    id?: string;
    project_name: string;
    industry: string;
    money_page_url: string;
    entities: string[];
    actions: string[];
    pain_points: string[];
    nodes: KalpaNode[];
    cms_config_id?: string;
  }) => request<{ success: boolean; matrix_id: string; matrix: KalpaMatrix }>('/api/kalpa/save', { method: 'POST', body: data }),

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

  getNode: (id: string) => request<KalpaNode>(`/api/kalpa/node/${id}`),
  updateNode: (nodeId: string, data: Partial<KalpaNode>) =>
    request<{ success: boolean; node: KalpaNode }>(`/api/kalpa/node/${nodeId}/update`, { method: 'POST', body: data }),
  resetNode: (nodeId: string) => request<{ success: boolean }>(`/api/kalpa/node/${nodeId}/reset`, { method: 'POST' }),
};

// Health check
export const healthCheck = () => request<{ status: string }>('/api/health');

// Prompts API
export interface PromptTemplate {
  id: number;
  category: string;
  name: string;
  description?: string;
  content: string;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const promptsApi = {
  list: (category?: string) =>
    request<PromptTemplate[]>(`/api/prompts/templates${category ? `?category=${category}` : ''}`),

  create: (data: { category: string; name: string; content: string; description?: string }) =>
    request<PromptTemplate>('/api/prompts/templates', { method: 'POST', body: data }),

  update: (id: number, data: { name?: string; content?: string; is_active?: boolean; description?: string }) =>
    request<PromptTemplate>(`/api/prompts/templates/${id}`, { method: 'PATCH', body: data }),

  delete: (id: number) =>
    request<{ message: string }>(`/api/prompts/templates/${id}`, { method: 'DELETE' }),
};

// Settings API
export interface AIProvider {
  id: 'zeabur' | 'openrouter' | string;
  name: string;
  models: (string | { id: string; name: string })[]; // ?舀??摮葡????底蝝唳芋?隞園??
  description: string;
}

export interface SettingsData {
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
  dataforseo_login: string;
  dataforseo_password: string;
  dataforseo_serp_mode: string;
  pixabay_api_key?: string;
  pexels_api_key?: string;
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

// Admin API
export const adminApi = {
  listUsers: (params: { page?: number; per_page?: number; role?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.role) searchParams.set('role', params.role);
    if (params.search) searchParams.set('search', params.search);

    return request<{
      users: UserRecord[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(`/api/admin/users?${searchParams.toString()}`);
  },

  getStats: () => request<AdminStats>('/api/admin/users/stats/summary'),

  updateUser: (userId: string, data: Partial<UserRecord> & { new_password?: string; credits_delta?: number }) =>
    request<{ success: boolean; message: string }>(`/api/admin/users/${userId}`, { method: 'PATCH', body: data }),

  deleteUser: (userId: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/users/${userId}`, { method: 'DELETE' }),

  getCreditConfig: () => request<Record<string, number>>('/api/admin/credits/config'),
  updateCreditConfig: (data: Record<string, number>) =>
    request<{ success: boolean; message: string }>('/api/admin/credits/config', { method: 'PUT', body: data }),
};

// CMS API
export interface CMSConfig {
  id: string;
  name: string;
  platform: string;
  api_url: string;
  username?: string;
  is_active: boolean;
  auto_publish_enabled: boolean;
  frequency_type: 'hour' | 'day' | 'week';
  frequency_count: number;
  last_auto_published_at?: string;
}

export const cmsApi = {
  listConfigs: () => request<CMSConfig[]>('/api/cms/configs'),

  createConfig: (data: Partial<CMSConfig>) =>
    request<CMSConfig>('/api/cms/configs', { method: 'POST', body: data }),

  updateConfig: (id: string, data: Partial<CMSConfig>) =>
    request<CMSConfig>(`/api/cms/configs/${id}`, { method: 'PUT', body: data }),

  deleteConfig: (id: string) =>
    request<void>(`/api/cms/configs/${id}`, { method: 'DELETE' }),

  testConnection: (id: string) =>
    request<{ success: boolean; message?: string }>(`/api/cms/test-connection/${id}`, { method: 'POST' }),

  publish: (data: {
    target_type: string;
    target_id: string;
    config_id: string;
    status: string;
    scheduled_at?: string | null;
  }) => request<CMSPublishResponse>('/api/cms/publish', { method: 'POST', body: data }),
};

// Images API
export const imagesApi = {
  upload: (file: File) => {
    const token = localStorage.getItem('seonize_token');
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        const msg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
        uiBus.notify(msg, 'error');
        throw new Error(msg);
      }
      return res.json();
    });
  },

  search: (q: string, limit: number = 10) =>
    request<{ success: boolean; data: ImageSearchResult[] }>(`/api/images/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  metadataSuggestion: (content: string, topic: string) =>
    request<{ success: boolean; data: { alt: string; caption: string } }>(`/api/images/metadata-suggestion?content=${encodeURIComponent(content)}&topic=${encodeURIComponent(topic)}`),
};


// Topical Map API
export const topicalMapApi = {
  generate: (data: CreateTopicalMapRequest) =>
    request<TopicalMapDetail>('/api/topical-map/generate', { method: 'POST', body: data }),
  list: () => request<TopicalMap[]>('/api/topical-map/list'),
  get: (id: string) => request<TopicalMapDetail>(`/api/topical-map/${id}`),
  delete: (id: string) => request<void>(`/api/topical-map/${id}`, { method: 'DELETE' }),
};
