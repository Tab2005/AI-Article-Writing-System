import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout';
import {
  HeroPage,
  DashboardPage,
  LoginPage,
  KeywordPage,
  ProjectNewPage,
  ProjectDetailPage,
  ProjectsPage,
  AnalysisPage,
  OutlinePage,
  WritingPage,
  SettingsPage,
  KeywordHistoryPage,
  PromptPage,
} from './pages';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Hero page without layout */}
        <Route path="/" element={<HeroPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Pages with sidebar layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/keyword" element={<KeywordPage />} />
          <Route path="/keyword/history" element={<KeywordHistoryPage />} />
          <Route path="/projects/new" element={<ProjectNewPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/outline" element={<OutlinePage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/prompts" element={<PromptPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
