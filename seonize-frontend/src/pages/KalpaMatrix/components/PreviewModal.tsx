import React from 'react';
import { Button, MermaidRenderer } from '../../../components/ui';
import { parseMarkdown } from '../../../utils/markdown';

interface PreviewModalProps {
    previewNode: any;
    setPreviewNode: (val: any) => void;
    setShowImagePicker: (val: boolean) => void;
    setShowPublishModal: (val: boolean) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
    previewNode,
    setPreviewNode,
    setShowImagePicker,
    setShowPublishModal
}) => {
    if (!previewNode) return null;

    return (
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
                                {/* Kalpa 圖片展示 */}
                                {previewNode.images && previewNode.images.length > 0 && (
                                    <div className="preview-image-container" style={{ marginBottom: 'var(--space-6)', position: 'relative' }}>
                                        <img 
                                            src={previewNode.images[0].url} 
                                            alt={previewNode.images[0].alt} 
                                            style={{ width: '100%', borderRadius: 'var(--radius-lg)', maxHeight: '400px', objectFit: 'cover' }}
                                        />
                                        <div className="image-source-tag" style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            right: '10px',
                                            backgroundColor: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px'
                                        }}>
                                            Source: {previewNode.images[0].source}
                                        </div>
                                    </div>
                                )}
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
                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                            使用法寶：<span style={{ color: 'var(--color-primary)' }}>{previewNode.anchor_used || '預設'}</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button variant="outline" onClick={() => setShowImagePicker(true)}>更換圖片</Button>
                        <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉</Button>
                        <Button variant="primary" onClick={() => setShowPublishModal(true)}>發佈文章</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
