import type { SearchIntent, WritingStyle, OptimizationMode } from './enums';
import type { SERPResult } from './api';

export interface KeywordData {
    secondary: string[];
    lsi: string[];
    density?: Record<string, number>;
}

export interface ImageSuggestion {
    topic: string;
    search_keywords: string;
    visual_type: string;
}

export interface OutlineSection {
    id: string;
    heading: string;
    level: number;
    content?: string;
    keywords: string[];
    children: OutlineSection[];
    image_suggestion?: ImageSuggestion;
}

export interface OutlineData {
    h1: string;
    sections: OutlineSection[];
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
    content: string;
    full_content: string;
    meta_title?: string;
    meta_description?: string;
    word_count: number;
    keyword_density: Record<string, number>;
    research_data?: Record<string, any>;
    eeat_score?: number;
    quality_report?: any;
    last_audit_at?: string;
    cms_config_id?: string;
    // CMS 發布資訊
    cms_post_id?: string;
    publish_status?: 'draft' | 'scheduled' | 'published' | 'failed';
    cms_publish_url?: string;
    scheduled_at?: string;
    published_at?: string;
}

export interface ProjectBatchCreate {
    primary_keyword: string;
    country: string;
    language: string;
    optimization_mode: OptimizationMode;
    selected_titles: string[];
    intent?: SearchIntent | string;
    style?: WritingStyle | string;
    keyword_cache_id?: number;
}
