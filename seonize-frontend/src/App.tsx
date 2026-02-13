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
  NotFoundPage,
} from './pages';
import './index.css';
import { Navigate, Outlet } from 'react-router-dom';

// 路由守衛組件
const ProtectedRoute = () => {
  const isAuthenticated = !!localStorage.getItem('seonize_token');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<HeroPage />} />
        <Route
          path="/login"
          element={
            localStorage.getItem('seonize_token') ?
              <Navigate to="/dashboard" replace /> :
              <LoginPage />
          }
        />

        {/* Protected pages with layout */}
        <Route element={<ProtectedRoute />}>
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
        </Route>

        {/* 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
