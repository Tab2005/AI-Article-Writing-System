import React from 'react';
import { Outlet } from 'react-router-dom';
import './KalpaEyeLayout.css';

export const KalpaEyeLayout: React.FC = () => {

    return (
        <div className="kalpa-eye-page">
            <div className="page-header">
                <h1 className="page-title">劫之眼術 (Kalpa Eye)</h1>
                <p className="page-subtitle">因果推演與意圖矩陣歷史查詢</p>
            </div>

            <div className="tab-content">
                <Outlet />
            </div>
        </div>
    );
};
