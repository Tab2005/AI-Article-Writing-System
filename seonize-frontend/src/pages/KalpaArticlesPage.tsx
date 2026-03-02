import React, { useState, useEffect, useMemo } from 'react';
import { Button, DataTable, KPICard, MermaidRenderer, Input } from '../components/ui';
import PublishModal from '../components/PublishModal';
import { kalpaApi } from '../services/api';
import type { KalpaNode, KalpaMatrix } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
import './KalpaPage.css';

type ViewMode = 'project-list' | 'article-detail';

export const KalpaArticlesPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('project-list');
    const [matrices, setMatrices] = useState<KalpaMatrix[]>([]);
    const [articles, setArticles] = useState<(KalpaNode & { project_name: string })[]>([]);
    const [selectedProject, setSelectedProject] = useState<KalpaMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showPublishModal, setShowPublishModal] = useState(false);

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

    const fetchProjectArticles = async (project: KalpaMatrix) => {
        setLoading(true);
        setSelectedProject(project);
        try {
            const data = await kalpaApi.listArticles(project.id);
            setArticles(data);
            setViewMode('article-detail');
            setSearchQuery(''); // 切換專案時重設文章搜尋
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToList = () => {
        setViewMode('project-list');
        setSelectedProject(null);
        setArticles([]);
        setSearchQuery(''); // 返回列表時重設專案搜尋
    };

    // 過濾專案列表
    const filteredMatrices = useMemo(() => {
        if (viewMode !== 'project-list') return [];
        return searchQuery
            ? matrices.filter(m => m.project_name.toLowerCase().includes(searchQuery.toLowerCase()))
            : matrices;
    }, [matrices, searchQuery, viewMode]);

    // 過濾文章列表
    const filteredArticles = useMemo(() => {
        if (viewMode !== 'article-detail') return [];
        return searchQuery
            ? articles.filter(a => a.target_title.toLowerCase().includes(searchQuery.toLowerCase()))
            : articles;
    }, [articles, searchQuery, viewMode]);

    const projectColumns = [
        {
            key: 'project_name',
            header: '專案名稱',
            render: (val: string) => <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{val}</span>
        },
        { key: 'industry', header: '產業領域', width: '150px' },
        {
            key: 'updated_at',
            header: '最後更新',
            width: '180px',
            render: (val: string) => val ? new Date(val).toLocaleString() : '-'
        },
        {
            key: 'actions',
            header: '操作',
            width: '120px',
            render: (_: any, row: KalpaMatrix) => (
                <Button variant="primary" size="sm" onClick={() => fetchProjectArticles(row)}>🔍 查詢文章</Button>
            )
        }
    ] as any;

    const articleColumns = [
        { key: 'target_title', header: '文章標題' },
        { key: 'entity', header: '實體', width: '120px' },
        {
            key: 'publish_status',
            header: '分發狀態',
            width: '150px',
            render: (val: string, row: KalpaNode) => {
                const statusMap: Record<string, { label: string, color: string, bg: string }> = {
                    published: { label: '已發布', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                    scheduled: { label: '已預約', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                    failed: { label: '發布失敗', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
                    draft: { label: '未發布', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' }
                };
                const status = statusMap[val || 'draft'] || statusMap.draft;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: status.color,
                            backgroundColor: status.bg,
                            width: 'fit-content',
                            border: `1px solid ${status.color}33`
                        }}>
                            {status.label}
                        </span>
                        {val === 'published' && row.cms_publish_url && (
                            <a
                                href={row.cms_publish_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '11px', color: 'var(--color-primary)', textDecoration: 'none' }}
                            >
                                🔗 前往查看
                            </a>
                        )}
                        {val === 'scheduled' && row.scheduled_at && (
                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                {new Date(row.scheduled_at).toLocaleString()}
                            </span>
                        )}
                    </div>
                );
            }
        },
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
                <Button variant="outline" size="sm" onClick={() => setPreviewNode(row)}>閱讀內容</Button>
            )
        }
    ] as any;

    return (
        <div className="kalpa-articles-page anim-fade-in">
            {/* Header Section */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                            {viewMode === 'article-detail' && (
                                <Button variant="outline" size="sm" onClick={handleBackToList} style={{ padding: '4px 8px' }}>⬅️ 返回</Button>
                            )}
                            <h2 className="card-title" style={{ marginBottom: 0 }}>
                                {viewMode === 'project-list' ? '靈感成稿中心' : `📚 ${selectedProject?.project_name}`}
                            </h2>
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                            {viewMode === 'project-list'
                                ? '請選擇您想要導航的文章專案'
                                : `正在瀏覽專案『${selectedProject?.project_name}』的所有已編織內容`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                        <Input
                            placeholder={viewMode === 'project-list' ? "搜尋專案名稱..." : "搜尋文章標題..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<span>🔍</span>}
                            style={{
                                background: 'var(--color-bg-secondary)',
                                minWidth: '300px'
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={() => viewMode === 'project-list' ? fetchMatrices() : fetchProjectArticles(selectedProject!)}
                            loading={loading}
                        >
                            重新整理
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {viewMode === 'project-list' ? (
                <>
                    <div className="results-header" style={{ marginBottom: 'var(--space-6)' }}>
                        <KPICard title="總專案數量" value={matrices.length.toString()} icon={<span>📂</span>} />
                        <KPICard title="最近開發專案" value={matrices[0]?.project_name || '-'} icon={<span>🚀</span>} />
                    </div>
                    <div className="card">
                        <DataTable columns={projectColumns} data={filteredMatrices} loading={loading} />
                    </div>
                </>
            ) : (
                <>
                    <div className="results-header" style={{ marginBottom: 'var(--space-6)' }}>
                        <KPICard title="本專案文章" value={articles.length.toString()} icon={<span>📚</span>} />
                        <KPICard title="最後編導時間" value={articles[0]?.woven_at ? new Date(articles[0].woven_at).toLocaleDateString() : '-'} icon={<span>📅</span>} />
                    </div>
                    <div className="card">
                        <DataTable columns={articleColumns} data={filteredArticles} loading={loading} />
                    </div>
                </>
            )}

            {/* Preview Modal */}
            {previewNode && (
                <div className="modal-overlay" onClick={() => setPreviewNode(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '900px', width: '92%', maxHeight: '90vh',
                        backgroundColor: 'var(--color-bg-card)', padding: 'var(--space-8)',
                        borderRadius: 'var(--radius-2xl)', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div className="modal-header" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)',
                            borderBottom: '1px solid var(--color-border)'
                        }}>
                            <h3 className="card-title" style={{ marginBottom: 0, fontSize: '1.25rem' }}>{previewNode.target_title}</h3>
                            <button onClick={() => setPreviewNode(null)} style={{
                                background: 'none', border: 'none', fontSize: '28px',
                                cursor: 'pointer', color: 'var(--color-text-muted)'
                            }}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 'var(--space-4)' }}>
                            <div className="markdown-body">
                                {previewNode.woven_content ? (
                                    <>
                                        <div dangerouslySetInnerHTML={{ __html: parseMarkdown(previewNode.woven_content) }} />
                                        <MermaidRenderer content={previewNode.woven_content} />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                                        <p style={{ color: 'var(--color-text-muted)' }}>尚無編織內容</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{
                            marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>使用的法寶錨點</span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{previewNode.anchor_used || '預設'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                <Button variant="primary" onClick={() => setShowPublishModal(true)}>🚀 發布至 CMS</Button>
                                <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉預覽</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPublishModal && previewNode && (
                <PublishModal
                    targetType="kalpa_node"
                    targetId={previewNode.id}
                    onClose={() => setShowPublishModal(false)}
                    onSuccess={() => fetchProjectArticles(selectedProject!)}
                />
            )}
        </div>
    );
};
