import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, KPICard, MermaidRenderer } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import PublishModal from '../components/PublishModal';
import ImagePicker from '../components/common/ImagePicker';
import { uiBus } from '../utils/ui-bus';
import { projectsApi, writingApi } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
import type { ProjectState, OutlineSection, OptimizationMode } from '../types';
import './WritingPage.css';

interface WritingSectionState {
  id: string;
  heading: string;
  level: number;
  content: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  keywords: string[];
  image_suggestion?: any;
}

export const WritingPage: React.FC = () => {
  const { refreshUser } = useAuth();
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
  const [previewMode, setPreviewMode] = useState<'render' | 'markdown'>('render');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [qualityAnalysis, setQualityAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [auditState, setAuditState] = useState<'idle' | 'analyzing' | 'error' | 'success'>('idle');
  const [auditStage, setAuditStage] = useState('');
  const [auditError, setAuditError] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  // Automation State
  const [automationState, setAutomationState] = useState<'idle' | 'running' | 'error' | 'success'>('idle');
  const [automationStage, setAutomationStage] = useState('');
  const [automationError, setAutomationError] = useState<string | null>(null);
  
  // Full Content Sidebar State
  const [fullContent, setFullContent] = useState('');
  const [llmSummary, setLlmSummary] = useState('');
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(true);

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
      setLlmSummary(data.llm_summary || '');
      setOptimizationMode(data.optimization_mode || 'seo');

      // 轉換大綱章節為寫作狀態
      if (data.outline && data.outline.sections) {
        const flatSections: WritingSectionState[] = [];
        const flatten = (items: OutlineSection[]) => {
          items.forEach((item) => {
            flatSections.push({
              id: item.id,
              heading: item.heading,
              level: item.level,
              content: item.content || '',
              status: item.content ? 'completed' : 'pending',
              keywords: item.keywords || [],
              image_suggestion: item.image_suggestion,
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

        // 載入已有的品質分析報告
        if (data.quality_report) {
          setQualityAnalysis(data.quality_report);
        }

        // 初始化全文內容
        if (data.full_content) {
          setFullContent(data.full_content);
          setIsAutoSyncing(false); // 已有內容則關閉自動同步，避免覆蓋
        } else {
          const initialFull = flatSections
            .filter((s) => s.content)
            .map((s) => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
            .join('\n\n');
          setFullContent(initialFull);
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

    const sectionIndex = sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) return;

    // 更新狀態為生成中
    const newSections = [...sections];
    newSections[sectionIndex].status = 'generating';
    setSections(newSections);

    try {
      // 計算前文摘要 (簡化：取上一段內容的前 100 字)
      const previousSummary =
        sectionIndex > 0 ? sections[sectionIndex - 1].content.substring(0, 200) : '';

      const res = await writingApi.generateSection({
        project_id: projectId,
        h1: project.selected_title || project.outline?.h1 || '',
        section: {
          heading: sections[sectionIndex].heading,
          level: sections[sectionIndex].level,
          keywords: sections[sectionIndex].keywords,
          previous_summary: previousSummary,
        },
        optimization_mode: optimizationMode,
        target_word_count: Math.round(targetTotalWords / (sections.length || 1)),
        keyword_density: keywordDensity,
      });

      // 這裡直接更新狀態，確保後續 save 抓到最新內容
      setSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          content: res.content,
          status: 'completed',
        };
        
        // 如果開啟自動同步，則更新全文
        if (isAutoSyncing) {
          const newFull = updated
            .filter((s) => s.content)
            .map((s) => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
            .join('\n\n');
          setFullContent(newFull);
        }
        
        return updated;
      });

      // 重要：生成完畢後立即觸發自動儲存 (非同步不阻塞 UI)
      setTimeout(() => saveToProject(), 500);

      // 重新整理使用者點數
      refreshUser();
    } catch (err) {
      console.error('生成失敗:', err);
      setSections((prev) => {
        const updated = [...prev];
        updated[sectionIndex].status = 'error';
        return updated;
      });
    }
  };

  const analyzeQuality = async () => {
    if (sections.length === 0) return;

    setAuditState('analyzing');
    setAuditStage('準備分析數據...');
    setAuditError(null);
    setAnalyzing(true);

    try {
      const fullContent = sections
        .filter((s) => s.content)
        .map((s) => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
        .join('\n\n');

      // 模擬階段性進度 (提升心理體驗)
      const stages = [
        "正在進行內容缺口分析...",
        "正在進行 E-E-A-T 品質評分...",
        "正在生成改善建議..."
      ];

      // 啟動 API 前先跳第一個階段
      setAuditStage(stages[0]);

      // 定期更新階段文字的計時器
      let stageIdx = 0;
      const stageTimer = setInterval(() => {
        if (stageIdx < stages.length - 1) {
          stageIdx++;
          setAuditStage(stages[stageIdx]);
        }
      }, 5000);

      const res = await writingApi.analyzeQuality({
        project_id: projectId,
        content: fullContent
      });

      clearInterval(stageTimer);
      setAuditStage('完成審計！');
      setAuditState('success');

      // 延遲一下讓使用者看到完成狀態再關閉視窗
      setTimeout(() => {
        setQualityAnalysis(res);
        setAuditState('idle');
      }, 800);

      // 更新本地 project 資料
      setProject(prev => prev ? { ...prev, quality_report: res, last_audit_at: new Date().toISOString() } : null);

      // 重新整理使用者點數 (因為扣點了)
      refreshUser();
    } catch (err: any) {
      console.error('分析失敗:', err);
      setAuditState('error');
      setAuditError(err.message || '分析過程中發生錯誤，請稍後再試。');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateFullContent = async () => {
    if (!projectId || !project || sections.length === 0) return;

    setAutomationState('running');
    setAutomationStage('1/3 正在制定全篇戰略藍圖...');
    setAutomationError(null);

    try {
      const outlineStr = sections.map(s => `${s.level}. ${s.heading}`).join('\n');
      
      // --- 階段 1: 藍圖 ---
      const blueprintRes = await writingApi.blueprint({
        project_id: projectId,
        h1: project.selected_title || project.outline?.h1 || '',
        outline: outlineStr
      });
      const currentBlueprint = blueprintRes.blueprint;
      
      // 更新本地專案狀態中的藍圖
      setProject(prev => prev ? { ...prev, style_blueprint: currentBlueprint } : null);

      // --- 階段 2: 逐段撰寫 ---
      let rawFullContent = `# ${project.selected_title || project.outline?.h1}\n\n`;
      let lastSummary = "這是文章開頭";
      
      // 使用一個本地變數來追蹤最新狀態，避免 React 閉包 captured 舊狀態
      let currentSections = [...sections];
      
      for (let i = 0; i < sections.length; i++) {
        const section = currentSections[i];
        setAutomationStage(`2/3 正在撰寫第 ${i + 1}/${sections.length} 章節: ${section.heading}`);
        
        const sectionRes = await writingApi.generateSection({
          project_id: projectId,
          h1: project.selected_title || project.outline?.h1 || '',
          section: {
            ...section,
            previous_summary: lastSummary
          },
          style_blueprint: currentBlueprint,
          optimization_mode: optimizationMode
        });

        // 更新本地副本
        currentSections = currentSections.map((s, idx) => 
          idx === i ? { ...s, content: sectionRes.content, status: 'completed' } : s
        );

        // 即時將生成的內容同步到 UI
        setSections(currentSections);

        rawFullContent += `## ${sectionRes.heading}\n\n${sectionRes.content}\n\n`;
        lastSummary = sectionRes.summary;
      }

      // 全部段落寫完後，先進行一次完整存檔 (直接傳入最新數據)
      const finalFullContent = currentSections
        .filter((s) => s.content)
        .map((s) => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
        .join('\n\n');
      
      if (isAutoSyncing) {
        setFullContent(finalFullContent);
      }

      await saveToProject(currentSections, isAutoSyncing ? finalFullContent : undefined);

      // --- 階段 3: 全篇審核 ---
      setAutomationStage('3/3 正在進行全篇集成審核與最終優化...');
      const reviewRes = await writingApi.review({
        project_id: projectId,
        content: rawFullContent,
        style_blueprint: currentBlueprint
      });

      if (reviewRes.optimized && reviewRes.content) {
        console.log('文章已完成全篇優化審閱');
        if (reviewRes.llm_summary) {
          setLlmSummary(reviewRes.llm_summary);
        }
      }

      // 最終完成處理
      setAutomationStage('✅ 正在同步數據並完成最後潤飾...');
      
      // 確保最後狀態也存檔
      await saveToProject(currentSections);
      
      // 重新載入全體專案資料確保資料庫同步
      await loadProject();
      
      // 如果審核成功且有內容，則通知成功
      setAutomationState('success');

      // 重新整理使用者點數
      refreshUser();

      // 3 秒後自動關閉成功視窗
      setTimeout(() => {
        setAutomationState('idle');
      }, 4000);

    } catch (err: any) {
      console.error('全篇生成失敗:', err);
      setAutomationState('error');
      setAutomationError(err.message || '自動化寫作過程中發生錯誤，請稍後再試。');
    }
  };

  const saveToProject = async (latestSections?: WritingSectionState[], manualFullContent?: string) => {
    if (!projectId || !project || (sections.length === 0 && !latestSections)) return;

    const sectionsToSave = latestSections || sections;

    try {
      // 1. 遞迴更新大綱結構中的內容
      const updateOutlineContent = (items: OutlineSection[]): OutlineSection[] => {
        return items.map((item) => {
          const matched = sectionsToSave.find((s) => s.id === item.id);
          return {
            ...item,
            content: matched ? matched.content : item.content,
            children: item.children ? updateOutlineContent(item.children) : [],
          };
        });
      };

      const updatedOutline = {
        ...project.outline!,
        sections: updateOutlineContent(project.outline!.sections),
      };

      // 2. 構建全文 Markdown (如果沒有傳入手動編輯的全文，則自動重組)
      const fullContentToSave = manualFullContent || fullContent || sectionsToSave
        .filter((s) => s.content)
        .map((s) => {
          const prefix = '#'.repeat(s.level);
          return `${prefix} ${s.heading}\n\n${s.content}`;
        })
        .join('\n\n');

      // 3. 呼叫 API 更新資料庫
      await projectsApi.update(projectId, {
        outline: updatedOutline,
        full_content: fullContentToSave,
        llm_summary: llmSummary, // 加入摘要儲存
        word_count: fullContentToSave.length,
      });

      // 更新本地 project 狀態，防止被舊狀態覆蓋
      setProject((prev) =>
        prev ? { 
          ...prev, 
          outline: updatedOutline, 
          full_content: fullContentToSave,
          llm_summary: llmSummary // 同步本地狀態
        } : null
      );
      
      // 如果是外部觸發的儲存且傳入了內容，同步到 local state
      if (manualFullContent) {
        setFullContent(manualFullContent);
      }
    } catch (err) {
      console.error('儲存失敗:', err);
    }
  };

  const refreshLLMSummary = async () => {
    if (!projectId) return;
    setRefreshingSummary(true);
    try {
      const res = await writingApi.refreshSummary(projectId);
      if (res.success) {
        setLlmSummary(res.llm_summary);
        uiBus.notify('機器摘要已重新生成', 'success');
        refreshUser();
      }
    } catch (error) {
      console.error('Failed to refresh summary:', error);
      uiBus.notify('摘要重新生成失敗', 'error');
    } finally {
      setRefreshingSummary(false);
    }
  };

  const handleImageSelect = (image: { url: string; alt: string; caption: string; source: string }) => {
    if (!activeSectionId) return;

    setSections(prev => {
      return prev.map(s => {
        if (s.id === activeSectionId) {
          const imageMarkdown = `\n\n![${image.alt}](${image.url})\n*${image.caption}*\n\n`;
          // 這裡簡單地將圖片附加在最後，若要更精準插入，通常需要一個編輯器組件
          return { ...s, content: s.content + imageMarkdown };
        }
        return s;
      });
    });

    setShowImagePicker(false);
    // 觸發儲存
    setTimeout(() => saveToProject(), 500);
  };

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId),
    [sections, activeSectionId]
  );

  const allTargetKeywords = useMemo(() => {
    if (!project) return [];
    const kws = new Set<string>();
    if (project.primary_keyword) kws.add(project.primary_keyword);
    if (project.keywords?.secondary) project.keywords.secondary.forEach((k) => kws.add(k));
    if (project.keywords?.lsi) project.keywords.lsi.forEach((k) => kws.add(k));

    // 從大綱章節中收集所有分配的關鍵字
    const collectFromOutline = (items: OutlineSection[]) => {
      items.forEach((item) => {
        if (item.keywords) item.keywords.forEach((k) => kws.add(k));
        if (item.children) collectFromOutline(item.children);
      });
    };
    if (project.outline?.sections) collectFromOutline(project.outline.sections);

    return Array.from(kws).filter((k) => k && typeof k === 'string' && k.trim() !== '');
  }, [project]);

  const keywordCoverageCount = useMemo(() => {
    if (allTargetKeywords.length === 0 || !fullContent) return 0;
    const text = fullContent.toLowerCase();
    return allTargetKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  }, [allTargetKeywords, fullContent]);

  const totalWordCount = useMemo(
    () => fullContent?.length || 0,
    [fullContent]
  );

  const highlightKeywords = (content: string) => {
    if (!content || allTargetKeywords.length === 0) return content;

    let highlighted = content;
    // 按照長標題到短標題排序，避免短關鍵字先被替換導致長關鍵字失效
    const sortedKws = [...allTargetKeywords].sort((a, b) => b.length - a.length);

    sortedKws.forEach((kw) => {
      try {
        // 排除已經在 HTML 標籤內的替換 (簡化處理)
        const regex = new RegExp(`(${kw})(?![^<]*>|[^<>]*<\/mark>)`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="keyword-highlight">$1</mark>');
      } catch (e) {
        console.warn('Regex error for keyword:', kw);
      }
    });
    return highlighted;
  };

  const getStatusIcon = (status: WritingSectionState['status']) => {
    switch (status) {
      case 'completed':
        return <span className="status-icon status-icon--completed">✓</span>;
      case 'generating':
        return <span className="status-icon status-icon--generating">⟳</span>;
      case 'error':
        return <span className="status-icon status-icon--error">!</span>;
      default:
        return <span className="status-icon status-icon--pending">○</span>;
    }
  };

  if (loading)
    return (
      <div className="writing-page">
        <div className="writing-empty-state">載入專案中...</div>
      </div>
    );
  if (error)
    return (
      <div className="writing-page">
        <div className="writing-empty-state">
          <h3>錯誤</h3>
          <p>{error}</p>
          <Button onClick={() => navigate('/projects')}>返回專案列表</Button>
        </div>
      </div>
    );

  return (
    <div className="writing-page">
      <div className="writing-header">
        <div>
          <h2 className="writing-header__title">分段撰寫預覽器</h2>
          <p className="writing-header__desc">
            專案：{project?.primary_keyword} | 標題：
            {project?.selected_title || project?.outline?.h1}
          </p>
        </div>
        <div className="writing-header__actions">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            返回大綱
          </Button>
          <Button variant="cta" onClick={() => analyzeQuality()} disabled={analyzing || sections.every(s => !s.content)}>
            {analyzing ? '⌛ 分析中...' : '🔍 品質健檢'}
          </Button>
          <Button variant="primary" onClick={() => generateFullContent()} disabled={automationState === 'running'}>
            {automationState === 'running' ? '🤖 自動撰寫中...' : '✨ 一鍵全篇生成'}
          </Button>
          <Button variant="cta" onClick={() => saveToProject()}>
            💾 儲存全文
          </Button>
          <Button variant="primary" onClick={() => setShowPublishModal(true)} disabled={!project}>
            🚀 發布至 CMS
          </Button>
        </div>
      </div>

      {showPublishModal && projectId && (
        <PublishModal
          targetType="project"
          targetId={projectId}
          onClose={() => setShowPublishModal(false)}
          onSuccess={() => loadProject()}
        />
      )}

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
          <span className="setting-hint">
            預計每章節約 {Math.round(targetTotalWords / (sections.length || 1))} 字
          </span>
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
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
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
          value={`${sections.filter((s) => s.status === 'completed').length}/${sections.length}`}
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
          value={`${keywordCoverageCount} / ${allTargetKeywords.length}`}
          suffix="組"
          icon={<span style={{ fontSize: '20px' }}>📍</span>}
        />
        <KPICard
          title="E-E-A-T 分數"
          value={qualityAnalysis?.score || project?.eeat_score || 85}
          suffix="/100"
          icon={<span style={{ fontSize: '20px' }}>✨</span>}
        />
      </div>

      {qualityAnalysis && (
        <div className="quality-dashboard">
          <div className="quality-dashboard__header">
            <h3>🛡️ 文章品質審計報告 ({qualityAnalysis.grade})</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {project?.last_audit_at && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  最後檢查：{new Date(project.last_audit_at).toLocaleString()}
                </span>
              )}
              <Button size="sm" variant="secondary" onClick={() => setQualityAnalysis(null)}>關閉</Button>
            </div>
          </div>
          <div className="quality-metrics">
            <div className="metric-item">
              <span className="metric-label">AI 偵測</span>
              <div className="metric-bar"><div className="metric-fill" style={{ width: `${qualityAnalysis.metrics?.ai_detect}%`, background: qualityAnalysis.metrics?.ai_detect > 50 ? 'red' : 'green' }}></div></div>
              <span className="metric-value">{qualityAnalysis.metrics?.ai_detect}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">SEO 優化</span>
              <div className="metric-bar"><div className="metric-fill" style={{ width: `${qualityAnalysis.metrics?.seo_score}%` }}></div></div>
              <span className="metric-value">{qualityAnalysis.metrics?.seo_score}%</span>
            </div>
            {qualityAnalysis.metrics?.gap_coverage !== undefined && (
              <div className="metric-item">
                <span className="metric-label">策略缺口覆蓋</span>
                <div className="metric-bar"><div className="metric-fill" style={{ width: `${qualityAnalysis.metrics?.gap_coverage}%`, background: 'var(--color-cta)' }}></div></div>
                <span className="metric-value">{qualityAnalysis.metrics?.gap_coverage}%</span>
              </div>
            )}
          </div>
          <div className="quality-issues">
            {qualityAnalysis.issues?.map((issue: any, i: number) => (
              <div key={i} className="quality-issue-item">
                <span className="severity">{issue.severity}</span>
                <span className="desc">{issue.description}</span>
              </div>
            ))}
          </div>
          <div className="quality-recommendations">
            <h4>💡 改善建議</h4>
            <ul>
              {qualityAnalysis.recommendations?.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* LLM 摘要預覽與更新 */}
      {(llmSummary || project?.full_content) && (
        <div className="llm-summary-dashboard card anim-fade-in">
          <div className="quality-dashboard__header">
            <h3 className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              LLM 機器讀取摘要 (llms.txt 格式)
            </h3>
            <div className="llm-summary-actions">
              <Button size="sm" variant="outline" onClick={refreshLLMSummary} loading={refreshingSummary}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                重新生成摘要
              </Button>
            </div>
          </div>
          
          <div className="llm-summary-content" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {llmSummary ? (
              <div className="markdown-body mini">
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(llmSummary) }} />
              </div>
            ) : (
              <div className="empty-summary-hint">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: 'var(--space-8)' }}>
                   <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>目前尚未生成摘要，點擊「一鍵全篇生成」或手動產出。</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="llm-summary-footer">
            <span className="hint-text" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              此摘要將自動同步至 CMS，優化 AI 搜尋引擎 (GEO) 的索引效率。
            </span>
          </div>
        </div>
      )}

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
              <span className="estimate-text">預計 40-60 秒</span>
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
              {activeSection && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowImagePicker(true)}
                >
                  🖼️ 插入圖片
                </Button>
              )}
              <div className="writing-preview__mode">
                <button
                  className={`preview-mode-btn ${previewMode === 'render' ? 'preview-mode-btn--active' : ''}`}
                  onClick={() => setPreviewMode('render')}
                >
                  渲染
                </button>
                <button
                  className={`preview-mode-btn ${previewMode === 'markdown' ? 'preview-mode-btn--active' : ''}`}
                  onClick={() => setPreviewMode('markdown')}
                >
                  原始碼
                </button>
              </div>
            </div>
          </div>

          <div className="writing-preview__content">
            {activeSection ? (
              activeSection.content ? (
                previewMode === 'render' ? (
                  <div className="markdown-body">
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(highlightKeywords(activeSection.content)) }} />
                    <MermaidRenderer content={activeSection.content} />
                  </div>
                ) : (
                  <pre className="source-code-view">{activeSection.content}</pre>
                )
              ) : (
                <div className="writing-empty-state">
                  <p>此章節尚未生成內容</p>
                  <Button onClick={() => generateSection(activeSection.id)}>
                    點擊生成章節內容
                  </Button>
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

      {/* 文章全文預覽 (獨立一欄) */}
      <div className="full-article-section-standalone">
        <div className="full-article-header">
          <h3 className="section-title">✨ 文章全文統合與全域編輯</h3>
          <div className="full-article-actions">
            <div className={`sync-status ${!isAutoSyncing ? 'sync-status--manual' : ''}`}>
              {isAutoSyncing ? '⚡ AI 自動同步撰寫中' : '✋ 手動編輯/優化模式'}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const forcedFull = sections
                  .filter((s) => s.content)
                  .map((s) => `${'#'.repeat(s.level)} ${s.heading}\n\n${s.content}`)
                  .join('\n\n');
                setFullContent(forcedFull);
                setIsAutoSyncing(true);
              }}
            >
              🔄 重置同步
            </Button>
          </div>
        </div>
        <textarea
          className="full-article-textarea-standalone"
          placeholder="當各個段落完成後，完整的文章內容將在此實時彙整，您可以隨時在此進行全域微調與潤色..."
          value={fullContent}
          onChange={(e) => {
            setFullContent(e.target.value);
            setIsAutoSyncing(false);
          }}
        />
        <div className="full-article-footer">
          <p className="hint-text">💡 編輯完成後，請點擊右上角的「💾 儲存全文」按鈕同步至專案預覽。</p>
        </div>
      </div>

      {/* SEO Check */}
      <div className="seo-check">
        <h3 className="seo-check__title">SEO 體檢 (即時分析)</h3>
        <div className="seo-check__items">
          <div
            className={`seo-check__item ${totalWordCount > targetTotalWords * 0.8 ? 'seo-check__item--pass' : 'seo-check__item--warn'}`}
          >
            <span className="seo-check__icon">
              {totalWordCount > targetTotalWords * 0.8 ? '✓' : '!'}
            </span>
            <span>
              文章字數：{totalWordCount} / 目標 {targetTotalWords} 字 (
              {((totalWordCount / targetTotalWords) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="seo-check__item seo-check__item--pass">
            <span className="seo-check__icon">✓</span>
            <span>
              關鍵字嵌入：已覆蓋 {sections.filter((s) => s.status === 'completed').length} 個章節
            </span>
          </div>
          <div className="seo-check__item seo-check__item--warn">
            <span className="seo-check__icon">!</span>
            <span>建議增加 E-E-A-T 信號（如數據引用、專家評論）</span>
          </div>
        </div>
      </div>
      {/* 品質健檢與自動化寫作進度視窗 */}
      {(auditState !== 'idle' || automationState !== 'idle') && (
        <div className="audit-modal-overlay">
          <div className={`audit-modal ${automationState !== 'idle' ? 'automation-modal' : ''}`}>
            <div className="audit-modal__header">
              <h3>{automationState !== 'idle' ? '🤖 AI 四階段全自動寫作引擎' : '🔍 品質審計中'}</h3>
              {(auditState === 'error' || automationState === 'error') && (
                <button className="audit-modal__close-top" onClick={() => { setAuditState('idle'); setAutomationState('idle'); }}>×</button>
              )}
            </div>

            <div className="audit-modal__body">
              {/* 品質健檢模式 */}
              {auditState === 'analyzing' && (
                <div className="audit-progress-view">
                  <div className="audit-spinner">
                    <div className="spinner-inner"></div>
                    <div className="spinner-center">AI</div>
                  </div>
                  <p className="audit-stage-text">{auditStage}</p>
                  <div className="audit-progress-bar">
                    <div className="audit-progress-fill"></div>
                  </div>
                  <p className="audit-hint">這可能需要 20-40 秒，請稍候...</p>
                </div>
              )}

              {auditState === 'success' && (
                <div className="audit-success-view">
                  <div className="audit-success-icon">✓</div>
                  <p className="audit-stage-text">分析完成！</p>
                </div>
              )}

              {auditState === 'error' && (
                <div className="audit-error-view">
                  <div className="audit-error-icon">!</div>
                  <p className="audit-error-title">審計失敗</p>
                  <div className="audit-error-details">{auditError}</div>
                  <Button variant="secondary" onClick={() => setAuditState('idle')}>關閉視窗</Button>
                </div>
              )}

              {/* 自動化寫作模式 */}
              {automationState === 'running' && (
                <div className="audit-progress-view">
                  <div className="automation-spinner">
                    <div className="spinner-inner"></div>
                    <div className="spinner-center">AI</div>
                    <div className="spinner-glow"></div>
                  </div>
                  <p className="audit-stage-text">{automationStage}</p>
                  <div className="audit-progress-bar">
                    <div className="automation-progress-fill"></div>
                  </div>
                  <div className="automation-steps">
                    <div className={`step-item ${automationStage.includes('1.') ? 'active' : ''}`}>🚩 制定藍圖</div>
                    <div className={`step-item ${automationStage.includes('2.') ? 'active' : ''}`}>✍️ 內容編織</div>
                    <div className={`step-item ${automationStage.includes('3.') || automationStage.includes('4.') ? 'active' : ''}`}>🖋️ 全篇校審</div>
                  </div>
                  <p className="audit-hint">這是全自動化流程，預計耗時 3-5 分鐘，請勿關閉視窗。</p>
                </div>
              )}

              {automationState === 'success' && (
                <div className="audit-success-view">
                  <div className="audit-success-icon">✨</div>
                  <p className="audit-stage-text">文章已全篇自動生成完成！</p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>正在為您呈現最終內容...</p>
                </div>
              )}

              {automationState === 'error' && (
                <div className="audit-error-view">
                  <div className="audit-error-icon">!</div>
                  <p className="audit-error-title">自動化生成失敗</p>
                  <div className="audit-error-details">{automationError}</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={() => setAutomationState('idle')}>關閉視窗</Button>
                    <Button variant="primary" onClick={() => generateFullContent()}>重試</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showImagePicker && (
        <ImagePicker
          onSelect={handleImageSelect}
          onClose={() => setShowImagePicker(false)}
          suggestedKeywords={activeSection?.image_suggestion?.search_keywords}
          suggestedTopic={activeSection?.image_suggestion?.topic}
          sectionContent={activeSection?.content}
        />
      )}
    </div>
  );
};
