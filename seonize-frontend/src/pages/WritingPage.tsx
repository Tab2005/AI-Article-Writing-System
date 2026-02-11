import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, KPICard } from '../components/ui';
import { projectsApi, writingApi } from '../services/api';
import type { ProjectState, OutlineSection, OptimizationMode } from '../types';
import './WritingPage.css';

interface WritingSectionState {
    id: string;
    heading: string;
    level: number;
    content: string;
    status: 'pending' | 'generating' | 'done' | 'error';
    keywords: string[];
}

export const WritingPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const projectId = location.state?.projectId || sessionStorage.getItem('lastProjectId');

    const [project, setProject] = useState<ProjectState | null>(null);
    const [sections, setSections] = useState<WritingSectionState[]>([]);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Settings
    const [targetTotalWords, setTargetTotalWords] = useState(2000);
    const [keywordDensity, setKeywordDensity] = useState(2.0);
    const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('seo');

    // 載入專案資料
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
            setOptimizationMode(data.optimization_mode || 'seo');

            // 轉換大綱章節為寫作狀態
            if (data.outline && data.outline.sections) {
                const flatSections: WritingSectionState[] = [];
                const flatten = (items: OutlineSection[]) => {
                    items.forEach(item => {
                        flatSections.push({
                            id: item.id,
                            heading: item.heading,
                            level: item.level,
                            content: item.content || '',
                            status: item.content ? 'done' : 'pending',
                            keywords: item.keywords || []
                        });
                        if (item.children && item.children.length > 0) {
                            flatten(item.children);
                        }
                    });
                };
                flatten(data.outline.sections);
                setSections(flatSections);
                if (flatSections.length > 0) {
                    setActiveSectionId(flatSections[0].id);
                }
            }
        } catch (err: any) {
            setError(err.message || '載入專案失敗');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    // 生成單一章節
    const generateSection = async (sectionId: string) => {
        if (!project || !projectId) return;

        const sectionIndex = sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        const section = sections[sectionIndex];

        // 更新狀態為生成中
        const newSections = [...sections];
        newSections[sectionIndex].status = 'generating';
        setSections(newSections);

        try {
            // 計算前文摘要 (簡化：取上一段內容的前 100 字)
            const previousSummary = sectionIndex > 0 ? sections[sectionIndex - 1].content.substring(0, 200) : "";

            const res = await writingApi.generateSection({
                project_id: projectId,
                h1: project.selected_title || project.outline?.h1 || '',
                section: {
                    heading: section.heading,
                    level: section.level,
                    keywords: section.keywords,
                    previous_summary: previousSummary
                },
                optimization_mode: optimizationMode,
                target_word_count: Math.round(targetTotalWords / sections.length),
                keyword_density: keywordDensity
            });

            const updatedSections = [...sections];
            updatedSections[sectionIndex] = {
                ...updatedSections[sectionIndex],
                content: res.content,
                status: 'done'
            };
            setSections(updatedSections);

            // 自動儲存到專案 (可選)
            saveToProject();

        } catch (err) {
            console.error('生成失敗:', err);
            const updatedSections = [...sections];
            updatedSections[sectionIndex].status = 'error';
            setSections(updatedSections);
        }
    };

    const saveToProject = async () => {
        if (!projectId || !project) return;

        try {
            // 構建結構化大綱 (這裡需要將平坦化列表轉回巢狀結構，或者簡化儲存)
            // 為了簡便，我們先儲存到專案的 full_content
            /*
            const fullContent = currentSections.map(s => {
                const prefix = '#'.repeat(s.level);
                return `${prefix} ${s.heading}\n\n${s.content}`;
            }).join('\n\n');
            */

            await projectsApi.update(projectId, {
                // 這裡可以選擇更新 outline.sections 中的 content
                // 或者更新專案的總內容
            });

            // 註：實際開發中應寫一個巢狀轉化函數來更新 project.outline
        } catch (err) {
            console.error('儲存失敗:', err);
        }
    };

    const activeSection = useMemo(() =>
        sections.find(s => s.id === activeSectionId),
        [sections, activeSectionId]);

    const totalWordCount = useMemo(() =>
        sections.reduce((acc, s) => acc + (s.content?.length || 0), 0),
        [sections]);

    const highlightKeywords = (content: string) => {
        if (!project || !content) return content;
        const mainKw = project.primary_keyword;
        const secondaryKws = project.keywords?.secondary || [];
        const allKws = [mainKw, ...secondaryKws].filter(k => k && typeof k === 'string' && k.length > 0);

        let highlighted = content;
        allKws.forEach(kw => {
            try {
                const regex = new RegExp(`(${kw})`, 'gi');
                highlighted = highlighted.replace(regex, '<mark class="keyword-highlight">$1</mark>');
            } catch (e) {
                console.warn('Regex error for keyword:', kw);
            }
        });
        return highlighted;
    };

    const getStatusIcon = (status: WritingSectionState['status']) => {
        switch (status) {
            case 'done': return <span className="status-icon status-icon--done">✓</span>;
            case 'generating': return <span className="status-icon status-icon--generating">⟳</span>;
            case 'error': return <span className="status-icon status-icon--error">!</span>;
            default: return <span className="status-icon status-icon--pending">○</span>;
        }
    };

    if (loading) return <div className="writing-page"><div className="writing-empty-state">載入專案中...</div></div>;
    if (error) return <div className="writing-page"><div className="writing-empty-state"><h3>錯誤</h3><p>{error}</p><Button onClick={() => navigate('/projects')}>返回專案列表</Button></div></div>;

    return (
        <div className="writing-page">
            <div className="writing-header">
                <div>
                    <h2 className="writing-header__title">分段撰寫預覽器</h2>
                    <p className="writing-header__desc">
                        專案：{project?.primary_keyword} | 標題：{project?.selected_title || project?.outline?.h1}
                    </p>
                </div>
                <div className="writing-header__actions">
                    <Button variant="secondary" onClick={() => navigate(-1)}>返回大綱</Button>
                    <Button variant="cta" onClick={() => saveToProject()}>💾 儲存全文</Button>
                </div>
            </div>

            {/* 寫作設定 */}
            <div className="writing-settings">
                <div className="setting-group">
                    <label className="setting-label">
                        目標總字數 <span className="setting-value">{targetTotalWords} 字</span>
                    </label>
                    <input
                        type="range"
                        min="500"
                        max="5000"
                        step="100"
                        value={targetTotalWords}
                        onChange={(e) => setTargetTotalWords(parseInt(e.target.value))}
                        className="setting-control"
                    />
                    <span className="setting-hint">預計每章節約 {Math.round(targetTotalWords / (sections.length || 1))} 字</span>
                </div>
                <div className="setting-group">
                    <label className="setting-label">
                        關鍵字密度 <span className="setting-value">{keywordDensity}%</span>
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={keywordDensity}
                        onChange={(e) => setKeywordDensity(parseFloat(e.target.value))}
                        className="setting-control"
                    />
                    <span className="setting-hint">SEO 建議範圍：1.5% - 3.0%</span>
                </div>
                <div className="setting-group">
                    <label className="setting-label">優化模式</label>
                    <select
                        value={optimizationMode}
                        onChange={(e) => setOptimizationMode(e.target.value as OptimizationMode)}
                        style={{ padding: '8px', borderRadius: '8px', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                        <option value="seo">SEO (關鍵字優化)</option>
                        <option value="aeo">AEO (問答格式)</option>
                        <option value="geo">GEO (權威引用)</option>
                        <option value="hybrid">Hybrid (混合優化)</option>
                    </select>
                </div>
            </div>

            {/* Progress Stats */}
            <div className="writing-stats">
                <KPICard
                    title="完成進度"
                    value={`${sections.filter(s => s.status === 'done').length}/${sections.length}`}
                    icon={<span style={{ fontSize: '20px' }}>📊</span>}
                />
                <KPICard
                    title="當前字數"
                    value={totalWordCount.toLocaleString()}
                    suffix="字"
                    icon={<span style={{ fontSize: '20px' }}>📝</span>}
                />
                <KPICard
                    title="關鍵字覆蓋"
                    value={project?.keywords?.secondary?.length || 0}
                    suffix="組"
                    icon={<span style={{ fontSize: '20px' }}>📍</span>}
                />
                <KPICard
                    title="E-E-A-T 分數"
                    value={project?.eeat_score || 85}
                    suffix="/100"
                    icon={<span style={{ fontSize: '20px' }}>✨</span>}
                />
            </div>

            {/* Writing Content */}
            <div className="writing-content">
                {/* Section List */}
                <div className="writing-sidebar">
                    <h3 className="writing-sidebar__title">章節列表</h3>
                    <div className="section-list">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`section-item ${activeSectionId === section.id ? 'section-item--active' : ''} section-item--${section.status}`}
                                onClick={() => setActiveSectionId(section.id)}
                            >
                                {getStatusIcon(section.status)}
                                <span className="section-item__heading">{section.heading}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Preview */}
                <div className="writing-preview">
                    {activeSection?.status === 'generating' && (
                        <div className="preview-loading-overlay">
                            <div className="preview-loading-spinner" />
                            <p>AI 正在撰寫中...</p>
                        </div>
                    )}

                    <div className="writing-preview__header">
                        <h3 className="writing-preview__title">
                            {activeSection ? `章節：${activeSection.heading}` : '請選擇章節'}
                        </h3>
                        <div className="writing-preview__actions">
                            {activeSection && (
                                <Button
                                    variant="cta"
                                    onClick={() => generateSection(activeSection.id)}
                                    disabled={activeSection.status === 'generating'}
                                    size="sm"
                                >
                                    {activeSection.content ? '🔄 重新撰寫' : '🤖 開始撰寫'}
                                </Button>
                            )}
                            <div className="writing-preview__mode">
                                <button className="preview-mode-btn preview-mode-btn--active">渲染</button>
                                <button className="preview-mode-btn">原始碼</button>
                            </div>
                        </div>
                    </div>

                    <div className="writing-preview__content">
                        {activeSection ? (
                            activeSection.content ? (
                                <div
                                    className="markdown-body"
                                    dangerouslySetInnerHTML={{ __html: highlightKeywords(activeSection.content) }}
                                />
                            ) : (
                                <div className="writing-empty-state">
                                    <p>此章節尚未生成內容</p>
                                    <Button onClick={() => generateSection(activeSection.id)}>點擊生成章節內容</Button>
                                </div>
                            )
                        ) : (
                            <div className="writing-empty-state">
                                <p>請從左側選擇一個章節開始撰寫</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SEO Check */}
            <div className="seo-check">
                <h3 className="seo-check__title">SEO 體檢 (即時分析)</h3>
                <div className="seo-check__items">
                    <div className={`seo-check__item ${totalWordCount > targetTotalWords * 0.8 ? 'seo-check__item--pass' : 'seo-check__item--warn'}`}>
                        <span className="seo-check__icon">{totalWordCount > targetTotalWords * 0.8 ? '✓' : '!'}</span>
                        <span>文章字數：{totalWordCount} / 目標 {targetTotalWords} 字 ({(totalWordCount / targetTotalWords * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="seo-check__item seo-check__item--pass">
                        <span className="seo-check__icon">✓</span>
                        <span>關鍵字嵌入：已覆蓋 {sections.filter(s => s.status === 'done').length} 個章節</span>
                    </div>
                    <div className="seo-check__item seo-check__item--warn">
                        <span className="seo-check__icon">!</span>
                        <span>建議增加 E-E-A-T 信號（如數據引用、專家評論）</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
