import React, { useState, useEffect } from 'react';
import { Button, Textarea, Input } from '../components/ui';
import './PromptPage.css';

interface PromptTemplate {
    id: number;
    category: string;
    name: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Category 中文標籤 - 按照流程順序排列
const CATEGORY_ORDER = ['title_generation', 'outline_generation', 'content_writing'];

const CATEGORY_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
    title_generation: {
        title: 'AI 標題生成規劃',
        desc: '可在下方撰寫指令，或從模板庫載入現有指令。',
        icon: '📰'
    },
    outline_generation: {
        title: 'SEO 大綱生成 (GEO 優化)',
        desc: '根據關鍵字研究數據生成結構化大綱。',
        icon: '📋'
    },
    content_writing: {
        title: 'AI 內容寫作',
        desc: '分段生成高品質、SEO 優化的文章內容。',
        icon: '✍️'
    }
};

export const PromptPage: React.FC = () => {
    const [allTemplates, setAllTemplates] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 每個 category 的編輯狀態
    const [activePrompts, setActivePrompts] = useState<Record<string, string>>({});
    const [newTemplateNames, setNewTemplateNames] = useState<Record<string, string>>({});
    const [savingCategory, setSavingCategory] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await fetch(`${API_URL}/api/prompts/templates`);
            if (response.ok) {
                const data = await response.json();
                setAllTemplates(data);

                // 為每個 category 初始化 activePrompts
                const prompts: Record<string, string> = {};
                const categories = Array.from(new Set(data.map((t: PromptTemplate) => t.category))) as string[];

                categories.forEach((category: string) => {
                    const categoryTemplates = data.filter((t: PromptTemplate) => t.category === category);
                    const active = categoryTemplates.find((t: PromptTemplate) => t.is_active);
                    if (active) {
                        prompts[category] = active.content;
                    } else if (categoryTemplates.length > 0) {
                        prompts[category] = categoryTemplates[0].content;
                    } else {
                        prompts[category] = '';
                    }
                });

                setActivePrompts(prompts);
            }
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
            const response = await fetch(`${API_URL}/api/prompts/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: category,
                    name: templateName,
                    content: activePrompts[category] || '',
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `模板「${templateName}」儲存成功！` });
                setNewTemplateNames({ ...newTemplateNames, [category]: '' });
                loadTemplates();
            } else {
                setMessage({ type: 'error', text: '儲存失敗' });
            }
        } catch {
            setMessage({ type: 'error', text: '連線錯誤' });
        } finally {
            setSavingCategory(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleActivate = async (id: number) => {
        try {
            const response = await fetch(`${API_URL}/api/prompts/templates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: true }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: '模板已啟用' });
                loadTemplates();
                setTimeout(() => setMessage(null), 3000);
            }
        } catch {
            setMessage({ type: 'error', text: '啟用失敗' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('確定要刪除此模板嗎？')) return;

        try {
            const response = await fetch(`${API_URL}/api/prompts/templates/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                loadTemplates();
            }
        } catch {
            alert('刪除失敗');
        }
    };

    const handleLoadTemplate = (category: string, template: PromptTemplate) => {
        setActivePrompts({ ...activePrompts, [category]: template.content });
        setMessage({ type: 'success', text: `已載入模板：${template.name}` });
        setTimeout(() => setMessage(null), 2000);
    };

    // 按指定順序排序 categories
    const categories = Array.from(new Set(allTemplates.map(t => t.category)))
        .sort((a, b) => {
            const indexA = CATEGORY_ORDER.indexOf(a);
            const indexB = CATEGORY_ORDER.indexOf(b);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

    if (loading) {
        return <div className="prompt-page"><div className="prompt-loading">載入指令庫中...</div></div>;
    }

    return (
        <div className="prompt-page">
            <div className="prompt-header">
                <h2 className="prompt-header__title">指令倉庫</h2>
                <p className="prompt-header__desc">
                    管理不同場景下的 AI 指令模板，隨時載入與切換。
                </p>
            </div>

            {message && (
                <div className={`prompt-message prompt-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="prompt-grid">
                {categories.map(category => {
                    const categoryTemplates = allTemplates.filter(t => t.category === category);
                    const labels = CATEGORY_LABELS[category] || {
                        title: category,
                        desc: '',
                        icon: '🔧'
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
                                        <p className="prompt-card__desc" style={{ fontStyle: 'italic', padding: '10px' }}>尚未建立模板</p>
                                    ) : (
                                        categoryTemplates.map(t => (
                                            <div
                                                key={t.id}
                                                className={`template-item ${t.is_active ? 'template-item--active' : ''}`}
                                                onClick={() => handleLoadTemplate(category, t)}
                                            >
                                                <div className="template-item__info">
                                                    <span className="template-item__name">{t.name}</span>
                                                    {t.is_active && <span className="template-item__badge">使用中</span>}
                                                </div>
                                                <div className="template-item__actions">
                                                    {!t.is_active && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleActivate(t.id); }}
                                                        >
                                                            啟用
                                                        </Button>
                                                    )}
                                                    <button className="template-action-btn" onClick={(e) => handleDelete(e, t.id)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* 編輯區域 */}
                                <Textarea
                                    placeholder="在這裡編輯指令..."
                                    value={activePrompts[category] || ''}
                                    onChange={(e) => setActivePrompts({ ...activePrompts, [category]: e.target.value })}
                                    rows={10}
                                    fullWidth
                                    hint={category === 'title_generation'
                                        ? "支援 {keyword}, {intent}, {titles} 變數。"
                                        : "支援 {keyword}, {intent}, {keywords}, {paa}, {related_searches}, {ai_overview} 變數。"}
                                />

                                {/* Save as new Template */}
                                <div className="prompt-card__new-template">
                                    <Input
                                        placeholder="新模板名稱 (如: 爆款風格)"
                                        value={newTemplateNames[category] || ''}
                                        onChange={(e) => setNewTemplateNames({ ...newTemplateNames, [category]: e.target.value })}
                                        fullWidth
                                    />
                                    <Button
                                        variant="cta"
                                        onClick={() => handleSaveAsNew(category)}
                                        loading={savingCategory === category}
                                        disabled={!activePrompts[category] || !newTemplateNames[category]}
                                    >
                                        另存為模板
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
