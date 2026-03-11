import React, { useState } from 'react';
import './ImagePicker.css';
import { Button, Input } from '../ui';
import { imagesApi } from '../../services/api';

interface ImagePickerProps {
    onSelect: (image: { url: string; alt: string; caption: string; source: string }) => void;
    onClose: () => void;
    suggestedKeywords?: string;
    suggestedTopic?: string;
    sectionContent?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
    onSelect,
    onClose,
    suggestedKeywords = '',
    suggestedTopic = '',
    sectionContent = ''
}) => {
    const [tab, setTab] = useState<'upload' | 'search'>(suggestedKeywords ? 'search' : 'upload');
    const [searchQuery, setSearchQuery] = useState(suggestedKeywords);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 當有選中圖片時，嘗試取得 AI 建議的 Metadata
    const selectWithMetadata = async (img: any) => {
        try {
            setLoading(true);
            const res = await imagesApi.metadataSuggestion(
                sectionContent,
                suggestedTopic || searchQuery || img.alt || ''
            );

            if (res.success) {
                onSelect({
                    ...img,
                    alt: res.data.alt,
                    caption: res.data.caption
                });
            } else {
                onSelect(img);
            }
        } catch (error) {
            console.error('Failed to get metadata suggestion:', error);
            onSelect(img);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const response = await imagesApi.upload(file);
            
            if (response.success) {
                selectWithMetadata({
                    url: response.data.url,
                    alt: file.name,
                    caption: '',
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
            const response = await imagesApi.search(searchQuery);
            if (response.success) {
                setResults(response.data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="image-picker-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
                                <input type="file" onChange={handleFileUpload} accept="image/*" hidden />
                                <div className="upload-icon">📁</div>
                                <p className="upload-text">{loading ? '正在處理並上傳...' : '點擊或拖拽圖片至此上傳'}</p>
                                <p className="upload-hint">支援 JPG, PNG, WebP 格式</p>
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
                                <Button onClick={handleSearch} disabled={loading}>
                                    {loading ? '搜尋中...' : '搜尋'}
                                </Button>
                            </div>
                            <div className="search-results">
                                {results.map((img, idx) => (
                                    <div key={idx} className="result-item" onClick={() => selectWithMetadata(img)}>
                                        <img src={img.url} alt={img.alt} loading="lazy" />
                                        <div className="source-label">{img.source}</div>
                                        <div className="result-overlay">選取圖片</div>
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
