import React, { useState, useEffect } from 'react';
import { Button, Input, Select, KPICard } from '../components/ui';
import './SettingsPage.css';

interface SettingsData {
    ai_provider: string;
    ai_api_key: string;
    ai_model: string;
    dataforseo_login: string;
    dataforseo_password: string;
    dataforseo_serp_mode: string;
    system_provided?: string[];
}

interface AIProvider {
    id: string;
    name: string;
    models: string[];
    description: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SettingsData>({
        ai_provider: 'gemini',
        ai_api_key: '',
        ai_model: 'gemini-2.0-flash',
        dataforseo_login: '',
        dataforseo_password: '',
        dataforseo_serp_mode: 'google_organic',
    });

    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingAI, setSavingAI] = useState(false);
    const [savingDataForSEO, setSavingDataForSEO] = useState(false);
    const [testingAI, setTestingAI] = useState(false);
    const [testingDataForSEO, setTestingDataForSEO] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; section?: string } | null>(null);
    const [dbInfo, setDbInfo] = useState<{ type: string; is_local: boolean } | null>(null);
    const [cacheInfo, setCacheInfo] = useState<{ type: string; size?: number } | null>(null);

    useEffect(() => {
        loadSettings();
        loadProviders();
        loadSystemInfo();
    }, []);

    // Auto-hide message after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const loadSettings = async () => {
        try {
            const response = await fetch(`${API_URL}/api/settings/`);
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProviders = async () => {
        try {
            const response = await fetch(`${API_URL}/api/settings/providers`);
            if (response.ok) {
                const data = await response.json();
                setProviders(data);
            }
        } catch {
            console.error('Failed to load providers');
            setProviders([
                { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro'], description: '' },
                { id: 'zeabur', name: 'Zeabur AI Hub', models: ['gpt-4o-mini', 'gpt-4o'], description: '' },
            ]);
        }
    };

    const loadSystemInfo = async () => {
        try {
            const [dbResponse, cacheResponse] = await Promise.all([
                fetch(`${API_URL}/api/settings/database-info`),
                fetch(`${API_URL}/api/settings/cache-info`),
            ]);

            if (dbResponse.ok) {
                setDbInfo(await dbResponse.json());
            }
            if (cacheResponse.ok) {
                setCacheInfo(await cacheResponse.json());
            }
        } catch {
            console.error('Failed to load system info');
        }
    };

    // Save AI settings only
    const handleSaveAI = async () => {
        setSavingAI(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ai_provider: settings.ai_provider,
                    ai_api_key: settings.ai_api_key,
                    ai_model: settings.ai_model,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'AI 模組設定已儲存！', section: 'ai' });
            } else {
                setMessage({ type: 'error', text: '儲存 AI 設定失敗', section: 'ai' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'ai' });
        } finally {
            setSavingAI(false);
        }
    };

    // Save DataForSEO settings only
    const handleSaveDataForSEO = async () => {
        setSavingDataForSEO(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataforseo_login: settings.dataforseo_login,
                    dataforseo_password: settings.dataforseo_password,
                    dataforseo_serp_mode: settings.dataforseo_serp_mode,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'DataForSEO 設定已儲存！', section: 'dataforseo' });
                loadSettings(); // Reload to get masked values
            } else {
                setMessage({ type: 'error', text: '儲存 DataForSEO 設定失敗', section: 'dataforseo' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'dataforseo' });
        } finally {
            setSavingDataForSEO(false);
        }
    };

    const handleTestAI = async () => {
        setTestingAI(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/test-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: settings.ai_provider,
                    api_key: settings.ai_api_key,
                    model: settings.ai_model,
                }),
            });

            const result = await response.json();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
                section: 'ai',
            });
        } catch {
            setMessage({ type: 'error', text: '測試連線時發生錯誤', section: 'ai' });
        } finally {
            setTestingAI(false);
        }
    };

    const handleTestDataForSEO = async () => {
        setTestingDataForSEO(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/test-dataforseo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: settings.dataforseo_login,
                    password: settings.dataforseo_password,
                }),
            });

            const result = await response.json();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
                section: 'dataforseo',
            });
        } catch {
            setMessage({ type: 'error', text: '測試連線時發生錯誤', section: 'dataforseo' });
        } finally {
            setTestingDataForSEO(false);
        }
    };

    const selectedProvider = providers.find(p => p.id === settings.ai_provider);
    const modelOptions = selectedProvider?.models.map(m => ({ value: m, label: m })) || [];

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-loading">載入中...</div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h2 className="settings-header__title">系統設定</h2>
                <p className="settings-header__desc">
                    配置您的 AI 模型與搜尋服務整合
                </p>
            </div>

            {/* Global Message */}
            {message && !message.section && (
                <div className={`settings-message settings-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* System Info */}
            <div className="settings-section">
                <h3 className="settings-section__title">系統資訊</h3>
                <p className="settings-section__desc">
                    目前的環境與服務狀態
                </p>
                <div className="system-info-grid">
                    <KPICard
                        title="資料庫"
                        value={dbInfo?.type?.toUpperCase() || '-'}
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                                <path d="M3 12A9 3 0 0 0 21 12" />
                            </svg>
                        }
                    />
                    <KPICard
                        title="快取"
                        value={cacheInfo?.type || '-'}
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v4" />
                                <path d="m16.24 7.76-2.12 2.12" />
                                <path d="M18 12h4" />
                                <path d="m16.24 16.24-2.12-2.12" />
                                <path d="M12 18v4" />
                                <path d="m7.76 16.24 2.12-2.12" />
                                <path d="M2 12h4" />
                                <path d="m7.76 7.76 2.12 2.12" />
                            </svg>
                        }
                    />
                    <KPICard
                        title="環境"
                        value={dbInfo?.is_local ? '本地開發' : '生產環境'}
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="14" x="2" y="3" rx="2" />
                                <line x1="8" x2="16" y1="21" y2="21" />
                                <line x1="12" x2="12" y1="17" y2="21" />
                            </svg>
                        }
                    />
                </div>
            </div>

            <div className="settings-sections-grid">
                {/* AI Module */}
                <div className="settings-section">
                    <h3 className="settings-section__title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8V4H8" />
                            <rect width="16" height="12" x="4" y="8" rx="2" />
                            <path d="M2 14h2" />
                            <path d="M20 14h2" />
                            <path d="M15 13v2" />
                            <path d="M9 13v2" />
                        </svg>
                        AI 模組設定
                    </h3>
                    <p className="settings-section__desc">
                        配置 AI 內容生成服務，支援 Gemini、Zeabur AI Hub
                    </p>

                    {/* Section-specific message */}
                    {message?.section === 'ai' && (
                        <div className={`settings-message settings-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="settings-form">
                        <Select
                            label={
                                <div className="field-label-wrapper">
                                    AI 提供者
                                    {settings.system_provided?.includes('ai_provider') && <span className="system-badge">環境變數鎖定</span>}
                                </div>
                            }
                            options={providers.map(p => ({ value: p.id, label: p.name }))}
                            value={settings.ai_provider}
                            disabled={settings.system_provided?.includes('ai_provider')}
                            onChange={(e) => setSettings({
                                ...settings,
                                ai_provider: e.target.value,
                                ai_model: providers.find(p => p.id === e.target.value)?.models[0] || '',
                            })}
                            fullWidth
                        />
                        <Input
                            label={
                                <div className="field-label-wrapper">
                                    API Key
                                    {settings.system_provided?.includes('ai_api_key') && <span className="system-badge">環境變數鎖定</span>}
                                </div>
                            }
                            type="password"
                            placeholder={settings.system_provided?.includes('ai_api_key') ? '已透過環境變數配置' : `輸入 ${selectedProvider?.name || 'AI'} API Key...`}
                            value={settings.ai_api_key}
                            disabled={settings.system_provided?.includes('ai_api_key')}
                            onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                            fullWidth
                        />
                        <Select
                            label={
                                <div className="field-label-wrapper">
                                    模型
                                    {settings.system_provided?.includes('ai_model') && <span className="system-badge">環境變數鎖定</span>}
                                </div>
                            }
                            options={modelOptions}
                            value={settings.ai_model}
                            disabled={settings.system_provided?.includes('ai_model')}
                            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                            fullWidth
                        />
                        <div className="settings-form__actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestAI}
                                loading={testingAI}
                                disabled={!settings.ai_api_key}
                            >
                                測試連線
                            </Button>
                            <Button
                                variant="cta"
                                onClick={handleSaveAI}
                                loading={savingAI}
                            >
                                儲存 AI 設定
                            </Button>
                        </div>
                    </div>
                </div>

                {/* DataForSEO API */}
                <div className="settings-section">
                    <h3 className="settings-section__title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        DataForSEO API
                    </h3>
                    <p className="settings-section__desc">
                        專業級 SEO 數據 API，支援 AI Overviews (SGE) 與關鍵字數據
                    </p>

                    {/* Section-specific message */}
                    {message?.section === 'dataforseo' && (
                        <div className={`settings-message settings-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="settings-form">
                        <Select
                            label="SERP 模式"
                            options={[
                                { value: 'google_organic', label: 'Google Organic SERP' },
                                { value: 'google_ai_mode', label: 'Google AI Mode SERP' },
                            ]}
                            value={settings.dataforseo_serp_mode}
                            onChange={(e) => setSettings({ ...settings, dataforseo_serp_mode: e.target.value })}
                            fullWidth
                        />
                        <Input
                            label={
                                <div className="field-label-wrapper">
                                    Login (Email)
                                    {settings.system_provided?.includes('dataforseo_login') && <span className="system-badge">環境變數鎖定</span>}
                                </div>
                            }
                            placeholder={settings.system_provided?.includes('dataforseo_login') ? '已透過環境變數配置' : "輸入 DataForSEO 帳號..."}
                            value={settings.dataforseo_login}
                            disabled={settings.system_provided?.includes('dataforseo_login')}
                            onChange={(e) => setSettings({ ...settings, dataforseo_login: e.target.value })}
                            fullWidth
                        />
                        <Input
                            label={
                                <div className="field-label-wrapper">
                                    API Password
                                    {settings.system_provided?.includes('dataforseo_password') && <span className="system-badge">環境變數鎖定</span>}
                                </div>
                            }
                            type="password"
                            placeholder={settings.system_provided?.includes('dataforseo_password') ? '已透過環境變數配置' : "輸入 API 密碼..."}
                            value={settings.dataforseo_password}
                            disabled={settings.system_provided?.includes('dataforseo_password')}
                            onChange={(e) => setSettings({ ...settings, dataforseo_password: e.target.value })}
                            fullWidth
                        />
                        <div className="settings-form__actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestDataForSEO}
                                loading={testingDataForSEO}
                                disabled={!settings.dataforseo_login || !settings.dataforseo_password}
                            >
                                測試連線
                            </Button>
                            <Button
                                variant="cta"
                                onClick={handleSaveDataForSEO}
                                loading={savingDataForSEO}
                            >
                                儲存 DataForSEO 設定
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
