import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable } from '../components/ui';
import { kalpaApi } from '../services/api';
import type { KalpaMatrix } from '../services/api';
import './KalpaPage.css'; // Reuse table and status styles

export const KalpaHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [matrices, setMatrices] = useState<KalpaMatrix[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewNode, setPreviewNode] = useState<any | null>(null);
    const [deleteMatrix, setDeleteMatrix] = useState<KalpaMatrix | null>(null);

    useEffect(() => {
        fetchMatrices();
    }, []);

    const fetchMatrices = async () => {
        setLoading(true);
        try {
            const data = await kalpaApi.list();
            setMatrices(data);
        } catch (error) {
            console.error('Failed to fetch matrices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (matrix: KalpaMatrix) => {
        navigate(`/kalpa-eye/matrix?id=${matrix.id}`);
    };

    const handleDeleteMatrix = async () => {
        if (!deleteMatrix) return;
        try {
            await kalpaApi.delete(deleteMatrix.id);
            setMatrices(prev => prev.filter(m => m.id !== deleteMatrix.id));
            setDeleteMatrix(null);
        } catch (error) {
            console.error('Failed to delete matrix:', error);
            alert('刪除失敗');
        }
    };

    const matrixColumns = [
        { key: 'project_name', header: '專案名稱' },
        { key: 'industry', header: '產業', width: '120px' },
        {
            key: 'created_at',
            header: '儲存時間',
            width: '180px',
            render: (val: string) => new Date(val).toLocaleString('zh-TW')
        },
        {
            key: 'actions',
            header: '操作',
            width: '220px',
            render: (_: any, row: KalpaMatrix) => (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" onClick={() => handleViewDetails(row)}>查看詳情</Button>
                    <Button
                        variant="outline"
                        onClick={() => setDeleteMatrix(row)}
                        style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                    >
                        刪除
                    </Button>
                </div>
            )
        }
    ] as any;

    return (
        <div className="kalpa-history-page">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>因果查詢</h3>
                    <Button variant="outline" onClick={fetchMatrices} loading={loading}>重新整理</Button>
                </div>
                <DataTable columns={matrixColumns} data={matrices} loading={loading} />
            </div>

            {/* Confirm Delete Modal */}
            {deleteMatrix && (
                <div className="modal-overlay" onClick={() => setDeleteMatrix(null)} style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        maxWidth: '400px',
                        width: '90%',
                        backgroundColor: 'var(--color-bg-card)',
                        padding: 'var(--space-6)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ marginBottom: 'var(--space-4)' }}>
                            <h3 className="card-title" style={{ marginBottom: 0, color: 'var(--color-text)' }}>確認刪除</h3>
                        </div>
                        <div className="modal-body" style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                            您確定要刪除專案 「<strong>{deleteMatrix.project_name}</strong>」 嗎？此操作將同時刪除所有生成的矩陣節點與文章，且無法復原。
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                            <Button variant="secondary" onClick={() => setDeleteMatrix(null)}>取消</Button>
                            <Button
                                variant="outline"
                                onClick={handleDeleteMatrix}
                                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                            >
                                確認刪除
                            </Button>
                        </div>
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
                                {previewNode.content}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <p style={{ marginRight: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                使用法寶：{previewNode.anchor_used}
                            </p>
                            <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
