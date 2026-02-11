import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, KPICard } from '../components/ui';
import { projectsApi, analysisApi } from '../services/api';
import type { ProjectState, AnalysisResponse, SearchIntent, WritingStyle, OptimizationMode } from '../types';
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
            const titles = project.serp_results?.map(r => r.title) || [];

            const res = await analysisApi.analyzeIntent({
                keyword: project.primary_keyword,
                titles: titles,
                content_samples: [] // 未來可擴充
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
                    extracted_keywords: analysisResult?.keywords
                }
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
        { id: 'informational', label: '資訊型', desc: '用戶想要了解知識或資訊', color: 'var(--color-primary)' },
        { id: 'commercial', label: '商業型', desc: '用戶正在研究產品或服務', color: 'var(--color-cta)' },
        { id: 'navigational', label: '導航型', desc: '用戶想要找到特定網站', color: 'var(--color-success)' },
        { id: 'transactional', label: '交易型', desc: '用戶準備採取購買行動', color: '#8B5CF6' },
    ];

    if (loading && !project) return <div className="analysis-page"><div className="analysis-empty-state">載入專案中...</div></div>;
    if (error && !project) return <div className="analysis-page"><div className="analysis-empty-state"><h3>錯誤</h3><p>{error}</p><Button onClick={() => navigate('/projects')}>返回專案列表</Button></div></div>;

    return (
        <div className="analysis-page">
            <div className="analysis-header">
                <h2 className="analysis-header__title">意圖分析引擎</h2>
                <p className="analysis-header__desc">
                    核心關鍵字：<strong>{project?.primary_keyword}</strong>
                </p>
                <div className="analysis-header__actions">
                    <Button variant="secondary" onClick={() => navigate(-1)}>返回</Button>
                    <Button
                        variant="cta"
                        onClick={handleRunAnalysis}
                        loading={analyzing}
                    >
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
                            value={intentTypes.find(i => i.id === analysisResult.intent_analysis.intent)?.label || '未知'}
                        />
                        <KPICard
                            title="信心度"
                            value={`${Math.round(analysisResult.intent_analysis.confidence * 100)}%`}
                        />
                        <KPICard
                            title="建議風格"
                            value={analysisResult.suggested_style}
                        />
                    </div>

                    <div className="analysis-signals">
                        <h4>偵測信號：</h4>
                        <div className="signals-list">
                            {analysisResult.intent_analysis.signals.map((s, i) => (
                                <span key={i} className="signal-tag">{s}</span>
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
                        {intentTypes.map(intent => (
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
                            {['seo', 'aeo', 'geo', 'hybrid'].map(mode => (
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
                            <option value="" disabled>請選擇風格...</option>
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
                                    <span key={i} className="kw-tag">{kw}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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
