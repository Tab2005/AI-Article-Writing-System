import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { UIProvider } from './context/UIContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout';
import './index.css';

// 路由按需加載 (Lazy Loading)
const HeroPage = lazy(() => import('./pages').then(m => ({ default: m.HeroPage })));
const DashboardPage = lazy(() => import('./pages').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('./pages').then(m => ({ default: m.LoginPage })));
const KeywordPage = lazy(() => import('./pages').then(m => ({ default: m.KeywordPage })));
const ProjectNewPage = lazy(() => import('./pages').then(m => ({ default: m.ProjectNewPage })));
const ProjectDetailPage = lazy(() => import('./pages').then(m => ({ default: m.ProjectDetailPage })));
const ProjectsPage = lazy(() => import('./pages').then(m => ({ default: m.ProjectsPage })));
const AnalysisPage = lazy(() => import('./pages').then(m => ({ default: m.AnalysisPage })));
const OutlinePage = lazy(() => import('./pages').then(m => ({ default: m.OutlinePage })));
const WritingPage = lazy(() => import('./pages').then(m => ({ default: m.WritingPage })));
const SettingsPage = lazy(() => import('./pages').then(m => ({ default: m.SettingsPage })));
const KeywordHistoryPage = lazy(() => import('./pages').then(m => ({ default: m.KeywordHistoryPage })));
const PromptPage = lazy(() => import('./pages').then(m => ({ default: m.PromptPage })));
const KalpaPage = lazy(() => import('./pages').then(m => ({ default: m.KalpaPage })));
const KalpaEyeLayout = lazy(() => import('./pages').then(m => ({ default: m.KalpaEyeLayout })));
const KalpaHistoryPage = lazy(() => import('./pages').then(m => ({ default: m.KalpaHistoryPage })));
const KalpaArticlesPage = lazy(() => import('./pages').then(m => ({ default: m.KalpaArticlesPage })));
const NotFoundPage = lazy(() => import('./pages').then(m => ({ default: m.NotFoundPage })));
const CMSPage = lazy(() => import('./pages').then(m => ({ default: m.CMSPage })));
const ProfilePage = lazy(() => import('./pages').then(m => ({ default: m.ProfilePage })));
const UserManagementPage = lazy(() => import('./pages').then(m => ({ default: m.UserManagementPage })));
const SystemGuidePage = lazy(() => import('./pages').then(m => ({ default: m.SystemGuidePage })));
const CreditManagementPage = lazy(() => import('./pages').then(m => ({ default: m.CreditManagementPage })));

// Loading fallback 組件
const PageLoader = () => (
  <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg)' }}>
    <div className="preview-loading-spinner"></div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
