import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { uiBus } from '../utils/ui-bus';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const data = await authApi.login(email, password);

        // 使用 AuthContext 更新全域狀態
        if (data.access_token && data.user) {
          login(data.access_token, data.user);
          uiBus.notify('登入成功', 'success');
          navigate('/dashboard');
        } else {
          // Fallback 為原本的 validate 邏輯（如果有必要）
          localStorage.setItem('seonize_token', data.access_token);
          window.location.href = '/dashboard';
        }
      } else {
        // ...
        if (password !== confirmPassword) {
          throw new Error('兩次輸入的密碼不一致');
        }

        await authApi.register({ email, password, username });
        uiBus.notify('註冊成功！請使用新帳號登入', 'success');

        // 切換回登入模式並自動填入 Email
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? '登入失敗，請檢查電子郵件與密碼。' : '註冊失敗'));
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
          <h1 className="login-card__title">
            {mode === 'login' ? '歡迎回來' : '建立帳號'}
          </h1>
          <p className="login-card__subtitle">
            {mode === 'login'
              ? '請輸入電子郵件與密碼以解鎖分析功能'
              : '填寫以下資訊加入我們的 AI 智慧寫作平台'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-form__error">
              {error}
            </div>
          )}

          <div className="login-form__group">
            <label className="login-form__label">電子郵件</label>
            <Input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
          </div>

          {mode === 'register' && (
            <div className="login-form__group">
              <label className="login-form__label">顯示名稱 (選填)</label>
              <Input
                type="text"
                placeholder="您的暱稱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
              />
            </div>
          )}

          <div className="login-form__group">
            <label className="login-form__label">密碼</label>
            <Input
              type="password"
              placeholder="請輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
          </div>

          {mode === 'register' && (
            <div className="login-form__group">
              <label className="login-form__label">確認密碼</label>
              <Input
                type="password"
                placeholder="請再次輸入密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="login-form__actions">
              <div className="login-form__remember">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">記住我</label>
              </div>
              <a href="#" className="login-form__forgot">
                忘記密碼？
              </a>
            </div>
          )}

          <Button type="submit" variant="cta" size="lg" fullWidth disabled={isLoading}>
            {isLoading
              ? (mode === 'login' ? '登入中...' : '註冊中...')
              : (mode === 'login' ? '登入系統' : '立即註冊')}
          </Button>
        </form>

        <div className="login-card__footer">
          <p>
            {mode === 'login' ? '還沒有帳號嗎？' : '已經有帳號了？'}{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? '立即註冊' : '點此登入'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
