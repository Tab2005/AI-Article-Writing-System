import React from 'react';
import './KPICard.css';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    loading?: boolean;
    suffix?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    change,
    icon,
    loading = false,
    suffix = '',
}) => {
    const isPositive = change !== undefined && change >= 0;

    return (
        <div className="kpi-card">
            {loading ? (
                <div className="kpi-card__loading">
                    <div className="kpi-card__spinner" />
                </div>
            ) : (
                <>
                    <div className="kpi-card__header">
                        {icon && <span className="kpi-card__icon">{icon}</span>}
                        <span className="kpi-card__title">{title}</span>
                    </div>
                    <div className="kpi-card__value">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                        {suffix && <span className="kpi-card__suffix">{suffix}</span>}
                    </div>
                    {change !== undefined && (
                        <div className={`kpi-card__change ${isPositive ? 'positive' : 'negative'}`}>
                            <span className="kpi-card__change-icon">
                                {isPositive ? '↑' : '↓'}
                            </span>
                            <span>{Math.abs(change)}%</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
