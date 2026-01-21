import React, { useState } from 'react';
import { Button, KPICard } from '../components/ui';
import './WritingPage.css';

interface Section {
    id: string;
    heading: string;
    content: string;
    status: 'pending' | 'generating' | 'done';
}

export const WritingPage: React.FC = () => {
    const [sections, setSections] = useState<Section[]>([
        { id: '1', heading: '什麼是 SEO？基礎概念解析', content: '', status: 'done' },
        { id: '2', heading: 'SEO 的重要性', content: '', status: 'generating' },
        { id: '3', heading: '2026 年最新 SEO 技巧', content: '', status: 'pending' },
        { id: '4', heading: '常見問題 FAQ', content: '', status: 'pending' },
    ]);

    const [activeSection, setActiveSection] = useState<string>('2');
    const [generatedContent, setGeneratedContent] = useState<string>(`## SEO 的重要性

在數位時代，**搜尋引擎優化 (SEO)** 已成為企業線上成功的關鍵因素。根據最新統計，超過 93% 的線上體驗始於搜尋引擎，這意味著若您的網站無法在搜尋結果中獲得良好排名，您將錯失大量潛在客戶。

### 為什麼企業需要 SEO？

1. **提升品牌曝光度**：高排名意味著更多人看到您的品牌
2. **增加有機流量**：免費獲得持續穩定的訪客
3. **建立信任與權威**：搜尋排名高的網站通常被視為更可信賴
4. **提高轉換率**：有機搜尋流量的轉換率通常高於付費廣告

### SEO vs 付費廣告

| 項目 | SEO | PPC 廣告 |
|------|-----|----------|
| 成本 | 長期投資，邊際成本遞減 | 持續性支出 |
| 效果 | 累積性成長 | 立即見效 |
| 信任度 | 較高 | 較低 |

> **專家建議**：結合 SEO 與 PPC 策略，可以最大化搜尋行銷效益。
`);

    const getStatusIcon = (status: Section['status']) => {
        switch (status) {
            case 'done':
                return <span className="status-icon status-icon--done">✓</span>;
            case 'generating':
                return <span className="status-icon status-icon--generating">⟳</span>;
            default:
                return <span className="status-icon status-icon--pending">○</span>;
        }
    };

    const highlightKeywords = (content: string) => {
        const keywords = ['SEO', '搜尋引擎優化', '關鍵字', '排名'];
        let highlighted = content;
        keywords.forEach(kw => {
            const regex = new RegExp(`(${kw})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark class="keyword-highlight">$1</mark>');
        });
        return highlighted;
    };

    return (
        <div className="writing-page">
            <div className="writing-header">
                <div>
                    <h2 className="writing-header__title">分段撰寫預覽器</h2>
                    <p className="writing-header__desc">
                        即時預覽 AI 生成內容，關鍵字高亮顯示
                    </p>
                </div>
                <div className="writing-header__actions">
                    <Button variant="secondary">匯出 Markdown</Button>
                    <Button variant="cta">繼續生成</Button>
                </div>
            </div>

            {/* Progress Stats */}
            <div className="writing-stats">
                <KPICard
                    title="完成進度"
                    value={`${sections.filter(s => s.status === 'done').length}/${sections.length}`}
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    }
                />
                <KPICard
                    title="總字數"
                    value="1,250"
                    suffix="字"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7V4h16v3" />
                            <path d="M9 20h6" />
                            <path d="M12 4v16" />
                        </svg>
                    }
                />
                <KPICard
                    title="關鍵字密度"
                    value="2.3"
                    suffix="%"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" x2="20" y1="9" y2="9" />
                            <line x1="4" x2="20" y1="15" y2="15" />
                            <line x1="10" x2="8" y1="3" y2="21" />
                            <line x1="16" x2="14" y1="3" y2="21" />
                        </svg>
                    }
                />
                <KPICard
                    title="E-E-A-T 分數"
                    value="85"
                    suffix="/100"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    }
                />
            </div>

            {/* Writing Content */}
            <div className="writing-content">
                {/* Section List */}
                <div className="writing-sidebar">
                    <h3 className="writing-sidebar__title">章節列表</h3>
                    <div className="section-list">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`section-item ${activeSection === section.id ? 'section-item--active' : ''} section-item--${section.status}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                {getStatusIcon(section.status)}
                                <span className="section-item__heading">{section.heading}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Preview */}
                <div className="writing-preview">
                    <div className="writing-preview__header">
                        <h3 className="writing-preview__title">內容預覽</h3>
                        <div className="writing-preview__mode">
                            <button className="preview-mode-btn preview-mode-btn--active">渲染</button>
                            <button className="preview-mode-btn">原始碼</button>
                        </div>
                    </div>
                    <div
                        className="writing-preview__content markdown-body"
                        dangerouslySetInnerHTML={{ __html: highlightKeywords(generatedContent) }}
                    />
                </div>
            </div>

            {/* SEO Check */}
            <div className="seo-check">
                <h3 className="seo-check__title">SEO 體檢</h3>
                <div className="seo-check__items">
                    <div className="seo-check__item seo-check__item--pass">
                        <span className="seo-check__icon">✓</span>
                        <span>關鍵字密度在建議範圍內 (1.5% - 3%)</span>
                    </div>
                    <div className="seo-check__item seo-check__item--pass">
                        <span className="seo-check__icon">✓</span>
                        <span>文章字數超過 1000 字</span>
                    </div>
                    <div className="seo-check__item seo-check__item--warn">
                        <span className="seo-check__icon">!</span>
                        <span>建議添加更多內部連結</span>
                    </div>
                    <div className="seo-check__item seo-check__item--pass">
                        <span className="seo-check__icon">✓</span>
                        <span>偵測到 E-E-A-T 信號：專家引用、數據來源</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
