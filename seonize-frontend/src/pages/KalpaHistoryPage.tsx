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

    const matrixColumns = [
        { key: 'project_name', header: '專案名稱' },
        { key: 'industry', header: '產業', width: '120px' },
        {
            key: 'created_at',
            header: '儲存時間',
            width: '180px',
            render: (val: string) => new Date(val).toLocaleString()
        },
        {
            key: 'actions',
            header: '操作',
            width: '120px',
            render: (_: any, row: KalpaMatrix) => (
                <Button variant="outline" onClick={() => handleViewDetails(row)}>查看詳情</Button>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
