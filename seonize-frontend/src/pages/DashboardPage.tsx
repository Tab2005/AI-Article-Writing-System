import React, { useState, useEffect } from 'react';
import { KPICard, DataTable, Button } from '../components/ui';
import { projectsApi } from '../services/api';
import type { ProjectState } from '../types';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectState[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await projectsApi.list();
            setProjects(data);
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Use mock data for demo
            setProjects([
                {
                    project_id: '1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    primary_keyword: 'SEO 優化技巧',
                    country: 'TW',
                    language: 'zh-TW',
                    intent: 'informational' as const,
                    style: '專業教育風' as const,
                    optimization_mode: 'seo' as const,
                    serp_results: [],
                    keywords: { secondary: ['關鍵字研究', '內容優化'], lsi: [] },
                    candidate_titles: [],
                    full_content: '',
                    word_count: 2500,
                    keyword_density: { 'SEO': 2.5 },
                },
                {
                    project_id: '2',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    updated_at: new Date(Date.now() - 86400000).toISOString(),
                    primary_keyword: '數位行銷策略',
                    country: 'TW',
                    language: 'zh-TW',
                    intent: 'commercial' as const,
                    style: '評論風' as const,
                    optimization_mode: 'hybrid' as const,
                    serp_results: [],
                    keywords: { secondary: ['社群行銷', 'SEO'], lsi: [] },
                    candidate_titles: [],
                    full_content: '',
                    word_count: 1800,
                    keyword_density: { '數位行銷': 1.8 },
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'primary_keyword',
            header: '關鍵字',
            render: (value: unknown) => (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {String(value)}
                </span>
            ),
        },
        {
            key: 'intent',
            header: '意圖',
            render: (value: unknown) => {
                const intentLabels: Record<string, string> = {
                    informational: '資訊型',
                    commercial: '商業型',
                    navigational: '導航型',
                    transactional: '交易型',
                };
                return (
                    <span className={`intent-badge intent-badge--${value}`}>
                        {intentLabels[String(value)] || '-'}
                    </span>
                );
            },
        },
        {
            key: 'word_count',
            header: '字數',
            render: (value: unknown) => (
                <span style={{ fontFamily: 'var(--font-display)' }}>
                    {Number(value).toLocaleString()}
                </span>
            ),
        },
        {
            key: 'optimization_mode',
            header: '優化模式',
            render: (value: unknown) => {
                const modeLabels: Record<string, string> = {
                    seo: 'SEO',
                    aeo: 'AEO',
                    geo: 'GEO',
                    hybrid: '混合',
                };
                return <span className="mode-tag">{modeLabels[String(value)] || '-'}</span>;
            },
        },
        {
            key: 'updated_at',
            header: '更新時間',
            render: (value: unknown) => new Date(String(value)).toLocaleDateString('zh-TW'),
        },
    ];

    return (
        <div className="dashboard-page">
            {/* KPI Cards */}
            <div className="dashboard-kpi-grid">
                <KPICard
                    title="總專案數"
                    value={projects.length}
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                    }
                    loading={loading}
                />
                <KPICard
                    title="平均字數"
                    value={Math.round(projects.reduce((sum, p) => sum + p.word_count, 0) / Math.max(projects.length, 1))}
                    suffix="字"
                    change={12}
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3,6 3,3 21,3 21,6" />
                            <path d="M3 10h18" />
                            <path d="M3 14h18" />
                            <polyline points="3,18 3,21 21,21 21,18" />
                        </svg>
                    }
                    loading={loading}
                />
                <KPICard
                    title="資訊型專案"
                    value={projects.filter(p => p.intent === 'informational').length}
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                        </svg>
                    }
                    loading={loading}
                />
                <KPICard
                    title="SEO 優化"
                    value={projects.filter(p => p.optimization_mode === 'seo' || p.optimization_mode === 'hybrid').length}
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    }
                    loading={loading}
                />
            </div>

            {/* Projects Table */}
            <div className="dashboard-section">
                <div className="dashboard-section__header">
                    <h2 className="dashboard-section__title">最近專案</h2>
                    <Button variant="primary" size="sm">
                        新建專案
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={projects}
                    loading={loading}
                    onRowClick={(project) => console.log('Selected project:', project)}
                    emptyMessage="尚無專案，點擊「新建專案」開始"
                />
            </div>

            {/* Quick Actions */}
            <div className="dashboard-actions">
                <h3 className="dashboard-actions__title">快速操作</h3>
                <div className="dashboard-actions__grid">
                    <button className="quick-action-card">
                        <div className="quick-action-card__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>
                        <span className="quick-action-card__label">關鍵字研究</span>
                    </button>
                    <button className="quick-action-card">
                        <div className="quick-action-card__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </div>
                        <span className="quick-action-card__label">意圖分析</span>
                    </button>
                    <button className="quick-action-card">
                        <div className="quick-action-card__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" x2="21" y1="6" y2="6" />
                                <line x1="8" x2="21" y1="12" y2="12" />
                                <line x1="8" x2="21" y1="18" y2="18" />
                                <line x1="3" x2="3.01" y1="6" y2="6" />
                                <line x1="3" x2="3.01" y1="12" y2="12" />
                                <line x1="3" x2="3.01" y1="18" y2="18" />
                            </svg>
                        </div>
                        <span className="quick-action-card__label">大綱生成</span>
                    </button>
                    <button className="quick-action-card">
                        <div className="quick-action-card__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                            </svg>
                        </div>
                        <span className="quick-action-card__label">內容撰寫</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
