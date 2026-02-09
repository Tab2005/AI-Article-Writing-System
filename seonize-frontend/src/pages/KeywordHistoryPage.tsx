import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Button } from '../components/ui';
import { researchApi } from '../services/api';
import type { ResearchHistoryItem } from '../types';
import './KeywordHistoryPage.css';

export const KeywordHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const data = await researchApi.getHistory();
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch research history:', err);
                setError('無法取得歷史紀錄');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const columns = [
        {
            key: 'keyword' as const,
            header: '關鍵字',
            render: (val: any) => (
                <div className="history-keyword">
                    <span className="history-keyword__text">{val}</span>
                </div>
            )
        },
        {
            key: 'search_volume' as const,
            header: '月搜尋量',
            render: (val: any) => val?.toLocaleString() || '-'
        },
        {
            key: 'cpc' as const,
            header: '平均 CPC',
            render: (val: any) => val ? `$${val.toFixed(2)}` : '-'
        },
        {
            key: 'created_at' as const,
            header: '搜尋日期',
            render: (val: any) => new Date(val).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        },
        {
            key: 'actions' as any,
            header: '操作',
            render: (_: any, row: ResearchHistoryItem) => (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/keyword?q=${encodeURIComponent(row.keyword)}`)}
                >
                    查看詳情
                </Button>
            )
        }
    ];

    return (
        <div className="keyword-history-page">
            <div className="history-header">
                <div className="history-header__content">
                    <h2 className="history-header__title">研究歷史紀錄</h2>
                    <p className="history-header__desc">瀏覽過去搜尋過的關鍵字資料，包含搜尋量、CPC 與搜尋時間。</p>
                </div>
                <Button variant="primary" onClick={() => navigate('/keyword')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <path d="M5 12h14M12 5v14" />
                    </svg>
                    新研究
                </Button>
            </div>

            {error && <div className="history-error">{error}</div>}

            <div className="history-list-section">
                <DataTable
                    columns={columns as any}
                    data={history}
                    loading={loading}
                    onRowClick={(row) => navigate(`/keyword?q=${encodeURIComponent(row.keyword)}`)}
                />
            </div>
        </div>
    );
};
