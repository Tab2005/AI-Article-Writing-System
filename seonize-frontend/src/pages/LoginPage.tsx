import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { authApi } from '../services/api';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const data = await authApi.login(password);

            // 儲存 Token
            localStorage.setItem('seonize_token', data.access_token);

            // 跳轉至儀表板
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || '登入失敗，請檢查密碼。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-page__bg">
                <div className="login-page__bg-gradient" />
                <div className="login-page__bg-grid" />
            </div>

            <div className="login-card">
                <div className="login-card__header">
                    <div className="login-card__logo">
                        <span className="login-card__logo-icon">🚀</span>
                        <span className="login-card__logo-text">Seonize</span>
                    </div>
                    <h1 className="login-card__title">管理員驗證</h1>
                    <p className="login-card__subtitle">請輸入系統密碼以解鎖分析功能</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    {error && (
                        <div className="login-form__error" style={{ color: 'var(--color-danger, #ef4444)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="login-form__group">
                        <label className="login-form__label">管理員密碼</label>
                        <Input
                            type="password"
                            placeholder="請輸入系統管理密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            fullWidth
                        />
                    </div>

                    <div className="login-form__actions">
                        <div className="login-form__remember">
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember">記住我</label>
                        </div>
                        <a href="#" className="login-form__forgot">忘記密碼？</a>
                    </div>

                    <Button
                        type="submit"
                        variant="cta"
                        size="lg"
                        fullWidth
                        disabled={isLoading}
                    >
                        {isLoading ? '登入中...' : '登入系統'}
                    </Button>
                </form>

                <div className="login-card__footer">
                    <p>還沒有帳號嗎？ <a href="#">立即註冊</a></p>
                </div>
            </div>
        </div>
    );
};
