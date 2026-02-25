import React, { useState, useEffect } from 'react';
import { Button, DataTable, KPICard } from '../components/ui';
import { kalpaApi } from '../services/api';
import type { KalpaNode } from '../services/api';
import './KalpaPage.css';

export const KalpaArticlesPage: React.FC = () => {
    const [articles, setArticles] = useState<(KalpaNode & { project_name: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);
    const [filterProject, setFilterProject] = useState<string>('');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await kalpaApi.listArticles();
            setArticles(data);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredArticles = filterProject
        ? articles.filter(a => a.project_name.toLowerCase().includes(filterProject.toLowerCase()))
        : articles;

    const columns = [
        {
            key: 'project_name',
            header: '所屬專案',
            render: (val: string) => <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{val}</span>
        },
        { key: 'target_title', header: '文章標題' },
        { key: 'entity', header: '實體', width: '100px' },
        {
            key: 'woven_at',
            header: '成稿時間',
            width: '180px',
            render: (val: string) => val ? new Date(val).toLocaleString() : '-'
        },
        {
            key: 'actions',
            header: '操作',
            width: '120px',
            render: (_: any, row: KalpaNode) => (
                <Button variant="outline" onClick={() => setPreviewNode(row)}>閱讀內容</Button>
            )
        }
    ] as any;

    return (
        <div className="kalpa-articles-page">
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-1)' }}>靈感成稿中心</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>匯總所有專案已編織完成的 SEO 文章內容</p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <input
                            type="text"
                            placeholder="搜尋專案名稱..."
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)',
                                fontSize: '14px',
                                minWidth: '240px'
                            }}
                        />
                        <Button variant="outline" onClick={fetchArticles} loading={loading}>重新整理</Button>
                    </div>
                </div>
            </div>

            <div className="results-header" style={{ marginBottom: 'var(--space-6)' }}>
                <KPICard title="總成稿數量" value={articles.length.toString()} icon={<span>📚</span>} />
                <KPICard title="最新成稿專案" value={articles[0]?.project_name || '-'} icon={<span>✨</span>} />
            </div>

            <div className="card">
                <DataTable columns={columns} data={filteredArticles} loading={loading} />
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
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', lineHeight: '1.6' }}>
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
