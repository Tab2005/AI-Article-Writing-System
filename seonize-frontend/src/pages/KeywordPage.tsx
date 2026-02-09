import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { researchApi, analysisApi } from '../services/api';
import type { SERPResult, AnalysisResponse, KeywordIdeasResponse, KeywordIdea } from '../types';
import './KeywordPage.css';

export const KeywordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialKeyword = searchParams.get('q') || '';

    const [keyword, setKeyword] = useState(initialKeyword);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [serpResults, setSerpResults] = useState<SERPResult[]>([]);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [keywordIdeas, setKeywordIdeas] = useState<KeywordIdeasResponse | null>(null);
    const [paa, setPaa] = useState<string[]>([]);
    const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    // 自動觸研：如果 URL 有搜尋參數則自動執行
    React.useEffect(() => {
        if (initialKeyword) {
            handleResearch();
        }
    }, [initialKeyword]);

    const handleResearch = async () => {
        if (!keyword.trim()) return;

        setLoading(true);
        setMessage(null);
        setAnalysisResult(null); // 清除舊的分析結果

        let serpData;
        try {
            // 第一階段：數據採集 (SERP & Keyword Ideas)
            const [serpRes, ideasRes] = await Promise.all([
                researchApi.serp({ keyword, num_results: 10 }),
                researchApi.keywordIdeas({ keyword })
            ]);

            serpData = serpRes;
            setSerpResults(serpRes.results);
            setPaa(serpRes.paa || []);
            setRelatedSearches(serpRes.related_searches || []);
            setKeywordIdeas(ideasRes);

            if (serpRes.error) {
                setMessage(`SERP 取得部分失敗：${serpRes.error}`);
            } else if (ideasRes?.error) {
                setMessage(`數據指標取得失敗：${ideasRes.error} (建議量與 CPC 可能暫時無法顯示)`);
            }
        } catch (error) {
            console.error('Research phase 1 failed:', error);
            setMessage('基礎數據研究失敗，請檢查 API 連線');
            setLoading(false);
            return;
        }

        // 數據採集完成，解除主要 Loading
        setLoading(false);

        // 第二階段：意圖分析 (背景執行，不阻塞第一階段顯示)
        if (serpData && serpData.results.length > 0) {
            setIsAnalyzing(true);
            try {
                const analysisData = await analysisApi.analyzeIntent({
                    keyword,
                    titles: serpData.results.map(r => r.title),
                });
                setAnalysisResult(analysisData);
            } catch (error) {
                console.error('Analysis phase 2 failed:', error);
                // 分析失敗不影響已顯示的數據，僅在控制台記錄或顯示微小提示
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handleCreateProject = () => {
        if (!analysisResult) return;

        const projectData = {
            keyword,
            intent: analysisResult.intent_analysis.intent,
            suggested_style: analysisResult.suggested_style,
            keywords: analysisResult.keywords,
            title_suggestions: analysisResult.title_suggestions,
            serp_results: serpResults,
        };

        navigate('/projects/new', { state: projectData });
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

    const suggestionColumns = [
        { key: 'keyword', header: '關鍵字' },
        {
            key: 'search_volume',
            header: '搜尋量',
            render: (val: any) => val?.toLocaleString() || '-'
        },
        {
            key: 'cpc',
            header: '平均 CPC',
            render: (val: any) => val ? `$${val.toFixed(2)}` : '-'
        },
        { key: 'competition', header: '競爭程度' },
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
                <p className="keyword-search__desc">輸入目標關鍵字，整合 Google 廣告數據與 SERP 語義分析</p>
                {message && (
                    <div className="keyword-message keyword-message--error">
                        {message}
                    </div>
                )}
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
            {(analysisResult || keywordIdeas) && (
                <div className="keyword-analysis">
                    <div className="analysis-kpi-grid">
                        <KPICard
                            title="預估月搜尋量"
                            value={keywordIdeas?.seed_keyword_data?.search_volume?.toLocaleString() || '-'}
                            loading={loading}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20V10" />
                                    <path d="M18 20V4" />
                                    <path d="M6 20v-4" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="平均 CPC"
                            value={keywordIdeas?.seed_keyword_data?.cpc ? `$${keywordIdeas.seed_keyword_data.cpc.toFixed(2)}` : '-'}
                            loading={loading}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="關鍵字難度"
                            value={keywordIdeas?.seed_keyword_data?.competition || '-'}
                            loading={loading}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                            }
                        />
                        <KPICard
                            title="搜尋意圖"
                            value={analysisResult ? intentLabels[analysisResult.intent_analysis.intent]?.label : '-'}
                            loading={isAnalyzing}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Semantic Intent Section (PAA & Related Searches) */}
                    {(paa.length > 0 || relatedSearches.length > 0) && (
                        <div className="keyword-section keyword-section--intent">
                            <h3 className="keyword-section__title">語義意圖與熱門問題</h3>
                            <div className="intent-grid">
                                {paa.length > 0 && (
                                    <div className="intent-group">
                                        <div className="intent-group__header">People Also Ask</div>
                                        <div className="paa-list">
                                            {paa.map((q, i) => (
                                                <div key={i} className="paa-item">
                                                    <span className="paa-item__icon">?</span>
                                                    {q}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {relatedSearches.length > 0 && (
                                    <div className="intent-group">
                                        <div className="intent-group__header">相關搜尋</div>
                                        <div className="keyword-tags">
                                            {relatedSearches.map((s, i) => (
                                                <span key={i} className="keyword-tag keyword-tag--related">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Long-tail Suggestions Table */}
                    {keywordIdeas && keywordIdeas.suggestions.length > 0 && (
                        <div className="keyword-section">
                            <h3 className="keyword-section__title">長尾關鍵字建議</h3>
                            <DataTable
                                columns={suggestionColumns as any}
                                data={keywordIdeas.suggestions}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* Keywords Section */}
                    {analysisResult && (
                        <div className="keyword-section">
                            <h3 className="keyword-section__title">延伸關鍵字 (系統提取)</h3>

                            {/* Secondary Keywords */}
                            {analysisResult.keywords.secondary_keywords.length > 0 && (
                                <div className="keyword-group">
                                    <div className="keyword-group__label">次要關鍵字</div>
                                    <div className="keyword-tags">
                                        {analysisResult.keywords.secondary_keywords.map((kw, i) => (
                                            <span key={`secondary-${i}`} className="keyword-tag keyword-tag--secondary">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LSI Keywords */}
                            {analysisResult.keywords.lsi_keywords.length > 0 && (
                                <div className="keyword-group">
                                    <div className="keyword-group__label">LSI 關鍵字</div>
                                    <div className="keyword-tags">
                                        {analysisResult.keywords.lsi_keywords.map((kw, i) => (
                                            <span key={`lsi-${i}`} className="keyword-tag keyword-tag--lsi">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Title Suggestions */}
                    {analysisResult && (
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
                    )}

                    {/* Create Project Button */}
                    <div className="keyword-section">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleCreateProject}
                            className="create-project-btn"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            創建專案
                        </Button>
                    </div>
                </div>
            )}

            {/* SERP Results */}
            {serpResults.length > 0 && (
                <div className="keyword-section">
                    <h3 className="keyword-section__title">SERP 競品分析 (Top 10)</h3>
                    <DataTable
                        columns={serpColumns as any}
                        data={serpResults}
                        loading={loading}
                    />
                </div>
            )}
        </div>
    );
};
