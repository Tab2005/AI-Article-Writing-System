import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Select } from '../components/ui';
import { projectsApi } from '../services/api';
import type { AnalysisResponse } from '../types';
import { SearchIntent, WritingStyle, OptimizationMode } from '../types';
import './ProjectNewPage.css';

export const ProjectNewPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const projectData = location.state as AnalysisResponse | null; // 從關鍵字分析傳來的數據

    const [formData, setFormData] = useState<ProjectCreate>({
        primary_keyword: projectData?.keyword || '',
        country: 'TW',
        language: 'zh-TW',
        optimization_mode: OptimizationMode.SEO,
    });

    const [selectedTitle, setSelectedTitle] = useState('');
    const [selectedIntent, setSelectedIntent] = useState<SearchIntent | ''>('');
    const [selectedStyle, setSelectedStyle] = useState<WritingStyle | ''>('');
    const [loading, setLoading] = useState(false);

    // 如果有傳來的分析數據，預填表單
    useEffect(() => {
        if (projectData) {
            setSelectedIntent(projectData.intent);
            setSelectedStyle(projectData.suggested_style);
            if (projectData.title_suggestions?.length > 0) {
                setSelectedTitle(projectData.title_suggestions[0].title);
            }
        }
    }, [projectData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 創建專案
            const project = await projectsApi.create(formData);

            // 如果有選擇的標題和風格，更新專案
            if (selectedTitle || selectedIntent || selectedStyle) {
                await projectsApi.update(project.project_id, {
                    selected_title: selectedTitle,
                    intent: selectedIntent as SearchIntent,
                    style: selectedStyle as WritingStyle,
                });
            }

            // 導航到專案詳情頁面
            navigate(`/projects/${project.project_id}`);
        } catch (error) {
            console.error('創建專案失敗:', error);
            // TODO: 顯示錯誤訊息
        } finally {
            setLoading(false);
        }
    };

    const intentOptions = [
        { value: 'informational', label: '資訊型' },
        { value: 'commercial', label: '商業型' },
        { value: 'navigational', label: '導航型' },
        { value: 'transactional', label: '交易型' },
    ];

    const optimizationOptions = [
        { value: 'seo', label: 'SEO 優化' },
        { value: 'aeo', label: 'AEO 優化' },
        { value: 'geo', label: 'GEO 優化' },
        { value: 'hybrid', label: '混合優化' },
    ];

    return (
        <div className="project-new-page">
            <div className="project-new-container">
                <div className="project-new-header">
                    <h1 className="project-new-title">新建專案</h1>
                    <p className="project-new-subtitle">
                        從關鍵字分析結果創建新專案，自動帶入分析數據
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="project-new-form">
                    {/* 基本信息 */}
                    <div className="form-section">
                        <h2 className="form-section-title">基本信息</h2>

                        <div className="form-group">
                            <label htmlFor="primary_keyword" className="form-label">
                                主要關鍵字 *
                            </label>
                            <Input
                                id="primary_keyword"
                                type="text"
                                value={formData.primary_keyword}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    primary_keyword: e.target.value
                                }))}
                                placeholder="輸入主要關鍵字"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <Select
                                    label="國家/地區"
                                    value={formData.country}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        country: e.target.value
                                    }))}
                                    options={[
                                        { value: 'TW', label: '台灣' },
                                        { value: 'CN', label: '中國大陸' },
                                        { value: 'HK', label: '香港' },
                                        { value: 'US', label: '美國' },
                                    ]}
                                />
                            </div>

                            <div className="form-group">
                                <Select
                                    label="語言"
                                    value={formData.language}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        language: e.target.value
                                    }))}
                                    options={[
                                        { value: 'zh-TW', label: '繁體中文' },
                                        { value: 'zh-CN', label: '簡體中文' },
                                        { value: 'en-US', label: '英文' },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <Select
                                label="優化模式"
                                value={formData.optimization_mode}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    optimization_mode: e.target.value as OptimizationMode
                                }))}
                                options={optimizationOptions}
                            />
                        </div>
                    </div>

                    {/* 分析數據（如果有的話） */}
                    {projectData && (
                        <div className="form-section">
                            <h2 className="form-section-title">分析數據</h2>

                            <div className="analysis-preview">
                                <div className="analysis-item">
                                    <label className="analysis-label">搜尋意圖:</label>
                                    <span className="analysis-value">
                                        {intentOptions.find(opt => opt.value === selectedIntent)?.label || '未選擇'}
                                    </span>
                                </div>

                                <div className="analysis-item">
                                    <label className="analysis-label">建議風格:</label>
                                    <span className="analysis-value">
                                        {selectedStyle || '未選擇'}
                                    </span>
                                </div>

                                {projectData.keywords && (
                                    <div className="analysis-item">
                                        <label className="analysis-label">延伸關鍵字:</label>
                                        <div className="keyword-tags">
                                            {projectData.keywords.secondary_keywords?.map((kw: string, i: number) => (
                                                <span key={i} className="keyword-tag">{kw}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <Select
                                    label="選擇標題"
                                    value={selectedTitle}
                                    onChange={(e) => setSelectedTitle(e.target.value)}
                                    options={projectData.title_suggestions?.map((suggestion) => ({
                                        value: suggestion.title,
                                        label: `${suggestion.title} (CTR: ${Math.round(suggestion.ctr_score * 100)}%)`
                                    })) || []}
                                />
                            </div>
                        </div>
                    )}

                    {/* 動作按鈕 */}
                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate(-1)}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                        >
                            創建專案
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};