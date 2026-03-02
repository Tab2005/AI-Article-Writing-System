import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui';
import { cmsApi } from '../services/api';
import type { CMSConfig } from '../services/api';
import { uiBus } from '../utils/ui-bus';
import './CMSPage.css';

const CMSPage: React.FC = () => {
    const [configs, setConfigs] = useState<CMSConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newConfig, setNewConfig] = useState({
        name: '',
        platform: 'ghost',
        api_url: '',
        api_key: '',
        username: '',
        auto_publish_enabled: false,
        frequency_type: 'day' as 'hour' | 'day' | 'week',
        frequency_count: 1,
    });

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await cmsApi.listConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Fetch configs failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingId) {
                await cmsApi.updateConfig(editingId, newConfig);
                uiBus.notify('設定已更新', 'success');
            } else {
                await cmsApi.createConfig(newConfig);
                uiBus.notify('設定已儲存', 'success');
            }
            setShowModal(false);
            resetForm();
            fetchConfigs();
        } catch (error) {
            console.error('Save failed', error);
        }
    };

    const resetForm = () => {
        setNewConfig({
            name: '',
            platform: 'ghost',
            api_url: '',
            api_key: '',
            username: '',
            auto_publish_enabled: false,
            frequency_type: 'day',
            frequency_count: 1,
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleEdit = (config: CMSConfig) => {
        setNewConfig({
            name: config.name,
            platform: config.platform as any,
            api_url: config.api_url,
            api_key: '',
            username: config.username || '',
            auto_publish_enabled: config.auto_publish_enabled || false,
            frequency_type: config.frequency_type || 'day',
            frequency_count: config.frequency_count || 1,
        });
        setIsEditing(true);
        setEditingId(config.id);
        setShowModal(true);
    };

    const toggleAutoPublish = async (config: CMSConfig) => {
        try {
            const updated = {
                ...config,
                auto_publish_enabled: !config.auto_publish_enabled,
                api_key: '' // 不修改 key
            };
            await cmsApi.updateConfig(config.id, updated);
            uiBus.notify(`自動排程已${!config.auto_publish_enabled ? '啟動' : '停止'}`, 'success');
            fetchConfigs();
        } catch (e) {
            console.error('Toggle failed', e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此設定嗎？')) return;
        try {
            await cmsApi.deleteConfig(id);
            uiBus.notify('已刪除設定', 'success');
            fetchConfigs();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handleTest = async (id: string) => {
        try {
            const res = await cmsApi.testConnection(id);
            if (res.success) {
                uiBus.notify('連線測試成功！', 'success');
            } else {
                uiBus.notify('連線失敗：' + (res.message || '未知錯誤'), 'error');
            }
        } catch (error) {
            console.error('Test failed', error);
        }
    };

    return (
        <div className="cms-page">
            <header className="projects-header">
                <div className="projects-header__content">
                    <h1 className="projects-title">站點管理</h1>
                    <p className="projects-subtitle">配置並管理多個外接網站，便於自動發布與排程文章。</p>
                </div>
                <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} className="projects-create-btn">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    新增站點
                </Button>
            </header>

            <div className="projects-content">
                {loading ? (
                    <div className="loading-state">載入中...</div>
                ) : configs.length > 0 ? (
                    <div className="cms-grid">
                        {configs.map(config => (
                            <div key={config.id} className="cms-card">
                                <div className="cms-card__header">
                                    <div className="cms-card__platform">{config.platform.toUpperCase()}</div>
                                    <div className={`cms-card__status ${config.auto_publish_enabled ? 'is-active' : ''}`}>
                                        <span className="status-dot"></span>
                                        {config.auto_publish_enabled ? '自動運行中' : '排程已停止'}
                                    </div>
                                </div>
                                <h3 className="cms-card__name">{config.name}</h3>
                                <p className="cms-card__url">{config.api_url}</p>

                                {config.auto_publish_enabled && (
                                    <div className="cms-card__schedule">
                                        頻率：每{config.frequency_type === 'hour' ? '小時' : config.frequency_type === 'day' ? '天' : '週'} {config.frequency_count} 篇
                                    </div>
                                )}

                                <div className="cms-card__actions">
                                    <Button variant="secondary" size="sm" onClick={() => handleTest(config.id)}>
                                        連線測試
                                    </Button>
                                    <Button
                                        variant={config.auto_publish_enabled ? "outline" : "primary"}
                                        size="sm"
                                        onClick={() => toggleAutoPublish(config)}
                                        className="btn-toggle-auto"
                                    >
                                        {config.auto_publish_enabled ? '暫停排程' : '啟動排程'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                                        編輯系統
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(config.id)} style={{ color: 'var(--color-error)' }}>
                                        刪除
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">尚未設定任何站點。點擊「新增站點」開始配置。</div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content cms-modal">
                        <h2>{isEditing ? '編輯發布站點' : '新增發布站點'}</h2>

                        <div className="cms-guide">
                            <div className="cms-guide__title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                如何獲取資料？
                            </div>
                            {newConfig.platform === 'ghost' ? (
                                <ul className="cms-guide__list">
                                    <li>前往 Ghost 後台的 <strong>Settings &gt; Integrations</strong></li>
                                    <li>點擊 <strong>+ Add custom integration</strong> 並命名</li>
                                    <li>複製產出的 <strong>Admin API Key</strong> 與 <strong>API URL</strong></li>
                                </ul>
                            ) : (
                                <ul className="cms-guide__list">
                                    <li>前往 WP 後台的 <strong>使用者 &gt; 個人資料</strong></li>
                                    <li>在 <strong>應用程式密碼</strong> 區塊新增一個密碼並複製</li>
                                    <li>API URL 通常為網站根網址 (例如 https://example.com)</li>
                                </ul>
                            )}
                            {isEditing && (
                                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    💡 提示：若不需要修改密碼/金鑰，請將該欄位留空。
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="cms-form-grid">
                                <div className="cms-form-section">
                                    <h3>基礎配置</h3>
                                    <div className="form-group">
                                        <label>顯示名稱</label>
                                        <input
                                            type="text"
                                            value={newConfig.name}
                                            onChange={e => setNewConfig({ ...newConfig, name: e.target.value })}
                                            placeholder="例如：官方科技部落格"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>平台類型</label>
                                        <select
                                            value={newConfig.platform}
                                            onChange={e => setNewConfig({ ...newConfig, platform: e.target.value })}
                                        >
                                            <option value="ghost">Ghost</option>
                                            <option value="wordpress">WordPress</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>API URL</label>
                                        <input
                                            type="url"
                                            value={newConfig.api_url}
                                            onChange={e => setNewConfig({ ...newConfig, api_url: e.target.value })}
                                            placeholder="https://yourblog.com"
                                            required
                                        />
                                    </div>
                                    {newConfig.platform === 'wordpress' && (
                                        <div className="form-group">
                                            <label>用戶帳號</label>
                                            <input
                                                type="text"
                                                value={newConfig.username}
                                                onChange={e => setNewConfig({ ...newConfig, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>{newConfig.platform === 'ghost' ? 'Admin API Key' : 'App Password'}</label>
                                        <input
                                            type="password"
                                            value={newConfig.api_key}
                                            onChange={e => setNewConfig({ ...newConfig, api_key: e.target.value })}
                                            placeholder={isEditing ? '保持空白則不修改' : '請輸入金鑰或密碼'}
                                            required={!isEditing}
                                        />
                                    </div>
                                </div>

                                <div className="cms-form-section cms-form-section--highlight">
                                    <h3>自動發布設定</h3>
                                    <div className="form-group-toggle">
                                        <label>啟用自動排程</label>
                                        <input
                                            type="checkbox"
                                            checked={newConfig.auto_publish_enabled}
                                            onChange={e => setNewConfig({ ...newConfig, auto_publish_enabled: e.target.checked })}
                                        />
                                    </div>
                                    <div className={`cms-auto-settings ${!newConfig.auto_publish_enabled ? 'is-disabled' : ''}`}>
                                        <div className="form-group">
                                            <label>發布頻率單位</label>
                                            <select
                                                value={newConfig.frequency_type}
                                                onChange={e => setNewConfig({ ...newConfig, frequency_type: e.target.value as any })}
                                                disabled={!newConfig.auto_publish_enabled}
                                            >
                                                <option value="hour">每小時</option>
                                                <option value="day">每天</option>
                                                <option value="week">每週</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>發布篇數</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={newConfig.frequency_count}
                                                onChange={e => setNewConfig({ ...newConfig, frequency_count: parseInt(e.target.value) || 1 })}
                                                disabled={!newConfig.auto_publish_enabled}
                                            />
                                        </div>
                                        <div className="cms-auto-hint">
                                            系統將自動在您設定的週期內，隨時將合適的草稿文章派發至此站點。
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <Button variant="secondary" onClick={() => setShowModal(false)}>
                                    取消
                                </Button>
                                <Button variant="primary" type="submit">
                                    {isEditing ? '儲存修改' : '提交儲存'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CMSPage;
