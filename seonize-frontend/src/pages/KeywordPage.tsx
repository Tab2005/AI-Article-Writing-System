import React, { useState } from 'react';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { researchApi, analysisApi, projectsApi } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type {
  SERPResult,
  AnalysisResponse,
  KeywordIdeasResponse,
  AITitleSuggestion,
} from '../types';
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
  const [aiOverview, setAiOverview] = useState<any | null>(null);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AITitleSuggestion[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [gapReport, setGapReport] = useState<any | null>(null);
  const [isGeneratingGap, setIsGeneratingGap] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 自動觸研：如果 URL 有搜尋參數則自動執行 (預設使用快取)
  React.useEffect(() => {
    if (initialKeyword) {
      handleResearch(false);
    }
  }, [initialKeyword]);

  const handleResearch = async (forceRefresh: boolean = false) => {
    if (!keyword.trim()) return;

    setLoading(true);
    setMessage(null);
    setAnalysisResult(null); // 清除舊的分析結果

    let serpData;
    try {
      // 第一階段：數據採集 (SERP & Keyword Ideas)
      const [serpRes, ideasRes] = await Promise.all([
        researchApi.serp({ keyword, num_results: 10, force_refresh: forceRefresh }),
        researchApi.keywordIdeas({ keyword, force_refresh: forceRefresh }),
      ]);

      serpData = serpRes;
      setSerpResults(serpRes.results);
      setPaa(serpRes.paa || []);
      setRelatedSearches(serpRes.related_searches || []);
      setAiOverview(serpRes.ai_overview);
      setLastCreatedAt(serpRes.created_at || null);
      setKeywordIdeas(ideasRes);

      // 如果快取中有已生成的 AI 標題，自動填入
      if (ideasRes?.ai_suggestions && ideasRes.ai_suggestions.length > 0) {
        setAiSuggestions(ideasRes.ai_suggestions);
      } else {
        setAiSuggestions([]); // 否則清空舊的建議
      }

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
          titles: serpData.results.map((r) => r.title),
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

  const handleGenerateAITitles = async () => {
    if (!keyword.trim() || serpResults.length === 0) return;

    setIsGeneratingTitles(true);
    try {
      const res = await researchApi.generateTitles({
        keyword,
        intent: analysisResult?.intent_analysis.intent || 'informational',
      });
      setAiSuggestions(res.suggestions);
    } catch (error: any) {
      console.error('Failed to generate AI titles:', error);

      // 嘗試從錯誤回應中提取詳細訊息
      let errorMessage = '標題生成失敗，請稍後再試';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = `標題生成失敗：${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleFetchContentGap = async () => {
    if (!keyword.trim() || serpResults.length === 0) return;

    setIsGeneratingGap(true);
    try {
      const data = await analysisApi.getContentGap(undefined, keyword);
      setGapReport(data);
    } catch (error: any) {
      console.error('Gap analysis failed:', error);
      alert(error.response?.data?.detail || '內容缺口分析失敗');
    } finally {
      setIsGeneratingGap(false);
    }
  };

  const handleUseTitle = async (selectedTitle: string) => {
    if (!keyword.trim()) return;

    setIsCreatingProject(true);
    try {
      // 1. 建立基礎專案 (使用 GEO 模式)
      const newProject = await projectsApi.create({
        primary_keyword: keyword,
        optimization_mode: 'geo' as any,
        country: 'TW',
        language: 'zh-TW',
      });

      // 2. 更新專案詳情：意圖、所選標題、所有候選標題、以及研究數據 (PAA, 相關搜尋等)
      await projectsApi.update(newProject.project_id, {
        selected_title: selectedTitle,
        intent: (analysisResult?.intent_analysis.intent as any) || 'informational',
        candidate_titles: aiSuggestions.map((s: AITitleSuggestion) => s.title),
        research_data: {
          paa: paa,
          related_searches: relatedSearches,
          ai_overview: aiOverview,
        },
        optimization_mode: 'geo' as any,
      });

      // 3. 跳轉至該專案的細節頁面 (目前跳轉至大綱生成或專案主頁)
      navigate(`/projects/${newProject.project_id}`);
    } catch (error) {
      console.error('Failed to create project and apply title:', error);
      alert('專案建立失敗，請稍後再試');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const serpColumns = [
    { key: 'rank', header: '排名', width: '60px' },
    {
      key: 'title',
      header: '標題',
    },
    {
      key: 'url',
      header: '網址',
      width: '200px',
      render: (value: unknown) => {
        const url = String(value);
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="serp-url"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
              title={url}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {domain}
            </a>
          );
        } catch {
          return (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {url}
            </span>
          );
        }
      },
    },
    { key: 'snippet', header: '摘要' },
  ];

  const TrendSparkline: React.FC<{ data: any[] | undefined }> = ({ data }) => {
    if (!data || data.length === 0) return <span>-</span>;

    // 找到最大值以進行縮放
    const values = data.map((d) => d.search_volume || 0);
    const max = Math.max(...values, 1);
    const width = 80;
    const height = 24;
    const padding = 2;

    // 繪製路徑
    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * (width - padding * 2) + padding;
        const y = height - (v / max) * (height - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="trend-sparkline" title="過去 12 個月趨勢">
        <svg width={width} height={height}>
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

  const suggestionColumns = [
    { key: 'keyword', header: '關鍵字', sortable: true },
    {
      key: 'search_volume',
      header: '搜尋量',
      sortable: true,
      render: (val: any) => val?.toLocaleString() || '-',
    },
    {
      key: 'monthly_searches',
      header: '趨勢 (12m)',
      render: (val: any) => <TrendSparkline data={val} />,
    },
    {
      key: 'cpc',
      header: '平均 CPC',
      sortable: true,
      render: (val: any) => (val ? `$${val.toFixed(2)}` : '-'),
    },
    {
      key: 'competition',
      header: '競爭度',
      sortable: true,
      render: (val: any) => (
        <span className={`comp-badge comp-${String(val).toLowerCase()}`}>{val}</span>
      ),
    },
    {
      key: 'relevance',
      header: '相關度',
      sortable: true,
      render: (val: any) => {
        const score = typeof val === 'number' ? Math.round(val * 100) : 0;
        if (score === 0) return '-';
        return (
          <div className="relevance-cell" title={`相關度: ${score}%`}>
            <div className="relevance-bar">
              <div
                className="relevance-fill"
                style={{
                  width: `${score}%`,
                  background: `hsla(${120 * (score / 100)}, 70%, 50%, 0.8)`,
                }}
              ></div>
            </div>
            <span className="relevance-text">{score}%</span>
          </div>
        );
      },
    },
  ];

  const intentLabels: Record<string, { label: string; color: string }> = {
    informational: { label: '資訊型', color: 'var(--color-primary)' },
    commercial: { label: '商業型', color: 'var(--color-cta)' },
    navigational: { label: '導航型', color: 'var(--color-success)' },
    transactional: { label: '交易型', color: '#8B5CF6' },
  };

  const strategyLabels: Record<string, string> = {
    DEFINITIONAL: '定義型',
    LISTICLE: '清單型',
    PROCEDURAL: '教學型',
    COMPARISON: '比較型',
    'AUTHORITY/TRENDS': '趨勢/權威型',
    定義型: '定義型',
    清單型: '清單型',
    教學型: '教學型',
    比較型: '比較型',
    趨勢型: '趨勢型',
    '趨勢/權威型': '趨勢/權威型',
  };

  const isDataExpired = () => {
    if (!lastCreatedAt) return false;
    const createdDate = new Date(lastCreatedAt);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  return (
    <div className="keyword-page">
      {/* Search Section */}
      <div className="keyword-search">
        <h2 className="keyword-search__title">關鍵字研究</h2>
        <p className="keyword-search__desc">輸入目標關鍵字，整合 Google 廣告數據與 SERP 語義分析</p>
        {message && <div className="keyword-message keyword-message--error">{message}</div>}
        <div className="keyword-search__form">
          <Input
            placeholder="輸入關鍵字..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            fullWidth
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            }
          />
          <Button
            variant="cta"
            onClick={() => handleResearch(false)}
            loading={loading}
            disabled={!keyword.trim()}
          >
            開始研究
          </Button>
        </div>
        {lastCreatedAt && (
          <div className="data-freshness-row">
            <div
              className="data-freshness"
              style={{
                fontSize: '0.875rem',
                color: isDataExpired() ? '#f59e0b' : 'var(--color-text-secondary)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '4px', verticalAlign: 'middle' }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              數據抓取時間：{new Date(lastCreatedAt).toLocaleString('zh-TW')}
              {isDataExpired() && (
                <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                  (建議更新數據以獲取最新結果)
                </span>
              )}
            </div>

            {keywordIdeas?.google_ads_status && (
              <div
                className="ads-status-badge"
                title={`最後更新：${keywordIdeas.google_ads_status.date_update}`}
              >
                <span
                  className="ads-status-badge__dot"
                  style={{
                    backgroundColor: keywordIdeas.google_ads_status.actual_data
                      ? '#10b981'
                      : '#f59e0b',
                  }}
                ></span>
                Google Ads 數據狀態：{keywordIdeas.google_ads_status.last_year}/
                {keywordIdeas.google_ads_status.last_month}{' '}
                {keywordIdeas.google_ads_status.actual_data ? '(已更新)' : '(發佈中)'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Results Container */}
      {(analysisResult || keywordIdeas || serpResults.length > 0) && (
        <div className="keyword-analysis">
          {/* KPI Grid */}
          <div className="analysis-kpi-grid">
            <KPICard
              title="預估月搜尋量"
              value={keywordIdeas?.seed_keyword_data?.search_volume?.toLocaleString() || '-'}
              loading={loading}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              }
            />
            <KPICard
              title="平均 CPC"
              value={
                keywordIdeas?.seed_keyword_data?.cpc
                  ? `$${keywordIdeas.seed_keyword_data.cpc.toFixed(2)}`
                  : '-'
              }
              loading={loading}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            />
            <KPICard
              title="搜尋意圖"
              value={
                analysisResult ? intentLabels[analysisResult.intent_analysis.intent]?.label : '-'
              }
              loading={isAnalyzing}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              }
            />
          </div>

          {/* Semantic Intent Section */}
          {(paa.length > 0 || relatedSearches.length > 0 || aiOverview || analysisResult) && (
            <div className="keyword-section keyword-section--intent">
              <h3 className="keyword-section__title">語義意圖與熱門問題</h3>
              <div className="intent-grid">
                {paa.length > 0 && (
                  <div className="intent-group">
                    <div className="intent-group__header">大家也問了 (People Also Ask)</div>
                    <div className="paa-list">
                      {paa.map((q: string, i: number) => (
                        <div key={i} className="paa-item">
                          <span className="paa-item__icon">?</span>
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="intent-group">
                  <div className="intent-group__header">AI 總結 (AI Overview)</div>
                  <div className="paa-list">
                    <div className="paa-item" style={{ opacity: aiOverview ? 1 : 0.7 }}>
                      <span
                        className="paa-item__icon"
                        style={{ color: aiOverview ? '#8B5CF6' : 'var(--color-text-secondary)' }}
                      >
                        ✨
                      </span>
                      {aiOverview ? (
                        aiOverview.description || aiOverview.snippet || '已擷取 Google AI 總結內容'
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                          此關鍵字目前暫無 Google AI 總結資料
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {relatedSearches.length > 0 && (
                  <div className="intent-group">
                    <div className="intent-group__header">相關搜尋 (Related Searches)</div>
                    <div className="paa-list">
                      {relatedSearches.map((s: string, i: number) => (
                        <div key={i} className="paa-item">
                          <span className="paa-item__icon" style={{ color: '#f59e0b' }}>
                            🔗
                          </span>
                          {s}
                        </div>
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

          {/* AI Title Magic Section */}
          <div className="keyword-section">
            <div className="section-header-row">
              <h3 className="keyword-section__title">AI 標題魔術師 (基於競品分析)</h3>
              {aiSuggestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAITitles}
                  loading={isGeneratingTitles}
                  icon={<span style={{ color: 'var(--color-primary)' }}>✨</span>}
                >
                  重新生成
                </Button>
              )}
            </div>

            {aiSuggestions.length > 0 ? (
              <div className="ai-title-grid">
                {aiSuggestions.map((item: AITitleSuggestion, i: number) => (
                  <div key={i} className="ai-title-card">
                    <div className="ai-title-card__badge">
                      {strategyLabels[item.strategy.toUpperCase()] ||
                        strategyLabels[item.strategy] ||
                        item.strategy}
                    </div>
                    <div className="ai-title-card__text">{item.title}</div>
                    <div className="ai-title-card__reason">{item.reason}</div>
                    <div className="ai-title-card__actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(item.title);
                          alert('標題已複製！');
                        }}
                      >
                        複製
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isCreatingProject}
                        onClick={() => handleUseTitle(item.title)}
                      >
                        選用
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-title-empty">
                <p style={{ marginBottom: '16px' }}>
                  透過分析前 10 名標題，為您產出更具競爭力的 H1 建議
                </p>
                <Button
                  variant="primary"
                  onClick={handleGenerateAITitles}
                  loading={isGeneratingTitles}
                  icon={<span>✨</span>}
                >
                  立即產生標題
                </Button>
              </div>
            )}
          </div>

          {/* Content Gap Analysis Section */}
          {serpResults.length > 0 && (
            <div className="keyword-section gap-analysis-section">
              <div className="section-header-row">
                <h3 className="keyword-section__title">內容缺口與 E-E-A-T 策略 (基於競品)</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleFetchContentGap}
                  loading={isGeneratingGap}
                  icon={<span>🎯</span>}
                >
                  {gapReport ? '重新分析' : '分析內容缺口'}
                </Button>
              </div>

              {gapReport ? (
                <div className="gap-report-card card animate-fade-in">
                  <div className="gap-grid">
                    <div className="gap-item content-gaps">
                      <label>🚩 競爭缺口 (應優先補齊的觀點)</label>
                      <ul>
                        {gapReport.content_gaps?.map((s: string, i: number) => <li key={i} className="highlight">{s}</li>)}
                      </ul>
                    </div>
                    <div className="gap-item eeat-strategy">
                      <label>🛡️ E-E-A-T/核心權威建議</label>
                      <ul>
                        {gapReport.eeat_strategies?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="gap-item market-standard">
                      <label>📊 市場基本水平 (必需包含內容)</label>
                      <ul>
                        {gapReport.market_standards?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gap-analysis-placeholder">
                  <p>透過 AI 橫向比對前 10 名標題與內容，挖掘競爭對手未提及的藍海觀點。</p>
                </div>
              )}
            </div>
          )}

          {/* SERP Results */}
          {serpResults.length > 0 && (
            <div className="keyword-section">
              <h3 className="keyword-section__title">SERP 競品分析 (Top 10)</h3>
              <DataTable columns={serpColumns as any} data={serpResults} loading={loading} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
