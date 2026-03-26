import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select } from '../components/ui';
import PublishModal from '../components/PublishModal';
import { projectsApi, cmsApi } from '../services/api';
import type { CMSConfig } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
import type { ProjectState } from '../types';
import { SearchIntent, WritingStyle } from '../types';
import './ProjectDetailPage.css';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<'render' | 'markdown'>('render');
  const [copySuccess, setCopySuccess] = useState(false);
  const [cmsConfigs, setCmsConfigs] = useState<CMSConfig[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const [projectData, cmsData] = await Promise.all([
        projectsApi.get(projectId),
        cmsApi.listConfigs()
      ]);
      setProject(projectData);
      setCmsConfigs(cmsData);
    } catch (error) {
      console.error('載入專案失敗:', error);
      // 如果專案不存在，跳轉回儀表板
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (projectId) {
      loadProject();
      // 存儲當前專案 ID 到 session，方便從側邊欄點擊分析頁面時能找回上下文
      sessionStorage.setItem('lastProjectId', projectId);
    }
  }, [projectId, loadProject]);

  const handleSave = async () => {
    if (!project) return;

    try {
      await projectsApi.update(project.project_id, {
        selected_title: project.selected_title,
        intent: project.intent,
        style: project.style,
        cms_config_id: project.cms_config_id,
      });
      setEditing(false);
    } catch (error) {
      console.error('更新專案失敗:', error);
    }
  };

  const handleCopy = () => {
    if (!project?.full_content) return;
    navigator.clipboard.writeText(project.full_content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDelete = async () => {
    if (!project) return;

    try {
      await projectsApi.delete(project.project_id);
      navigate('/projects');
    } catch (error) {
      console.error('刪除專案失敗:', error);
    }
  };

  const handleStartAnalysis = () => {
    navigate('/analysis', { state: { projectId: project?.project_id } });
  };

  const handleStartOutline = () => {
    navigate('/outline', { state: { projectId: project?.project_id } });
  };

  const handleStartWriting = () => {
    navigate('/writing', { state: { projectId: project?.project_id } });
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="loading">載入中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="error">專案不存在</div>
      </div>
    );
  }

  const intentLabels: Record<string, { label: string; color: string }> = {
    informational: { label: '資訊型', color: 'var(--color-primary)' },
    commercial: { label: '商業型', color: 'var(--color-cta)' },
    navigational: { label: '導航型', color: 'var(--color-success)' },
    transactional: { label: '交易型', color: '#8B5CF6' },
  };

  const styleLabels: Record<string, string> = {
    專業風: '專業風',
    評論風: '評論風',
    新聞風: '新聞風',
    對話風: '對話風',
    技術風: '技術風',
    開箱風: '開箱風',
    懶人包: '懶人包',
    故事風: '故事風',
  };

  const optimizationLabels: Record<string, string> = {
    seo: 'SEO 優化',
    aeo: 'AEO 優化',
    geo: 'GEO 優化',
    hybrid: '混合優化',
  };

  return (
    <div className="project-detail-page">
      <div className="project-detail-header">
        <div className="project-detail-header__content">
          <h1 className="project-detail-title">{project.primary_keyword}</h1>
          <div className="project-detail-meta">
            <span className="project-detail-meta__item">
              建立時間: {new Date(project.created_at).toLocaleString('zh-TW')}
            </span>
            <span className="project-detail-meta__item">
              更新時間: {new Date(project.updated_at).toLocaleString('zh-TW')}
            </span>
          </div>
        </div>
        <div className="project-detail-actions">
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            返回列表
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm(true)}
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          >
            刪除專案
          </Button>
          <Button variant="primary" onClick={() => setEditing(!editing)}>
            {editing ? '取消編輯' : '編輯專案'}
          </Button>
        </div>
      </div>

      <div className="project-detail-content">
        {/* 專案資訊 */}
        <div className="project-info-section">
          <h2 className="section-title">專案資訊</h2>
          <div className="project-info-grid">
            <div className="info-item">
              <label className="info-label">主要關鍵字</label>
              <div className="info-value">{project.primary_keyword}</div>
            </div>
            <div className="info-item">
              <label className="info-label">國家/地區</label>
              <div className="info-value">{project.country}</div>
            </div>
            <div className="info-item">
              <label className="info-label">語言</label>
              <div className="info-value">{project.language}</div>
            </div>
            <div className="info-item">
              <label className="info-label">優化模式</label>
              <div className="info-value">{optimizationLabels[project.optimization_mode]}</div>
            </div>
          </div>
        </div>

        {/* 分析設定 */}
        <div className="project-analysis-section">
          <h2 className="section-title">分析設定</h2>
          <div className="analysis-settings-grid">
            <div className="setting-item">
              <label className="setting-label">搜尋意圖</label>
              {editing ? (
                <Select
                  value={project.intent || ''}
                  onChange={(e) =>
                    setProject((prev) =>
                      prev
                        ? {
                          ...prev,
                          intent: e.target.value as SearchIntent,
                        }
                        : null
                    )
                  }
                  options={[
                    { value: 'informational', label: '資訊型' },
                    { value: 'commercial', label: '商業型' },
                    { value: 'navigational', label: '導航型' },
                    { value: 'transactional', label: '交易型' },
                  ]}
                />
              ) : (
                <div className="setting-value">
                  {project.intent ? intentLabels[project.intent]?.label : '未設定'}
                </div>
              )}
            </div>

            <div className="setting-item">
              <label className="setting-label">預設發布站點</label>
              {editing ? (
                <Select
                  value={project.cms_config_id || ''}
                  onChange={(e) =>
                    setProject((prev) =>
                      prev
                        ? {
                          ...prev,
                          cms_config_id: e.target.value,
                        }
                        : null
                    )
                  }
                  options={[
                    { value: '', label: '不預設' },
                    ...cmsConfigs.map(c => ({ value: c.id, label: c.name }))
                  ]}
                />
              ) : (
                <div className="setting-value">
                  {project.cms_config_id
                    ? cmsConfigs.find(c => c.id === project.cms_config_id)?.name || '已失效站點'
                    : '未設定'}
                </div>
              )}
            </div>

            <div className="setting-item">
              <label className="setting-label">寫作風格</label>
              {editing ? (
                <Select
                  value={project.style || ''}
                  onChange={(e) =>
                    setProject((prev) =>
                      prev
                        ? {
                          ...prev,
                          style: e.target.value as WritingStyle,
                        }
                        : null
                    )
                  }
                  options={[
                    { value: '專業風', label: '專業風' },
                    { value: '評論風', label: '評論風' },
                    { value: '新聞風', label: '新聞風' },
                    { value: '對話風', label: '對話風' },
                    { value: '技術風', label: '技術風' },
                    { value: '開箱風', label: '開箱風' },
                    { value: '懶人包', label: '懶人包' },
                    { value: '故事風', label: '故事風' },
                  ]}
                />
              ) : (
                <div className="setting-value">
                  {project.style ? styleLabels[project.style] : '未設定'}
                </div>
              )}
            </div>

            <div className="setting-item">
              <label className="setting-label">選擇標題</label>
              {editing ? (
                <>
                  <Input
                    value={project.selected_title || ''}
                    onChange={(e) =>
                      setProject((prev) =>
                        prev
                          ? {
                            ...prev,
                            selected_title: e.target.value,
                          }
                          : null
                      )
                    }
                    placeholder="輸入文章標題"
                    fullWidth
                  />
                  {project.candidate_titles && project.candidate_titles.length > 0 && (
                    <div className="candidate-titles-list">
                      <p className="candidate-titles-title">AI 建議候選標題 (點擊切換)：</p>
                      {project.candidate_titles.map((title, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`candidate-title-item ${project.selected_title === title ? 'candidate-title-item--active' : ''}`}
                          onClick={() =>
                            setProject((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  selected_title: title,
                                }
                                : null
                            )
                          }
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="setting-value">{project.selected_title || '未設定'}</div>
              )}
            </div>
          </div>

          {editing && (
            <div className="edit-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  loadProject(); // 取消編輯時重載以還原數值
                }}
              >
                取消
              </Button>
              <Button variant="primary" onClick={handleSave}>
                儲存
              </Button>
            </div>
          )}
        </div>

        {/* 內容預覽 */}
        {project.full_content && (
          <div className="project-preview-section">
            <div className="section-header-with-actions">
              <h2 className="section-title">文章預覽</h2>
              <div className="preview-actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowPublishModal(true)}
                  style={{ marginRight: 'var(--space-2)' }}
                >
                  🚀 發布至 CMS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className={copySuccess ? 'copy-success' : ''}
                >
                  {copySuccess ? '✅ 已複製' : '📋 複製全文'}
                </Button>
                <div className="preview-toggle-group">
                  <button
                    className={`toggle-btn ${previewMode === 'render' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('render')}
                  >
                    渲染
                  </button>
                  <button
                    className={`toggle-btn ${previewMode === 'markdown' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('markdown')}
                  >
                    Markdown
                  </button>
                </div>
              </div>
            </div>

            <div className="preview-container card">
              {previewMode === 'render' ? (
                <div
                  className="preview-render markdown-body"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(project.full_content) }}
                />
              ) : (
                <pre className="preview-markdown">{project.full_content}</pre>
              )}
            </div>
          </div>
        )}
        <div className="project-workflow-section">
          <h2 className="section-title">工作流程</h2>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="workflow-step__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="m20.2 10.3-1.4-1.4" />
                </svg>
              </div>
              <div className="workflow-step__content">
                <h3 className="workflow-step__title">意圖分析引擎</h3>
                <p className="workflow-step__desc">AI 診斷搜尋意圖並自動匹配風格</p>
                <Button variant="secondary" size="sm" onClick={handleStartAnalysis}>
                  開始分析
                </Button>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-step__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <div className="workflow-step__content">
                <h3 className="workflow-step__title">大綱撰寫</h3>
                <p className="workflow-step__desc">建立文章結構和內容大綱</p>
                <Button variant="secondary" size="sm" onClick={handleStartOutline}>
                  開始撰寫
                </Button>
              </div>
            </div>

            <div className="workflow-step">
              <div className="workflow-step__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>
              <div className="workflow-step__content">
                <h3 className="workflow-step__title">內容寫作</h3>
                <p className="workflow-step__desc">生成優化內容和最終文章</p>
                <Button variant="secondary" size="sm" onClick={handleStartWriting}>
                  開始寫作
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && project && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text)' }}>確認刪除專案</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-secondary)' }}>
              您確定要刪除專案「{project.primary_keyword}」嗎？此操作無法撤銷。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
                取消
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPublishModal && project && (
        <PublishModal
          targetType="project"
          targetId={project.project_id}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </div>
  );
};
