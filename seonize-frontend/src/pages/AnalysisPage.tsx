import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, KPICard } from '../components/ui';
import { projectsApi, analysisApi, writingApi } from '../services/api';
import type {
  ProjectState,
  AnalysisResponse,
  SearchIntent,
  WritingStyle,
  OptimizationMode,
  CompetitionResponse,
} from '../types';
import './AnalysisPage.css';

export const AnalysisPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // 優先從 location state 獲取，其次從 sessionStorage 獲取
  const projectId = location.state?.projectId || sessionStorage.getItem('lastProjectId');

  const [project, setProject] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 當前選定的設定 (用於套用)
  const [selectedIntent, setSelectedIntent] = useState<SearchIntent | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle | null>(null);
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>('seo');

  // 競爭對手數據
  const [competitionData, setCompetitionData] = useState<CompetitionResponse | null>(null);
  const [analyzingCompetition, setAnalyzingCompetition] = useState(false);
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setError('找不到專案 ID，請從專案頁面進入');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await projectsApi.get(projectId);
      setProject(data);
      setSelectedIntent(data.intent || null);
      setSelectedStyle(data.style || null);
      setSelectedMode(data.optimization_mode || 'seo');
    } catch (err) {
      setError('載入專案失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleRunAnalysis = async () => {
    if (!project) return;

    try {
      setAnalyzing(true);
      setError(null);

      // 準備分析數據：關鍵字 + 競品標題
      const titles = project.serp_results?.map((r) => r.title) || [];

      const res = await analysisApi.analyzeIntent({
        keyword: project.primary_keyword,
        titles: titles,
        content_samples: [], // 未來可擴充
      });

      setAnalysisResult(res);

      // 自動帶入建議值
      setSelectedIntent(res.intent_analysis.intent);
      setSelectedStyle(res.suggested_style);

      // 根據意圖智慧推薦優化模式
      if (res.intent_analysis.intent === 'informational') {
        setSelectedMode('seo');
      } else if (res.intent_analysis.intent === 'transactional') {
        setSelectedMode('aeo');
      } else {
        setSelectedMode('geo');
      }
    } catch (err) {
      setError('分析失敗，請檢查 API 連線');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeCompetition = async () => {
    if (!projectId) return;
    try {
      setAnalyzingCompetition(true);
      const res = await writingApi.analyzeCompetition(projectId);
      setCompetitionData(res);

      // 根據競爭實體自動優示意圖證物 (例如偵測到 Shopping)
      if (res.serp_features.includes('shopping') || res.serp_features.includes('merchant_ad')) {
        setSelectedIntent('commercial');
        setSelectedMode('aeo');
      } else if (res.serp_features.includes('local_pack') || res.serp_features.includes('map')) {
        setSelectedIntent('navigational');
      }
    } catch (err) {
      console.error('分析競爭對手失敗', err);
      setError('競爭分析失敗，請檢查 DataForSEO 設定');
    } finally {
      setAnalyzingCompetition(false);
    }
  };

  const handleApplyStrategy = async () => {
    if (!projectId || !project || !selectedIntent || !selectedStyle) return;

    try {
      setLoading(true);

      // 更新專案設定
      await projectsApi.update(projectId, {
        intent: selectedIntent,
        style: selectedStyle,
        optimization_mode: selectedMode,
        // 同步更新提取出的潛在關鍵字 (可選)
        research_data: {
          ...project.research_data,
          extracted_keywords: analysisResult?.keywords,
        },
      });

      // 成功後跳轉到大綱生成
      navigate('/outline', { state: { projectId } });
    } catch (err) {
      setError('套用設定失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const intentTypes = [
    {
      id: 'informational',
      label: '資訊型',
      desc: '用戶想要了解知識或資訊',
      color: 'var(--color-primary)',
    },
    {
      id: 'commercial',
      label: '商業型',
      desc: '用戶正在研究產品或服務',
      color: 'var(--color-cta)',
    },
    {
      id: 'navigational',
      label: '導航型',
      desc: '用戶想要找到特定網站',
      color: 'var(--color-success)',
    },
    { id: 'transactional', label: '交易型', desc: '用戶準備採取購買行動', color: '#8B5CF6' },
  ];

  if (loading && !project)
    return (
      <div className="analysis-page">
        <div className="analysis-empty-state">載入專案中...</div>
      </div>
    );
  if (error && !project)
    return (
      <div className="analysis-page">
        <div className="analysis-empty-state">
          <h3>錯誤</h3>
          <p>{error}</p>
          <Button onClick={() => navigate('/projects')}>返回專案列表</Button>
        </div>
      </div>
    );

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <h2 className="analysis-header__title">意圖分析引擎</h2>
        <p className="analysis-header__desc">
          核心關鍵字：<strong>{project?.primary_keyword}</strong>
        </p>
        <div className="analysis-header__actions">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            返回
          </Button>
          <Button variant="cta" onClick={handleRunAnalysis} loading={analyzing}>
            {analysisResult ? '重新分析' : '開始執行 AI 分析'}
          </Button>
        </div>
      </div>

      {error && <div className="analysis-error-banner">{error}</div>}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="analysis-results-section animate-fade-in">
          <div className="analysis-tool__results">
            <KPICard
              title="預測意圖"
              value={
                intentTypes.find((i) => i.id === analysisResult.intent_analysis.intent)?.label ||
                '未知'
              }
            />
            <KPICard
              title="信心度"
              value={`${Math.round(analysisResult.intent_analysis.confidence * 100)}%`}
            />
            <KPICard title="建議風格" value={analysisResult.suggested_style} />
          </div>

          <div className="analysis-signals">
            <h4>偵測信號：</h4>
            <div className="signals-list">
              {analysisResult.intent_analysis.signals.map((s, i) => (
                <span key={i} className="signal-tag">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="analysis-config-grid">
        {/* Intent Selection */}
        <div className="config-card">
          <h3>1. 確定搜尋意圖</h3>
          <div className="intent-list-compact">
            {intentTypes.map((intent) => (
              <div
                key={intent.id}
                className={`intent-item-small ${selectedIntent === intent.id ? 'active' : ''}`}
                onClick={() => setSelectedIntent(intent.id as SearchIntent)}
                style={{ '--intent-color': intent.color } as React.CSSProperties}
              >
                <span className="intent-dot"></span>
                <div className="intent-text">
                  <strong>{intent.label}</strong>
                  <p>{intent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Mode & Style */}
        <div className="config-card">
          <h3>2. 選擇優化模式與風格</h3>
          <div className="mode-selection">
            <label>優化目標：</label>
            <div className="mode-options">
              {['seo', 'aeo', 'geo', 'hybrid'].map((mode) => (
                <button
                  key={mode}
                  className={`mode-btn ${selectedMode === mode ? 'active' : ''}`}
                  onClick={() => setSelectedMode(mode as OptimizationMode)}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="style-selection">
            <label>寫作風格：</label>
            <select
              value={selectedStyle || ''}
              onChange={(e) => setSelectedStyle(e.target.value as WritingStyle)}
              className="style-select"
            >
              <option value="" disabled>
                請選擇風格...
              </option>
              <option value="專業教育風">專業教育風</option>
              <option value="評論風">評論風</option>
              <option value="新聞風">新聞風</option>
              <option value="對話風">對話風</option>
              <option value="技術風">技術風</option>
            </select>
          </div>

          {analysisResult && (
            <div className="extracted-keywords">
              <label>提取關鍵字建議 (LSI)：</label>
              <div className="kw-cloud">
                {analysisResult.keywords.secondary_keywords.slice(0, 10).map((kw, i) => (
                  <span key={i} className="kw-tag">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competition Intelligence */}
      <div
        className="analysis-competition-section animate-fade-in"
        style={{
          marginTop: '2.5rem',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '2rem',
        }}
      >
        <div className="competition-header">
          <div className="competition-header__info">
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              競爭對手深度情報 (Top 5)
            </h3>
            <p
              className="subtitle"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                margin: '0.25rem 0 1rem',
              }}
            >
              拆解對手文章骨架，找出內容缺口
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              console.log('Project analysis data:', project);
              handleAnalyzeCompetition();
            }}
            loading={analyzingCompetition}
            disabled={!project || analyzingCompetition}
          >
            {competitionData ? '重新整理數據' : '執行深度拆解 (H2/H3專用)'}
          </Button>
        </div>

        {competitionData && (
          <div
            className="competitors-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
            }}
          >
            {competitionData.competitors.length > 0 ? (
              competitionData.competitors.map((comp, idx) => (
                <div
                  key={idx}
                  className={`competitor-card ${expandedCompetitor === idx ? 'expanded' : ''}`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    className="competitor-card__header"
                    onClick={() => setExpandedCompetitor(expandedCompetitor === idx ? null : idx)}
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <span
                      className="rank-badge"
                      style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      #{comp.rank}
                    </span>
                    <div className="competitor-info" style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="competitor-title"
                        style={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {comp.title}
                      </div>
                      <div
                        className="competitor-url"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {comp.url}
                      </div>

                      {/* 進階 SERP 資訊標籤 (Advanced API 帶來的額外價值) */}
                      <div
                        className="advanced-badges"
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginTop: '0.4rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {project?.serp_results?.[idx]?.faq &&
                          project.serp_results[idx].faq!.length > 0 && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                background: 'rgba(139, 92, 246, 0.2)',
                                color: '#A78BFA',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                              }}
                            >
                              💬 FAQ ({project.serp_results[idx].faq!.length})
                            </span>
                          )}
                        {project?.serp_results?.[idx]?.sitelinks &&
                          project.serp_results[idx].sitelinks!.length > 0 && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34D399',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              🔗 Sitelinks ({project.serp_results[idx].sitelinks!.length})
                            </span>
                          )}
                        {project?.serp_results?.[idx]?.rating && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#FBBF24',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            ⭐ {project.serp_results[idx].rating.value} (
                            {project.serp_results[idx].rating.votes_count})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="expand-trigger" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {expandedCompetitor === idx ? '收合 ▲' : '分析 ➔'}
                    </div>
                  </div>

                  {expandedCompetitor === idx && (
                    <div
                      className="competitor-structure-tree animate-slide-down"
                      style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--color-border)' }}
                    >
                      <div
                        className="structure-meta"
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '1rem 0',
                          fontSize: '0.8rem',
                          opacity: 0.8,
                        }}
                      >
                        <div className="stat-item">
                          <span>預估字數：</span>
                          <strong>{comp.structure.content_stats.word_count || 'N/A'}</strong>
                        </div>
                        <div className="stat-item">
                          <span>圖片：</span>
                          <strong>{comp.structure.content_stats.images_count || 0}</strong>
                        </div>
                      </div>

                      <div
                        className="h-tag-list"
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          background: 'rgba(0,0,0,0.1)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                        }}
                      >
                        {comp.structure.h_tags.length > 0 ? (
                          comp.structure.h_tags.map((h, hIdx) => (
                            <div
                              key={hIdx}
                              className={`h-tag-item tag-${h.tag}`}
                              style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginBottom: '0.35rem',
                                fontSize: '0.85rem',
                              }}
                            >
                              <span
                                className="h-badge"
                                style={{
                                  fontSize: '0.65rem',
                                  background:
                                    h.tag === 'h2'
                                      ? 'rgba(7, 137, 240, 0.2)'
                                      : 'rgba(255,255,255,0.1)',
                                  padding: '0 0.25rem',
                                  borderRadius: '2px',
                                  height: 'fit-content',
                                }}
                              >
                                {h.tag.toUpperCase()}
                              </span>
                              <span className="h-text">{h.text}</span>
                            </div>
                          ))
                        ) : (
                          <div
                            className="structure-empty"
                            style={{
                              textAlign: 'center',
                              padding: '1rem',
                              opacity: 0.5,
                              fontSize: '0.8rem',
                            }}
                          >
                            <p>無法解析該網頁結構</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-competitors">無有效的競爭對手數據</div>
            )}
          </div>
        )}
      </div>

      <div className="analysis-footer">
        <Button
          variant="cta"
          size="lg"
          fullWidth
          disabled={!selectedIntent || !selectedStyle}
          onClick={handleApplyStrategy}
        >
          確認套用策略並開始撰寫大綱 ➔
        </Button>
      </div>
    </div>
  );
};
