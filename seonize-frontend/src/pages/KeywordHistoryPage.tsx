import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Button } from '../components/ui';
import { researchApi } from '../services/api';
import type { ResearchHistoryItem } from '../types';
import './KeywordHistoryPage.css';

export const KeywordHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: ResearchHistoryItem | null }>({
        show: false,
        item: null,
    });

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

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleRefresh = async (keyword: string) => {
        try {
            setUpdating(keyword);
            // 同步更新：數據指標 + SERP 排名
            await Promise.all([
                researchApi.keywordIdeas({ keyword, force_refresh: true }),
                researchApi.serp({ keyword, force_refresh: true })
            ]);

            // 重新取得列表以顯示最新數據與日期
            const data = await researchApi.getHistory();
            setHistory(data);
        } catch (err) {
            console.error('Failed to refresh keyword data:', err);
            alert(`更新失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await researchApi.deleteHistory(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            setDeleteConfirm({ show: false, item: null });
        } catch (err) {
            console.error('Failed to delete research record:', err);
            alert(`刪除失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
        }
    };

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
                <div className="history-actions" style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/keyword?q=${encodeURIComponent(row.keyword)}`);
                        }}
                    >
                        查看
                    </Button>
                    <Button
                        variant="cta"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRefresh(row.keyword);
                        }}
                        loading={updating === row.keyword}
                        disabled={!!updating}
                    >
                        更新
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ show: true, item: row });
                        }}
                        style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                    >
                        刪除
                    </Button>
                </div>
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

            {/* Delete Confirmation Modal */}
            {deleteConfirm.show && deleteConfirm.item && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text)', fontSize: '1.25rem' }}>
                            確認刪除紀錄
                        </h3>
                        <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            您確定要刪除關鍵字「<strong>{deleteConfirm.item.keyword}</strong>」的研究紀錄嗎？此動作將無法復原。
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button
                                variant="secondary"
                                onClick={() => setDeleteConfirm({ show: false, item: null })}
                            >
                                取消
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => deleteConfirm.item && handleDelete(deleteConfirm.item.id)}
                                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                            >
                                確認刪除
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
