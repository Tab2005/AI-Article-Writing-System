import React, { useState, useEffect } from 'react';
import { Button, Textarea, Input } from '../components/ui';
import { promptsApi, type PromptTemplate } from '../services/api';
import './PromptPage.css';

// Category 中文標籤 - 按照流程順序排列
const CATEGORY_ORDER = [
  'title_generation',
  'outline_generation',
  'content_writing',
  'kalpa_brainstorming',
  'kalpa_anchor_generation',
  'kalpa_weaving_system',
  'kalpa_weaving_user'
];

const CATEGORY_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
  title_generation: {
    title: 'AI 標題生成規劃',
    desc: '可在下方撰寫指令，或從模板庫載入現有指令。',
    icon: '📰',
  },
  outline_generation: {
    title: 'SEO 大綱生成 (GEO 優化)',
    desc: '根據關鍵字研究數據生成結構化大綱。',
    icon: '📋',
  },
  content_writing: {
    title: 'AI 內容寫作',
    desc: '分段生成高品質、SEO 優化的文章內容集。',
    icon: '✍️',
  },
  kalpa_brainstorming: {
    title: '劫之眼：領域建模 (天道解析)',
    desc: '定義特定產業的實體、動作與痛點矩陣。',
    icon: '🔮',
  },
  kalpa_anchor_generation: {
    title: '劫之眼：法寶袋生成',
    desc: '生成與產業高度相關的導引性錨點文字。',
    icon: '🔗',
  },
  kalpa_weaving_system: {
    title: '劫之眼：神諭編織 (系統指令)',
    desc: '定義 AI 寫作人格、語氣與內容架構規範。',
    icon: '🧠',
  },
  kalpa_weaving_user: {
    title: '劫之眼：神諭編織 (用戶指令)',
    desc: '定義如何將矩陣節點轉化為專業解答內容。',
    icon: '📝',
  },
};

const PROMPT_HINTS: Record<string, string[]> = {
  title_generation: [
    '{keyword}: 核心搜尋關鍵字',
    '{intent}: 搜尋意圖分析',
    '{titles}: 競爭對手標題清單'
  ],
  outline_generation: [
    '{keyword}: 核心搜尋關鍵字',
    '{intent}: 搜尋意圖',
    '{keywords}: 推薦延伸詞',
    '{paa}: Google 常問問題 (PAA)',
    '{related_searches}: 相關搜尋詞',
    '{ai_overview}: AI 搜尋綜述'
  ],
  content_writing: (
    <>
      <div className="prompt-hint-title">支援變數：</div>
      <ul className="prompt-hint-list">
        <li>{`{h1}`} - 文章總標題</li>
        <li>{`{heading}`} - 當前章節標題</li>
        <li>{`{keywords}`} - 必須嵌入的關鍵字清單</li>
        <li>{`{previous_summary}`} - 前一篇章節的內容摘要</li>
        <li>{`{research_context}`} - 相關研究參考資料</li>
        <li>{`{intent}`} - 搜尋意圖與優化模式</li>
        <li>{`{target_word_count}`} - 目標字數</li>
        <li>{`{keyword_density}`} - 目標關鍵字密度 %</li>
        <li><strong>[IMAGE_PLACEHOLDER_1]</strong> - 插入圖片位置 1 (自動配圖)</li>
      </ul>
    </>
  ),
  kalpa_brainstorming: [
    '{topic}: 產業主題'
  ],
  kalpa_anchor_generation: [
    '{industry}: 產業背景',
    '{money_page_url}: 轉化頁網址'
  ],
  kalpa_weaving_system: [
    '{persona_role}: 人格角色名稱',
    '{persona_tone}: 語氣設定',
    '{title}: 文章總標題'
  ],
    '{money_page_url}: 轉化頁網址',
    '{persona_role}: AI 角色腳本'
  ],
};

export const PromptPage: React.FC = () => {
  const [allTemplates, setAllTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 每個 category 的編輯狀態
  const [activePrompts, setActivePrompts] = useState<Record<string, string>>({});
  const [newTemplateNames, setNewTemplateNames] = useState<Record<string, string>>({});
  const [loadedTemplates, setLoadedTemplates] = useState<Record<string, PromptTemplate | null>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await promptsApi.list();
      setAllTemplates(data);

      // 為每個 category 初始化 activePrompts
      const prompts: Record<string, string> = {};
      const loadedTemplatesMap: Record<string, PromptTemplate> = {};
      const namesMap: Record<string, string> = {};
      const categories = CATEGORY_ORDER;

      categories.forEach((category: string) => {
        const categoryTemplates = data.filter((t: PromptTemplate) => t.category === category);
        // 優先權：我的活躍模板 > 系統活躍模板 > 第一個模板
        const myActive = categoryTemplates.find((t: PromptTemplate) => t.is_active && t.user_id);
        const systemActive = categoryTemplates.find((t: PromptTemplate) => t.is_active && !t.user_id);
        const active = myActive || systemActive;

        if (active) {
          prompts[category] = active.content;
          loadedTemplatesMap[category] = active;
          namesMap[category] = active.name;
        } else if (categoryTemplates.length > 0) {
          prompts[category] = categoryTemplates[0].content;
        } else {
          prompts[category] = '';
        }
      });

      setActivePrompts(prompts);
      setLoadedTemplates(loadedTemplatesMap);
      setNewTemplateNames(namesMap);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNew = async (category: string) => {
    const templateName = newTemplateNames[category];
    if (!templateName?.trim()) {
      setMessage({ type: 'error', text: '請輸入模板名稱' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSavingCategory(category);
    try {
      await promptsApi.create({
        category: category,
        name: templateName,
        content: activePrompts[category] || '',
      });

      setMessage({ type: 'success', text: `模板「${templateName}」儲存成功！` });
      setNewTemplateNames({ ...newTemplateNames, [category]: '' });
      loadTemplates();
    } catch {
      // 全域已顯示錯誤
    } finally {
      setSavingCategory(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };
  const handleUpdateExisting = async (category: string) => {
    const template = loadedTemplates[category];
    if (!template) return;

    const newName = newTemplateNames[category];
    const newContent = activePrompts[category];

    if (!newName?.trim()) {
      setMessage({ type: 'error', text: '模板名稱不能為空' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSavingCategory(category);
    try {
      await promptsApi.update(template.id, {
        name: newName,
        content: newContent,
      });

      setMessage({ type: 'success', text: `模板「${newName}」已更新！` });
      loadTemplates();
    } catch {
      // 全域已顯示錯誤
    } finally {
      setSavingCategory(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleActivate = async (templateId: number, active: boolean = true) => {
    try {
      await promptsApi.update(templateId, { is_active: active });
      setMessage({ type: 'success', text: '模板已啟用' });
      loadTemplates();
      setTimeout(() => setMessage(null), 3000);
    } catch {
      // 全域已顯示錯誤
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('確定要刪除此模板嗎？')) return;

    try {
      await promptsApi.delete(id);
      loadTemplates();
    } catch {
      // 全域已顯示錯誤
    }
  };

  const handleLoadTemplate = (category: string, template: PromptTemplate) => {
    setActivePrompts({ ...activePrompts, [category]: template.content });
    setNewTemplateNames({ ...newTemplateNames, [category]: template.name });
    setLoadedTemplates({ ...loadedTemplates, [category]: template });
    setMessage({ type: 'success', text: `已載入模板：${template.name}` });
    setTimeout(() => setMessage(null), 2000);
  };

  // 使用 CATEGORY_ORDER 作為顯示來源，確保始終顯示核心分類
  const categories = CATEGORY_ORDER;

  if (loading) {
    return (
      <div className="prompt-page">
        <div className="prompt-loading">載入指令庫中...</div>
      </div>
    );
  }

  return (
    <div className="prompt-page">
      <div className="prompt-header">
        <h2 className="prompt-header__title">指令倉庫</h2>
        <p className="prompt-header__desc">管理不同場景下的 AI 指令模板，隨時載入與切換。</p>
      </div>

      {message && (
        <div className={`prompt-message prompt-message--${message.type}`}>{message.text}</div>
      )}

      <div className="prompt-grid">
        {categories.map((category) => {
          const categoryTemplates = allTemplates.filter((t) => t.category === category);
          const labels = CATEGORY_LABELS[category] || {
            title: category,
            desc: '',
            icon: '🔧',
          };

          return (
            <div key={category} className="prompt-card">
              <div className="prompt-card__header">
                <div className="prompt-card__icon">
                  <span style={{ fontSize: '28px' }}>{labels.icon}</span>
                </div>
                <div className="prompt-card__info">
                  <h3 className="prompt-card__title">{labels.title}</h3>
                  <p className="prompt-card__desc">{labels.desc}</p>
                </div>
              </div>

              <div className="prompt-card__content">
                {/* Templates List */}
                <div className="prompt-templates-list">
                  <p className="candidate-titles-title">已儲存模板：</p>
                  {categoryTemplates.length === 0 ? (
                    <p
                      className="prompt-card__desc"
                      style={{ fontStyle: 'italic', padding: '10px' }}
                    >
                      尚未建立模板
                    </p>
                  ) : (
                    categoryTemplates.map((t) => (
                      <div
                        key={t.id}
                        className={`template-item ${t.is_active ? 'template-item--active' : ''}`}
                        onClick={() => handleLoadTemplate(category, t)}
                      >
                        <div className="template-item__info">
                          <span className="template-item__name">
                            {!t.user_id && <span className="system-badge">系統</span>}
                            {t.name}
                          </span>
                          {t.is_active && <span className="template-item__badge">使用中</span>}
                        </div>
                        <div className="template-item__actions">
                          {t.is_active ? (
                            t.user_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivate(t.id, false);
                                }}
                              >
                                停用
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivate(t.id);
                              }}
                            >
                              啟用
                            </Button>
                          )}
                          {t.user_id && (
                            <button
                              className="template-action-btn"
                              onClick={(e) => handleDelete(e, t.id)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 編輯區域 */}
                <Textarea
                  placeholder="在這裡編輯指令..."
                  value={activePrompts[category] || ''}
                  onChange={(e) =>
                    setActivePrompts({ ...activePrompts, [category]: e.target.value })
                  }
                  rows={10}
                  fullWidth
                  hint={
                    <div className="prompt-hint-container">
                      <p className="prompt-hint-title">支援變數說明：</p>
                      <ul className="prompt-hint-list">
                        {(PROMPT_HINTS[category] || ['支援專案相關變數']).map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  }
                />

                {/* Save Actions */}
                <div className="prompt-card__new-template">
                  <Input
                    placeholder="模板名稱 (編輯或新建立)"
                    value={newTemplateNames[category] || ''}
                    onChange={(e) =>
                      setNewTemplateNames({ ...newTemplateNames, [category]: e.target.value })
                    }
                    fullWidth
                  />
                  <div className="prompt-card__actions-row">
                    <Button
                      variant="secondary"
                      onClick={() => handleUpdateExisting(category)}
                      loading={savingCategory === category}
                      disabled={!activePrompts[category] || !loadedTemplates[category]?.user_id}
                      fullWidth
                    >
                      儲存變更
                    </Button>
                    <Button
                      variant="cta"
                      onClick={() => handleSaveAsNew(category)}
                      loading={savingCategory === category}
                      disabled={!activePrompts[category] || !newTemplateNames[category]}
                      fullWidth
                    >
                      另存為模板
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
