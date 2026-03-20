import React from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { MermaidRenderer } from '../../../../components/common/MermaidRenderer';
import { Button } from '../../../../components/ui/Button';
import type { KalpaNode } from '../../../../services/api';

interface PreviewModalProps {
    previewNode: KalpaNode | null;
    setPreviewNode: (node: KalpaNode | null) => void;
    setShowImagePicker: (show: boolean) => void;
    setShowPublishModal: (show: boolean) => void;
}

// 簡單的 Markdown 渲染（僅支援分段與標題）
const parseMarkdown = (text: string = '') => {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => {
            if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
            if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
            if (line.trim() === '') return '<br/>';
            return `<p>${line}</p>`;
        })
        .join('');
};

export const PreviewModal: React.FC<PreviewModalProps> = ({
    previewNode,
    setPreviewNode,
    setShowImagePicker,
    setShowPublishModal
}) => {
    if (!previewNode) return null;

    return (
        <Modal
            isOpen={!!previewNode}
            onClose={() => setPreviewNode(null)}
            title="神諭編織預覽"
            size="xl"
            footer={
                <div className="preview-footer-actions">
                    <Button
                        variant="secondary"
                        onClick={() => setShowImagePicker(true)}
                    >
                        📷 插入圖片
                    </Button>
                    <Button
                        variant="cta"
                        onClick={() => setShowPublishModal(true)}
                    >
                        🚀 立即發佈
                    </Button>
                </div>
            }
        >
            <div className="preview-scroll-container">
                <div className="preview-meta">
                    <div className="preview-meta-item">
                        <span className="label">題目</span>
                        <span className="value">{previewNode.target_title}</span>
                    </div>
                    <div className="preview-meta-item">
                        <span className="label">組合</span>
                        <span className="value">{previewNode.entity} + {previewNode.action}</span>
                    </div>
                </div>

                <div className="preview-content">
                    {previewNode.content ? (
                        <div className="preview-markdown">
                            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(previewNode.content) }} />
                            <MermaidRenderer content={previewNode.content} />
                        </div>
                    ) : (
                        <div className="preview-empty">尚未生成編織內容</div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
