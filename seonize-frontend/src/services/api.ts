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
    CompetitionResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    // 從 LocalStorage 獲取 Token
    const token = localStorage.getItem('seonize_token');

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        if (response.status === 401) {
            // Token 失效，清理並跳轉
            localStorage.removeItem('seonize_token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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
        }).then(async res => {
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

    list: () =>
        request<ProjectState[]>('/api/projects/'),

    get: (projectId: string) =>
        request<ProjectState>(`/api/projects/${projectId}`),

    update: (projectId: string, data: ProjectUpdate) =>
        request<ProjectState>(`/api/projects/${projectId}`, { method: 'PATCH', body: data }),

    delete: (projectId: string) =>
        request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),
};

// Research API
export const researchApi = {
    serp: (data: ResearchRequest) =>
        request<ResearchResponse>('/api/research/serp', { method: 'POST', body: data }),

    crawl: (urls: string[]) =>
        request<{ results: any[] }>(
            '/api/research/crawl',
            { method: 'POST', body: { urls } }
        ),

    keywordIdeas: (data: { keyword: string; country?: string; language?: string; force_refresh?: boolean }) =>
        request<KeywordIdeasResponse>('/api/research/keyword-ideas', { method: 'POST', body: data }),

    getHistory: () =>
        request<ResearchHistoryItem[]>('/api/research/history'),

    deleteHistory: (recordId: number) =>
        request<void>(`/api/research/history/${recordId}`, { method: 'DELETE' }),

    generateTitles: (data: { keyword: string; intent?: string }) =>
        request<TitleGenerationResponse>('/api/research/generate-titles', { method: 'POST', body: data }),
};

// Analysis API
export const analysisApi = {
    analyzeIntent: (data: { keyword: string; titles: string[]; content_samples?: string[] }) =>
        request<AnalysisResponse>('/api/analysis/intent', { method: 'POST', body: data }),

    generateOutline: (data: { project_id: string; keyword: string; intent: string; selected_keywords: string[] }) =>
        request<{ h1: string; sections: Array<{ id: string; heading: string; level: number; description: string; keywords: string[] }>; logic_chain: string[] }>(
            '/api/analysis/outline',
            { method: 'POST', body: data }
        ),
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
    }) =>
        request<WritingResponse>('/api/writing/generate-section', { method: 'POST', body: data }),

    generateFull: (data: { project_id: string; h1: string; sections: WritingSection[]; optimization_mode?: string }) =>
        request<{ title: string; content: string; word_count: number; keyword_density: Record<string, number>; meta_title: string; meta_description: string }>(
            '/api/writing/generate-full',
            { method: 'POST', body: data }
        ),

    seoCheck: (data: { content: string; primary_keyword: string; secondary_keywords?: string[] }) =>
        request<SEOCheckResponse>('/api/writing/seo-check', { method: 'POST', body: data }),

    analyzeCompetition: (projectId: string) =>
        request<CompetitionResponse>(`/api/writing/projects/${projectId}/analyze-competition`, { method: 'POST' }),
};

// Health check
export const healthCheck = () => request<{ status: string }>('/api/health');
