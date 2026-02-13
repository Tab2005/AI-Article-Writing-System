import type { SearchIntent, WritingStyle, OptimizationMode } from './enums';
import type { SERPResult } from './api';

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
