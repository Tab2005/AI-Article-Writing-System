import React, { useEffect, useState } from 'react';
import { Button, DataTable, KPICard } from '../components/ui';
import { kalpaApi } from '../services/api';
import type { KalpaMatrix, KalpaNode } from '../services/api';
import './KalpaPage.css'; // Reuse table and status styles

export const KalpaHistoryPage: React.FC = () => {
    const [matrices, setMatrices] = useState<KalpaMatrix[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatrix, setSelectedMatrix] = useState<KalpaMatrix | null>(null);
    const [nodes, setNodes] = useState<KalpaNode[]>([]);
    const [nodeLoading, setNodeLoading] = useState(false);
    const [weaveLoading, setWeaveLoading] = useState<string | null>(null);
    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);

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

    const handleViewDetails = async (matrix: KalpaMatrix) => {
        setSelectedMatrix(matrix);
        setNodeLoading(true);
        try {
            const fullMatrix = await kalpaApi.get(matrix.id);
            setNodes(fullMatrix.nodes || []);
            // Scroll to details
            setTimeout(() => {
                document.getElementById('matrix-details')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Failed to fetch nodes:', error);
        } finally {
            setNodeLoading(false);
        }
    };

    const handleWeave = async (node: KalpaNode) => {
        setWeaveLoading(node.id || null);
        try {
            const res = await kalpaApi.weave(node.id!);
            if (res.success) {
                setNodes(prev => prev.map(n => n.id === node.id ? res.node : n));
                setPreviewNode(res.node);
            }
        } catch (error) {
            console.error('Weaving failed:', error);
            alert('編織失敗');
        } finally {
            setWeaveLoading(null);
        }
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

    const nodeColumns = [
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
        <div className="kalpa-history-page">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>因果查詢</h3>
                    <Button variant="outline" onClick={fetchMatrices} loading={loading}>重新整理</Button>
                </div>
                <DataTable columns={matrixColumns} data={matrices} loading={loading} />
            </div>

            {selectedMatrix && (
                <div id="matrix-details" className="kalpa-results" style={{ marginTop: 'var(--space-8)' }}>
                    <div className="results-header">
                        <KPICard title="當前專案" value={selectedMatrix.project_name} icon={<span>📁</span>} />
                        <KPICard title="總意圖節點" value={nodes.length.toString()} icon={<span>📊</span>} />
                    </div>

                    <div className="results-table-container card">
                        <h3 className="card-title">「{selectedMatrix.project_name}」節點列表</h3>
                        <DataTable columns={nodeColumns} data={nodes} loading={nodeLoading} />
                    </div>
                </div>
            )}

            {/* Preview Modal (Reuse logic from KalpaPage if possible, here duplicated for independence) */}
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
