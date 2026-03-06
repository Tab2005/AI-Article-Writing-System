import type { SearchIntent, WritingStyle, OptimizationMode } from './enums';

// Domain Core Types used across API
export interface SERPResult {
    rank: number;
    url: string;
    title: string;
    snippet: string;
    headings: string[];
    sitelinks?: Array<{ title: string; url: string }>;
    faq?: Array<{ question: string; answer: string }>;
    rating?: any;
    price?: any;
    about_this_result?: any;
    main_domain?: string;
    metrics?: any;
}

export interface HTag {
    tag: string;
    text: string;
}

export interface PageStructure {
    h_tags: HTag[];
    content_stats: {
        word_count: number;
        images_count: number;
    };
    meta_info: {
        title: string;
        description: string;
    };
    error?: string | null;
    from_cache?: boolean;
}

export interface CompetitorAnalysis {
    rank: number;
    url: string;
    title: string;
    snippet: string;
    structure: PageStructure;
}

export interface CrawlResult {
    url: string;
    title: string;
    headings: string[];
    content: string;
    word_count: number;
}

// Research API
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
    paa: string[];
    related_searches: string[];
    content_gap_report?: any;
    created_at?: string | null;
    error?: string | null;
}

export interface KeywordIdea {
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: string;
    competition_index: number;
    monthly_searches?: any[];
    relevance?: number;
}

export interface KeywordIdeasResponse {
    seed_keyword_data: KeywordIdea | null;
    suggestions: KeywordIdea[];
    ai_suggestions?: AITitleSuggestion[];
    from_cache: boolean;
    google_ads_status?: {
        actual_data: boolean;
        date_update: string;
        last_year: number;
        last_month: number;
    };
    error?: string;
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

// Analysis API
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

// Writing/SEO API
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

export interface CompetitionResponse {
    project_id: string;
    keyword: string;
    competitors: CompetitorAnalysis[];
    serp_features: string[];
    error?: string;
}

export interface CrawlResponse {
    results: CrawlResult[];
}

// Project API CRUD types
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
    outline?: any; // Avoiding circular dependency with OutlineData if needed
    optimization_mode?: OptimizationMode;
    candidate_titles?: string[];
    research_data?: Record<string, any>;
    content_gap_report?: any;
    full_content?: string;
    word_count?: number;
    cms_config_id?: string;
}
