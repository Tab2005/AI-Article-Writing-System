import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // 模擬登入延遲
        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 800);
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
                    <h1 className="login-card__title">歡迎回來</h1>
                    <p className="login-card__subtitle">請登入您的帳號以繼續分析</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="login-form__group">
                        <label className="login-form__label">電子郵件</label>
                        <Input
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            fullWidth
                        />
                    </div>

                    <div className="login-form__group">
                        <label className="login-form__label">密碼</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
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
