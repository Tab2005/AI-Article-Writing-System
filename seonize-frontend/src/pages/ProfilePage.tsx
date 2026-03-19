import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { formatDate } from '../utils/date-utils';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Credit History State
    const [creditLogs, setCreditLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [membershipLevels, setMembershipLevels] = useState<Record<string, string>>({});
    
    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    const fetchLevels = async () => {
        try {
            const data = await authApi.getMembershipLevels();
            setMembershipLevels(data);
        } catch (e) { /* ignore */ }
    };

    const fetchCreditHistory = async () => {
        setLogsLoading(true);
        try {
            const data = await authApi.getCreditHistory(page, perPage);
            setCreditLogs(data.logs || []);
            setTotalPages(data.total_pages || 1);
            setTotalLogs(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch credit history:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const data = await authApi.updateProfile({ username });
            updateUser(data.user);
            setMessage({ type: 'success', text: '基本資料已成功更新' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '更新失敗' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await authApi.updateProfile({ old_password: oldPassword, new_password: newPassword });
            setMessage({ type: 'success', text: '密碼已成功變更' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '密碼變更失敗' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMockUpgrade = async (level: number) => {
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/membership/mock-upgrade?level=${level}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('seonize_token')}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                updateUser(data.user);
                setMessage({ type: 'success', text: data.message });
                fetchCreditHistory();
            } else {
                setMessage({ type: 'error', text: data.detail || '升級失敗' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '網路錯誤' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchLevels();
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchCreditHistory();
        }
    }, [user, page, perPage]);

    if (!user) return null;

    const currentLevel = user.membership_level ?? 1;

    return (
        <div className="profile-page">
            <header className="profile-page__header">
                <h1 className="profile-page__title">個人資訊中心</h1>
                <p className="profile-page__subtitle">管理您的帳號設定與權限資產</p>
            </header>

            {message.text && (
                <div className={`profile-page__alert profile-page__alert--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="profile-page__sections-wrapper">
                {/* 帳號安全與基本資料大區塊 */}
                <div className="profile-page__section-container profile-page__section-container--auth glass-card">
                    <div className="profile-page__section-grid">
                        {/* 基本資料區塊 */}
                        <section className="profile-page__section">
                            <h2 className="profile-page__section-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                基本資料
                            </h2>
                            <form onSubmit={handleUpdateProfile} className="profile-page__form">
                                <div className="form-group">
                                    <label>電子郵件 (帳號)</label>
                                    <input type="text" value={user.email} disabled className="form-input--disabled" />
                                    <small>帳號 Email 無法修改</small>
                                </div>
                                <div className="form-group">
                                    <label>顯示名稱</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <button type="submit" className="btn-profile btn-profile--primary" disabled={isLoading}>
                                    {isLoading ? '儲存中...' : '✓ 更新顯示名稱'}
                                </button>
                            </form>
                        </section>

                        {/* 帳號安全區塊 */}
                        <section className="profile-page__section">
                            <h2 className="profile-page__section-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5 3.5z"/></svg>
                                更換密碼
                            </h2>
                            <form onSubmit={handleChangePassword} className="profile-page__form">
                                <div className="form-group">
                                    <label>舊密碼</label>
                                    <input
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="輸入目前使用的密碼"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>新密碼</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="至少 8 碼"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>確認新密碼</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="再次輸入以確認"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <button type="submit" className="btn-profile btn-profile--danger" disabled={isLoading}>
                                    {isLoading ? '處理中...' : '🔑 更換密碼'}
                                </button>
                            </form>
                        </section>
                    </div>
                </div>

                {/* 資產與權限概覽大區塊 */}
                <div className="profile-page__section-container profile-page__section-container--assets glass-card">
                    <h2 className="profile-page__section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
                        資產與權限概覽
                    </h2>
                    <div className="profile-page__stats">
                        <div className="stat-item">
                            <span className="stat-label">會員等級</span>
                            <span className={`stat-value badge-level-${currentLevel}`}>
                                Lv.{currentLevel} {membershipLevels[currentLevel] || (currentLevel === 3 ? '深度會員' : currentLevel === 2 ? '一般會員' : '暫時試用')}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">可用點數 (Credits)</span>
                            <span className={`stat-value ${user.credits < 50 ? 'credits--low' : ''}`}>💎 {user.credits}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">角色權限</span>
                            <span className="stat-value badge-role">{user.role.toUpperCase()}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">註冊日期</span>
                            <span className="stat-value">{formatDate(user.created_at)}</span>
                        </div>
                    </div>

                    <div className="membership-plans">
                        <div className={`plan-card ${currentLevel === 1 ? 'active' : ''}`}>
                            <div className="plan-header">暫時試用 (Trial)</div>
                            <ul className="plan-features">
                                <li>✓ 基本 SEO 研究</li>
                                <li>✓ 單篇大綱生成</li>
                            </ul>
                            {currentLevel < 2 && (
                                <button className="btn-upgrade" onClick={() => handleMockUpgrade(2)}>立即升級</button>
                            )}
                        </div>
                        <div className={`plan-card ${currentLevel === 2 ? 'active' : ''}`}>
                            <div className="plan-header">一般會員 (Basic)</div>
                            <ul className="plan-features">
                                <li>✓ 完整文章自動化成稿</li>
                                <li>✓ CMS 一鍵發布</li>
                            </ul>
                            {currentLevel < 3 && (
                                <button className="btn-upgrade btn-upgrade--pro" onClick={() => handleMockUpgrade(3)}>立即升級</button>
                            )}
                        </div>
                        <div className={`plan-card ${currentLevel === 3 ? 'active' : ''}`}>
                            <div className="plan-header">深度會員 (Pro)</div>
                            <ul className="plan-features">
                                <li>✓ 劫之眼批量編織</li>
                                <li>✓ 享有階梯點數折扣</li>
                            </ul>
                        </div>
                    </div>

                    <div className="profile-page__info-box" style={{ marginTop: 'var(--space-6)' }}>
                        <p>💡 提示：點數將用於執行 AI 生成與 SEO 研究任務。您可以隨時聯絡管理員進行加值。</p>
                    </div>
                </div>

                {/* 點數交易紀錄區塊 */}
                <div className="profile-page__section-container profile-page__section-container--history glass-card">
                    <div className="profile-page__history-header">
                        <h2 className="profile-page__section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                            點數交易紀錄
                        </h2>
                        <div className="profile-page__history-controls">
                            <span className="history-count">共 {totalLogs} 筆</span>
                            <div className="per-page-select">
                                <label>每頁顯示</label>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value={10}>10 筆</option>
                                    <option value={20}>20 筆</option>
                                    <option value={50}>50 筆</option>
                                    <option value={100}>100 筆</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="credit-history-container">
                        {logsLoading ? (
                            <div className="logs-loading">載入紀錄中...</div>
                        ) : creditLogs.length > 0 ? (
                            <div className="table-wrapper">
                                <table className="credit-table">
                                    <thead>
                                        <tr>
                                            <th>時間</th>
                                            <th>異動項目</th>
                                            <th className="text-center">點數異動</th>
                                            <th className="text-center">餘額 SNAPSHOT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="log-date">
                                                    {formatDate(log.created_at, true)}
                                                </td>
                                                <td className="log-op">{log.operation}</td>
                                                <td className={`log-delta text-center ${log.delta > 0 ? 'plus' : log.delta < 0 ? 'minus' : 'neutral'}`}>
                                                    {log.delta > 0 ? `+${log.delta}` : log.delta === 0 ? '--' : log.delta}
                                                </td>
                                                <td className="log-balance text-center">💎 {log.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="profile-page__pagination">
                                    <button 
                                        className="pagination-btn"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        上一頁
                                    </button>
                                    <div className="pagination-info">
                                        第 {page} / {totalPages} 頁
                                    </div>
                                    <button 
                                        className="pagination-btn"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        下一頁
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="no-logs">目前尚無點數異動紀錄</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
