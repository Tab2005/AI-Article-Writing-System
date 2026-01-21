# Seonize AI Article Writing System

此專案是 Seonize（析優）AI SEO 撰寫系統的開發版，聚焦數據驅動的 SERP 研究、意圖判定與分段內容生成。

## 專案結構
- `seonize/`：FastAPI 後端與核心邏輯
- `ui/`：Streamlit 儀表板介面
- `skills/`：專案技能與範例

## 啟動方式
1. 安裝依賴
2. （可選）設定 SERP API：複製 `.env.example` 為 `.env`，填入 `SERPAPI_KEY`
3. 啟動 API：`uvicorn seonize.api:app --reload`
4. 啟動 UI：`streamlit run ui/streamlit_app.py`
