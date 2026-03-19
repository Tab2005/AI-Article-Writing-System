import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { kalpaApi, cmsApi } from '../../../services/api';
import type { KalpaNode, CMSConfig } from '../../../services/api';
import { uiBus } from '../../../utils/ui-bus';

export const useKalpaMatrix = (user: any) => {
    const { refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

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
    const [showImagePicker, setShowImagePicker] = useState(false);

    // 批量處理與篩選狀態
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [filterEntity, setFilterEntity] = useState<string>('');
    const [filterAction, setFilterAction] = useState<string>('');
    const [filterPain, setFilterPain] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // 天道解析狀態
    const [brainstormTopic, setBrainstormTopic] = useState('');
    const [isBrainstorming, setIsBrainstorming] = useState(false);
    const [brainstormStage, setBrainstormStage] = useState('');
    const [tiandaoSuggestions, setTiandaoSuggestions] = useState<any | null>(null);

    const fetchConfigs = useCallback(async () => {
        try {
            const data = await cmsApi.listConfigs();
            setCmsConfigs(data);
        } catch (error) {
            console.error('Failed to fetch CMS configs:', error);
        }
    }, []);

    const loadMatrix = useCallback(async (id: string) => {
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
            uiBus.notify('載入專案失敗', 'error');
            navigate('/kalpa-eye/matrix', { replace: true });
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchConfigs();
        const id = searchParams.get('id');
        if (id) {
            if (id !== matrixId) {
                loadMatrix(id);
            }
        } else {
            if (matrixId !== null) {
                setResults([]);
                setMatrixId(null);
                setCmsConfigId('');
            }
        }
    }, [searchParams, matrixId, fetchConfigs, loadMatrix]);

    const handleBrainstorm = () => {
        if (!brainstormTopic.trim()) return;

        setCostConfirm({
            open: true,
            title: '天道解析確認',
            description: `將針對「${brainstormTopic}」進行深度因果發想`,
            cost: 3,
            onConfirm: async () => {
                setIsBrainstorming(true);
                const stages = [
                    "正在感應冥冥天機...",
                    "正在撥動因果弦線...",
                    "正在推演萬物聯繫...",
                    "正在凝聚天道智慧..."
                ];
                setBrainstormStage(stages[0]);
                
                let stageIdx = 0;
                const stageTimer = setInterval(() => {
                    if (stageIdx < stages.length - 1) {
                        stageIdx++;
                        setBrainstormStage(stages[stageIdx]);
                    }
                }, 4000);

                try {
                    const data = await kalpaApi.brainstorm(brainstormTopic);
                    setTiandaoSuggestions(data);
                    refreshUser();
                    uiBus.notify('天道解析完成', 'success');
                } catch (error) {
                    console.error('Brainstorm failed:', error);
                    uiBus.notify('天道解析失敗，請稍後再試', 'error');
                } finally {
                    clearInterval(stageTimer);
                    setIsBrainstorming(false);
                }
            }
        });
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

        setTiandaoSuggestions(null);
        setBrainstormTopic('');
    };

    const handleOneClickApplyAndGenerate = async () => {
        if (!tiandaoSuggestions) return;

        const newEntities = tiandaoSuggestions.entities;
        const newActions = tiandaoSuggestions.actions;
        const newPains = tiandaoSuggestions.pain_points;
        const newTemplate = tiandaoSuggestions.suggested_title_template || titleTemplate;
        const newExclusionRules = tiandaoSuggestions.exclusion_rules || exclusionRules;

        setEntities(newEntities);
        setActions(newActions);
        setPains(newPains);
        if (newTemplate) setTitleTemplate(newTemplate);
        if (tiandaoSuggestions.exclusion_rules) setExclusionRules(tiandaoSuggestions.exclusion_rules);
        setTiandaoSuggestions(null);

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
            const finalProjectName = projectName || brainstormTopic || 'New Project';
            if (!projectName && brainstormTopic) setProjectName(brainstormTopic);

            uiBus.notify('正在自動儲存矩陣以啟用編織功能...', 'info');
            const saveRes = await kalpaApi.save({
                project_name: finalProjectName,
                industry: industry,
                money_page_url: moneyPageUrl,
                entities: newEntities,
                actions: newActions,
                pain_points: newPains,
                nodes: data,
                cms_config_id: cmsConfigId
            });

            if (saveRes.success) {
                setMatrixId(saveRes.matrix_id);
                if (saveRes.matrix?.nodes) {
                    setResults(saveRes.matrix.nodes);
                }
                navigate(`/kalpa-eye/matrix?id=${saveRes.matrix_id}`, { replace: true });
                uiBus.notify('矩陣生成並儲存完畢，現在可以開始編織！', 'success');
            }
        } catch (error) {
            console.error('One-click generate and save failed:', error);
            uiBus.notify('自動儲存失敗，請手動點擊「儲存專案」', 'error');
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
            setMatrixId(null); 
            uiBus.notify('矩陣推演完成！生成後請點擊「儲存專案」以解鎖選取與編織功能。', 'info');
        } catch (error) {
            console.error('Failed to generate Kalpa matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!projectName.trim()) {
            uiBus.notify('請輸入專案名稱', 'warning');
            return;
        }
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
                if (res.matrix?.nodes) {
                    setResults(res.matrix.nodes);
                }
                navigate(`/kalpa-eye/matrix?id=${res.matrix_id}`, { replace: true });
                uiBus.notify('專案儲存成功', 'success');
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!matrixId) return;
        setLoading(true);
        try {
            const res = await kalpaApi.get(matrixId);
            setResults(res.nodes || []);
            uiBus.notify('數據已同步', 'success');
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setLoading(false);
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
                        refreshUser();
                    }
                } catch (error: any) {
                    setResults(prev => prev.map(n => n.id === node.id ? { ...n, status: 'failed' } : n));
                    if (!error?.isCreditsError) uiBus.notify('編織失敗，已退還點數。', 'error');
                } finally {
                    setWeaveLoading(null);
                }
            },
        });
    };

    const handleImageSelect = (image: { url: string; alt: string; caption: string; source: string }) => {
        if (!previewNode) return;
        const updatedNode = { ...previewNode, images: [image] };
        setPreviewNode(updatedNode);
        setResults(prev => prev.map(n => (n.id === updatedNode.id || (n.entity === updatedNode.entity && n.action === updatedNode.action && n.pain_point === updatedNode.pain_point)) ? updatedNode : n));
        setShowImagePicker(false);
    };

    const handleResetNode = async (nodeId: string) => {
        if (!window.confirm('確定要重置此節點狀態嗎？這將取消當前的編織任務並允許手動重新開始。')) return;
        try {
            const res = await kalpaApi.resetNode(nodeId);
            if (res.success) {
                setResults(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'pending' } : n));
                uiBus.notify('節點狀態已重置', 'success');
            }
        } catch (err) {
            console.error('Reset node failed:', err);
        }
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
                    uiBus.notify(res.message || `已啟動 ${ids.length} 個任務...`, 'info');
                    setResults(prev => prev.map(nd => ids.includes(nd.id || '') ? { ...nd, status: 'weaving' } : nd));
                    setSelectedNodeIds([]);
                    refreshUser();
                } catch (error: any) {
                    if (!error?.isCreditsError) uiBus.notify('批量編織啟動失敗。', 'error');
                }
            },
        });
    };

    const filteredResults = results.filter(n => {
        return (filterEntity === '' || n.entity === filterEntity) &&
            (filterAction === '' || n.action === filterAction) &&
            (filterPain === '' || n.pain_point === filterPain) &&
            (filterStatus === '' || n.status === filterStatus);
    });

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
        setFilterStatus('');
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

    return {
        // States
        costConfirm, setCostConfirm,
        projectName, setProjectName,
        industry, setIndustry,
        moneyPageUrl, setMoneyPageUrl,
        entities, setEntities,
        actions, setActions,
        pains, setPains,
        titleTemplate, setTitleTemplate,
        exclusionRules, setExclusionRules,
        cmsConfigId, setCmsConfigId,
        cmsConfigs,
        loading,
        saveLoading,
        weaveLoading,
        results, setResults,
        matrixId,
        previewNode, setPreviewNode,
        showPublishModal, setShowPublishModal,
        showImagePicker, setShowImagePicker,
        selectedNodeIds,
        filterEntity, setFilterEntity,
        filterAction, setFilterAction,
        filterPain, setFilterPain,
        filterStatus, setFilterStatus,
        brainstormTopic, setBrainstormTopic,
        isBrainstorming,
        brainstormStage,
        tiandaoSuggestions, setTiandaoSuggestions,

        // Handlers
        handleBrainstorm,
        applyTiandaoSuggestions,
        handleOneClickApplyAndGenerate,
        handleClearAll,
        handleGenerate,
        handleSave,
        handleRefresh,
        handleWeave,
        handleImageSelect,
        handleResetNode,
        handleBatchWeave,
        toggleSelectNode,
        toggleSelectAll,
        handleResetFilters,
        exportCSV,

        // Computed
        filteredResults,
        uniqueEntities,
        uniqueActions,
        uniquePains
    };
};
