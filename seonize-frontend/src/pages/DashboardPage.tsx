import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard, DataTable, Button } from '../components/ui';
import { projectsApi } from '../services/api';
import { formatDate } from '../utils/date-utils';
import type { ProjectState } from '../types';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.list();
      setProjects(data);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      setError('加載專案失敗，請確認資料庫已同步。');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'primary_keyword',
      header: '關鍵字',
      render: (value: unknown) => (
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{String(value)}</span>
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
        <span style={{ fontFamily: 'var(--font-display)' }}>{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'optimization_mode',
      header: '進度',
      render: (_: unknown, row: ProjectState) => {
        let status = 'research';
        let label = '研究中';
        if (row.word_count > 1000) {
          status = 'completed';
          label = '已完稿';
        } else if (row.word_count > 0) {
          status = 'writing';
          label = '撰寫中';
        } else if (row.selected_title || (row.outline && row.outline.sections.length > 0)) {
          status = 'planning';
          label = '規劃中';
        }

        return (
          <div className="table-status-group">
            <span className={`status-dot status-dot--${status}`}></span>
            <span className="status-text">{label}</span>
          </div>
        );
      },
    },
    {
      key: 'project_id',
      header: '操作',
      render: (value: unknown, row: ProjectState) => (
        <Button
          variant={row.word_count > 0 ? 'cta' : 'secondary'}
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            navigate(`/projects/${value}/writing`);
          }}
        >
          {row.word_count > 0 ? '繼續撰寫' : '開始寫作'}
        </Button>
      ),
    },
    {
      key: 'updated_at',
      header: '更新時間',
      render: (value: unknown) => formatDate(String(value)),
    },
  ];

  // 計算進階指標
  const stats = useMemo(() => {
    if (projects.length === 0) return { totalWords: 0, avgEEAT: 0, avgKeywords: 0 };

    const totalWords = projects.reduce((sum, p) => sum + (p.word_count || 0), 0);
    const avgEEAT = projects.reduce((sum, p) => sum + (p.eeat_score || 0), 0) / projects.length;

    const avgKeywords =
      projects.reduce((sum, p) => sum + (p.keywords?.secondary?.length || 0), 0) / projects.length;

    return {
      totalWords,
      avgEEAT: Math.round(avgEEAT * 10) / 10,
      avgKeywords: Math.round(avgKeywords * 10) / 10,
    };
  }, [projects]);

  // 專案狀態漏斗邏輯
  const funnelData = useMemo(() => {
    const counts = { research: 0, planning: 0, writing: 0, completed: 0 };

    projects.forEach((p) => {
      if (p.word_count > 1000) counts.completed++;
      else if (p.word_count > 0) counts.writing++;
      else if (p.selected_title || (p.outline && p.outline.sections.length > 0)) counts.planning++;
      else counts.research++;
    });

    return [
      { status: 'research', label: '研究階段', count: counts.research },
      { status: 'planning', label: '規劃階段', count: counts.planning },
      { status: 'writing', label: '撰寫中', count: counts.writing },
      { status: 'completed', label: '已完稿', count: counts.completed },
    ];
  }, [projects]);

  // 策略分佈邏輯
  const intentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    projects.forEach((p) => {
      if (p.intent) stats[p.intent] = (stats[p.intent] || 0) + 1;
    });
    return stats;
  }, [projects]);

  const modeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    projects.forEach((p) => {
      if (p.optimization_mode) stats[p.optimization_mode] = (stats[p.optimization_mode] || 0) + 1;
    });
    return stats;
  }, [projects]);

  return (
    <div className="dashboard-page">
      <h1 className="page-title">數據儀表板</h1>

      {error && (
        <div className="dashboard-error-alert" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        <KPICard
          title="總專案數"
          value={projects.length}
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
          loading={loading}
        />
        <KPICard
          title="累積產出字數"
          value={stats.totalWords.toLocaleString()}
          suffix="字"
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
          loading={loading}
        />
        <KPICard
          title="平均權威度 (E-E-A-T)"
          value={stats.avgEEAT}
          suffix="/100"
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
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          loading={loading}
        />
        <KPICard
          title="平均關鍵字組數"
          value={stats.avgKeywords}
          suffix="組"
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
          loading={loading}
        />
      </div>

      {/* 專案狀態漏斗 & 策略分析 */}
      <div className="dashboard-grid-layout">
        <div className="dashboard-section funnel-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">專案開發漏斗</h2>
          </div>
          <div className="funnel-container">
            {funnelData.map((item) => (
              <div key={item.status} className="funnel-item">
                <div className="funnel-bar-wrapper">
                  <div
                    className={`funnel-bar funnel-bar--${item.status}`}
                    style={{ width: `${(item.count / Math.max(projects.length, 1)) * 100}%` }}
                  >
                    <span className="funnel-count">{item.count}</span>
                  </div>
                </div>
                <div className="funnel-label">
                  <span className="funnel-name">{item.label}</span>
                  <span className="funnel-percent">
                    {Math.round((item.count / Math.max(projects.length, 1)) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section distribution-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">SEO 策略分佈</h2>
          </div>
          <div className="distribution-container">
            <div className="dist-group">
              <h4 className="dist-title">搜尋意圖</h4>
              <div className="dist-list">
                {Object.entries(intentStats).map(([key, count]) => (
                  <div key={key} className="dist-item">
                    <span className={`dist-dot dist-dot--${key}`}></span>
                    <span className="dist-name">
                      {key === 'informational'
                        ? '資訊型'
                        : key === 'commercial'
                          ? '商業型'
                          : key === 'navigational'
                            ? '導航型'
                            : '交易型'}
                    </span>
                    <span className="dist-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dist-group">
              <h4 className="dist-title">優化模式</h4>
              <div className="dist-list">
                {Object.entries(modeStats).map(([key, count]) => (
                  <div key={key} className="dist-item">
                    <span className={`dist-dot dist-dot--${key}`}></span>
                    <span className="dist-name">{key.toUpperCase()}</span>
                    <span className="dist-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">最近專案</h2>
        </div>
        <DataTable
          columns={columns}
          data={projects.slice(0, 5)} // 只顯示前5筆資料
          loading={loading}
          onRowClick={(project) => navigate(`/projects/${project.project_id}`)}
          emptyMessage="尚無專案"
        />
      </div>
    </div>
  );
};
