import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './KalpaEyeLayout.css';

export const KalpaEyeLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="kalpa-eye-page">
            <div className="page-header">
                <h1 className="page-title">劫之眼術 (Kalpa Eye)</h1>
                <p className="page-subtitle">因果推演與意圖矩陣歷史查詢</p>
            </div>

            <div className="tab-navigation">
                <NavLink
                    to="/kalpa-eye/matrix"
                    className={({ isActive }) => `tab-link ${isActive || location.pathname === '/kalpa-eye' ? 'tab-link--active' : ''}`}
                >
                    因果矩陣 (推演功能)
                </NavLink>
                <NavLink
                    to="/kalpa-eye/history"
                    className={({ isActive }) => `tab-link ${isActive ? 'tab-link--active' : ''}`}
                >
                    因果查詢 (歷史紀錄)
                </NavLink>
            </div>

            <div className="tab-content">
                <Outlet />
            </div>
        </div>
    );
};
