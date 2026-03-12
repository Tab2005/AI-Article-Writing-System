import React, { useState } from 'react';
import { useNavigate, NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InsufficientCreditsModal from '../common/InsufficientCreditsModal';
import { useApiWithCredits } from '../../hooks/useApiWithCredits';
import './MainLayout.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: { path: string; label: string }[];
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: '儀表板',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    path: '/projects',
    label: '專案列表',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5,4.27 7.5,9.64" />
        <polyline points="16.5,4.27 16.5,9.64" />
      </svg>
    ),
  },
  {
    path: '/keyword',
    label: '關鍵字研究',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    path: '/keyword/history',
    label: '研究歷史',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    path: '/analysis',
    label: '意圖分析',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    path: '/outline',
    label: '大綱編輯',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
      </svg>
    ),
  },
  {
    path: '/writing',
    label: '內容撰寫',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
      </svg>
    ),
  },
  {
    path: '/prompts',
    label: '指令倉庫',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44111 22 3 21.556 3 20.9932V8H21ZM21 4V6H3V4C3 3.456 3.44111 3 3.9934 3H20.0066C20.5552 3 21 3.4501 21 4ZM10 11V13H14V11H10Z" />
      </svg>
    ),
  },
  {
    path: '/kalpa-eye',
    label: '劫之眼術',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="m16 16-4-4" />
      </svg>
    ),
    children: [
      { path: '/kalpa-eye/matrix', label: '因果矩陣' },
      { path: '/kalpa-eye/history', label: '因果查詢' },
      { path: '/kalpa-eye/articles', label: '靈感成稿' },
    ]
  },
  {
    path: '/cms',
    label: '站點管理',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
    children: [
      { path: '/cms', label: '站點設定' },
      { path: '/cms/guide', label: '操作指南' },
    ]
  },
  {
    path: '/admin/users',
    label: '用戶管理',
    adminOnly: true,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: '系統設定',
    adminOnly: true,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (path: string, e: React.MouseEvent) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
    setExpandedMenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
    e.preventDefault();
    e.stopPropagation();
  };

  const filteredNavItems = navItems.filter(item =>
    !item.adminOnly || (user?.role === 'super_admin')
  );

  const { creditsModal, closeCreditsModal } = useApiWithCredits();

  return (
    <div className="main-layout">
      {/* 全域點數不足提示 Modal */}
      <InsufficientCreditsModal
        isOpen={creditsModal.isOpen}
        required={creditsModal.required}
        available={creditsModal.available}
        message={creditsModal.message}
        onClose={closeCreditsModal}
      />
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <span className="sidebar__logo-icon">S</span>
            {sidebarOpen && <span className="sidebar__logo-text">Seonize</span>}
          </div>
          <button
            className="sidebar__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? '收合側邊欄' : '展開側邊欄'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        <nav className="sidebar__nav">
          {filteredNavItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.path);

            return (
              <React.Fragment key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''} ${hasChildren ? 'sidebar__link--has-children' : ''}`
                  }
                  onClick={(e) => hasChildren && toggleMenu(item.path, e)}
                >
                  <span className="sidebar__link-icon">{item.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="sidebar__link-text">{item.label}</span>
                      {hasChildren && (
                        <span className={`sidebar__link-chevron ${isExpanded ? 'active' : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                {hasChildren && isExpanded && sidebarOpen && (
                  <div className="sidebar__submenu">
                    {item.children?.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `sidebar__submenu-link ${isActive ? 'sidebar__submenu-link--active' : ''}`
                        }
                      >
                        <span className="sidebar__submenu-text">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          {user && (
            <div className="sidebar__user">
              <Link
                to="/profile"
                className="sidebar__user-avatar"
                title="查看個人資料"
              >
                {user.username.charAt(0).toUpperCase()}
                <div className="sidebar__user-avatar-badge">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
              </Link>
              {sidebarOpen && (
                <div className="sidebar__user-info">
                  <Link to="/profile" className="sidebar__user-name-link">
                    <span className="sidebar__user-name">{user.username}</span>
                  </Link>
                  <div className="sidebar__user-role">
                    <span className={`sidebar__user-credits ${user.credits < 50 ? 'sidebar__user-credits--low' : ''}`}>
                      {user.role === 'super_admin' ? '💎 UNLIMITED' : `💎 ${user.credits}`}
                    </span>
                    {user.role === 'super_admin' && <span className="sidebar__role-badge">ADMIN</span>}
                  </div>
                </div>
              )}
              {sidebarOpen && (
                <button
                  className="sidebar__logout-btn"
                  onClick={handleLogout}
                  title="登出"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {sidebarOpen && (
            <div className="sidebar__version">
              <span>v1.0.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <main className="main-body" style={{ paddingTop: 'var(--space-8)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
