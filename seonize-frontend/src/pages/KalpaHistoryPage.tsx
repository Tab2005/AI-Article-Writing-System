import React, { useState, useEffect } from 'react';
import { kalpaApi, type KalpaMatrix, type KalpaNode } from '../services/api';
import { PreviewModal } from './KalpaMatrix/components/PreviewModal';
import './KalpaHistoryPage.css';

const KalpaHistoryPage: React.FC = () => {
    const [matrices, setMatrices] = useState<KalpaMatrix[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await kalpaApi.getHistory();
            setMatrices(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="history-loading">載入歷史紀錄中...</div>;
    }

    return (
        <div className="history-page">
            <div className="history-header">
                <h2>劫之眼 - 矩陣歷史</h2>
                <p>檢視過去推演與編織的完整紀錄</p>
            </div>

            <div className="history-list">
                {matrices.length === 0 ? (
                    <div className="empty-history">
                        <p>尚無歷史紀錄</p>
                    </div>
                ) : (
                    matrices.map((matrix) => (
                        <div key={matrix.id} className="matrix-record">
                            <div className="matrix-record-header">
                                <div className="matrix-info">
                                    <h3>{matrix.project_name || '未命名專案'}</h3>
                                    <span className="matrix-date">
                                        {matrix.created_at ? new Date(matrix.created_at).toLocaleString() : '時間未知'}
                                    </span>
                                </div>
                                <div className="matrix-meta">
                                    <span className="industry-tag">{matrix.industry}</span>
                                </div>
                            </div>

                            <div className="matrix-results-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>實體</th>
                                            <th>動作</th>
                                            <th>痛點</th>
                                            <th>標題</th>
                                            <th>狀態</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrix.nodes?.map((node) => (
                                            <tr key={node.id}>
                                                <td>{node.entity}</td>
                                                <td>{node.action}</td>
                                                <td>{node.pain_point}</td>
                                                <td>{node.target_title}</td>
                                                <td>
                                                    <span className={`status-badge status-${node.status}`}>
                                                        {node.status === 'completed' ? '已編織' : 
                                                         node.status === 'pending' ? '待處理' : node.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {node.status === 'completed' && (
                                                        <button 
                                                            className="view-btn"
                                                            onClick={() => setPreviewNode(node)}
                                                        >
                                                            檢視
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 預覽視窗 */}
            {previewNode && (
                <div className="history-preview-overlay" onClick={() => setPreviewNode(null)}>
                    <div className="history-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="history-preview-header">
                            <h3>文章內容預覽</h3>
                            <button className="close-btn" onClick={() => setPreviewNode(null)}>&times;</button>
                        </div>
                        <div className="history-preview-body">
                            <div className="preview-meta-grid">
                                <div className="meta-item">
                                    <label>意圖標題</label>
                                    <span>{previewNode.target_title}</span>
                                </div>
                                <div className="meta-item">
                                    <label>關鍵字組合</label>
                                    <span>{previewNode.entity} + {previewNode.action}</span>
                                </div>
                            </div>
                            <div className="preview-content-area">
                                {previewNode.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KalpaHistoryPage;
