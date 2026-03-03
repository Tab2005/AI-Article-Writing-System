import React, { useState, useEffect } from 'react';
import './InsufficientCreditsModal.css';

interface InsufficientCreditsModalProps {
    isOpen: boolean;
    required?: number;
    available?: number;
    message?: string;
    onClose: () => void;
}

const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
    isOpen,
    required,
    available,
    message,
    onClose,
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) setVisible(true);
    }, [isOpen]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 250);
    };

    if (!isOpen && !visible) return null;

    return (
        <div className={`ic-backdrop ${visible && isOpen ? 'ic-backdrop--in' : 'ic-backdrop--out'}`}
            onClick={handleClose}>
            <div className="ic-modal" onClick={e => e.stopPropagation()}>
                {/* Icon */}
                <div className="ic-modal__icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <h2 className="ic-modal__title">點數不足</h2>
                <p className="ic-modal__desc">
                    {message || '您的點數餘額不足以執行此操作。'}
                </p>

                {/* 點數詳情 */}
                {(required !== undefined || available !== undefined) && (
                    <div className="ic-modal__stats">
                        {required !== undefined && (
                            <div className="ic-stat">
                                <span className="ic-stat__label">本次需要</span>
                                <span className="ic-stat__value ic-stat__value--required">💎 {required} 點</span>
                            </div>
                        )}
                        {available !== undefined && (
                            <div className="ic-stat">
                                <span className="ic-stat__label">目前剩餘</span>
                                <span className={`ic-stat__value ${available <= 5 ? 'ic-stat__value--danger' : 'ic-stat__value--available'}`}>
                                    💎 {available} 點
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* 說明 */}
                <div className="ic-modal__tip">
                    <p>💡 點數用於執行 AI 生成操作。您可以：</p>
                    <ul>
                        <li>聯絡管理員補充點數</li>
                        <li>升級會員等級以獲得每月更多點數</li>
                    </ul>
                </div>

                <div className="ic-modal__actions">
                    <button className="ic-btn ic-btn--primary" onClick={handleClose}>
                        我知道了
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InsufficientCreditsModal;
