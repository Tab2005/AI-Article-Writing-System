import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { uiBus } from '../utils/ui-bus';

interface UIContextType {
    isLoading: boolean;
    showLoading: () => void;
    hideLoading: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<any[]>([]);

    // Loading counter to handle multiple simultaneous requests
    const [loadingCount, setLoadingCount] = useState(0);

    const showLoading = useCallback(() => setLoadingCount(c => c + 1), []);
    const hideLoading = useCallback(() => setLoadingCount(c => Math.max(0, c - 1)), []);

    useEffect(() => {
        const unsubLoading = uiBus.onLoading((loading) => {
            if (loading) showLoading();
            else hideLoading();
        });

        const unsubNotify = uiBus.onNotification((event) => {
            const id = Math.random().toString(36).substr(2, 9);
            setNotifications(prev => [...prev, { id, ...event }]);

            // Auto remove after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
        });

        return () => {
            unsubLoading();
            unsubNotify();
        };
    }, [showLoading, hideLoading]);

    return (
        <UIContext.Provider value={{ isLoading: loadingCount > 0, showLoading, hideLoading }}>
            {children}

            {/* Loading Overlay */}
            {loadingCount > 0 && (
                <div className="global-loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>正在處理中...</p>
                </div>
            )}

            {/* Notification Portal */}
            <div className="notification-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification notification-${n.type}`}>
                        <div className="notification-content">
                            {n.type === 'error' && <span className="icon">⚠️</span>}
                            {n.type === 'success' && <span className="icon">✅</span>}
                            {n.type === 'info' && <span className="icon">ℹ️</span>}
                            <span>{n.message}</span>
                        </div>
                        <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))}>×</button>
                    </div>
                ))}
            </div>
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
