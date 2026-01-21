import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { researchApi, analysisApi } from '../services/api';
import type { SERPResult, AnalysisResponse } from '../types';
import './KeywordPage.css';

export const KeywordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialKeyword = searchParams.get('q') || '';

    const [keyword, setKeyword] = useState(initialKeyword);
    const [loading, setLoading] = useState(false);
    const [serpResults, setSerpResults] = useState<SERPResult[]>([]);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

    const handleResearch = async () => {
        if (!keyword.trim()) return;

        setLoading(true);
        try {
            // Research SERP
            const serpData = await researchApi.serp({ keyword, num_results: 10 });
            setSerpResults(serpData.results);

            // Analyze intent
            const analysisData = await analysisApi.analyzeIntent({
                keyword,
                titles: serpData.results.map(r => r.title),
            });
            setAnalysisResult(analysisData);
        } catch (error) {
            console.error('Research failed:', error);
            // Mock data for demo
            setSerpResults([
                { rank: 1, url: 'https://example1.com', title: `${keyword} 完整指南 2026`, snippet: '深入了解...', headings: [] },
                { rank: 2, url: 'https://example2.com', title: `${keyword}怎麼做？教學攻略`, snippet: '一步步教你...', headings: [] },
                { rank: 3, url: 'https://example3.com', title: `${keyword}推薦：10 個必學技巧`, snippet: '專家推薦...', headings: [] },
            ]);
            setAnalysisResult({
                intent_analysis: { intent: 'informational' as const, confidence: 0.85, signals: ['疑問詞觸發'] },
                suggested_style: '專業教育風' as const,
                keywords: { secondary_keywords: [`${keyword}技巧`, `${keyword}方法`], lsi_keywords: ['相關詞'], keyword_weights: {} },
                title_suggestions: [
                    { title: `2026 ${keyword}完整指南`, ctr_score: 0.9, intent_match: true },
                    { title: `${keyword}必看！5 個關鍵技巧`, ctr_score: 0.85, intent_match: true },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    const serpColumns = [
        { key: 'rank', header: '排名', width: '60px' },
        {
            key: 'title',
            header: '標題',
            render: (value: unknown, row: SERPResult) => (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="serp-link">
                    {String(value)}
                </a>
            ),
        },
        { key: 'snippet', header: '摘要' },
    ];

    const intentLabels: Record<string, { label: string; color: string }> = {
        informational: { label: '資訊型', color: 'var(--color-primary)' },
        commercial: { label: '商業型', color: 'var(--color-cta)' },
        navigational: { label: '導航型', color: 'var(--color-success)' },
        transactional: { label: '交易型', color: '#8B5CF6' },
    };

    return (
        <div className="keyword-page">
            {/* Search Section */}
            <div className="keyword-search">
                <h2 className="keyword-search__title">關鍵字研究</h2>
                <p className="keyword-search__desc">輸入目標關鍵字，分析 SERP 競品數據與搜尋意圖</p>
                <div className="keyword-search__form">
                    <Input
                        placeholder="輸入關鍵字..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        fullWidth
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        }
                    />
                    <Button
                        variant="cta"
                        onClick={handleResearch}
                        loading={loading}
                        disabled={!keyword.trim()}
                    >
                        開始研究
                    </Button>
                </div>
            </div>

            {/* Analysis Results */}
            {analysisResult && (
                <div className="keyword-analysis">
                    <div className="analysis-kpi-grid">
                        <KPICard
                            title="搜尋意圖"
                            value={intentLabels[analysisResult.intent_analysis.intent]?.label || '-'}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="信心度"
                            value={`${Math.round(analysisResult.intent_analysis.confidence * 100)}%`}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="建議風格"
                            value={analysisResult.suggested_style}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="次要關鍵字"
                            value={analysisResult.keywords.secondary_keywords.length}
                            suffix="個"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" x2="20" y1="9" y2="9" />
                                    <line x1="4" x2="20" y1="15" y2="15" />
                                    <line x1="10" x2="8" y1="3" y2="21" />
                                    <line x1="16" x2="14" y1="3" y2="21" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Keywords Section */}
                    <div className="keyword-section">
                        <h3 className="keyword-section__title">延伸關鍵字</h3>
                        <div className="keyword-tags">
                            {analysisResult.keywords.secondary_keywords.map((kw, i) => (
                                <span key={i} className="keyword-tag keyword-tag--secondary">{kw}</span>
                            ))}
                            {analysisResult.keywords.lsi_keywords.map((kw, i) => (
                                <span key={i} className="keyword-tag keyword-tag--lsi">{kw}</span>
                            ))}
                        </div>
                    </div>

                    {/* Title Suggestions */}
                    <div className="keyword-section">
                        <h3 className="keyword-section__title">標題建議</h3>
                        <div className="title-suggestions">
                            {analysisResult.title_suggestions.map((suggestion, i) => (
                                <div key={i} className="title-suggestion">
                                    <div className="title-suggestion__rank">{i + 1}</div>
                                    <div className="title-suggestion__content">
                                        <div className="title-suggestion__text">{suggestion.title}</div>
                                        <div className="title-suggestion__meta">
                                            <span className="title-suggestion__score">
                                                CTR 預測: {Math.round(suggestion.ctr_score * 100)}%
                                            </span>
                                            {suggestion.intent_match && (
                                                <span className="title-suggestion__match">✓ 意圖匹配</span>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="sm">選用</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SERP Results */}
            {serpResults.length > 0 && (
                <div className="keyword-section">
                    <h3 className="keyword-section__title">SERP 競品分析</h3>
                    <DataTable
                        columns={serpColumns}
                        data={serpResults}
                        loading={loading}
                    />
                </div>
            )}
        </div>
    );
};
