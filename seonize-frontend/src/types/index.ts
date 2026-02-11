/**
 * Seonize Frontend - TypeScript Type Definitions
 * Based on SSD v2.0 ProjectState
 */

// Enums
export const SearchIntent = {
    INFORMATIONAL: 'informational',
    COMMERCIAL: 'commercial',
    NAVIGATIONAL: 'navigational',
    TRANSACTIONAL: 'transactional',
} as const;

export type SearchIntent = typeof SearchIntent[keyof typeof SearchIntent];

export const WritingStyle = {
    EDUCATIONAL: '專業教育風',
    REVIEW: '評論風',
    NEWS: '新聞風',
    CONVERSATIONAL: '對話風',
    TECHNICAL: '技術風',
} as const;

export type WritingStyle = typeof WritingStyle[keyof typeof WritingStyle];

export const OptimizationMode = {
    SEO: 'seo',
    AEO: 'aeo',
    GEO: 'geo',
    HYBRID: 'hybrid',
} as const;

export type OptimizationMode = typeof OptimizationMode[keyof typeof OptimizationMode];

// Data Types
export interface KeywordData {
    secondary: string[];
    lsi: string[];
    density?: Record<string, number>;
}

export interface OutlineSection {
    id: string;
    heading: string;
    level: number;
    content?: string;
    keywords: string[];
    children: OutlineSection[];
}

export interface OutlineData {
    h1: string;
    sections: OutlineSection[];
}

export interface SERPResult {
    rank: number;
    url: string;
    title: string;
    snippet: string;
    headings: string[];
}

export interface ProjectState {
    project_id: string;
    created_at: string;
    updated_at: string;
    primary_keyword: string;
    country: string;
    language: string;
    intent?: SearchIntent;
    style?: WritingStyle;
    optimization_mode: OptimizationMode;
    serp_results: SERPResult[];
    keywords: KeywordData;
    candidate_titles: string[];
    selected_title?: string;
    outline?: OutlineData;
    full_content: string;
    meta_title?: string;
    meta_description?: string;
    word_count: number;
    keyword_density: Record<string, number>;
    research_data?: Record<string, any>;
    eeat_score?: number;
}

// API Request/Response Types
export interface ProjectCreate {
    primary_keyword: string;
    country?: string;
    language?: string;
    optimization_mode?: OptimizationMode;
}

export interface ProjectUpdate {
    selected_title?: string;
    intent?: SearchIntent;
    style?: WritingStyle;
    outline?: OutlineData;
    optimization_mode?: OptimizationMode;
    candidate_titles?: string[];
    research_data?: Record<string, any>;
}

export interface ResearchRequest {
    keyword: string;
    country?: string;
    language?: string;
    num_results?: number;
    force_refresh?: boolean;
}

export interface ResearchResponse {
    keyword: string;
    results: SERPResult[];
    total_results: number;
    ai_overview?: Record<string, unknown> | null;
    paa: string[];              // 新增 PAA 清單
    related_searches: string[]; // 新增相關搜尋清單
    created_at?: string | null; // 數據時間
    error?: string | null;
}

export interface KeywordIdea {
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: string;
    competition_index: number;
}

export interface KeywordIdeasResponse {
    seed_keyword_data: {
        keyword: string;
        search_volume: number;
        cpc: number;
        competition: string;
        competition_index: number;
    } | null;
    suggestions: KeywordIdea[];
    ai_suggestions?: AITitleSuggestion[]; // 新增：已生成的 AI 標題建議
    from_cache: boolean;
    google_ads_status?: {
        actual_data: boolean;
        date_update: string;
        last_year: number;
        last_month: number;
    };
    error?: string;
}

export interface IntentResult {
    intent: SearchIntent;
    confidence: number;
    signals: string[];
}

export interface KeywordExtractionResult {
    secondary_keywords: string[];
    lsi_keywords: string[];
    keyword_weights: Record<string, number>;
}

export interface ResearchHistoryItem {
    id: number;
    keyword: string;
    country: string;
    language: string;
    created_at: string;
    search_volume?: number;
    cpc?: number;
}

export interface TitleSuggestion {
    title: string;
    ctr_score: number;
    intent_match: boolean;
}

export interface AITitleSuggestion {
    title: string;
    strategy: string;
    reason: string;
}

export interface TitleGenerationResponse {
    keyword: string;
    suggestions: AITitleSuggestion[];
}

export interface AnalysisResponse {
    intent_analysis: IntentResult;
    suggested_style: WritingStyle;
    keywords: KeywordExtractionResult;
    title_suggestions: TitleSuggestion[];
}

export interface WritingSection {
    heading: string;
    level: number;
    keywords: string[];
    previous_summary?: string;
}

export interface WritingResponse {
    heading: string;
    content: string;
    word_count: number;
    embedded_keywords: string[];
    summary: string;
}

export interface SEOCheckResponse {
    word_count: number;
    keyword_density: Record<string, number>;
    readability_score: number;
    eeat_signals: string[];
    suggestions: string[];
}

// UI Component Props
export interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    loading?: boolean;
}

export interface DataTableColumn<T> {
    key: keyof T;
    header: string;
    width?: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
}

export interface CrawlResult {
    url: string;
    title: string;
    headings: string[];
    content: string;
    word_count: number;
}

export interface CrawlResponse {
    results: CrawlResult[];
}
