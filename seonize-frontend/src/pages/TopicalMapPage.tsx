import React, { useState, useEffect } from 'react';
import { Button, Input, DataTable, KPICard } from '../components/ui';
import { topicalMapApi } from '../services/api';
import type { TopicalMap, TopicalMapDetail, TopicalCluster, TopicalKeyword } from '../types';
import './TopicalMapPage.css';

export const TopicalMapPage: React.FC = () => {
  const [maps, setMaps] = useState<TopicalMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<TopicalMapDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
      setDetailLoading(true);
      const data = await topicalMapApi.get(id);
      setSelectedMap(data);
    } catch (error) {
      console.error('Failed to fetch map detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('?賤?畸?????')) return;
    try {
      await topicalMapApi.delete(id);
      if (selectedMap?.id === id) setSelectedMap(null);
      fetchMaps();
    } catch (error) {
      console.error('Failed to delete map:', error);
    }
  };

  const columns = [
    { key: 'name', header: '??迂' },
    { key: 'topic', header: '剜??' },
    { key: 'total_keywords', header: '?謚殷???, width: '100px' },
    { 
      key: 'status', 
      header: '???, 
      width: '120px',
      render: (val: string) => (
        <span className={status-badge status-}>
          {val === 'completed' ? '璆?' : val === 'processing' ? '止策??..' : '剜?'}
        </span>
      )
    },
    { key: 'created_at', header: '梁?蹇?', render: (val: string) => new Date(val).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      width: '150px',
      render: (_: any, row: TopicalMap) => (
        <div className=\"table-actions\">
          <Button size=\"sm\" variant=\"outline\" onClick={() => handleViewDetail(row.id)}>?</Button>
          <Button size=\"sm\" variant=\"outline\" onClick={(e) => handleDelete(row.id, e)} style={{ color: 'var(--color-error)' }}>?畸</Button>
        </div>
      )
    }
  ];

  return (
    <div className=\"topical-map-page\">
      <div className=\"page-header\">
        <div>
          <h1 className=\"page-title\">Topical Map ???</h1>
          <p className=\"page-desc\">?? AI ????憐?豲?選??? SEO 璆菟謓?/p>
        </div>
        <Button variant=\"cta\" onClick={() => setShowCreateModal(true)}>梁????</Button>
      </div>

      <div className=\"content-grid\">
        <div className=\"map-list-section card\">
          <DataTable columns={columns as any} data={maps} loading={loading} />
        </div>

        {selectedMap && (
          <div className=\"map-detail-section card animate-fade-in\">
            <div className=\"detail-header\">
              <h2>{selectedMap.name} - {selectedMap.topic}</h2>
              <Button size=\"sm\" variant=\"secondary\" onClick={() => setSelectedMap(null)}></Button>
            </div>
            
            <div className=\"detail-stats\">
              <KPICard title=\"?謚殷??\" value={selectedMap.total_keywords} />
              <KPICard title=\"????\" value={selectedMap.total_search_volume.toLocaleString()} />
            </div>

            <div className=\"tree-view\">
              {selectedMap.clusters.filter(c => c.level === 1).map(l1 => (
                <div key={l1.id} className=\"cluster-l1\">
                  <div className=\"cluster-header\">
                    <span className=\"level-badge\">L1</span>
                    <h3>{l1.name}</h3>
                  </div>
                  <div className=\"subclusters\">
                    {l1.subclusters.map(l2 => (
                      <div key={l2.id} className=\"cluster-l2\">
                        <div className=\"cluster-header\">
                          <span className=\"level-badge\">L2</span>
                          <h4>{l2.name}</h4>
                        </div>
                        <div className=\"keywords-tag-cloud\">
                          {l2.keywords.map(kw => (
                            <span key={kw.id} className=\"keyword-tag\" title={Vol: }>
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
        <div className=\"modal-overlay\">
          <div className=\"modal-content\">
            <h3>梁????</h3>
            <div className=\"form-group\">
              <label>??迂</label>
              <Input value={newMapData.name} onChange={e => setNewMapData({...newMapData, name: e.target.value})} placeholder=\"?: 撟 ???\" />
            </div>
            <div className=\"form-group\">
              <label>剜?? (?閰?謚殷??)</label>
              <Input value={newMapData.topic} onChange={e => setNewMapData({...newMapData, topic: e.target.value})} placeholder=\"?: AI Writing\" />
            </div>
            <div className=\"modal-actions\">
              <Button variant=\"secondary\" onClick={() => setShowCreateModal(false)}>?謘?</Button>
              <Button variant=\"cta\" onClick={handleCreate} loading={creating}>?賹??賹? (50 ?)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

