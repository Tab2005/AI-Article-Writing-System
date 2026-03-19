import React from 'react';

interface TagInputProps {
    label: string;
    tags: string[];
    setTags: (tags: string[]) => void;
    placeholder: string;
}

export const TagInput: React.FC<TagInputProps> = ({ label, tags, setTags, placeholder }) => {
    const [inputValue, setInputValue] = React.useState('');

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
