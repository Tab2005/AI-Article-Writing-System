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

    return (
        <div className="cm-page">
            <header className="cm-header">
                <h1 className="cm-title">會員與點數管理</h1>
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
                {/* 1. 功能點數消耗 */}
                <section className="cm-section glass-card">
                    <h2 className="cm-section-title">✨ 功能點數消耗 (Costs)</h2>
                    <div className="cm-costs-list">
                        {Object.entries(costs).map(([key, value]: [string, any]) => (
                            <div className="cm-cost-item" key={key}>
                                <label className="cm-cost-label">{key}</label>
                                <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => handleCostChange(key, e.target.value)}
                                    className="cm-cost-input"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <div className="cm-column">
                    {/* 2. 等級權限設定 */}
                    <section className="cm-section glass-card">
                        <h2 className="cm-section-title">🛡️ 等級權限設定 (Feature Access)</h2>
                        <div className="cm-access-list">
                            {Object.entries(feature_access_levels_mapping).map(([feature, label]) => (
                                <div className="cm-access-item" key={feature}>
                                    <span className="cm-access-label">{label}</span>
                                    <select
                                        className="cm-select"
                                        value={featureAccess[feature] || 1}
                                        onChange={(e) => handleAccessChange(feature, parseInt(e.target.value))}
                                    >
                                        <option value={1}>Lv.1 Basic (暫時試用)</option>
                                        <option value={2}>Lv.2 Pro (一般會員)</option>
                                        <option value={3}>Lv.3 Business (深度會員)</option>
                                    </select>
                                </div>
                            ))}
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

// 內部對應表，用於更友善地顯示功能名稱
const feature_access_levels_mapping = {
    "writing_full": "生成完整文章 (Generate Full)",
    "kalpa_batch_weave": "批量編製 (Batch Weave)",
    "cms_access": "站點管理入口 (CMS Access)",
    "dataforseo_keywords": "關鍵字流量數據 (SEO Data)",
};

export default CreditManagementPage;
