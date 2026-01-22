import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable } from '../components/ui';
import { projectsApi } from '../services/api';
import type { ProjectState } from '../types';
import { SearchIntent, WritingStyle, OptimizationMode } from '../types';
import './ProjectsPage.css';

type ProjectColumn = {
    key: keyof ProjectState | string;
    header: string;
    width?: string;
    render?: (value: unknown, row: ProjectState) => React.ReactNode;
};

export const ProjectsPage: React.FC = () => {
    const navigate = useNavigate();
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
                    intent: SearchIntent.INFORMATIONAL,
                    style: WritingStyle.EDUCATIONAL,
                    optimization_mode: OptimizationMode.SEO,
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
                    intent: SearchIntent.COMMERCIAL,
                    style: WritingStyle.REVIEW,
                    optimization_mode: OptimizationMode.HYBRID,
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

    const columns: ProjectColumn[] = [
        {
            key: 'primary_keyword',
            header: '主要關鍵字',
            render: (value: unknown) => (
                <span className="keyword-cell">{String(value)}</span>
            ),
        },
        {
            key: 'intent',
            header: '搜尋意圖',
            render: (value: unknown) => {
                const intentLabels: Record<string, { label: string; color: string }> = {
                    informational: { label: '資訊型', color: 'var(--color-primary)' },
                    commercial: { label: '商業型', color: 'var(--color-cta)' },
                    navigational: { label: '導航型', color: 'var(--color-success)' },
                    transactional: { label: '交易型', color: '#8B5CF6' },
                };
                const intent = intentLabels[String(value)];
                return intent ? (
                    <span className="intent-tag" style={{ backgroundColor: intent.color + '20', color: intent.color }}>
                        {intent.label}
                    </span>
                ) : '-';
            },
        },
        {
            key: 'style',
            header: '寫作風格',
            render: (value: unknown) => {
                const styleLabels: Record<string, string> = {
                    '專業教育風': '教育風',
                    '評論風': '評論風',
                    '新聞風': '新聞風',
                    '對話風': '對話風',
                    '技術風': '技術風',
                };
                return <span>{styleLabels[String(value)] || '-'}</span>;
            },
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
            key: 'word_count',
            header: '字數',
            render: (value: unknown) => `${String(value)} 字`,
        },
        {
            key: 'updated_at',
            header: '更新時間',
            render: (value: unknown) => new Date(String(value)).toLocaleDateString('zh-TW'),
        },
    ];

    return (
        <div className="projects-page">
            <div className="projects-header">
                <div className="projects-header__content">
                    <h1 className="projects-title">專案列表</h1>
                    <p className="projects-subtitle">管理您的所有專案</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => navigate('/keyword')}
                    className="projects-create-btn"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    新建專案
                </Button>
            </div>

            <div className="projects-content">
                <DataTable<ProjectState>
                    columns={columns}
                    data={projects}
                    loading={loading}
                    onRowClick={(project) => navigate(`/projects/${project.project_id}`)}
                    emptyMessage="尚無專案，點擊「新建專案」開始"
                />
            </div>
        </div>
    );
};