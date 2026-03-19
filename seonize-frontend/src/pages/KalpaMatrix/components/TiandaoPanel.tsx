import React from 'react';
import { Button } from '../../../components/ui';

interface TiandaoPanelProps {
    brainstormTopic: string;
    setBrainstormTopic: (val: string) => void;
    handleBrainstorm: () => void;
    isBrainstorming: boolean;
    brainstormStage: string;
    tiandaoSuggestions: any;
    setTiandaoSuggestions: (val: any) => void;
    applyTiandaoSuggestions: (overwrite: boolean) => void;
    handleOneClickApplyAndGenerate: () => void;
    loading: boolean;
}

export const TiandaoPanel: React.FC<TiandaoPanelProps> = ({
    brainstormTopic,
    setBrainstormTopic,
    handleBrainstorm,
    isBrainstorming,
    brainstormStage,
    tiandaoSuggestions,
    setTiandaoSuggestions,
    applyTiandaoSuggestions,
    handleOneClickApplyAndGenerate,
    loading
}) => {
    return (
        <>
            {/* 天道解析面板 */}
            <div className="tiandao-panel card">
                <div className="tiandao-header">
                    <div className="tiandao-title">
                        <span className="tiandao-icon">☯️</span>
                        <div>
                            <h3>天道解析 (Tiandao Analysis)</h3>
                            <p>輸入產業主題，AI 將為您推演因果要素</p>
                        </div>
                    </div>
                    <div className="tiandao-input-group">
                        <input
                            type="text"
                            placeholder="輸入主題 (例如：海外代購, 美妝保養...)"
                            value={brainstormTopic}
                            onChange={(e) => setBrainstormTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                            className="tiandao-input"
                        />
                        <Button
                            variant="primary"
                            onClick={handleBrainstorm}
                            loading={isBrainstorming}
                            disabled={!brainstormTopic.trim()}
                        >
                            解析天道
                        </Button>
                    </div>
                </div>

                {tiandaoSuggestions && (
                    <div className="tiandao-results animate-slide-down">
                        <div className="tiandao-suggest-grid">
                            <div className="suggest-item">
                                <label>建議實體：</label>
                                <div className="suggest-tags">
                                    {tiandaoSuggestions.entities.map((s: string) => <span key={s} className="suggest-tag">{s}</span>)}
                                </div>
                            </div>
                            <div className="suggest-item">
                                <label>建議動作：</label>
                                <div className="suggest-tags">
                                    {tiandaoSuggestions.actions.map((s: string) => <span key={s} className="suggest-tag">{s}</span>)}
                                </div>
                            </div>
                            <div className="suggest-item">
                                <label>建議痛點：</label>
                                <div className="suggest-tags">
                                    {tiandaoSuggestions.pain_points.map((s: string) => <span key={s} className="suggest-tag">{s}</span>)}
                                </div>
                            </div>
                        </div>

                        {tiandaoSuggestions.exclusion_rules && Object.keys(tiandaoSuggestions.exclusion_rules).length > 0 && (
                            <div className="tiandao-suggest-rules" style={{
                                marginTop: 'var(--space-4)',
                                padding: 'var(--space-3)',
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed #ef4444'
                            }}>
                                <label style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', display: 'block', marginBottom: 'var(--space-1)' }}>
                                    🛡️ 建議排除規則 (慧眼識珠)：
                                </label>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    {Object.entries(tiandaoSuggestions.exclusion_rules).map(([trigger, forbidden], idx) => (
                                        <div key={idx} style={{ marginBottom: '2px' }}>
                                            • 當實體含「<b>{trigger}</b>」時，排除含：{(forbidden as string[]).join(', ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tiandaoSuggestions.suggested_title_template && (
                            <>
                                <div className="tiandao-suggest-template" style={{
                                    marginTop: 'var(--space-4)',
                                    padding: 'var(--space-3)',
                                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px dashed var(--color-primary)'
                                }}>
                                    <label style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 'bold', display: 'block', marginBottom: 'var(--space-1)' }}>
                                        ✨ 建議標題模板：
                                    </label>
                                    <code style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                                        {tiandaoSuggestions.suggested_title_template}
                                    </code>
                                </div>

                                <div className="tiandao-simulation-preview" style={{
                                    marginTop: 'var(--space-4)',
                                    padding: 'var(--space-4)',
                                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
                                }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <span>🔮 標題推演模擬 (範例)</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        {tiandaoSuggestions.entities.slice(0, 3).map((entity: string, i: number) => {
                                            const action = tiandaoSuggestions.actions[i] || tiandaoSuggestions.actions[0];
                                            const pain = tiandaoSuggestions.pain_points[i] || tiandaoSuggestions.pain_points[0];
                                            const simulatedTitle = (tiandaoSuggestions.suggested_title_template || '')
                                                .replace('{entity}', entity)
                                                .replace('{action}', action)
                                                .replace('{pain_point}', pain);
                                            return (
                                                <div key={i} style={{
                                                    fontSize: '13px',
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    borderLeft: '3px solid var(--color-primary)',
                                                    color: 'var(--color-text-secondary)'
                                                }}>
                                                    {simulatedTitle}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="tiandao-actions" style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button variant="outline" onClick={() => setTiandaoSuggestions(null)}>放棄建議</Button>
                            <div className="tiandao-apply-group" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <Button variant="secondary" onClick={() => applyTiandaoSuggestions(false)}>併入現有項目</Button>
                                <Button
                                    variant="cta"
                                    onClick={handleOneClickApplyAndGenerate}
                                    loading={loading}
                                    icon={<span>⚡</span>}
                                >
                                    一鍵推演全陣
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 天道解析進度視窗 */}
            {isBrainstorming && (
                <div className="tiandao-loading-overlay">
                    <div className="tiandao-loading-modal">
                        <div className="tiandao-loading-content">
                            <div className="tiandao-spinner-container">
                                <div className="taiji-spinner">☯️</div>
                                <div className="spinner-glow"></div>
                            </div>
                            <h3 className="loading-title">天道推演中</h3>
                            <p className="loading-stage">{brainstormStage}</p>
                            <div className="loading-progress-bar">
                                <div className="loading-progress-fill"></div>
                            </div>
                            <p className="loading-hint">萬物皆有因果，AI 正在為您排演最佳陣勢...</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
