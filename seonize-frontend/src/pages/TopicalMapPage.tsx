import React, { useState, useEffect } from 'react';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { topicalMapApi } from '../services/api';
import type { TopicalMap, TopicalMapDetail } from '../types';
import './TopicalMapPage.css';

export const TopicalMapPage: React.FC = () => {
  const [maps, setMaps] = useState<TopicalMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<TopicalMapDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapData, setNewMapData] = useState({ name: '', topic: '', country: 'TW', language: 'zh-TW' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      const data = await topicalMapApi.list();
      setMaps(data);
    } catch (error) {
      console.error('Failed to fetch maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newMapData.name || !newMapData.topic) return;
    try {
      setCreating(true);
      await topicalMapApi.generate(newMapData);
      setShowCreateModal(false);
      setNewMapData({ name: '', topic: '', country: 'TW', language: 'zh-TW' });
      fetchMaps();
    } catch (error) {
      console.error('Failed to create map:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const data = await topicalMapApi.get(id);
      setSelectedMap(data);
    } catch (error) {
      console.error('Failed to fetch map detail:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此主題地圖嗎？')) return;
    try {
      await topicalMapApi.delete(id);
      if (selectedMap?.id === id) setSelectedMap(null);
      fetchMaps();
    } catch (error) {
      console.error('Failed to delete map:', error);
    }
  };

  const columns = [
    { key: 'name', header: '地圖名稱' },
    { key: 'topic', header: '種子主題' },
    { key: 'total_keywords', header: '關鍵字數量', width: '100px' },
    { 
      key: 'status', 
      header: '狀態', 
      width: '120px',
      render: (val: string) => (
        <span className={`status-badge status-${val}`}>
          {val === 'completed' ? '已完成' : val === 'processing' ? '處理中...' : '待處理'}
        </span>
      )
    },
    { key: 'created_at', header: '建立時間', render: (val: string) => new Date(val).toLocaleDateString() },
    {
      key: 'actions',
      header: '操作',
      width: '150px',
      render: (_: any, row: TopicalMap) => (
        <div className="table-actions">
          <Button size="sm" variant="outline" onClick={() => handleViewDetail(row.id)}>查看</Button>
          <Button size="sm" variant="outline" onClick={(e) => handleDelete(row.id, e)} style={{ color: 'var(--color-error)' }}>刪除</Button>
        </div>
      )
    }
  ];

  return (
    <div className="topical-map-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Topical Map 主題地圖</h1>
          <p className="page-desc">利用 AI 自動規劃完整的內容地圖，提升您的 SEO 覆蓋率</p>
        </div>
        <Button variant="cta" onClick={() => setShowCreateModal(true)}>建立主題地圖</Button>
      </div>

      <div className="content-grid">
        <div className="map-list-section card">
          <DataTable columns={columns as any} data={maps} loading={loading} />
        </div>

        {selectedMap && (
          <div className="map-detail-section card animate-fade-in">
            <div className="detail-header">
              <h2>{selectedMap.name} - {selectedMap.topic}</h2>
              <Button size="sm" variant="secondary" onClick={() => setSelectedMap(null)}>關閉</Button>
            </div>
            
            <div className="detail-stats">
              <KPICard title="關鍵字總數" value={selectedMap.total_keywords} />
              <KPICard title="預估總搜尋量" value={selectedMap.total_search_volume.toLocaleString()} />
            </div>

            <div className="tree-view">
              {selectedMap.clusters.filter(c => c.level === 1).map(l1 => (
                <div key={l1.id} className="cluster-l1">
                  <div className="cluster-header">
                    <span className="level-badge">L1</span>
                    <h3>{l1.name}</h3>
                  </div>
                  <div className="subclusters">
                    {l1.subclusters.map(l2 => (
                      <div key={l2.id} className="cluster-l2">
                        <div className="cluster-header">
                          <span className="level-badge">L2</span>
                          <h4>{l2.name}</h4>
                        </div>
                        <div className="keywords-tag-cloud">
                          {l2.keywords.map(kw => (
                            <span key={kw.id} className="keyword-tag" title={`搜尋量: ${kw.search_volume}`}>
                              {kw.keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>建立主題地圖</h3>
            <div className="form-group">
              <label>地圖名稱</label>
              <Input value={newMapData.name} onChange={e => setNewMapData({...newMapData, name: e.target.value})} placeholder="例如: 某某主題地圖" />
            </div>
            <div className="form-group">
              <label>種子主題 (主要關鍵字)</label>
              <Input value={newMapData.topic} onChange={e => setNewMapData({...newMapData, topic: e.target.value})} placeholder="例如: AI Writing" />
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button variant="cta" onClick={handleCreate} loading={creating}>開始生成 (50 點)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
