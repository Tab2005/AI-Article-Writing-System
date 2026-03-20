import React from 'react';
import { Button, DataTable, KPICard } from '../../../components/ui';

interface ResultsPanelProps {
    results: any[];
    matrixId: string | null;
    handleRefresh: () => void;
    handleBatchWeave: () => void;
    selectedNodeIds: string[];
    user: any;
    filterEntity: string;
    setFilterEntity: (val: string) => void;
    uniqueEntities: string[];
    filterAction: string;
    setFilterAction: (val: string) => void;
    uniqueActions: string[];
    filterPain: string;
    setFilterPain: (val: string) => void;
    uniquePains: string[];
    filterStatus: string;
    setFilterStatus: (val: string) => void;
    handleResetFilters: () => void;
    filteredResults: any[];
    columns: any[];
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    results,
    matrixId,
    handleRefresh,
    handleBatchWeave,
    selectedNodeIds,
    user,
    filterEntity,
    setFilterEntity,
    uniqueEntities,
    filterAction,
    setFilterAction,
    uniqueActions,
    filterPain,
    setFilterPain,
    uniquePains,
    filterStatus,
    setFilterStatus,
    handleResetFilters,
    filteredResults,
    columns
}) => {
    if (results.length === 0) return null;

    return (
        <div className="kalpa-results">
            <div className="results-header">
                <KPICard title="總意圖節點" value={results.length.toString()} icon={<span>📊</span>} />
                <KPICard title="儲存狀態" value={matrixId ? '已儲存' : '未儲存'} icon={<span>🔒</span>} />
            </div>

            <div className="results-table-container card">
                <div className="results-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>矩陣節點預覽</h3>
                        {matrixId && (
                            <button
                                className="refresh-btn"
                                onClick={handleRefresh}
                                title="手動刷新狀態"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--color-text-muted)',
                                    transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                            >
                                🔄
                            </button>
                        )}
                    </div>
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
                    <div className="filter-separator"></div>
                    <div className="filter-group">
                        <label>
                            <span className="filter-icon">📋</span> 狀態篩選
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">全部狀態</option>
                            <option value="pending">待編織</option>
                            <option value="weaving">神諭編織中</option>
                            <option value="completed">已編織</option>
                            <option value="failed">失敗</option>
                        </select>
                    </div>

                    <div className="filter-actions-right">
                        {(filterEntity || filterAction || filterPain || filterStatus) && (
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
    );
};
