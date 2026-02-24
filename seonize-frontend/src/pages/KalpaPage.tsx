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
    const [entities, setEntities] = useState<string[]>(['幣安', 'MAX', 'OKX', 'MetaMask', 'Bybit']);
    const [actions, setActions] = useState<string[]>(['入金', '提現', 'KYC認證', '合約下單', '提幣']);
    const [pains, setPains] = useState<string[]>(['卡住', '失敗', '被風控', '顯示錯誤代碼', '等很久沒收到']);

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<KalpaNode[]>([]);

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
        } catch (error) {
            console.error('Failed to generate Kalpa matrix:', error);
        } finally {
            setLoading(false);
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
        { key: 'entity', header: '實體', width: '120px' },
        { key: 'action', header: '動作', width: '120px' },
        { key: 'pain_point', header: '痛點', width: '150px' },
        { key: 'target_title', header: '意圖標題' },
        {
            key: 'status',
            header: '狀態',
            width: '100px',
            render: (val: any) => {
                const statusStr = String(val);
                return (
                    <span className={`status-badge status-${statusStr}`}>
                        {statusStr === 'pending' ? '待編織' : statusStr}
                    </span>
                );
            }
        },
    ] as any;

    return (
        <div className="kalpa-page">
            <div className="kalpa-header">
                <h1 className="page-title">因果矩陣 (Kalpa Intent Matrix)</h1>
                <p className="kalpa-desc">透過笛卡爾乘積演算法，捕捉市場中所有潛在的搜尋意圖節點。</p>
            </div>

            <div className="kalpa-config card">
                <div className="kalpa-instruction">
                    <h4>
                        <span>💡</span> 如何使用因果矩陣？
                    </h4>
                    <p>
                        在下方欄位輸入您的核心<b>實體</b>（如：產品名）、<b>動作</b>（如：入金）與<b>痛點</b>（如：沒收到）。
                        輸入完成後按下 <b>Enter</b> 即可新增。系統將自動排列組合生成所有可能的搜尋意圖標題。
                    </p>
                </div>

                <div className="kalpa-config__row">
                    <Input
                        label="專案名稱"
                        placeholder="輸入專案名稱以便後續追蹤..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        fullWidth
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
                        <Button variant="outline" onClick={exportCSV}>
                            匯出 CSV
                        </Button>
                    )}
                </div>
            </div>

            {results.length > 0 && (
                <div className="kalpa-results">
                    <div className="results-header">
                        <KPICard title="總意圖節點" value={results.length.toString()} icon={<span>📊</span>} />
                        <KPICard title="預計生成次數" value={results.length.toString()} icon={<span>⚡</span>} />
                    </div>

                    <div className="results-table-container card">
                        <h3 className="card-title">矩陣節點預覽</h3>
                        <DataTable columns={columns} data={results} />
                    </div>
                </div>
            )}
        </div>
    );
};
