import React, { useState } from 'react';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { kalpaApi } from '../services/api';
import type { KalpaNode } from '../services/api';
import './KalpaPage.css';

interface TagInputProps {
    label: string;
    tags: string[];
    setTags: (tags: string[]) => void;
    placeholder: string;
}

const TagInput: React.FC<TagInputProps> = ({ label, tags, setTags, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                setTags([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    return (
        <div className="tag-input-group">
            <label className="tag-input-label">
                <span>{label}</span>
                <span className="tag-input-count">{tags.length} 項目</span>
            </label>
            <div className="tag-input-container">
                {tags.map((tag, index) => (
                    <span key={index} className="tag-item">
                        {tag}
                        <button type="button" onClick={() => removeTag(index)} className="tag-remove">
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="tag-input-field"
                />
            </div>
        </div>
    );
};

export const KalpaPage: React.FC = () => {
    const [projectName, setProjectName] = useState('Crypto_Emergency_2026');
    const [industry, setIndustry] = useState('Crypto');
    const [moneyPageUrl, setMoneyPageUrl] = useState('');
    const [entities, setEntities] = useState<string[]>(['幣安', 'MAX', 'OKX', 'MetaMask', 'Bybit']);
    const [actions, setActions] = useState<string[]>(['入金', '提現', 'KYC認證', '合約下單', '提幣']);
    const [pains, setPains] = useState<string[]>(['卡住', '失敗', '被風控', '顯示錯誤代碼', '等很久沒收到']);

    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [weaveLoading, setWeaveLoading] = useState<string | null>(null);
    const [results, setResults] = useState<KalpaNode[]>([]);
    const [matrixId, setMatrixId] = useState<string | null>(null);

    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);

    const handleGenerate = async () => {
        if (entities.length === 0 || actions.length === 0 || pains.length === 0) {
            alert('請至少在每個欄位輸入一個項目');
            return;
        }

        setLoading(true);
        try {
            const data = await kalpaApi.generate({
                project_name: projectName,
                entities,
                actions,
                pain_points: pains,
            });
            setResults(data);
            setMatrixId(null); // Reset saved ID on new generation
        } catch (error) {
            console.error('Failed to generate Kalpa matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (results.length === 0) return;
        setSaveLoading(true);
        try {
            const res = await kalpaApi.save({
                project_name: projectName,
                industry,
                money_page_url: moneyPageUrl,
                entities,
                actions,
                pain_points: pains,
                nodes: results
            });
            if (res.success) {
                setMatrixId(res.matrix_id);
                // Refresh results to get IDs from database
                const updatedMatrix = await kalpaApi.get(res.matrix_id);
                setResults(updatedMatrix.nodes || []);
                alert('專案儲存成功！');
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('儲存失敗，請檢查網路連線。');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleWeave = async (node: KalpaNode) => {
        if (!node.id) {
            alert('請先點擊「儲存專案」，才能開始編織文章。');
            return;
        }

        setWeaveLoading(node.id);
        try {
            const res = await kalpaApi.weave(node.id);
            if (res.success) {
                setResults(prev => prev.map(n => n.id === node.id ? res.node : n));
                setPreviewNode(res.node);
            }
        } catch (error) {
            console.error('Weaving failed:', error);
            alert('編織失敗，請稍後再試。');
        } finally {
            setWeaveLoading(null);
        }
    };

    const exportCSV = () => {
        if (results.length === 0) return;

        const headers = ['Entity', 'Action', 'Pain Point', 'Target Title', 'Status'];
        const rows = results.map(r => [r.entity, r.action, r.pain_point, r.target_title, r.status]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${projectName}_matrix.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        { key: 'entity', header: '實體', width: '100px' },
        { key: 'action', header: '動作', width: '100px' },
        { key: 'pain_point', header: '痛點', width: '120px' },
        { key: 'target_title', header: '意圖標題' },
        {
            key: 'status',
            header: '狀態',
            width: '120px',
            render: (val: any, row: KalpaNode) => {
                const statusStr = String(val);
                if (statusStr === 'completed') {
                    return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="status-badge status-completed">已編織</span>
                            <button className="weave-btn" onClick={() => setPreviewNode(row)}>預覽</button>
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`status-badge status-${statusStr}`}>
                            {statusStr === 'pending' ? '待編織' : statusStr === 'weaving' ? '編織中' : statusStr}
                        </span>
                        {statusStr === 'pending' && (
                            <button
                                className="weave-btn"
                                disabled={weaveLoading !== null}
                                onClick={() => handleWeave(row)}
                            >
                                {weaveLoading === row.id ? '...' : '編織'}
                            </button>
                        )}
                    </div>
                );
            }
        },
    ] as any;

    return (
        <div className="kalpa-page-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
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

                <div className="kalpa-config__row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 'var(--space-4)' }}>
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

                <div className="kalpa-config__actions">
                    <Button
                        variant="cta"
                        onClick={handleGenerate}
                        loading={loading}
                        icon={<span>🔮</span>}
                    >
                        推演因果矩陣
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

            {results.length > 0 && (
                <div className="kalpa-results">
                    <div className="results-header">
                        <KPICard title="總意圖節點" value={results.length.toString()} icon={<span>📊</span>} />
                        <KPICard title="儲存狀態" value={matrixId ? '已儲存' : '未儲存'} icon={<span>🔒</span>} />
                    </div>

                    <div className="results-table-container card">
                        <h3 className="card-title">矩陣節點預覽</h3>
                        <DataTable columns={columns} data={results} />
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewNode && (
                <div className="modal-overlay" onClick={() => setPreviewNode(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="card-title" style={{ marginBottom: 0 }}>文章預覽：{previewNode.target_title}</h3>
                            <button onClick={() => setPreviewNode(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)' }}>
                                {previewNode.woven_content}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <p style={{ marginRight: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                使用法寶：{previewNode.anchor_used}
                            </p>
                            <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉</Button>
                            <Button variant="primary" onClick={() => {
                                // Logic to send to main project list
                                alert('功能開發中：將內容發佈至專案清單');
                            }}>發佈文章</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
