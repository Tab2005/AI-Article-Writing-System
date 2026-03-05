import React, { useState, useEffect } from 'react';
import './CostConfirmModal.css';

interface CostConfirmModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    cost: number;
    currentCredits?: number;
    userRole?: string;
    discountInfo?: string;  // 例如「深度會員 8折 優惠」
    onConfirm: () => void;
    onCancel: () => void;
}

const CostConfirmModal: React.FC<CostConfirmModalProps> = ({
    isOpen,
    title,
    description,
    cost,
    currentCredits,
    userRole,
    discountInfo,
    onConfirm,
    onCancel,
}) => {
    const [visible, setVisible] = useState(false);
    const isAdmin = userRole === 'super_admin';
    const afterBalance = currentCredits !== undefined ? currentCredits - (isAdmin ? 0 : cost) : undefined;
    const isInsufficient = !isAdmin && currentCredits !== undefined && currentCredits < cost;

    useEffect(() => {
        if (isOpen) setVisible(true);
    }, [isOpen]);

    const handleCancel = () => {
        setVisible(false);
        setTimeout(onCancel, 250);
    };

    const handleConfirm = () => {
        setVisible(false);
        setTimeout(onConfirm, 150);
    };

    if (!isOpen && !visible) return null;

    return (
        <div
            className={`ccm-backdrop ${visible && isOpen ? 'ccm-backdrop--in' : 'ccm-backdrop--out'}`}
            onClick={handleCancel}
        >
            <div className="ccm-modal" onClick={e => e.stopPropagation()}>
                {/* Icon */}
                <div className="ccm-modal__icon">💎</div>

                <h2 className="ccm-modal__title">{title}</h2>
                {description && <p className="ccm-modal__desc">{description}</p>}

                {/* 點數細節 */}
                <div className="ccm-modal__cost-card">
                    <div className="ccm-cost-row">
                        <span className="ccm-cost-label">本次消耗</span>
                        {isAdmin ? (
                            <span className="ccm-cost-value" style={{ color: 'var(--color-primary)' }}>管理員免扣點</span>
                        ) : (
                            <span className="ccm-cost-value ccm-cost-value--deduct">－ {cost} 點</span>
                        )}
                    </div>
                    {discountInfo && !isAdmin && (
                        <div className="ccm-cost-row ccm-cost-row--discount">
                            <span className="ccm-cost-label">✨ {discountInfo}</span>
                        </div>
                    )}
                    {currentCredits !== undefined && (
                        <>
                            <div className="ccm-cost-divider" />
                            <div className="ccm-cost-row">
                                <span className="ccm-cost-label">目前餘額</span>
                                <span className="ccm-cost-value">{currentCredits} 點</span>
                            </div>
                            <div className="ccm-cost-row">
                                <span className="ccm-cost-label">操作後餘額</span>
                                <span className={`ccm-cost-value ${isInsufficient ? 'ccm-cost-value--danger' : 'ccm-cost-value--after'}`}>
                                    {isInsufficient ? '⚠ 點數不足' : isAdmin ? `${currentCredits} 點 (不變)` : `${afterBalance} 點`}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {isInsufficient && (
                    <div className="ccm-warning">
                        ⚠ 點數不足，無法執行此操作。
                    </div>
                )}

                <div className="ccm-modal__actions">
                    <button className="ccm-btn ccm-btn--cancel" onClick={handleCancel}>
                        取消
                    </button>
                    <button
                        className="ccm-btn ccm-btn--confirm"
                        onClick={handleConfirm}
                        disabled={isInsufficient}
                    >
                        {isAdmin ? '確認執行 (管理員)' : `確認消耗 ${cost} 點`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CostConfirmModal;
