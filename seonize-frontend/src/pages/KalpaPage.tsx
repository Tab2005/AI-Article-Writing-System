import React from 'react';
import { useAuth } from '../context/AuthContext';
import CostConfirmModal from '../components/common/CostConfirmModal';
import PublishModal from '../components/PublishModal';
import ImagePicker from '../components/common/ImagePicker';
import './KalpaPage.css';
import { useKalpaMatrix } from './KalpaMatrix/hooks/useKalpaMatrix';
import { TiandaoPanel } from './KalpaMatrix/components/TiandaoPanel';
import { ConfigPanel } from './KalpaMatrix/components/ConfigPanel';
import { ResultsPanel } from './KalpaMatrix/components/ResultsPanel';
import { PreviewModal } from './KalpaMatrix/components/PreviewModal';
import type { KalpaNode } from '../services/api';

export const KalpaPage: React.FC = () => {
    const { user } = useAuth();
    const {
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
        results,
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
    } = useKalpaMatrix(user);

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
                if (statusStr === 'weaving') {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <span className="status-badge status-weaving">
                                <span className="weaving-spinner"></span> 神諭編織中...
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>⏱️ 預計 40-60 秒</span>
                                <button
                                    onClick={() => handleResetNode(row.id!)}
                                    className="text-btn"
                                    style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                                    title="如果長時間沒反應，可點擊重置"
                                >
                                    [重置]
                                </button>
                            </div>
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

            <TiandaoPanel
                brainstormTopic={brainstormTopic}
                setBrainstormTopic={setBrainstormTopic}
                handleBrainstorm={handleBrainstorm}
                isBrainstorming={isBrainstorming}
                brainstormStage={brainstormStage}
                tiandaoSuggestions={tiandaoSuggestions}
                setTiandaoSuggestions={setTiandaoSuggestions}
                applyTiandaoSuggestions={applyTiandaoSuggestions}
                handleOneClickApplyAndGenerate={handleOneClickApplyAndGenerate}
                loading={loading}
            />

            <ConfigPanel
                projectName={projectName} setProjectName={setProjectName}
                industry={industry} setIndustry={setIndustry}
                moneyPageUrl={moneyPageUrl} setMoneyPageUrl={setMoneyPageUrl}
                cmsConfigId={cmsConfigId} setCmsConfigId={setCmsConfigId}
                cmsConfigs={cmsConfigs}
                entities={entities} setEntities={setEntities}
                actions={actions} setActions={setActions}
                pains={pains} setPains={setPains}
                titleTemplate={titleTemplate} setTitleTemplate={setTitleTemplate}
                exclusionRules={exclusionRules} setExclusionRules={setExclusionRules}
                handleGenerate={handleGenerate}
                handleClearAll={handleClearAll}
                handleSave={handleSave}
                exportCSV={exportCSV}
                loading={loading}
                saveLoading={saveLoading}
                matrixId={matrixId}
                results={results}
            />

            <ResultsPanel
                results={results}
                matrixId={matrixId}
                handleRefresh={handleRefresh}
                handleBatchWeave={handleBatchWeave}
                selectedNodeIds={selectedNodeIds}
                user={user}
                filterEntity={filterEntity}
                setFilterEntity={setFilterEntity}
                uniqueEntities={uniqueEntities}
                filterAction={filterAction}
                setFilterAction={setFilterAction}
                uniqueActions={uniqueActions}
                filterPain={filterPain}
                setFilterPain={setFilterPain}
                uniquePains={uniquePains}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                handleResetFilters={handleResetFilters}
                filteredResults={filteredResults}
                columns={columns}
            />

            <PreviewModal
                previewNode={previewNode}
                setPreviewNode={setPreviewNode}
                setShowImagePicker={setShowImagePicker}
                setShowPublishModal={setShowPublishModal}
            />
            {showPublishModal && previewNode && (
                <PublishModal
                    targetType="kalpa_node"
                    targetId={previewNode.id!}
                    onClose={() => setShowPublishModal(false)}
                />
            )}
            {showImagePicker && previewNode && (
                <ImagePicker
                    onSelect={handleImageSelect}
                    onClose={() => setShowImagePicker(false)}
                    suggestedKeywords={previewNode.target_title}
                    suggestedTopic={previewNode.target_title}
                    sectionContent={previewNode.content}
                />
            )}
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
        </div>
    );
};
