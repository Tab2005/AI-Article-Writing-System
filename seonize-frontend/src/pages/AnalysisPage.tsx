import React from 'react';
import { Button, KPICard } from '../components/ui';
import './AnalysisPage.css';

export const AnalysisPage: React.FC = () => {
    const intentTypes = [
        {
            id: 'informational',
            label: '資訊型',
            desc: '用戶想要了解知識或資訊',
            examples: ['如何...', '什麼是...', '為什麼...'],
            style: '專業教育風',
            color: 'var(--color-primary)',
        },
        {
            id: 'commercial',
            label: '商業型',
            desc: '用戶正在研究產品或服務',
            examples: ['推薦', '比較', '最好的...'],
            style: '評論風',
            color: 'var(--color-cta)',
        },
        {
            id: 'navigational',
            label: '導航型',
            desc: '用戶想要找到特定網站',
            examples: ['品牌名稱', '官網', '登入'],
            style: '新聞風',
            color: 'var(--color-success)',
        },
        {
            id: 'transactional',
            label: '交易型',
            desc: '用戶準備採取購買行動',
            examples: ['購買', '下載', '訂閱'],
            style: '對話風',
            color: '#8B5CF6',
        },
    ];

    return (
        <div className="analysis-page">
            <div className="analysis-header">
                <h2 className="analysis-header__title">意圖分析引擎</h2>
                <p className="analysis-header__desc">
                    智慧判定四大搜尋意圖，匹配最佳寫作風格與 SEO 策略
                </p>
            </div>

            {/* Intent Types Grid */}
            <div className="intent-grid">
                {intentTypes.map((intent) => (
                    <div
                        key={intent.id}
                        className="intent-card"
                        style={{ '--intent-color': intent.color } as React.CSSProperties}
                    >
                        <div className="intent-card__header">
                            <span className="intent-card__badge">{intent.label}</span>
                        </div>
                        <p className="intent-card__desc">{intent.desc}</p>
                        <div className="intent-card__examples">
                            {intent.examples.map((ex, i) => (
                                <span key={i} className="intent-card__example">{ex}</span>
                            ))}
                        </div>
                        <div className="intent-card__footer">
                            <span className="intent-card__style">建議風格：{intent.style}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analysis Tool */}
            <div className="analysis-tool">
                <h3 className="analysis-tool__title">分析工具</h3>
                <div className="analysis-tool__content">
                    <div className="analysis-tool__input">
                        <textarea
                            className="analysis-tool__textarea"
                            placeholder="貼上 SERP 標題或內容進行意圖分析..."
                            rows={4}
                        />
                        <Button variant="cta">分析意圖</Button>
                    </div>

                    <div className="analysis-tool__results">
                        <KPICard title="偵測意圖" value="資訊型" />
                        <KPICard title="信心度" value="85%" />
                        <KPICard title="匹配風格" value="專業教育風" />
                    </div>
                </div>
            </div>

            {/* Optimization Modes */}
            <div className="optimization-section">
                <h3 className="optimization-section__title">優化模式</h3>
                <div className="optimization-grid">
                    <div className="optimization-card optimization-card--seo">
                        <h4>SEO 模式</h4>
                        <p>傳統搜尋引擎優化，著重關鍵字密度、Meta 標籤、內部連結</p>
                        <ul>
                            <li>關鍵字研究與嵌入</li>
                            <li>Meta Title/Description</li>
                            <li>標題結構優化</li>
                        </ul>
                    </div>
                    <div className="optimization-card optimization-card--aeo">
                        <h4>AEO 模式</h4>
                        <p>答案引擎優化，針對語音搜尋與精選摘要</p>
                        <ul>
                            <li>問答格式結構</li>
                            <li>FAQ Schema</li>
                            <li>簡潔直接回答</li>
                        </ul>
                    </div>
                    <div className="optimization-card optimization-card--geo">
                        <h4>GEO 模式</h4>
                        <p>生成式引擎優化，針對 AI 搜尋助手</p>
                        <ul>
                            <li>深度引用與來源</li>
                            <li>E-E-A-T 信號強化</li>
                            <li>權威性內容結構</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
