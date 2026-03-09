import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Input, Select } from '../components/ui';
import './HeroPage.css';

const typewriterTexts = [
  '反向工程 SERP，贏得搜尋排名',
  '織入內容缺口與 E-E-A-T 策略',
  'SEO + AEO + GEO 三位一體優化',
  '數據驅動的智慧權威內容生成',
];

export const HeroPage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('TW');
  const [language, setLanguage] = useState('zh-TW');
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect
  useEffect(() => {
    const currentText = typewriterTexts[textIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setDisplayText(currentText.substring(0, charIndex + 1));
            setCharIndex(charIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (charIndex > 0) {
            setDisplayText(currentText.substring(0, charIndex - 1));
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setTextIndex((textIndex + 1) % typewriterTexts.length);
          }
        }
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate('/login');
    }
  };

  const countryOptions = [
    { value: 'TW', label: '台灣 (TW)' },
    { value: 'US', label: '美國 (US)' },
    { value: 'JP', label: '日本 (JP)' },
    { value: 'CN', label: '中國 (CN)' },
    { value: 'HK', label: '香港 (HK)' },
  ];

  const languageOptions = [
    { value: 'zh-TW', label: '繁體中文' },
    { value: 'zh-CN', label: '簡體中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
  ];

  return (
    <div className="hero-page">
      {/* Background decoration */}
      <div className="hero-page__bg">
        <div className="hero-page__bg-gradient" />
        <div className="hero-page__bg-grid" />
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-section__content">
          <div className="hero-section__badge">
            <span className="hero-section__badge-icon">✨</span>
            <span>數據驅動的 AI SEO 撰寫系統</span>
          </div>

          <h1 className="hero-section__title">
            <span className="hero-section__title-main">Seonize</span>
            <span className="hero-section__title-sub">
              {displayText}
              <span className="hero-section__cursor">|</span>
            </span>
          </h1>

          <p className="hero-section__description">
            透過反向工程搜尋引擎結果頁面 (SERP)，自動判定搜尋意圖並建立知識圖譜，
            確保生成的文章具備極高的競爭力與 GSC 擴散潛力。
          </p>

          {/* Keyword Form */}
          <form className="hero-form" onSubmit={handleSubmit}>
            <div className="hero-form__main">
              <Input
                placeholder="輸入目標關鍵字... 例如：SEO 優化技巧"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                icon={
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
                }
                fullWidth
              />
              <Button type="submit" variant="cta" size="lg" disabled={!keyword.trim()}>
                開始分析
              </Button>
            </div>

            <div className="hero-form__options">
              <Select
                label="搜尋國家"
                options={countryOptions}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <Select
                label="內容語言"
                options={languageOptions}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat__value">SERP</div>
            <div className="hero-stat__label">深度競品反向工程</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">Gap</div>
            <div className="hero-stat__label">精準內容缺口識別</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">EEAT</div>
            <div className="hero-stat__label">權威性品質審計</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">Multi</div>
            <div className="hero-stat__label">GEO/AEO 多維優化</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-section__title">核心功能</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><circle cx="12" cy="12" r="4" /></svg>
            </div>
            <h3 className="feature-card__title">內容缺口研究</h3>
            <p className="feature-card__desc">
              自動分析 Top 10 競品，識別對手忽略的「缺口話題」，確保內容具備獨特性與高度資訊增益。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
            </div>
            <h3 className="feature-card__title">E-E-A-T 審計系統</h3>
            <p className="feature-card__desc">
              基於 Google 品質評分指南，深度檢測文章的專業性、權威性與可信度，並提供具體改善建議。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></svg>
            </div>
            <h3 className="feature-card__title">多維優化模式</h3>
            <p className="feature-card__desc">
              支援 SEO (關鍵字)、AEO (問答格式) 與 GEO (權威引用) 三大優化引擎，適應未來搜尋變革。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            </div>
            <h3 className="feature-card__title">結構化導引生成</h3>
            <p className="feature-card__desc">
              將研究報告直接注入 AI 指令，由大綱結構導引全文撰寫，確保每一段落都符合 SEO 戰略目標。
            </p>
          </div>
        </div>
      </section>

      {/* Footer / Login Link */}
      <footer className="hero-footer">
        <div className="hero-footer__content">
          <p>© 2026 Seonize - AI 驅動的數據 SEO 專家</p>
          <div className="hero-footer__links">
            <button className="login-link-btn" onClick={() => navigate('/login')}>
              後台管理登入
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
