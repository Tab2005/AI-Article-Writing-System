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
    專業風: '專業風',
    評論風: '評論風',
    新聞風: '新聞風',
    對話風: '對話風',
    技術風: '技術風',
    開箱風: '開箱風',
    懶人包: '懶人包',
    故事風: '故事風',
} as const;

export type WritingStyle = (typeof WritingStyle)[keyof typeof WritingStyle];

export const OptimizationMode = {
    SEO: 'seo',
    AEO: 'aeo',
    GEO: 'geo',
    HYBRID: 'hybrid',
} as const;

export type OptimizationMode = (typeof OptimizationMode)[keyof typeof OptimizationMode];
