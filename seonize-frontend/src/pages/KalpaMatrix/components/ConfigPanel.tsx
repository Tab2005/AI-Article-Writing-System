import React from 'react';
import { Button, Input } from '../../../components/ui';
import { TagInput } from './TagInput';

interface ConfigPanelProps {
    projectName: string;
    setProjectName: (val: string) => void;
    industry: string;
    setIndustry: (val: string) => void;
    moneyPageUrl: string;
    setMoneyPageUrl: (val: string) => void;
    cmsConfigId: string;
    setCmsConfigId: (val: string) => void;
    cmsConfigs: any[];
    entities: string[];
    setEntities: (val: string[]) => void;
    actions: string[];
    setActions: (val: string[]) => void;
    pains: string[];
    setPains: (val: string[]) => void;
    titleTemplate: string;
    setTitleTemplate: (val: string) => void;
    exclusionRules: any;
    setExclusionRules: (val: any) => void;
    handleGenerate: () => void;
    handleClearAll: () => void;
    handleSave: () => void;
    exportCSV: () => void;
    loading: boolean;
    saveLoading: boolean;
    matrixId: string | null;
    results: any[];
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    projectName, setProjectName,
    industry, setIndustry,
    moneyPageUrl, setMoneyPageUrl,
    cmsConfigId, setCmsConfigId,
    cmsConfigs,
    entities, setEntities,
    actions, setActions,
    pains, setPains,
    titleTemplate, setTitleTemplate,
    exclusionRules, setExclusionRules,
    handleGenerate,
    handleClearAll,
    handleSave,
    exportCSV,
    loading,
    saveLoading,
    matrixId,
    results
}) => {
    return (
        <div className="kalpa-config card">
            <div className="kalpa-instruction">
                <h4>
                    <span>💡</span> 如何使用因果矩陣？
                </h4>
                <p>
                    在下方欄位輸入您的核心<b>實體</b>、<b>動作</b>與<b>痛點</b>。
                    輸入完成後按下 <b>Enter</b> 即可新增。系統將自動排列組合生成所有可能的搜尋意圖標題。
                    生成後請點擊「儲存專案」以解鎖預留「神諭編織」功能。
                </p>
            </div>

            <details className="kalpa-advanced-config" style={{ marginBottom: 'var(--space-6)' }}>
                <summary style={{
                    cursor: 'pointer',
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    userSelect: 'none',
                    width: 'fit-content',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="icon">⚙️</span>
                    <span>進階標題設定 (點擊展開)</span>
                </summary>

                <div className="title-template-config" style={{ marginTop: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="config-header">
                        <span className="icon">🏷️</span>
                        <span>意圖標題模板 (建議搭配預留位置: {'{entity}'}, {'{action}'}, {'{pain_point}'})</span>
                    </div>
                    <div className="template-input-group">
                        <Input
                            placeholder="例如：{entity}{action}{pain_point}怎麼辦？2026 最新解決教學與修復步驟"
                            value={titleTemplate}
                            onChange={(e) => setTitleTemplate(e.target.value)}
                        />
                        <div className="template-presets">
                            <button className="preset-btn" onClick={() => setTitleTemplate('{entity}{action}{pain_point}怎麼辦？2026 最新解決教學與修復步驟')}>預設</button>
                            <button className="preset-btn" onClick={() => setTitleTemplate('{entity}{action}{pain_point}：2026 專家深度分析與防坑指南')}>專業指南</button>
                            <button className="preset-btn" onClick={() => setTitleTemplate('{entity}在{action}時遇到{pain_point}？這篇教你如何快速修復')}>實戰修復</button>
                            <button className="preset-btn" onClick={() => setTitleTemplate('為什麼{entity}{action}會{pain_point}？2026 避坑清單與優化方案')}>避坑清單</button>
                            <button className="preset-btn" style={{ color: '#ef4444' }} onClick={() => setExclusionRules({})}>清空過濾規則</button>
                        </div>
                    </div>
                </div>

                <div className="filter-logic-config" style={{ marginTop: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span className="icon">🛡️</span>
                            <span>慧眼識珠：過濾邏輯設定 (JSON 格式)</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>AI 將自動生成，您也可手動調整</span>
                    </div>
                    <div style={{ padding: 'var(--space-4)' }}>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                color: '#10b981',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-3)',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                            value={JSON.stringify(exclusionRules, null, 2)}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    setExclusionRules(parsed);
                                } catch (err) {
                                    // 暫不處理編輯中的無效 JSON
                                }
                            }}
                            placeholder='{ "關鍵字": ["禁止詞1", "禁止詞2"] }'
                        />
                    </div>
                </div>
            </details>

            <div className="kalpa-config__row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <Input
                    label="專案名稱"
                    placeholder="輸入專案名稱..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                />
                <Input
                    label="產業 (Industry)"
                    placeholder="例如：Crypto, Finance..."
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                />
                <Input
                    label="目標導航 URL (Money Page)"
                    placeholder="https://your-money-page.com"
                    value={moneyPageUrl}
                    onChange={(e) => setMoneyPageUrl(e.target.value)}
                />
                <div className="input-field-group">
                    <label className="input-label">預設發布站點</label>
                    <select
                        value={cmsConfigId}
                        onChange={(e) => setCmsConfigId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text)',
                            fontSize: '14px',
                            height: '42px'
                        }}
                    >
                        <option value="">不預設</option>
                        {cmsConfigs.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="kalpa-config__grid">
                <TagInput
                    label="實體 (Entities)"
                    tags={entities}
                    setTags={setEntities}
                    placeholder="例如：幣安, MetaMask..."
                />
                <TagInput
                    label="動作 (Actions)"
                    tags={actions}
                    setTags={setActions}
                    placeholder="例如：入金, 提現, 註冊..."
                />
                <TagInput
                    label="痛點 (Pain Points)"
                    tags={pains}
                    setTags={setPains}
                    placeholder="例如：失敗, 等很久, 報錯..."
                />
            </div>

            <div className="kalpa-config__actions" style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <Button
                    variant="cta"
                    onClick={handleGenerate}
                    loading={loading}
                    icon={<span>🔮</span>}
                >
                    推演因果矩陣
                </Button>
                <Button
                    variant="outline"
                    onClick={handleClearAll}
                    title="清空所有欄位"
                >
                    全部清空
                </Button>
                {results.length > 0 && (
                    <>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            loading={saveLoading}
                            icon={<span>💾</span>}
                        >
                            {matrixId ? '更新專案' : '儲存專案'}
                        </Button>
                        <Button variant="outline" onClick={exportCSV}>
                            匯出 CSV
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
