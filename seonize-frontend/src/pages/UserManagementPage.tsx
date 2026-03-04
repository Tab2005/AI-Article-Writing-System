import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import './UserManagementPage.css';

interface UserRecord {
    id: string;
    email: string;
    username: string;
    role: string;
    credits: number;
    membership_level: number;
    project_count: number;
    created_at: string;
}

interface UserStats {
    total_users: number;
    super_admins: number;
    vip_users: number;
    regular_users: number;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
    super_admin: { label: 'Super Admin', className: 'badge--admin' },
    vip: { label: 'VIP', className: 'badge--vip' },
    user: { label: 'User', className: 'badge--user' },
};

const LEVEL_LABELS: Record<number, string> = { 1: 'Basic', 2: 'Pro', 3: 'Business' };

const UserManagementPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [editForm, setEditForm] = useState({ role: '', credits: 0, membership_level: 1, username: '' });
    const [creditsDelta, setCreditsDelta] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const showMessage = (type: string, text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    const fetchStats = async () => {
        try {
            const data = await adminApi.getStats();
            setStats(data);
        } catch (e) { /* ignore */ }
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listUsers({
                page,
                per_page: 15,
                role: roleFilter,
                search
            });
            setUsers(data.users);
            setTotalPages(data.total_pages);
            setTotal(data.total);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, roleFilter]);

    useEffect(() => { fetchUsers(); fetchStats(); }, [fetchUsers]);

    const openEdit = (u: UserRecord) => {
        setEditingUser(u);
        setEditForm({ role: u.role, credits: u.credits, membership_level: u.membership_level, username: u.username || '' });
        setCreditsDelta(0);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        try {
            const body: Record<string, any> = {
                role: editForm.role,
                membership_level: editForm.membership_level,
                username: editForm.username,
            };

            if (creditsDelta !== 0) {
                body.credits_delta = creditsDelta;
            } else {
                body.credits = editForm.credits;
            }

            await adminApi.updateUser(editingUser.id, body);
            showMessage('success', `已更新 ${editingUser.email} 的資料`);
            setEditingUser(null);
            fetchUsers();
            fetchStats();
        } catch (e: any) {
            showMessage('error', e.message || '更新失敗');
        }
    };

    const handleDelete = async (userId: string) => {
        try {
            const data = await adminApi.deleteUser(userId);
            showMessage('success', data.message);
            setDeleteConfirm(null);
            fetchUsers();
            fetchStats();
        } catch (e: any) {
            showMessage('error', e.message || '刪除失敗');
            setDeleteConfirm(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    return (
        <div className="um-page">
            {/* Page Header */}
            <header className="um-page__header">
                <div>
                    <h1 className="um-page__title">用戶管理中心</h1>
                    <p className="um-page__subtitle">管理所有使用者帳號、角色與資産</p>
                </div>
            </header>

            {/* Message */}
            {message.text && (
                <div className={`um-alert um-alert--${message.type}`}>{message.text}</div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="um-stats">
                    <div className="um-stat-card">
                        <span className="um-stat-card__num">{stats.total_users}</span>
                        <span className="um-stat-card__label">總用戶數</span>
                    </div>
                    <div className="um-stat-card um-stat-card--admin">
                        <span className="um-stat-card__num">{stats.super_admins}</span>
                        <span className="um-stat-card__label">超級管理員</span>
                    </div>
                    <div className="um-stat-card um-stat-card--vip">
                        <span className="um-stat-card__num">{stats.vip_users}</span>
                        <span className="um-stat-card__label">VIP 用戶</span>
                    </div>
                    <div className="um-stat-card um-stat-card--regular">
                        <span className="um-stat-card__num">{stats.regular_users}</span>
                        <span className="um-stat-card__label">一般用戶</span>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <section className="um-filters glass-card">
                <form onSubmit={handleSearch} className="um-filters__form">
                    <input
                        type="text"
                        className="um-input"
                        placeholder="搜尋 Email 或名稱…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        className="um-input um-select"
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">全部角色</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="vip">VIP</option>
                        <option value="user">User</option>
                    </select>
                    <button type="submit" className="btn-primary">搜尋</button>
                    {(search || roleFilter) && (
                        <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}>
                            清除
                        </button>
                    )}
                </form>
                <span className="um-filters__count">共 {total} 筆</span>
            </section>

            {/* User Table */}
            <section className="glass-card um-table-wrap">
                {isLoading ? (
                    <div className="um-loading">載入中…</div>
                ) : users.length === 0 ? (
                    <div className="um-empty">找不到符合條件的用戶</div>
                ) : (
                    <table className="um-table">
                        <thead>
                            <tr>
                                <th>帳號與名稱</th>
                                <th>角色</th>
                                <th>等級</th>
                                <th>點數</th>
                                <th>專案數</th>
                                <th>加入日期</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className={u.id === currentUser?.id ? 'um-table__row--self' : ''}>
                                    <td>
                                        <div className="um-user-col">
                                            <div className="um-avatar">{(u.username || u.email).charAt(0).toUpperCase()}</div>
                                            <div>
                                                <div className="um-user-col__name">{u.username || '—'}</div>
                                                <div className="um-user-col__email">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`um-badge ${ROLE_LABELS[u.role]?.className || ''}`}>
                                            {ROLE_LABELS[u.role]?.label || u.role}
                                        </span>
                                        {u.id === currentUser?.id && <span className="um-badge badge--self">（我）</span>}
                                    </td>
                                    <td><span className="um-level">Lv.{u.membership_level} {LEVEL_LABELS[u.membership_level]}</span></td>
                                    <td><span className="um-credits">💎 {u.credits}</span></td>
                                    <td>{u.project_count}</td>
                                    <td className="um-date">{new Date(u.created_at).toLocaleDateString('zh-TW')}</td>
                                    <td>
                                        <div className="um-actions">
                                            <button className="um-btn-edit" onClick={() => openEdit(u)}>編輯</button>
                                            {u.id !== currentUser?.id && (
                                                <button className="um-btn-delete" onClick={() => setDeleteConfirm(u.id)}>刪除</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="um-pagination">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ 上一頁</button>
                        <span>第 {page} / {totalPages} 頁</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一頁 ›</button>
                    </div>
                )}
            </section>

            {/* Edit Modal */}
            {editingUser && (
                <div className="um-modal-backdrop" onClick={() => setEditingUser(null)}>
                    <div className="um-modal glass-card" onClick={e => e.stopPropagation()}>
                        <h2 className="um-modal__title">編輯用戶</h2>
                        <p className="um-modal__subtitle">{editingUser.email}</p>

                        <div className="um-modal__form">
                            <div className="form-group">
                                <label>顯示名稱</label>
                                <input type="text" className="form-input" value={editForm.username}
                                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>角色</label>
                                <select className="form-input" value={editForm.role}
                                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                                    <option value="user">User（一般用戶）</option>
                                    <option value="vip">VIP（付費用戶）</option>
                                    <option value="super_admin">Super Admin（超級管理員）</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>會員等級</label>
                                <select className="form-input" value={editForm.membership_level}
                                    onChange={e => setEditForm(f => ({ ...f, membership_level: Number(e.target.value) }))}>
                                    <option value={1}>Lv.1 Basic</option>
                                    <option value={2}>Lv.2 Pro</option>
                                    <option value={3}>Lv.3 Business</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>目前點數：{editForm.credits} 點</label>
                                <div className="um-credits-row">
                                    <input type="number" className="form-input" placeholder="直接設定點數"
                                        value={editForm.credits}
                                        onChange={e => { setEditForm(f => ({ ...f, credits: Number(e.target.value) })); setCreditsDelta(0); }} />
                                    <span className="um-credits-or">或增減</span>
                                    <input type="number" className="form-input" placeholder="±點數（例如 +100）"
                                        value={creditsDelta || ''}
                                        onChange={e => setCreditsDelta(Number(e.target.value))} />
                                </div>
                                {creditsDelta !== 0 && (
                                    <small className="um-credits-preview">
                                        操作後：{Math.max(0, editForm.credits + creditsDelta)} 點（{creditsDelta > 0 ? '+' : ''}{creditsDelta}）
                                    </small>
                                )}
                            </div>
                        </div>

                        <div className="um-modal__actions">
                            <button className="btn-primary" onClick={handleSaveEdit}>儲存變更</button>
                            <button className="btn-secondary" onClick={() => setEditingUser(null)}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="um-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="um-modal um-modal--danger glass-card" onClick={e => e.stopPropagation()}>
                        <h2 className="um-modal__title">⚠️ 確認刪除</h2>
                        <p className="um-modal__subtitle">
                            此操作無法復原。該用戶的帳號將被永久刪除，但其建立的資料將會保留。
                        </p>
                        <div className="um-modal__actions">
                            <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>確認刪除</button>
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
