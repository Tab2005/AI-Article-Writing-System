import React, { useState, useEffect } from 'react';
import { Button, Input, Select, KPICard } from '../components/ui';
import './SettingsPage.css';

interface SettingsData {
    google_search_api_key: string;
    google_search_cx: string;
    ai_provider: string;
    ai_api_key: string;
    ai_model: string;
    serper_api_key: string;
    serpapi_api_key: string;
    dataforseo_login: string;
    dataforseo_password: string;
    dataforseo_serp_mode: string;
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
        google_search_api_key: '',
        google_search_cx: '',
        ai_provider: 'gemini',
        ai_api_key: '',
        ai_model: 'gemini-2.0-flash',
        serper_api_key: '',
        serpapi_api_key: '',
        dataforseo_login: '',
        dataforseo_password: '',
        dataforseo_serp_mode: 'google_organic',
    });

    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingGoogle, setSavingGoogle] = useState(false);
    const [savingAI, setSavingAI] = useState(false);
    const [savingSerper, setSavingSerper] = useState(false);
    const [savingDataForSEO, setSavingDataForSEO] = useState(false);
    const [testingGoogle, setTestingGoogle] = useState(false);
    const [testingAI, setTestingAI] = useState(false);
    const [testingSerper, setTestingSerper] = useState(false);
    const [savingSerpApi, setSavingSerpApi] = useState(false);
    const [testingSerpApi, setTestingSerpApi] = useState(false);
    const [testingDataForSEO, setTestingDataForSEO] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; section?: string } | null>(null);
    const [dbInfo, setDbInfo] = useState<{ type: string; is_local: boolean } | null>(null);
    const [cacheInfo, setCacheInfo] = useState<{ type: string; size?: number } | null>(null);
    const [serpProvider, setSerpProvider] = useState<string>('google');
    const [serpProviders, setSerpProviders] = useState<Array<{ id: string; name: string; description: string; configured: boolean }>>([]);

    useEffect(() => {
        loadSettings();
        loadProviders();
        loadSystemInfo();
        loadSerpProviders();
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

    const loadSerpProviders = async () => {
        try {
            const [providersResponse, currentProviderResponse] = await Promise.all([
                fetch(`${API_URL}/api/settings/serp-providers`),
                fetch(`${API_URL}/api/settings/serp-provider`),
            ]);

            const fallbackProviders = [
                { id: 'google', name: 'Google Search API', description: '使用 Google Custom Search API', configured: false },
                { id: 'serper', name: 'Serper.dev API', description: '使用 Serper.dev Google SERP API', configured: false },
                { id: 'serpapi', name: 'SerpApi.com API', description: '使用 SerpApi.com Google SERP API', configured: false },
                { id: 'dataforseo', name: 'DataForSEO API', description: '支援 Google SERP 與 AI Overviews (SGE)', configured: false },
            ];

            if (providersResponse.ok) {
                const providers = await providersResponse.json();
                const byId = new Map<string, { id: string; name: string; description: string; configured: boolean }>();
                if (Array.isArray(providers)) {
                    providers.forEach((provider) => {
                        if (provider?.id) {
                            byId.set(provider.id, provider);
                        }
                    });
                }
                fallbackProviders.forEach((fallback) => {
                    if (!byId.has(fallback.id)) {
                        byId.set(fallback.id, fallback);
                    }
                });
                const normalized = fallbackProviders
                    .map((fallback) => byId.get(fallback.id) || fallback)
                    .filter(Boolean) as Array<{ id: string; name: string; description: string; configured: boolean }>;
                setSerpProviders(normalized);
            } else {
                setSerpProviders(fallbackProviders);
            }
            if (currentProviderResponse.ok) {
                const data = await currentProviderResponse.json();
                setSerpProvider(data.provider);
            }
        } catch {
            console.error('Failed to load SERP providers');
            setSerpProviders([
                { id: 'google', name: 'Google Search API', description: '使用 Google Custom Search API', configured: false },
                { id: 'serper', name: 'Serper.dev API', description: '使用 Serper.dev Google SERP API', configured: false },
                { id: 'serpapi', name: 'SerpApi.com API', description: '使用 SerpApi.com Google SERP API', configured: false },
                { id: 'dataforseo', name: 'DataForSEO API', description: '支援 Google SERP 與 AI Overviews (SGE)', configured: false },
            ]);
        }
    };

    // Save Google API settings only
    const handleSaveGoogle = async () => {
        setSavingGoogle(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_search_api_key: settings.google_search_api_key,
                    google_search_cx: settings.google_search_cx,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Google Search API 設定已儲存！', section: 'google' });
                loadSettings(); // Reload to get masked values
                loadSerpProviders(); // Refresh configured status
            } else {
                setMessage({ type: 'error', text: '儲存 Google 設定失敗', section: 'google' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'google' });
        } finally {
            setSavingGoogle(false);
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

    // Save Serper API settings only
    const handleSaveSerper = async () => {
        setSavingSerper(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serper_api_key: settings.serper_api_key,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Serper.dev API 設定已儲存！', section: 'serper' });
                loadSettings(); // Reload to get masked values
                loadSerpProviders(); // Refresh configured status
            } else {
                setMessage({ type: 'error', text: '儲存 Serper 設定失敗', section: 'serper' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'serper' });
        } finally {
            setSavingSerper(false);
        }
    };

    // Save SerpApi API settings only
    const handleSaveSerpApi = async () => {
        setSavingSerpApi(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serpapi_api_key: settings.serpapi_api_key,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'SerpApi.com API 設定已儲存！', section: 'serpapi' });
                loadSettings(); // Reload to get masked values
                loadSerpProviders(); // Refresh configured status
            } else {
                setMessage({ type: 'error', text: '儲存 SerpApi 設定失敗', section: 'serpapi' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'serpapi' });
        } finally {
            setSavingSerpApi(false);
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
                loadSerpProviders(); // Refresh configured status
            } else {
                setMessage({ type: 'error', text: '儲存 DataForSEO 設定失敗', section: 'dataforseo' });
            }
        } catch {
            setMessage({ type: 'error', text: '儲存時發生錯誤', section: 'dataforseo' });
        } finally {
            setSavingDataForSEO(false);
        }
    };

    const handleTestGoogle = async () => {
        setTestingGoogle(true);
        setMessage(null);

        try {
            const response = await fetch(
                `${API_URL}/api/settings/test-google?api_key=${encodeURIComponent(settings.google_search_api_key)}&cx=${encodeURIComponent(settings.google_search_cx)}`,
                { method: 'POST' }
            );

            const result = await response.json();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
                section: 'google',
            });
        } catch {
            setMessage({ type: 'error', text: '測試連線時發生錯誤', section: 'google' });
        } finally {
            setTestingGoogle(false);
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

    const handleTestSerper = async () => {
        setTestingSerper(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/test-serper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: settings.serper_api_key,
                }),
            });

            const result = await response.json();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
                section: 'serper',
            });
        } catch {
            setMessage({ type: 'error', text: '測試連線時發生錯誤', section: 'serper' });
        } finally {
            setTestingSerper(false);
        }
    };

    const handleTestSerpApi = async () => {
        setTestingSerpApi(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/settings/test-serpapi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: settings.serpapi_api_key,
                }),
            });

            const result = await response.json();
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
                section: 'serpapi',
            });
        } catch {
            setMessage({ type: 'error', text: '測試連線時發生錯誤', section: 'serpapi' });
        } finally {
            setTestingSerpApi(false);
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

    const handleSerpProviderChange = async (provider: string) => {
        try {
            const response = await fetch(`${API_URL}/api/settings/serp-provider`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            });

            if (response.ok) {
                setSerpProvider(provider);
                const providerName = serpProviders.find(p => p.id === provider)?.name || provider;
                setMessage({ type: 'success', text: `SERP 提供者已切換為 ${providerName}`, section: 'serp' });
            } else {
                setMessage({ type: 'error', text: '切換 SERP 提供者失敗', section: 'serp' });
            }
        } catch {
            setMessage({ type: 'error', text: '切換時發生錯誤', section: 'serp' });
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
                    配置 Google Search API 和 AI 模組設定
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
                    佈署到生產環境時會自動切換（透過環境變數 DATABASE_URL 和 REDIS_URL）
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

            {/* SERP Provider Selection */}
            <div className="settings-section">
                <h3 className="settings-section__title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    SERP 搜尋設定
                </h3>
                <p className="settings-section__desc">
                    選擇用於關鍵字分析的 SERP 搜尋 API
                </p>

                {/* Section-specific message */}
                {message?.section === 'serp' && (
                    <div className={`settings-message settings-message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="settings-form">
                    <Select
                        label="SERP 提供者"
                        options={serpProviders.map(p => ({
                            value: p.id,
                            label: `${p.name} ${p.configured ? '' : '(未設定)'}`
                        }))}
                        value={serpProvider}
                        onChange={(e) => handleSerpProviderChange(e.target.value)}
                        fullWidth
                    />
                    <div className="serp-providers-info">
                        {serpProviders.map(provider => (
                            <div key={provider.id} className={`serp-provider-item ${provider.configured ? 'configured' : 'not-configured'}`}>
                                <strong>{provider.name}</strong>: {provider.description}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings Sections Grid */}
            <div className="settings-sections-grid">
                {/* Google Search API */}
                <div className="settings-section">
                    <h3 className="settings-section__title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        Google Search API
                    </h3>
                    <p className="settings-section__desc">
                        用於 SERP 競品分析，需要 Google Custom Search API
                    </p>

                    {/* Section-specific message */}
                    {message?.section === 'google' && (
                        <div className={`settings-message settings-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="settings-form">
                        <Input
                            label="API Key"
                            type="password"
                            placeholder="輸入 Google API Key..."
                            value={settings.google_search_api_key}
                            onChange={(e) => setSettings({ ...settings, google_search_api_key: e.target.value })}
                            fullWidth
                        />
                        <Input
                            label="Custom Search Engine ID (CX)"
                            placeholder="輸入 Search Engine ID..."
                            value={settings.google_search_cx}
                            onChange={(e) => setSettings({ ...settings, google_search_cx: e.target.value })}
                            fullWidth
                        />
                        <div className="settings-form__actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestGoogle}
                                loading={testingGoogle}
                                disabled={!settings.google_search_api_key || !settings.google_search_cx}
                            >
                                測試連線
                            </Button>
                            <Button
                                variant="cta"
                                onClick={handleSaveGoogle}
                                loading={savingGoogle}
                            >
                                儲存 Google 設定
                            </Button>
                        </div>
                    </div>
                </div>

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
                            label="AI 提供者"
                            options={providers.map(p => ({ value: p.id, label: p.name }))}
                            value={settings.ai_provider}
                            onChange={(e) => setSettings({
                                ...settings,
                                ai_provider: e.target.value,
                                ai_model: providers.find(p => p.id === e.target.value)?.models[0] || '',
                            })}
                            fullWidth
                        />
                        <Input
                            label="API Key"
                            type="password"
                            placeholder={`輸入 ${selectedProvider?.name || 'AI'} API Key...`}
                            value={settings.ai_api_key}
                            onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                            fullWidth
                        />
                        <Select
                            label="模型"
                            options={modelOptions}
                            value={settings.ai_model}
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

                {/* Serper.dev API */}
                <div className="settings-section">
                    <h3 className="settings-section__title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M8 16H3v5" />
                        </svg>
                        Serper.dev API
                    </h3>
                    <p className="settings-section__desc">
                        用於 SERP 競品分析，提供 Google 搜尋結果 API 服務
                    </p>

                    {/* Section-specific message */}
                    {message?.section === 'serper' && (
                        <div className={`settings-message settings-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="settings-form">
                        <Input
                            label="API Key"
                            type="password"
                            placeholder="輸入 Serper.dev API Key..."
                            value={settings.serper_api_key}
                            onChange={(e) => setSettings({ ...settings, serper_api_key: e.target.value })}
                            fullWidth
                        />
                        <div className="settings-form__actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestSerper}
                                loading={testingSerper}
                                disabled={!settings.serper_api_key}
                            >
                                測試連線
                            </Button>
                            <Button
                                variant="cta"
                                onClick={handleSaveSerper}
                                loading={savingSerper}
                            >
                                儲存 Serper 設定
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SerpApi.com API */}
                <div className="settings-section">
                    <h3 className="settings-section__title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
                            <path d="m16 20 2 2 4-4" />
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                        SerpApi.com API
                    </h3>
                    <p className="settings-section__desc">
                        用於 SERP 競品分析，提供穩定的 Google 搜尋結果 API
                    </p>

                    {/* Section-specific message */}
                    {message?.section === 'serpapi' && (
                        <div className={`settings-message settings-message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="settings-form">
                        <Input
                            label="API Key"
                            type="password"
                            placeholder="輸入 SerpApi.com API Key..."
                            value={settings.serpapi_api_key}
                            onChange={(e) => setSettings({ ...settings, serpapi_api_key: e.target.value })}
                            fullWidth
                        />
                        <div className="settings-form__actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestSerpApi}
                                loading={testingSerpApi}
                                disabled={!settings.serpapi_api_key}
                            >
                                測試連線
                            </Button>
                            <Button
                                variant="cta"
                                onClick={handleSaveSerpApi}
                                loading={savingSerpApi}
                            >
                                儲存 SerpApi 設定
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
                            label="Login (Email)"
                            placeholder="輸入 DataForSEO 帳號..."
                            value={settings.dataforseo_login}
                            onChange={(e) => setSettings({ ...settings, dataforseo_login: e.target.value })}
                            fullWidth
                        />
                        <Input
                            label="API Password"
                            type="password"
                            placeholder="輸入 API 密碼..."
                            value={settings.dataforseo_password}
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
