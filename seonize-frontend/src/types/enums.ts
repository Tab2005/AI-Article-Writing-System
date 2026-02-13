/**
 * Seonize Frontend - Enums and Constants
 */

export const SearchIntent = {
    INFORMATIONAL: 'informational',
    COMMERCIAL: 'commercial',
    NAVIGATIONAL: 'navigational',
    TRANSACTIONAL: 'transactional',
} as const;

export type SearchIntent = (typeof SearchIntent)[keyof typeof SearchIntent];

export const WritingStyle = {
    EDUCATIONAL: '專業教育風',
    REVIEW: '評論風',
    NEWS: '新聞風',
    CONVERSATIONAL: '對話風',
    TECHNICAL: '技術風',
} as const;

export type WritingStyle = (typeof WritingStyle)[keyof typeof WritingStyle];

export const OptimizationMode = {
    SEO: 'seo',
    AEO: 'aeo',
    GEO: 'geo',
    HYBRID: 'hybrid',
} as const;

export type OptimizationMode = (typeof OptimizationMode)[keyof typeof OptimizationMode];
