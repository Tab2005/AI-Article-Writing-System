import React, { useState, useEffect } from 'react';
import { cmsApi, projectsApi, kalpaApi } from '../services/api';
import type { CMSConfig } from '../services/api';
import { uiBus } from '../utils/ui-bus';
import './PublishModal.css';

interface PublishModalProps {
    targetType: 'project' | 'kalpa_node';
    targetId: string | undefined;
    onClose: () => void;
    onSuccess?: () => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ targetType, targetId, onClose, onSuccess }) => {
    const [configs, setConfigs] = useState<CMSConfig[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [publishStatus, setPublishStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!targetId) return;
            try {
                const [configsData, targetData] = await Promise.all([
                    cmsApi.listConfigs(),
                    targetType === 'project'
                        ? projectsApi.get(targetId!)
                        : kalpaApi.getNode(targetId!)
                ]);

                setConfigs(configsData);

                // 優先選擇目標專案已設定的站點
                let defaultId = '';

                if (targetType === 'project') {
                    // 「主要分析寫文」專案
                    defaultId = (targetData as any).cms_config_id || '';
                } else {
                    // 「矩陣寫文」節點，需檢查節點本身或其所屬矩陣
                    const node = targetData as any;
                    defaultId = node.cms_config_id || '';

                    if (!defaultId && node.matrix_id) {
                        try {
                            const matrix = await kalpaApi.get(node.matrix_id);
                            defaultId = matrix.cms_config_id || '';
                        } catch (e) {
                            console.error('Failed to fetch parent matrix for default CMS', e);
                        }
                    }
                }

                if (defaultId && configsData.some(c => c.id === defaultId)) {
                    setSelectedConfigId(defaultId);
                } else if (configsData.length > 0) {
                    setSelectedConfigId(configsData[0].id);
                }
            } catch (error) {
                console.error('Fetch publish data failed', error);
                uiBus.notify('載入發布資料失敗，請聯繫管理員', 'error');
            }
        };
        fetchData();
    }, [targetType, targetId]);

    const handlePublish = async () => {
        if (!selectedConfigId) {
            uiBus.notify('請先選擇發布站點', 'error');
            return;
        }

        try {
            setLoading(true);
            await cmsApi.publish({
                target_type: targetType,
                target_id: targetId!,
                config_id: selectedConfigId,
                status: publishStatus,
                scheduled_at: publishStatus === 'scheduled' ? scheduledAt : null
            });

            uiBus.notify('操作成功！', 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Publish failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content publish-modal">
                <h2>發布至 CMS</h2>
                <div className="form-group">
                    <label>選擇目的地站點</label>
                    <select
                        value={selectedConfigId}
                        onChange={(e) => setSelectedConfigId(e.target.value)}
                        className={configs.length === 0 ? 'select-empty' : ''}
                    >
                        {configs.length === 0 ? (
                            <option value="">-- 無可用站點，請先至「CMS 設定」建立 --</option>
                        ) : (
                            <>
                                <option value="">-- 請選擇站點 --</option>
                                {configs.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>
                                ))}
                            </>
                        )}
                    </select>
                    {configs.length === 0 && (
                        <p className="form-help error">偵測到尚未建立 CMS 站點，或權限不足。</p>
                    )}
                </div>

                <div className="form-group">
                    <label>發布動作</label>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                checked={publishStatus === 'draft'}
                                onChange={() => setPublishStatus('draft')}
                            /> 儲存為草稿
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={publishStatus === 'published'}
                                onChange={() => setPublishStatus('published')}
                            /> 立即發布
                        </label>
                        <label>
                            <input
                                type="radio"
                                checked={publishStatus === 'scheduled'}
                                onChange={() => setPublishStatus('scheduled')}
                            /> 預約排程
                        </label>
                    </div>
                </div>

                {publishStatus === 'scheduled' && (
                    <div className="form-group animate-fade-in">
                        <label>排程時間</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            required
                        />
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn btn--secondary" onClick={onClose} disabled={loading}>
                        取消
                    </button>
                    <button className="btn btn--primary" onClick={handlePublish} disabled={loading}>
                        {loading ? '處理中...' : '確認執行'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublishModal;
