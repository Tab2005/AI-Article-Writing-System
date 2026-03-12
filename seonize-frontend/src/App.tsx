import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { UIProvider } from './context/UIContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  KalpaPage,
  KalpaEyeLayout,
  KalpaHistoryPage,
  KalpaArticlesPage,
  NotFoundPage,
  CMSPage,
  ProfilePage,
  UserManagementPage,
  SystemGuidePage,
  CreditManagementPage,
} from './pages';
import './index.css';

// 路由守衛組件
const ProtectedRoute = ({ requireAdmin = false }: { requireAdmin?: boolean }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">載入中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<HeroPage />} />
            <Route path="/login" element={<LoginPage />} />

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
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/kalpa" element={<Navigate to="/kalpa-eye/matrix" replace />} />
                <Route path="/kalpa-eye" element={<KalpaEyeLayout />}>
                  <Route index element={<Navigate to="matrix" replace />} />
                  <Route path="matrix" element={<KalpaPage />} />
                  <Route path="history" element={<KalpaHistoryPage />} />
                  <Route path="articles" element={<KalpaArticlesPage />} />
                </Route>
                <Route path="/cms" element={<CMSPage />} />
                <Route path="/cms/guide" element={<SystemGuidePage />} />

                {/* 僅限超管訪問的設定頁面 */}
                <Route element={<ProtectedRoute requireAdmin />}>
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/credits" element={<CreditManagementPage />} />
                </Route>
              </Route>
            </Route>

            {/* 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
