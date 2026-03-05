import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, DataTable, KPICard, MermaidRenderer } from '../components/ui';
import { kalpaApi, cmsApi } from '../services/api';
import type { KalpaNode, CMSConfig } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
import { useAuth } from '../context/AuthContext';
import CostConfirmModal from '../components/common/CostConfirmModal';
import PublishModal from '../components/PublishModal';
import './KalpaPage.css';

interface TagInputProps {
    label: string;
    tags: string[];
    setTags: (tags: string[]) => void;
    placeholder: string;
}

const TagInput: React.FC<TagInputProps> = ({ label, tags, setTags, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                setTags([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    return (
        <div className="tag-input-group">
            <label className="tag-input-label">
                <span>{label}</span>
                <span className="tag-input-count">{tags.length} 項目</span>
            </label>
            <div className="tag-input-container">
                {tags.map((tag, index) => (
                    <span key={index} className="tag-item">
                        {tag}
                        <button type="button" onClick={() => removeTag(index)} className="tag-remove">
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="tag-input-field"
                />
            </div>
        </div>
    );
};

export const KalpaPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // 點數確認 Modal 狀態
    const [costConfirm, setCostConfirm] = useState<{
        open: boolean;
        title: string;
        description?: string;
        cost: number;
        discountInfo?: string;
        onConfirm: () => void;
    }>({ open: false, title: '', cost: 0, onConfirm: () => { } });

    const [projectName, setProjectName] = useState('');
    const [industry, setIndustry] = useState('');
    const [moneyPageUrl, setMoneyPageUrl] = useState('');
    const [entities, setEntities] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [pains, setPains] = useState<string[]>([]);
    const [titleTemplate, setTitleTemplate] = useState('');
    const [exclusionRules, setExclusionRules] = useState<Record<string, string[]>>({});
    const [cmsConfigId, setCmsConfigId] = useState<string>('');
    const [cmsConfigs, setCmsConfigs] = useState<CMSConfig[]>([]);

    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [weaveLoading, setWeaveLoading] = useState<string | null>(null);
    const [results, setResults] = useState<KalpaNode[]>([]);
    const [matrixId, setMatrixId] = useState<string | null>(null);

    const [previewNode, setPreviewNode] = useState<KalpaNode | null>(null);
    const [showPublishModal, setShowPublishModal] = useState(false);

    // 批量處理與篩選狀態
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [filterEntity, setFilterEntity] = useState<string>('');
    const [filterAction, setFilterAction] = useState<string>('');
    const [filterPain, setFilterPain] = useState<string>('');

    // 天道解析狀態
    const [brainstormTopic, setBrainstormTopic] = useState('');
    const [isBrainstorming, setIsBrainstorming] = useState(false);
    const [tiandaoSuggestions, setTiandaoSuggestions] = useState<{
        entities: string[];
        actions: string[];
        pain_points: string[];
        suggested_title_template?: string;
        exclusion_rules?: Record<string, string[]>;
    } | null>(null);

    useEffect(() => {
        fetchConfigs();
        const id = searchParams.get('id');
        if (id) {
            loadMatrix(id);
        } else {
            // Reset for new matrix
            setResults([]);
            setMatrixId(null);
            setCmsConfigId('');
        }
    }, [searchParams]);

    const fetchConfigs = async () => {
        try {
            const data = await cmsApi.listConfigs();
            setCmsConfigs(data);
        } catch (error) {
            console.error('Failed to fetch CMS configs:', error);
        }
    };

    const handleBrainstorm = async () => {
        if (!brainstormTopic.trim()) return;
        setIsBrainstorming(true);
        try {
            const data = await kalpaApi.brainstorm(brainstormTopic);
            setTiandaoSuggestions(data);
        } catch (error) {
            console.error('Brainstorm failed:', error);
        } finally {
            setIsBrainstorming(false);
        }
    };

    const applyTiandaoSuggestions = (overwrite: boolean = false) => {
        if (!tiandaoSuggestions) return;

        if (overwrite) {
            setEntities(tiandaoSuggestions.entities);
            setActions(tiandaoSuggestions.actions);
            setPains(tiandaoSuggestions.pain_points);
            if (tiandaoSuggestions.exclusion_rules) {
                setExclusionRules(tiandaoSuggestions.exclusion_rules);
            }
        } else {
            // 併入但不重複
            setEntities(prev => Array.from(new Set([...prev, ...tiandaoSuggestions.entities])));
            setActions(prev => Array.from(new Set([...prev, ...tiandaoSuggestions.actions])));
            setPains(prev => Array.from(new Set([...prev, ...tiandaoSuggestions.pain_points])));
            if (!titleTemplate && tiandaoSuggestions.suggested_title_template) {
                setTitleTemplate(tiandaoSuggestions.suggested_title_template);
            }
            if (tiandaoSuggestions.exclusion_rules) {
                setExclusionRules(prev => ({ ...prev, ...tiandaoSuggestions.exclusion_rules }));
            }
        }

        setTiandaoSuggestions(null); // 套用後關閉預覽
        setBrainstormTopic(''); // 清空輸入
    };

    const handleOneClickApplyAndGenerate = async () => {
        if (!tiandaoSuggestions) return;

        // 1. 同步更動狀態 (雖然 useState 是非同步，但我們在下一個呼叫中使用最新值)
        const newEntities = tiandaoSuggestions.entities;
        const newActions = tiandaoSuggestions.actions;
        const newPains = tiandaoSuggestions.pain_points;
        const newTemplate = tiandaoSuggestions.suggested_title_template || titleTemplate;
        const newExclusionRules = tiandaoSuggestions.exclusion_rules || exclusionRules;

        // 更新 UI 狀態
        setEntities(newEntities);
        setActions(newActions);
        setPains(newPains);
        if (newTemplate) setTitleTemplate(newTemplate);
        if (tiandaoSuggestions.exclusion_rules) setExclusionRules(tiandaoSuggestions.exclusion_rules);
        setTiandaoSuggestions(null);

        // 2. 直接呼叫生成 API (使用 local 變數確保即時性)
        setLoading(true);
        try {
            const data = await kalpaApi.generate({
                project_name: projectName || brainstormTopic || 'New Project',
                entities: newEntities,
                actions: newActions,
                pain_points: newPains,
                title_template: newTemplate,
                exclusion_rules: newExclusionRules
            });
            setResults(data);
            setMatrixId(null);
            if (!projectName && brainstormTopic) setProjectName(brainstormTopic);
        } catch (error) {
            console.error('One-click generate failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = () => {
        if (window.confirm('確定要清空所有輸入欄位與生成的矩陣嗎？')) {
            setProjectName('');
            setIndustry('');
            setMoneyPageUrl('');
            setEntities([]);
            setActions([]);
            setPains([]);
            setResults([]);
            setMatrixId(null);
            setTiandaoSuggestions(null);
            setExclusionRules({});
        }
    };

    const loadMatrix = async (id: string) => {
        // ... loadMatrix stays the same (I'll skip it in this chunk to keep it smaller if possible, but I'll make sure context matches)
        // (Self-correction: I should include the context correctly)
        setLoading(true);
        try {
            const matrix = await kalpaApi.get(id);
            setProjectName(matrix.project_name);
            setIndustry(matrix.industry || '');
            setMoneyPageUrl(matrix.money_page_url || '');
            setEntities(matrix.entities || []);
            setActions(matrix.actions || []);
            setPains(matrix.pain_points || []);
            setResults(matrix.nodes || []);
            setMatrixId(id);
            setCmsConfigId(matrix.cms_config_id || '');
        } catch (error) {
            console.error('Failed to load matrix:', error);
            alert('載入專案失敗');
            navigate('/kalpa-eye/matrix', { replace: true });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (entities.length === 0 || actions.length === 0 || pains.length === 0) {
            alert('請至少在每個欄位輸入一個項目');
            return;
        }

        setLoading(true);
        try {
            const data = await kalpaApi.generate({
                project_name: projectName,
                entities,
                actions,
                pain_points: pains,
                title_template: titleTemplate,
                exclusion_rules: exclusionRules
            });
            setResults(data);
            setMatrixId(null); // Reset saved ID on new generation
        } catch (error) {
            console.error('Failed to generate Kalpa matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (results.length === 0) return;
        setSaveLoading(true);
        try {
            const res = await kalpaApi.save({
                id: matrixId || undefined,
                project_name: projectName,
                industry,
                money_page_url: moneyPageUrl,
                entities,
                actions,
                pain_points: pains,
                nodes: results,
                cms_config_id: cmsConfigId
            });
            if (res.success) {
                setMatrixId(res.matrix_id);
                // Refresh results to get IDs from database
                const updatedMatrix = await kalpaApi.get(res.matrix_id);
                setResults(updatedMatrix.nodes || []);
                alert('專案儲存成功！');
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('儲存失敗，請檢查網路連線。');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleWeave = (node: KalpaNode) => {
        if (!node.id) {
            alert('請先點擊「儲存專案」，才能開始編織文章。');
            return;
        }
        setCostConfirm({
            open: true,
            title: '節點成稿確認',
            description: `將為「${node.target_title.slice(0, 20)}…」以 AI 生成文章`,
            cost: 8,
            onConfirm: async () => {
                setResults(prev => prev.map(n => n.id === node.id ? { ...n, status: 'weaving' } : n));
                setWeaveLoading(node.id!);
                try {
                    const res = await kalpaApi.weave(node.id!);
                    if (res.success) {
                        setResults(prev => prev.map(n => n.id === node.id ? res.node : n));
                        setPreviewNode(res.node);
                        // 成功後重新整理點數
                        if ((window as any).refreshAuthUser) (window as any).refreshAuthUser();
                    }
                } catch (error: any) {
                    setResults(prev => prev.map(n => n.id === node.id ? { ...n, status: 'failed' } : n));
                    if (!error?.isCreditsError) alert('編織失敗，已退還點數。');
                } finally {
                    setWeaveLoading(null);
                }
            },
        });
    };

    const handleBatchWeave = () => {
        if (selectedNodeIds.length === 0) return;
        if (!matrixId) {
            alert('請先點擊「儲存專案」，才能啟動批量編織功能。');
            return;
        }
        const nodeCount = selectedNodeIds.length;
        const memberLevel = user?.membership_level ?? 1;
        let cost = nodeCount * 8;
        let discountInfo: string | undefined;
        if (memberLevel >= 3) {
            if (nodeCount >= 20) { cost = Math.ceil(nodeCount * 8 * 0.70); discountInfo = `深度會員專屬 7 折，原價 ${nodeCount * 8} 點`; }
            else if (nodeCount >= 6) { cost = Math.ceil(nodeCount * 8 * 0.80); discountInfo = `深度會員專屬 8 折，原價 ${nodeCount * 8} 點`; }
            else if (nodeCount >= 2) { cost = Math.ceil(nodeCount * 8 * 0.85); discountInfo = `深度會員專屬 85 折，原價 ${nodeCount * 8} 點`; }
        }
        setCostConfirm({
            open: true,
            title: `批量編織 ${nodeCount} 個節點`,
            description: '節點將在背景排隊單獨出稿，進度可在面板下方查看。',
            cost,
            discountInfo,
            onConfirm: async () => {
                try {
                    const ids = [...selectedNodeIds];
                    const res = await kalpaApi.batchWeave(ids);
                    alert(res.message || `已啟動 ${ids.length} 個任務...`);
                    setResults(prev => prev.map(nd => ids.includes(nd.id || '') ? { ...nd, status: 'weaving' } : nd));
                    setSelectedNodeIds([]);
                    // 成功後重新整理點數
                    if ((window as any).refreshAuthUser) (window as any).refreshAuthUser();
                } catch (error: any) {
                    if (!error?.isCreditsError) alert('批量編織啟動失敗。');
                }
            },
        });
    };

    const filteredResults = results.filter(n => {
        return (filterEntity === '' || n.entity === filterEntity) &&
            (filterAction === '' || n.action === filterAction) &&
            (filterPain === '' || n.pain_point === filterPain);
    });

    // 動態從結果提取篩選選項 (確保與當前矩陣內容同步)
    const uniqueEntities = Array.from(new Set(results.map(n => n.entity))).sort();
    const uniqueActions = Array.from(new Set(results.map(n => n.action))).sort();
    const uniquePains = Array.from(new Set(results.map(n => n.pain_point))).sort();

    const toggleSelectNode = (nodeId: string) => {
        setSelectedNodeIds(prev =>
            prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedNodeIds.length === filteredResults.length) {
            setSelectedNodeIds([]);
        } else {
            setSelectedNodeIds(filteredResults.map(n => n.id || '').filter(id => id !== ''));
        }
    };

    const handleResetFilters = () => {
        setFilterEntity('');
        setFilterAction('');
        setFilterPain('');
        setSelectedNodeIds([]);
    };

    const exportCSV = () => {
        if (results.length === 0) return;

        const headers = ['Entity', 'Action', 'Pain Point', 'Target Title', 'Status'];
        const rows = results.map(r => [r.entity, r.action, r.pain_point, r.target_title, r.status]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${projectName}_matrix.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            key: 'selection',
            header: (
                <input
                    type="checkbox"
                    checked={selectedNodeIds.length > 0 && selectedNodeIds.length === filteredResults.length}
                    ref={input => {
                        if (input) {
                            input.indeterminate = selectedNodeIds.length > 0 && selectedNodeIds.length < filteredResults.length;
                        }
                    }}
                    onChange={toggleSelectAll}
                />
            ),
            width: '40px',
            render: (_: any, row: KalpaNode) => (
                <input
                    type="checkbox"
                    checked={selectedNodeIds.includes(row.id || '')}
                    onChange={() => toggleSelectNode(row.id || '')}
                    disabled={!row.id}
                />
            )
        },
        { key: 'entity', header: '實體', width: '100px' },
        { key: 'action', header: '動作', width: '100px' },
        { key: 'pain_point', header: '痛點', width: '120px' },
        { key: 'target_title', header: '意圖標題' },
        {
            key: 'status',
            header: '狀態',
            width: '240px',
            render: (val: any, row: KalpaNode) => {
                const statusStr = String(val);
                if (statusStr === 'completed') {
                    return (
                        <div className="status-cell">
                            <span className="status-badge status-completed">已編織</span>
                            <button className="weave-btn preview" onClick={() => setPreviewNode(row)}>預覽</button>
                        </div>
                    );
                }
                return (
                    <div className="status-cell">
                        <span className={`status-badge status-${statusStr}`}>
                            {statusStr === 'pending' ? '待編織' :
                                statusStr === 'weaving' ? '神諭編織中...' :
                                    statusStr === 'failed' ? '失敗' : statusStr}
                        </span>
                        {statusStr === 'weaving' && (
                            <div className="weaving-progress-info">
                                <div className="mini-spinner"></div>
                                <span className="estimate-text">預計 40-60 秒</span>
                            </div>
                        )}
                        {(statusStr === 'pending' || statusStr === 'failed') && (
                            <button
                                className={`weave-btn ${statusStr === 'failed' ? 'retry' : ''}`}
                                disabled={weaveLoading !== null}
                                onClick={() => handleWeave(row)}
                                style={statusStr === 'failed' ? {
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--color-error)',
                                    borderColor: 'var(--color-error)'
                                } : {}}
                            >
                                {weaveLoading === row.id ? '...' : statusStr === 'failed' ? '重試' : '編織'}
                            </button>
                        )}
                    </div>
                );
            }
        },
    ] as any;

    return (
        <div className="kalpa-page-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* 點數確認 Modal */}
            <CostConfirmModal
                isOpen={costConfirm.open}
                title={costConfirm.title}
                description={costConfirm.description}
                cost={costConfirm.cost}
                currentCredits={user?.credits}
                userRole={user?.role}
                discountInfo={costConfirm.discountInfo}
                onConfirm={() => {
                    setCostConfirm(prev => ({ ...prev, open: false }));
                    costConfirm.onConfirm();
                }}
                onCancel={() => setCostConfirm(prev => ({ ...prev, open: false }))}
            />
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
                                    {tiandaoSuggestions.entities.map(s => <span key={s} className="suggest-tag">{s}</span>)}
                                </div>
                            </div>
                            <div className="suggest-item">
                                <label>建議動作：</label>
                                <div className="suggest-tags">
                                    {tiandaoSuggestions.actions.map(s => <span key={s} className="suggest-tag">{s}</span>)}
                                </div>
                            </div>
                            <div className="suggest-item">
                                <label>建議痛點：</label>
                                <div className="suggest-tags">
                                    {tiandaoSuggestions.pain_points.map(s => <span key={s} className="suggest-tag">{s}</span>)}
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
                                            • 當實體含「<b>{trigger}</b>」時，排除含：{forbidden.join(', ')}
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
                                        {tiandaoSuggestions.entities.slice(0, 3).map((entity, i) => {
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

            <div className="kalpa-config card">
                <div className="kalpa-instruction">
                    <h4>
                        <span>💡</span> 如何使用因果矩陣？
                    </h4>
                    <p>
                        在下方欄位輸入您的核心<b>實體</b>、<b>動作</b>與<b>痛點</b>。
                        輸入完成後按下 <b>Enter</b> 即可新增。系統將自動排列組合生成所有可能的搜尋意圖標題。
                        生成後請點擊「儲存專案」以解鎖預留「神諭編織」功能。
                    </p>
                </div>

                <details className="kalpa-advanced-config" style={{ marginBottom: 'var(--space-6)' }}>
                    <summary style={{
                        cursor: 'pointer',
                        padding: 'var(--space-2) var(--space-4)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '14px',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        userSelect: 'none',
                        width: 'fit-content',
                        transition: 'all 0.2s ease'
                    }}>
                        <span className="icon">⚙️</span>
                        <span>進階標題設定 (點擊展開)</span>
                    </summary>

                    <div className="title-template-config" style={{ marginTop: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                        <div className="config-header">
                            <span className="icon">🏷️</span>
                            <span>意圖標題模板 (建議搭配預留位置: {'{entity}'}, {'{action}'}, {'{pain_point}'})</span>
                        </div>
                        <div className="template-input-group">
                            <Input
                                placeholder="例如：{entity}{action}{pain_point}怎麼辦？2026 最新解決教學與修復步驟"
                                value={titleTemplate}
                                onChange={(e) => setTitleTemplate(e.target.value)}
                            />
                            <div className="template-presets">
                                <button className="preset-btn" onClick={() => setTitleTemplate('{entity}{action}{pain_point}怎麼辦？2026 最新解決教學與修復步驟')}>預設</button>
                                <button className="preset-btn" onClick={() => setTitleTemplate('{entity}{action}{pain_point}：2026 專家深度分析與防坑指南')}>專業指南</button>
                                <button className="preset-btn" onClick={() => setTitleTemplate('{entity}在{action}時遇到{pain_point}？這篇教你如何快速修復')}>實戰修復</button>
                                <button className="preset-btn" onClick={() => setTitleTemplate('為什麼{entity}{action}會{pain_point}？2026 避坑清單與優化方案')}>避坑清單</button>
                                <button className="preset-btn" style={{ color: '#ef4444' }} onClick={() => setExclusionRules({})}>清空過濾規則</button>
                            </div>
                        </div>
                    </div>

                    <div className="filter-logic-config" style={{ marginTop: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                        <div className="config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span className="icon">🛡️</span>
                                <span>慧眼識珠：過濾邏輯設定 (JSON 格式)</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>AI 將自動生成，您也可手動調整</span>
                        </div>
                        <div style={{ padding: 'var(--space-4)' }}>
                            <textarea
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    color: '#10b981',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-3)',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                                value={JSON.stringify(exclusionRules, null, 2)}
                                onChange={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        setExclusionRules(parsed);
                                    } catch (err) {
                                        // 暫不處理編輯中的無效 JSON
                                    }
                                }}
                                placeholder='{ "關鍵字": ["禁止詞1", "禁止詞2"] }'
                            />
                        </div>
                    </div>
                </details>

                <div className="kalpa-config__row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <Input
                        label="專案名稱"
                        placeholder="輸入專案名稱..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                    />
                    <Input
                        label="產業 (Industry)"
                        placeholder="例如：Crypto, Finance..."
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                    />
                    <Input
                        label="目標導航 URL (Money Page)"
                        placeholder="https://your-money-page.com"
                        value={moneyPageUrl}
                        onChange={(e) => setMoneyPageUrl(e.target.value)}
                    />
                    <div className="input-field-group">
                        <label className="input-label">預設發布站點</label>
                        <select
                            value={cmsConfigId}
                            onChange={(e) => setCmsConfigId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)',
                                fontSize: '14px',
                                height: '42px'
                            }}
                        >
                            <option value="">不預設</option>
                            {cmsConfigs.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="kalpa-config__grid">
                    <TagInput
                        label="實體 (Entities)"
                        tags={entities}
                        setTags={setEntities}
                        placeholder="例如：幣安, MetaMask..."
                    />
                    <TagInput
                        label="動作 (Actions)"
                        tags={actions}
                        setTags={setActions}
                        placeholder="例如：入金, 提現, 註冊..."
                    />
                    <TagInput
                        label="痛點 (Pain Points)"
                        tags={pains}
                        setTags={setPains}
                        placeholder="例如：失敗, 等很久, 報錯..."
                    />
                </div>

                <div className="kalpa-config__actions" style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                    <Button
                        variant="cta"
                        onClick={handleGenerate}
                        loading={loading}
                        icon={<span>🔮</span>}
                    >
                        推演因果矩陣
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleClearAll}
                        title="清空所有欄位"
                    >
                        全部清空
                    </Button>
                    {results.length > 0 && (
                        <>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                loading={saveLoading}
                                icon={<span>💾</span>}
                            >
                                {matrixId ? '更新專案' : '儲存專案'}
                            </Button>
                            <Button variant="outline" onClick={exportCSV}>
                                匯出 CSV
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {
                results.length > 0 && (
                    <div className="kalpa-results">
                        <div className="results-header">
                            <KPICard title="總意圖節點" value={results.length.toString()} icon={<span>📊</span>} />
                            <KPICard title="儲存狀態" value={matrixId ? '已儲存' : '未儲存'} icon={<span>🔒</span>} />
                        </div>

                        <div className="results-table-container card">
                            <div className="results-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>矩陣節點預覽</h3>
                                <div className="batch-actions" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    {selectedNodeIds.length > 0 && (
                                        <Button
                                            variant="cta"
                                            size="sm"
                                            onClick={handleBatchWeave}
                                            icon={<span>{(user?.membership_level ?? 1) < 3 ? '🔒' : '⚡'}</span>}
                                            disabled={(user?.membership_level ?? 1) < 3}
                                            title={(user?.membership_level ?? 1) < 3 ? '此功能僅限「深度會員」使用' : ''}
                                        >
                                            {(user?.membership_level ?? 1) < 3 ? '批量編織 (需深度會員)' : `批量編織選中項 (${selectedNodeIds.length})`}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="table-filters">
                                <div className="filter-group">
                                    <label>
                                        <span className="filter-icon">🎯</span> 實體篩選
                                    </label>
                                    <select
                                        value={filterEntity}
                                        onChange={(e) => setFilterEntity(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">全部實體</option>
                                        {uniqueEntities.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div className="filter-separator"></div>
                                <div className="filter-group">
                                    <label>
                                        <span className="filter-icon">⚡</span> 動作篩選
                                    </label>
                                    <select
                                        value={filterAction}
                                        onChange={(e) => setFilterAction(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">全部動作</option>
                                        {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="filter-separator"></div>
                                <div className="filter-group">
                                    <label>
                                        <span className="filter-icon">🔥</span> 痛點篩選
                                    </label>
                                    <select
                                        value={filterPain}
                                        onChange={(e) => setFilterPain(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">全部痛點</option>
                                        {uniquePains.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div className="filter-actions-right">
                                    {(filterEntity || filterAction || filterPain) && (
                                        <button className="filter-reset-btn" onClick={handleResetFilters}>
                                            重置篩選 ↺
                                        </button>
                                    )}
                                    <div className="filter-info">
                                        顯示 <b>{filteredResults.length}</b> / {results.length} 個節點
                                    </div>
                                </div>
                            </div>

                            <DataTable columns={columns} data={filteredResults} />
                        </div>
                    </div>
                )
            }

            {/* Preview Modal */}
            {
                previewNode && (
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
                                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                                        使用法寶：<span style={{ color: 'var(--color-primary)' }}>{previewNode.anchor_used || '預設'}</span>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <Button variant="outline" onClick={() => setPreviewNode(null)}>關閉</Button>
                                    <Button variant="primary" onClick={() => setShowPublishModal(true)}>發佈文章</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {showPublishModal && previewNode && (
                <PublishModal
                    targetType="kalpa_node"
                    targetId={previewNode.id!}
                    onClose={() => setShowPublishModal(false)}
                />
            )}
        </div >
    );
};
