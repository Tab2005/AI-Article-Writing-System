import React, { useState, useMemo, useRef, useEffect } from 'react';
import './ModelSearchSelect.css';

interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  description?: string;
}

interface ModelSearchSelectProps {
  label: React.ReactNode;
  models: (string | ModelInfo)[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ModelSearchSelect: React.FC<ModelSearchSelectProps> = ({
  label,
  models,
  value,
  onChange,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 統一格式化模型數據
  const normalizedModels = useMemo(() => {
    return models.map(m => {
      if (typeof m === 'string') {
        return { id: m, name: m } as ModelInfo;
      }
      return m;
    });
  }, [models]);

  // 過濾後的模型
  const filteredModels = useMemo(() => {
    if (!searchTerm) return normalizedModels;
    const lowerSearch = searchTerm.toLowerCase();
    return normalizedModels.filter(m => 
      m.id.toLowerCase().includes(lowerSearch) || 
      m.name.toLowerCase().includes(lowerSearch)
    );
  }, [normalizedModels, searchTerm]);

  // 分組過濾後的模型
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    
    // 定義推薦模型 ID
    const recommendedIds = [
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.0-flash',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1'
    ];

    const recommended: ModelInfo[] = [];
    
    filteredModels.forEach((m: ModelInfo) => {
      // 檢查是否為推薦模型
      if (recommendedIds.includes(m.id)) {
        recommended.push(m);
      }

      let provider = '其他';
      if (m.id.startsWith('openai/')) provider = 'OpenAI';
      else if (m.id.startsWith('anthropic/')) provider = 'Anthropic';
      else if (m.id.startsWith('google/')) provider = 'Google';
      else if (m.id.startsWith('deepseek/')) provider = 'DeepSeek';
      else if (m.id.startsWith('meta/')) provider = 'Meta (Llama)';
      else if (m.id.startsWith('mistralai/')) provider = 'Mistral';
      else if (m.id.startsWith('perplexity/')) provider = 'Perplexity';
      else if (m.id.includes('/')) provider = m.id.split('/')[0].toUpperCase();

      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(m);
    });

    // 只有在非搜尋模式或推薦模型清單中有內容時才顯示推薦分組
    const finalGroups: Record<string, ModelInfo[]> = {};
    if (recommended.length > 0) {
      finalGroups['✨ 推薦、常用模型'] = recommended;
    }
    
    return { ...finalGroups, ...groups };
  }, [filteredModels]);

  // 當選擇時
  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = normalizedModels.find(m => m.id === value);

  return (
    <div className={`model-search-select ${disabled ? 'model-search-select--disabled' : ''}`} ref={containerRef}>
      <label className="model-search-select__label">{label}</label>
      
      <div 
        className={`model-search-select__trigger ${isOpen ? 'model-search-select__trigger--active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="model-search-select__value">
          {selectedModel ? (
            <span className="model-search-select__selected-text">
              <span className="model-search-select__selected-name">{selectedModel.name || selectedModel.id}</span>
              <span className="model-search-select__selected-id">{selectedModel.id}</span>
            </span>
          ) : '請選擇模型...'}
        </span>
        <svg 
          className="model-search-select__icon" 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {isOpen && (
        <div className="model-search-select__dropdown">
          <div className="model-search-select__search-wrapper">
            <svg className="model-search-select__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              className="model-search-select__search"
              placeholder="搜尋模型..."
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="model-search-select__options">
            {Object.keys(groupedModels).length > 0 ? (
              Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider} className="model-search-select__group">
                  <div className="model-search-select__group-title">{provider}</div>
                  {providerModels.map(m => (
                    <div 
                      key={m.id} 
                      className={`model-search-select__option ${m.id === value ? 'model-search-select__option--selected' : ''}`}
                      onClick={() => handleSelect(m.id)}
                    >
                      <div className="model-search-select__option-content">
                        <div className="model-search-select__option-main">
                          <span className="model-search-select__option-name">{m.name || m.id}</span>
                          <span className="model-search-select__option-id">{m.id}</span>
                        </div>
                        {m.pricing && (
                          <div className="model-search-select__option-pricing">
                            <span className="pricing-tag">
                              ${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/M
                            </span>
                          </div>
                        )}
                      </div>
                      {m.context_length && (
                        <div className="model-search-select__option-footer">
                          Context: {Math.round(m.context_length / 1024)}K
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="model-search-select__no-results">找不到匹配的模型</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
