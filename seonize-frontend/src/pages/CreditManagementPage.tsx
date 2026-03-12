import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { Button, Input } from '../components/ui';
import './CreditManagementPage.css';

const CreditManagementPage: React.FC = () => {
    const [config, setConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getCreditConfig();
            setConfig(data);
        } catch (error) {
            console.error('Failed to fetch credit config:', error);
            setMessage({ type: 'error', text: '讀取配置失敗' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminApi.updateCreditConfig(config);
            setMessage({ type: 'success', text: '配置已更新，並已清除伺服器快取' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '更新失敗' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="cm-loading">載入配置中...</div>;
    if (!config) return <div className="cm-error">無法載入配置資料</div>;

    const costs = config.costs || {};
    const featureAccess = config.feature_access || {};
    const batchDiscounts = config.batch_discounts || [];

    const handleCostChange = (key: string, value: string) => {
        const val = parseInt(value) || 0;
        setConfig({
            ...config,
            costs: { ...config.costs, [key]: val }
        });
    };

    const handleAccessChange = (feature: string, level: number) => {
        setConfig({
            ...config,
            feature_access: { ...config.feature_access, [feature]: level }
        });
    };

    const handleDiscountChange = (index: number, field: string, value: string) => {
        const newDiscounts = [...batchDiscounts];
        if (field === 'threshold') {
            newDiscounts[index].threshold = parseInt(value) || 0;
        } else {
            newDiscounts[index].rate = parseFloat(value) || 0;
        }
        setConfig({ ...config, batch_discounts: newDiscounts });
    };

    const addDiscount = () => {
        setConfig({
            ...config,
            batch_discounts: [...batchDiscounts, { threshold: 10, rate: 0.9 }]
        });
    };

    const removeDiscount = (index: number) => {
        setConfig({
            ...config,
            batch_discounts: batchDiscounts.filter((_: any, i: number) => i !== index)
        });
    };

    const handleLevelNameChange = (level: string, name: string) => {
        setConfig({
            ...config,
            level_names: { ...config.level_names, [level]: name }
        });
    };

    const addLevel = () => {
        const nextLevel = (Object.keys(config.level_names || {}).length + 1).toString();
        setConfig({
            ...config,
            level_names: { ...config.level_names, [nextLevel]: `新等級 ${nextLevel}` }
        });
    };

    const removeLevel = (level: string) => {
        const newLevelNames = { ...config.level_names };
        delete newLevelNames[level];
        setConfig({ ...config, level_names: newLevelNames });
    };

    const levelOptions = Object.entries(config.level_names || {}).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    return (
        <div className="cm-page">
            <header className="cm-header">
                <h1 className="cm-title">等級配置</h1>
                <p className="cm-subtitle">自由定義各功能的點數消耗、等級權限與批量折扣規則</p>
                <Button variant="cta" onClick={handleSave} loading={isSaving} className="cm-save-btn">
                    儲存所有變更
                </Button>
            </header>

            {message.text && (
                <div className={`cm-alert cm-alert--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="cm-grid">
                <section className="cm-section glass-card">
                    <h2 className="cm-section-title">✨ 功能點數消耗配置</h2>
                    <div className="cm-costs-list">
                        {Object.entries(costs).map(([key, value]: [string, any]) => (
                            <div className="cm-cost-item" key={key}>
                                <div className="cm-cost-info">
                                    <span className="cm-cost-name">{COST_NAME_MAPPING[key] || key}</span>
                                    <span className="cm-cost-key">{key}</span>
                                </div>
                                <div className="cm-cost-action">
                                    <Input
                                        type="number"
                                        value={value}
                                        onChange={(e) => handleCostChange(key, e.target.value)}
                                        className="cm-cost-input"
                                    />
                                    <span className="cm-cost-unit">點</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="cm-column">
                    <section className="cm-section glass-card">
                        <h2 className="cm-section-title">🛡️ 等級與權限分配</h2>
                        <div className="cm-access-list">
                            {Object.entries(feature_access_levels_mapping).map(([feature, label]) => (
                                <div className="cm-access-item" key={feature}>
                                    <span className="cm-access-label">{label}</span>
                                    <select
                                        className="cm-select"
                                        value={featureAccess[feature] || 1}
                                        onChange={(e) => handleAccessChange(feature, parseInt(e.target.value))}
                                    >
                                        {levelOptions.map(([lvl, name]) => (
                                            <option key={lvl} value={lvl}>Lv.{lvl} {name as string}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <p className="cm-hint">※ 功能僅限高於或等於設定等級之會員使用。</p>
                    </section>

                    {/* 2.5 會員等級管理 */}
                    <section className="cm-section glass-card">
                        <h2 className="cm-section-title">💎 會員等級名稱定義</h2>
                        <div className="cm-levels-list">
                            {levelOptions.map(([lvl, name]) => (
                                <div className="cm-level-row" key={lvl}>
                                    <div className="cm-level-badge">Lv.{lvl}</div>
                                    <Input
                                        value={name as string}
                                        onChange={(e) => handleLevelNameChange(lvl, e.target.value)}
                                        className="cm-level-input"
                                    />
                                    {parseInt(lvl) > 3 && (
                                        <button className="cm-btn-remove" onClick={() => removeLevel(lvl)}>×</button>
                                    )}
                                </div>
                            ))}
                            <Button variant="secondary" onClick={addLevel} className="cm-add-btn">
                                + 新增會員等級
                            </Button>
                        </div>
                    </section>

                    {/* 3. 批量折扣規則 */}
                    <section className="cm-section glass-card">
                        <h2 className="cm-section-title">🎟️ 批量折扣規則 (Batch Discounts)</h2>
                        <div className="cm-discounts">
                            <div className="cm-discount-header">
                                <span>節點門檻 (≥)</span>
                                <span>折扣率 (0.7 = 7折)</span>
                                <span>操作</span>
                            </div>
                            {batchDiscounts.map((d: any, i: number) => (
                                <div className="cm-discount-row" key={i}>
                                    <Input
                                        type="number"
                                        value={d.threshold}
                                        onChange={(e) => handleDiscountChange(i, 'threshold', e.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={d.rate}
                                        onChange={(e) => handleDiscountChange(i, 'rate', e.target.value)}
                                    />
                                    <button className="cm-btn-remove" onClick={() => removeDiscount(i)}>×</button>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={addDiscount} className="cm-add-btn">
                                + 新增折扣層級
                            </Button>
                        </div>
                        <p className="cm-hint">※ 批量折扣目前僅適用於「劫之眼術」的批量編織功能。</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

// 功能點數中文對應表
const COST_NAME_MAPPING: Record<string, string> = {
    "writing_section": "生成章節內容 (Section)",
    "writing_full": "生成完整文章 (Full Article)",
    "writing_optimize": "文章優化 (Optimize)",
    "kalpa_brainstorm": "因果靈感發想 (Brainstorm)",
    "kalpa_weave_node": "神諭編織 (Weave Node)",
    "kalpa_batch_weave": "批量編織 (Batch Weave)",
    "cms_ai_schedule": "AI 自動排程發布",
    "quality_audit": "品質健檢 (Audit)",
    "image_stock_search": "圖庫搜尋 (Stock Search)",
    "serp_query": "SERP 搜尋查詢",
    "dataforseo_keywords": "關鍵字流量數據",
    "ai_intent_analysis": "AI 意圖分析",
    "create_outline": "AI 大綱生成",
    "competitor_analysis": "競爭者分析 (Competitor)",
    "content_gap_analysis": "內容缺口分析 (Gap Analysis)"
};

// 權限功能中文對應表
const feature_access_levels_mapping = {
    "writing_full": "生成完整文章權限",
    "kalpa_batch_weave": "批量編製權限",
    "cms_access": "站點管理入口權限",
    "dataforseo_keywords": "關鍵字流量數據權限",
};

export default CreditManagementPage;
