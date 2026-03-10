import React, { useState } from 'react';
import './ImagePicker.css';
import { Button, Input } from '../ui';
import axios from 'axios';

interface ImagePickerProps {
    onSelect: (image: { url: string; alt: string; source: string }) => void;
    onClose: () => void;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ onSelect, onClose }) => {
    const [tab, setTab] = useState<'upload' | 'search'>('upload');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const response = await axios.post('/api/images/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                onSelect({
                    url: response.data.data.url,
                    alt: file.name,
                    source: 'manual_upload'
                });
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        try {
            setLoading(true);
            const response = await axios.get(`/api/images/search?q=${encodeURIComponent(searchQuery)}`);
            if (response.data.success) {
                setResults(response.data.data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="image-picker-overlay">
            <div className="image-picker-container glass-morphism">
                <div className="image-picker-header">
                    <h3>選擇圖片</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="image-picker-tabs">
                    <button
                        className={tab === 'upload' ? 'active' : ''}
                        onClick={() => setTab('upload')}
                    >本機上傳</button>
                    <button
                        className={tab === 'search' ? 'active' : ''}
                        onClick={() => setTab('search')}
                    >圖庫搜尋</button>
                </div>

                <div className="image-picker-content">
                    {tab === 'upload' && (
                        <div className="upload-section">
                            <label className="upload-dropzone">
                                <input type="file" onChange={handleFileUpload} hidden />
                                <div className="upload-icon">📁</div>
                                <p>{loading ? '正在上傳...' : '點擊或拖拽圖片至此上傳'}</p>
                            </label>
                        </div>
                    )}

                    {tab === 'search' && (
                        <div className="search-section">
                            <div className="search-bar">
                                <Input
                                    placeholder="輸入關鍵字 (例如: crypto, expert)"
                                    value={searchQuery}
                                    onChange={(e: any) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e: any) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={loading}>搜尋</Button>
                            </div>
                            <div className="search-results">
                                {results.map((img, idx) => (
                                    <div key={idx} className="result-item" onClick={() => onSelect(img)}>
                                        <img src={img.url} alt={img.alt} />
                                    </div>
                                ))}
                                {results.length === 0 && !loading && <p className="no-results">無搜尋結果</p>}
                                {loading && <p className="loading-text">搜尋中...</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImagePicker;
