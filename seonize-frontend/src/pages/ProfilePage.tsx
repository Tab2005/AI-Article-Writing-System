import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
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

    const fetchLevels = async () => {
        try {
            const data = await authApi.getMembershipLevels();
            setMembershipLevels(data);
        } catch (e) { /* ignore */ }
    };

    const fetchCreditHistory = async () => {
        setLogsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/credits/history`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('seonize_token')}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCreditLogs(data.logs || []);
            }
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('seonize_token')}`,
                },
                body: JSON.stringify({ username }),
            });

            const data = await response.json();
            if (response.ok) {
                updateUser(data.user);
                setMessage({ type: 'success', text: '基本資料已成功更新' });
            } else {
                setMessage({ type: 'error', text: data.detail || '更新失敗' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '網路錯誤，請稍後再試' });
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('seonize_token')}`,
                },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: '密碼已成功變更' });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMessage({ type: 'error', text: data.detail || '密碼變更失敗' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '網路錯誤，請稍後再試' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMockUpgrade = async (level: number) => {
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/membership/mock-upgrade?level=${level}`, {
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
            fetchCreditHistory();
            fetchLevels();
        }
    }, [user]);

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

            <div className="profile-page__grid">
                {/* 基本資料區塊 */}
                <section className="profile-page__card glass-card">
                    <h2 className="profile-page__card-title">基本資料</h2>
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
                <section className="profile-page__card glass-card">
                    <h2 className="profile-page__card-title">更換密碼</h2>
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
                                placeholder="至少 8 碼，建議包含大小寫與數字"
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
                                placeholder="再次輸入新密碼以確認"
                                required
                                className="form-input"
                            />
                        </div>
                        <button type="submit" className="btn-profile btn-profile--danger" disabled={isLoading}>
                            {isLoading ? '處理中...' : '🔑 更換密碼'}
                        </button>
                    </form>
                </section>

                {/* 資產概覽區塊 */}
                <section className="profile-page__card glass-card profile-page__card--span">
                    <h2 className="profile-page__card-title">資產與權限概覽</h2>
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
                            <span className="stat-value">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
                        </div>
                    </div>

                    <div className="membership-plans">
                        <div className={`plan-card ${currentLevel === 1 ? 'active' : ''}`}>
                            <div className="plan-header">暫時試用 (Trial)</div>
                            <ul className="plan-features">
                                <li>✓ 基本 SEO 研究</li>
                                <li>✓ 單篇大綱生成</li>
                                <li>✗ 完整文章生成 (需 Lv.2)</li>
                                <li>✗ 劫之眼批量編織 (需 Lv.3)</li>
                            </ul>
                            {currentLevel < 2 && (
                                <button className="btn-upgrade" onClick={() => handleMockUpgrade(2)}>立即升級一般會員</button>
                            )}
                        </div>
                        <div className={`plan-card ${currentLevel === 2 ? 'active' : ''}`}>
                            <div className="plan-header">一般會員 (Basic)</div>
                            <ul className="plan-features">
                                <li>✓ 所有研究功能</li>
                                <li>✓ 完整文章自動化成稿</li>
                                <li>✓ CMS 一鍵發布</li>
                                <li>✗ 劫之眼批量折扣 (需 Lv.3)</li>
                            </ul>
                            {currentLevel < 3 && (
                                <button className="btn-upgrade btn-upgrade--pro" onClick={() => handleMockUpgrade(3)}>升級深度會員 (特惠)</button>
                            )}
                        </div>
                        <div className={`plan-card ${currentLevel === 3 ? 'active' : ''}`}>
                            <div className="plan-header">深度會員 (Pro)</div>
                            <ul className="plan-features">
                                <li>✓ 解鎖劫之眼批量編織</li>
                                <li>✓ 享有階梯點數折扣 (最高 7 折)</li>
                                <li>✓ 優先權執行排程</li>
                                <li>✓ 專屬 AI 撰寫法寶袋</li>
                            </ul>
                            {currentLevel < 3 && <div className="plan-hint">推薦長期使用者</div>}
                        </div>
                    </div>

                    <div className="profile-page__info-box" style={{ marginTop: 'var(--space-6)' }}>
                        <p>💡 提示：點數將用於執行 AI 生成與 SEO 數據研究任務。您可以隨時聯絡管理員進行加值。</p>
                    </div>
                </section>

                {/* 交易紀錄區塊 */}
                <section className="profile-page__card glass-card profile-page__card--span credit-history-section">
                    <h2 className="profile-page__card-title">點數交易紀錄</h2>
                    <div className="credit-history-container">
                        {logsLoading ? (
                            <div className="logs-loading">載入紀錄中...</div>
                        ) : creditLogs.length > 0 ? (
                            <div className="table-responsive">
                                <table className="credit-table">
                                    <thead>
                                        <tr>
                                            <th>時間</th>
                                            <th>異動項目</th>
                                            <th className="text-center">點數異動</th>
                                            <th className="text-center">餘額 snapshot</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="log-date">
                                                    {new Date(log.created_at).toLocaleString('zh-TW', {
                                                        month: '2-digit', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
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
                            </div>
                        ) : (
                            <div className="no-logs">目前尚無點數異動紀錄</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ProfilePage;
