import React, { useId } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    icon,
    fullWidth = false,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;

    return (
        <div className={`input-group ${fullWidth ? 'input-group--full-width' : ''} ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-group__label">
                    {label}
                </label>
            )}
            <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''}`}>
                {icon && <span className="input-wrapper__icon">{icon}</span>}
                <input
                    id={inputId}
                    className={`input ${icon ? 'input--with-icon' : ''}`}
                    {...props}
                />
            </div>
            {error && <span className="input-group__error">{error}</span>}
            {hint && !error && <span className="input-group__hint">{hint}</span>}
        </div>
    );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
    fullWidth?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
    label,
    error,
    hint,
    fullWidth = false,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const textareaId = id || `textarea-${generatedId}`;

    return (
        <div className={`input-group ${fullWidth ? 'input-group--full-width' : ''} ${className}`}>
            {label && (
                <label htmlFor={textareaId} className="input-group__label">
                    {label}
                </label>
            )}
            <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''}`}>
                <textarea
                    id={textareaId}
                    className="textarea"
                    {...props}
                />
            </div>
            {error && <span className="input-group__error">{error}</span>}
            {hint && !error && <span className="input-group__hint">{hint}</span>}
        </div>
    );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: Array<{ value: string; label: string }>;
    fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    options,
    fullWidth = false,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const selectId = id || `select-${generatedId}`;

    return (
        <div className={`input-group ${fullWidth ? 'input-group--full-width' : ''} ${className}`}>
            {label && (
                <label htmlFor={selectId} className="input-group__label">
                    {label}
                </label>
            )}
            <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''}`}>
                <select id={selectId} className="select" {...props}>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && <span className="input-group__error">{error}</span>}
        </div>
    );
};
