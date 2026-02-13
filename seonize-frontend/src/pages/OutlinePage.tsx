import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { analysisApi, projectsApi } from '../services/api';
import './OutlinePage.css';

interface OutlineItem {
  id: string;
  heading: string;
  level: number;
  keywords: string[];
  description?: string;
}

export const OutlinePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = location.state?.projectId || sessionStorage.getItem('lastProjectId');

  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [h1, setH1] = useState<string>('');
  const [logicChain, setLogicChain] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 載入專案與現有大綱
  const loadProject = useCallback(async () => {
    if (!projectId) {
      setError('找不到專案 ID，請從專案頁面進入');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const project = await projectsApi.get(projectId);

      // 如果專案已有大綱，載入它
      if (project.outline && project.outline.sections && project.outline.sections.length > 0) {
        setH1(project.outline.h1 || project.selected_title || '');
        setOutline(project.outline.sections || []);
        setLogicChain(['✓ 已載入專案大綱']);
      } else {
        // 沒有現有大綱，但載入專案已選定的標題
        setH1(project.selected_title || '');
        setOutline([]);
        setLogicChain([]);
      }
    } catch (err: any) {
      console.error('載入專案失敗:', err);
      setError(err.message || '無法載入專案資料');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // AI 生成大綱
  const generateOutline = useCallback(async () => {
    if (!projectId) {
      setError('找不到專案 ID，請從專案頁面進入');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 先獲取專案資訊 (為了關鍵字)
      const project = await projectsApi.get(projectId);

      // 2. 調用 AI 生成大綱 (後端會自動讀取 research_data)
      const res = await analysisApi.generateOutline({
        project_id: projectId,
        keyword: project.primary_keyword,
        intent: (project.intent as any) || 'informational',
        selected_keywords: project.keywords?.secondary || [],
      });

      setH1(res.h1);
      setOutline(res.sections);
      setLogicChain(res.logic_chain);
    } catch (err: any) {
      console.error('生成大綱失敗:', err);
      setError(err.message || '無法生成大綱');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 儲存大綱到專案
  const saveOutline = useCallback(async () => {
    if (!projectId) {
      setError('找不到專案 ID');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // 確保所有 sections 都有 children 屬性以符合 OutlineSection 型別
      const sectionsWithChildren = outline.map((item) => ({
        ...item,
        children: [],
      }));

      await projectsApi.update(projectId, {
        outline: {
          h1: h1,
          sections: sectionsWithChildren,
        },
      });

      alert('大綱已成功儲存！');
    } catch (err: any) {
      console.error('儲存大綱失敗:', err);
      setError(err.message || '無法儲存大綱');
    } finally {
      setSaving(false);
    }
  }, [projectId, h1, outline]);

  useEffect(() => {
    // 進入頁面時載入專案與現有大綱
    loadProject();
  }, [loadProject]);

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      const draggedIndex = outline.findIndex((item) => item.id === draggedItem);
      const targetIndex = outline.findIndex((item) => item.id === targetId);

      const newOutline = [...outline];
      const [removed] = newOutline.splice(draggedIndex, 1);
      newOutline.splice(targetIndex, 0, removed);
      setOutline(newOutline);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleLevelChange = (id: string, delta: number) => {
    setOutline(
      outline.map((item) => {
        if (item.id === id) {
          const newLevel = Math.max(2, Math.min(4, item.level + delta));
          return { ...item, level: newLevel };
        }
        return item;
      })
    );
  };

  const handleHeadingChange = (id: string, newHeading: string) => {
    setOutline(outline.map((item) => (item.id === id ? { ...item, heading: newHeading } : item)));
  };

  const handleAddSection = () => {
    const newItem: OutlineItem = {
      id: Date.now().toString(),
      heading: '新章節標題',
      level: 2,
      keywords: [],
    };
    setOutline([...outline, newItem]);
  };

  const handleDeleteSection = (id: string) => {
    setOutline(outline.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="outline-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>AI 正在分析研究數據並生成大綱中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="outline-page">
        <div className="error-state">
          <p>{error}</p>
          <Button onClick={() => navigate('/projects')}>返回專案</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="outline-page">
      <div className="outline-header">
        <div>
          <h1 className="outline-h1">{h1 || '尚未生成標題'}</h1>
          <h2 className="outline-header__title">互動式大綱編輯器</h2>
          <p className="outline-header__desc">
            {outline.length > 0
              ? '拖拽排序 H2/H3 結構，編輯標題文字，已為您自動織入 PAA 與相關搜尋'
              : '點擊「AI 生成大綱」按鈕，讓 AI 根據關鍵字研究數據為您建立專業大綱'}
          </p>
        </div>
        <div className="outline-header__actions">
          <Button variant="secondary" onClick={generateOutline} disabled={loading}>
            {loading ? '⏳ AI 生成中...' : '🤖 AI 生成大綱'}
          </Button>
          {outline.length > 0 && (
            <>
              <Button variant="secondary" onClick={handleAddSection}>
                + 新增章節
              </Button>
              <Button variant="cta" onClick={saveOutline} disabled={saving}>
                {saving ? '儲存中...' : '💾 儲存大綱'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Logic Chain */}
      {logicChain.length > 0 && (
        <div className="logic-chain">
          <h3 className="logic-chain__title">GEO 優化邏輯鏈條</h3>
          <div className="logic-chain__flow">
            {logicChain.map((step, idx) => (
              <React.Fragment key={idx}>
                <span className="logic-chain__step">{step}</span>
                {idx < logicChain.length - 1 && <span className="logic-chain__arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Outline Editor */}
      <div className="outline-editor">
        <div className="outline-list">
          {outline.map((item) => (
            <div
              key={item.id}
              className={`outline-item outline-item--h${item.level} ${draggedItem === item.id ? 'outline-item--dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="outline-item__drag">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>

              <span className="outline-item__level">H{item.level}</span>

              <div className="outline-item__controls">
                <button
                  className="outline-item__level-btn"
                  onClick={() => handleLevelChange(item.id, -1)}
                  disabled={item.level <= 2}
                >
                  ←
                </button>
                <button
                  className="outline-item__level-btn"
                  onClick={() => handleLevelChange(item.id, 1)}
                  disabled={item.level >= 4}
                >
                  →
                </button>
              </div>

              {editingId === item.id ? (
                <input
                  className="outline-item__input"
                  value={item.heading}
                  onChange={(e) => handleHeadingChange(item.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                  autoFocus
                />
              ) : (
                <span className="outline-item__heading" onClick={() => setEditingId(item.id)}>
                  {item.heading}
                </span>
              )}

              <div className="outline-item__keywords">
                {item.keywords.map((kw, i) => (
                  <span key={i} className="outline-item__keyword">
                    {kw}
                  </span>
                ))}
              </div>

              <button className="outline-item__delete" onClick={() => handleDeleteSection(item.id)}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="outline-preview">
        <h3 className="outline-preview__title">大綱預覽</h3>
        <div className="outline-preview__content">
          {outline.map((item) => (
            <div
              key={item.id}
              className="outline-preview__item"
              style={{ paddingLeft: `${(item.level - 2) * 24}px` }}
            >
              <span className="outline-preview__marker">
                {item.level === 2 ? '■' : item.level === 3 ? '●' : '○'}
              </span>
              {item.heading}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
