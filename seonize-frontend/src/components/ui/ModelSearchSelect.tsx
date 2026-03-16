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
        return { id: m, name: m };
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
          {selectedModel ? selectedModel.name || selectedModel.id : '請選擇模型...'}
        </span>
        <svg 
          className="model-search-select__icon" 
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {isOpen && (
        <div className="model-search-select__dropdown">
          <div className="model-search-select__search-wrapper">
            <input
              type="text"
              className="model-search-select__search"
              placeholder="搜尋模型名稱或 ID..."
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="model-search-select__options">
            {filteredModels.length > 0 ? (
              filteredModels.map(m => (
                <div 
                  key={m.id} 
                  className={`model-search-select__option ${m.id === value ? 'model-search-select__option--selected' : ''}`}
                  onClick={() => handleSelect(m.id)}
                >
                  <div className="model-search-select__option-name">{m.name || m.id}</div>
                  <div className="model-search-select__option-id">{m.id}</div>
                  {m.pricing && (
                    <div className="model-search-select__option-meta">
                      ${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)} / 1M tokens
                    </div>
                  )}
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
