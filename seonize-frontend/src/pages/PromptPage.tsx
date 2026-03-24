import React, { useState, useEffect } from 'react';
import { Button, Textarea, Input } from '../components/ui';
import { promptsApi, type PromptTemplate } from '../services/api';
import './PromptPage.css';

// Category 中文標籤 - 按照流程順序排列
const CATEGORY_ORDER = [
  'kalpa_persona',
  'title_generation',
  'outline_generation',
  'article_blueprint',
  'content_writing',
  'article_review',
  'kalpa_brainstorming',
  'kalpa_anchor_generation',
  'kalpa_weaving_system',
  'kalpa_weaving_user'
];

const CATEGORY_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
  kalpa_persona: {
    title: '全域：AI 寫作人格設定 (神諭人格)',
    desc: '定義核心角色身份與寫作語氣，全系統共用（包含戰略藍圖與內容編織）。',
    icon: '🎭',
  },
  title_generation: {
    title: '專案主題：1. AI 標題生成規劃',
    desc: '設定標題生成的創意權重與關鍵字配置。',
    icon: '📰',
  },
  outline_generation: {
    title: '專案主題：2. SEO 大綱生成 (GEO 優化)',
    desc: '根據 PAA 與研究數據，自動生成結構化的大綱框架。',
    icon: '📋',
  },
  article_blueprint: {
    title: '專案主題：3. 寫作戰略藍圖 (總指揮)',
    desc: '動筆前由 AI 自動制定全篇的人稱、語氣與核心觀點。',
    icon: '🚩',
  },
  content_writing: {
    title: '專案主題：4. AI 脈絡化內文寫作',
    desc: '參考藍圖進行高品質、具備前文銜接感的段落創作。',
    icon: '✍️',
  },
  article_review: {
    title: '專案主題：5. 集成編校審閱 (主編)',
    desc: '全篇合成後進行語路校準、轉折語優化與重複性檢查。',
    icon: '🖋️',
  },
  kalpa_brainstorming: {
    title: '劫之眼：1. 領域建模 (天道解析)',
    desc: '定義特定產業的實體、動作與痛點矩陣。',
    icon: '🔮',
  },
  kalpa_anchor_generation: {
    title: '劫之眼：2. 法寶袋生成 (錨點建議)',
    desc: '生成與產業高度相關的引流性錨點文字。',
    icon: '🔗',
  },
  kalpa_weaving_system: {
    title: '劫之眼：3. 神諭編織 (系統指令)',
    desc: '定義劫之眼寫作時的核心架構與輸出規範。',
    icon: '🧠',
  },
  kalpa_weaving_user: {
    title: '劫之眼：4. 神諭編織 (用戶指令)',
    desc: '定義如何將矩陣節點轉化為最適合閱讀的專業解答。',
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
  article_blueprint: [
    '{h1}: 文章總標題',
    '{outline}: 完整大綱結構',
    '{persona_role}: 人格角色',
    '{persona_tone}: 語氣設定'
  ],
  content_writing: [
    '{h1}: 文章總標題',
    '{heading}: 當前章節標題',
    '{keywords}: 章節必要關鍵字',
    '{previous_summary}: 前文銜接摘要',
    '{style_blueprint}: 生成的戰略藍圖',
    '{full_outline}: 全景大綱路徑',
    '{research_context}: 研究資料',
    '{target_word_count}: 目標字數',
    '[IMAGE_PLACEHOLDER_1]: 自動配圖'
  ],
  article_review: [
    '{style_blueprint}: 最初設定的藍圖',
    '{full_article}: 待審核全文內容',
    '{persona_role}: 設定的人格角色'
  ],
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
  kalpa_weaving_user: [
    '{persona_intro}: 人格背景介紹',
    '{title}: 本篇節點標題',
    '{industry}: 產業背景',
    '{entity}: 主題實體 (Subject)',
    '{action}: 具體操作 (Action)',
    '{pain_point}: 解決痛點 (Pain Point)',
    '{selected_anchor}: 內部連結錨點',
    '{money_page_url}: 轉化頁網址',
    '{persona_role}: AI 角色腳本',
    '[IMAGE_PLACEHOLDER_1]: 圖片位置 1 (自動配圖)',
    '[IMAGE_PLACEHOLDER_2]: 圖片位置 2 (自動配圖)'
  ],
  kalpa_persona: [
    '【內容格式建議】：使用 JSON 格式儲存以供系統解析。',
    '欄位包含: role, tone, intro',
    '變數替代: {ind} -> 產業, {pp} -> 痛點, {current_year} -> 今年',
    '範例:',
    '{"role": "資深 {ind} 專家", "tone": "專業", "intro": "..."}'
  ],
};

export const PromptPage: React.FC = () => {
  const [allTemplates, setAllTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 每個 category 的編輯狀態
  const [activePrompts, setActivePrompts] = useState<Record<string, string>>({});
  const [activeDescriptions, setActiveDescriptions] = useState<Record<string, string>>({});
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
      const descriptions: Record<string, string> = {};
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
          descriptions[category] = active.description || '';
          loadedTemplatesMap[category] = active;
          namesMap[category] = active.name;
        } else if (categoryTemplates.length > 0) {
          prompts[category] = categoryTemplates[0].content;
          descriptions[category] = categoryTemplates[0].description || '';
        } else {
          prompts[category] = '';
          descriptions[category] = '';
        }
      });

      setActivePrompts(prompts);
      setActiveDescriptions(descriptions);
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
        description: activeDescriptions[category] || '',
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
        description: activeDescriptions[category] || '',
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
    setActiveDescriptions({ ...activeDescriptions, [category]: template.description || '' });
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

                {/* 描述/關鍵字編輯 (針對 Kalpa Persona 特別顯示) */}
                <div style={{ marginBottom: '15px' }}>
                  <Input
                    placeholder={category === 'kalpa_persona' ? "觸發關鍵字 (用逗號分隔，例如：失敗,錯誤)" : "模板簡短描述"}
                    value={activeDescriptions[category] || ''}
                    onChange={(e) =>
                      setActiveDescriptions({ ...activeDescriptions, [category]: e.target.value })
                    }
                    fullWidth
                    label={category === 'kalpa_persona' ? "🔑 匹配關鍵字" : "說明描述"}
                  />
                </div>

                {/* 編輯區域 */}
                <Textarea
                  placeholder={category === 'kalpa_persona' ? '請輸入 Persona JSON 指令...' : "在這裡編輯指令..."}
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
