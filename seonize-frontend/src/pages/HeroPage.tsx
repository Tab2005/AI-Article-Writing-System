import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Input, Select } from '../components/ui';
import './HeroPage.css';

const typewriterTexts = [
  '讓 AI 幫你撰寫 SEO 優質內容',
  '數據驅動的智慧寫作系統',
  '反向工程 SERP，贏得搜尋排名',
  'AEO + GEO 策略，全方位優化',
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
            <div className="hero-stat__value">10+</div>
            <div className="hero-stat__label">SERP 競品分析</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">4</div>
            <div className="hero-stat__label">意圖類型判定</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">AI</div>
            <div className="hero-stat__label">智慧內容生成</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat__value">SEO</div>
            <div className="hero-stat__label">優化策略建議</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-section__title">核心功能</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <h3 className="feature-card__title">SERP 研究引擎</h3>
            <p className="feature-card__desc">
              自動獲取 Google Top 10 搜尋結果，異步爬取網頁內容與標題結構。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg
                width="24"
                height="24"
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
            </div>
            <h3 className="feature-card__title">意圖分析引擎</h3>
            <p className="feature-card__desc">
              智慧判定四大搜尋意圖（資訊、商業、導航、交易），匹配最佳寫作風格。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg
                width="24"
                height="24"
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
            </div>
            <h3 className="feature-card__title">AI 內容撰寫器</h3>
            <p className="feature-card__desc">
              分段迭代撰寫，強制嵌入關鍵字，支援 Gemini 2.5 Flash 與 GPT-4o。
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 className="feature-card__title">SEO 體檢優化</h3>
            <p className="feature-card__desc">
              即時檢測關鍵字密度、E-E-A-T 信號，自動生成 Meta 標籤。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
