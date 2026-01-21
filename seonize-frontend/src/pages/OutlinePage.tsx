import React, { useState } from 'react';
import { Button } from '../components/ui';
import './OutlinePage.css';

interface OutlineItem {
    id: string;
    heading: string;
    level: number;
    keywords: string[];
}

export const OutlinePage: React.FC = () => {
    const [outline, setOutline] = useState<OutlineItem[]>([
        { id: '1', heading: '什麼是 SEO？基礎概念解析', level: 2, keywords: ['SEO', '搜尋引擎優化'] },
        { id: '2', heading: 'SEO 的重要性', level: 2, keywords: ['SEO 重要性'] },
        { id: '3', heading: '為什麼企業需要 SEO？', level: 3, keywords: ['企業 SEO'] },
        { id: '4', heading: 'SEO 與付費廣告的差異', level: 3, keywords: ['SEO vs 廣告'] },
        { id: '5', heading: '2026 年最新 SEO 技巧', level: 2, keywords: ['SEO 技巧'] },
        { id: '6', heading: '關鍵字研究方法', level: 3, keywords: ['關鍵字研究'] },
        { id: '7', heading: '內容優化策略', level: 3, keywords: ['內容優化'] },
        { id: '8', heading: '技術 SEO 檢查清單', level: 3, keywords: ['技術 SEO'] },
        { id: '9', heading: '常見問題 FAQ', level: 2, keywords: ['SEO FAQ'] },
    ]);

    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleDragStart = (id: string) => {
        setDraggedItem(id);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== targetId) {
            const draggedIndex = outline.findIndex(item => item.id === draggedItem);
            const targetIndex = outline.findIndex(item => item.id === targetId);

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
        setOutline(outline.map(item => {
            if (item.id === id) {
                const newLevel = Math.max(2, Math.min(4, item.level + delta));
                return { ...item, level: newLevel };
            }
            return item;
        }));
    };

    const handleHeadingChange = (id: string, newHeading: string) => {
        setOutline(outline.map(item =>
            item.id === id ? { ...item, heading: newHeading } : item
        ));
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
        setOutline(outline.filter(item => item.id !== id));
    };

    return (
        <div className="outline-page">
            <div className="outline-header">
                <div>
                    <h2 className="outline-header__title">互動式大綱編輯器</h2>
                    <p className="outline-header__desc">
                        拖拽排序 H2/H3 結構，編輯標題文字，規劃知識圖譜
                    </p>
                </div>
                <div className="outline-header__actions">
                    <Button variant="secondary" onClick={handleAddSection}>
                        + 新增章節
                    </Button>
                    <Button variant="cta">生成內容</Button>
                </div>
            </div>

            {/* Logic Chain */}
            <div className="logic-chain">
                <h3 className="logic-chain__title">邏輯鏈條</h3>
                <div className="logic-chain__flow">
                    <span className="logic-chain__step">定義說明</span>
                    <span className="logic-chain__arrow">→</span>
                    <span className="logic-chain__step">原理解析</span>
                    <span className="logic-chain__arrow">→</span>
                    <span className="logic-chain__step">步驟教學</span>
                    <span className="logic-chain__arrow">→</span>
                    <span className="logic-chain__step">注意事項</span>
                    <span className="logic-chain__arrow">→</span>
                    <span className="logic-chain__step">常見問題</span>
                </div>
            </div>

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
                                <span
                                    className="outline-item__heading"
                                    onClick={() => setEditingId(item.id)}
                                >
                                    {item.heading}
                                </span>
                            )}

                            <div className="outline-item__keywords">
                                {item.keywords.map((kw, i) => (
                                    <span key={i} className="outline-item__keyword">{kw}</span>
                                ))}
                            </div>

                            <button
                                className="outline-item__delete"
                                onClick={() => handleDeleteSection(item.id)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
