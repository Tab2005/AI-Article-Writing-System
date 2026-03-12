import React from 'react';
import { 
  BookOpen, 
  Layout, 
  Eye, 
  Share2, 
  Shield, 
  Zap, 
  Image as ImageIcon,
  ArrowRight
} from 'lucide-react';
import './SystemGuidePage.css';

const SystemGuidePage: React.FC = () => {
  return (
    <div className="guide-container">
      <header className="guide-header">
        <div className="guide-icon-wrapper">
          <BookOpen size={48} />
        </div>
        <h1 className="guide-title">Seonize 系統操作指南</h1>
        <p className="guide-subtitle">掌握全方位的 AI SEO 內容創作與發布流程</p>
      </header>

      <div className="guide-content">
        {/* 1. 基礎架構與專案管理 */}
        <section className="guide-section">
          <div className="guide-section-header">
            <div className="guide-section-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <Layout size={28} />
            </div>
            <h2 className="guide-section-label">1. 專案管理與基礎流程</h2>
          </div>
          <div className="guide-grid">
            <div className="guide-card">
              <h3 className="guide-card-title">建立與配置專案</h3>
              <p className="guide-card-text">
                從「專案列表」進入，定義產業、國家語系與目標 URL。專案是所有分析的根基，確保基礎資訊準確能顯著提升 AI 生成的精確度。
              </p>
            </div>
            <div className="guide-card">
              <h3 className="guide-card-title">關鍵字與意圖分析</h3>
              <p className="guide-card-text">
                研究搜尋趨勢並分析用戶心理。系統會自動篩選出高轉換潛力的關鍵字，並建議適合的內容結構（如：資訊教學型或產品比較型）。
              </p>
            </div>
          </div>
        </section>

        {/* 2. 劫之眼術 - 深度內容編擬 */}
        <section className="guide-section">
          <div className="guide-section-header">
            <div className="guide-section-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
              <Eye size={28} />
            </div>
            <h2 className="guide-section-label">2. 劫之眼術 (Kalpa Eye)</h2>
          </div>
          <div className="guide-grid">
            <div className="guide-card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="guide-card-title">因果矩陣核心概念</h3>
              <p className="guide-card-text">
                這是系統最先進的內容編排技術。透過拆解「實體、動作、痛點、標題及錨點」，自動擬合讀者心理與搜尋路徑。建議一次生成多組矩陣，從中挑選最具商業價值的節點執行編織。
              </p>
              <div className="guide-highlight-box">
                <span className="guide-highlight-title">操作心法</span>
                <span className="guide-highlight-content">選取關鍵內容素材 → 生成矩陣 → 選定節點 → 啟動神諭編織</span>
              </div>
            </div>
            <div className="guide-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <ImageIcon size={24} color="#fbbf24" />
                <h3 className="guide-card-title" style={{ marginBottom: 0 }}>多圖自動編織</h3>
              </div>
              <p className="guide-card-text">
                系統會自動搜尋適合的 **全橫式 (Landscape)** 圖片，除了文章首圖，內文也會在第一與末段自動插入帶有 SEO Alt Text 的相關插圖。
              </p>
            </div>
            <div className="guide-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Zap size={24} color="#fbbf24" />
                <h3 className="guide-card-title" style={{ marginBottom: 0 }}>圖片持久化管理器</h3>
              </div>
              <p className="guide-card-text">
                在「靈感成稿」預覽時，可使用「更換圖片」功能。您的選擇將會立即被儲存並永久綁定至該稿件，發布至外部站點時將以此圖為準。
              </p>
            </div>
          </div>
        </section>

        {/* 3. 發布至 CMS */}
        <section className="guide-section">
          <div className="guide-section-header">
            <div className="guide-section-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
              <Share2 size={28} />
            </div>
            <h2 className="guide-section-label">3. 多平台發布與優化</h2>
          </div>
          <div className="guide-grid">
            <div className="guide-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <h3 className="guide-card-title">WordPress (區塊化支援)</h3>
              <ul className="guide-list">
                <li>Gutenberg Blocks：發布後內容自動分拆為原生區塊。</li>
                <li>排版修復：專門處理表格與圖片間距，確保後台管理順手。</li>
                <li>媒體同步：外連圖片自動下載並轉存至 WP 媒體庫。</li>
              </ul>
            </div>
            <div className="guide-card" style={{ borderLeft: '4px solid #a855f7' }}>
              <h3 className="guide-card-title">Ghost (極簡發布)</h3>
              <ul className="guide-list">
                <li>支援 HTML 渲染，保持 Markdown 原汁原味。</li>
                <li>可選擇同步發布或保留在草稿狀態進行二次校對。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. 指令與進階設定 */}
        <section className="guide-section">
          <div className="guide-section-header">
            <div className="guide-section-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <Shield size={28} />
            </div>
            <h2 className="guide-section-label">4. 指令倉庫與核心機制</h2>
          </div>
          <div className="guide-card">
            <p className="guide-card-text">
              在「指令倉庫」中，您可以針對不同「人設 (Persona)」設定專有的口吻與結構。您可以定義禁用詞、必含詞，系統在執行任何寫作任務時都會優先參考該專案所綁定的指令模板。
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>💎 UNLIMITED 權限</span>
              <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>💎 點數額度管理</span>
            </div>
          </div>
        </section>

        <footer style={{ textAlign: 'center', padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            需要更多協助？請聯絡系統管理員或查閱開發者手冊。
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SystemGuidePage;
