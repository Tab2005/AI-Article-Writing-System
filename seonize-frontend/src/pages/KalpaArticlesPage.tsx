import React, { useState, useEffect } from 'react';
import { Button, DataTable, KPICard, MermaidRenderer } from '../components/ui';
import { kalpaApi } from '../services/api';
import type { KalpaNode } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
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
                <div className="modal-overlay" onClick={() => setPreviewNode(null)} style={{
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '85vh',
                        backgroundColor: 'var(--color-bg-card)',
                        padding: 'var(--space-6)',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'var(--shadow-xl)'
                    }}>
                        <div className="modal-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-4)',
                            paddingBottom: 'var(--space-4)',
                            borderBottom: '1px solid var(--color-border)'
                        }}>
                            <h3 className="card-title" style={{ marginBottom: 0 }}>文章預覽：{previewNode.target_title}</h3>
                            <button onClick={() => setPreviewNode(null)} style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)'
                            }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{
                            overflowY: 'auto',
                            padding: 'var(--space-2)',
                            flex: 1
                        }}>
                            <div className="markdown-body">
                                {previewNode.woven_content ? (
                                    <>
                                        <div dangerouslySetInnerHTML={{ __html: parseMarkdown(previewNode.woven_content) }} />
                                        <MermaidRenderer content={previewNode.woven_content} />
                                    </>
                                ) : (
                                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-10)' }}>
                                        尚無內容
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{
                            marginTop: 'var(--space-4)',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                使用法寶：<span style={{ color: 'var(--color-primary)' }}>{previewNode.anchor_used}</span>
                            </p>
                            <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉視窗</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
