import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StatsScreen } from './screens/StatsScreen';
import { AuthScreen } from './screens/AuthScreen';
import { QueryBuilderScreen } from './screens/QueryBuilderScreen';
import { RunsScreen } from './screens/RunsScreen';
import { RunDetailScreen } from './screens/RunDetailScreen';
import { BalanceScreen } from './screens/BalanceScreen';

// Providers
import { DatabaseProvider, useDatabase } from './contexts/DatabaseContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';

// Layout
import { TabBar } from './components/navigation/TabBar';
import { ToastContainer } from './components/ui/ToastContainer';
import { Spinner } from './components/ui/Spinner';

// ---------------------------------------------------------------------------
// Gate: show splash until DB is ready, redirect to onboarding if needed
// ---------------------------------------------------------------------------

function AppShell() {
  const { isReady, error } = useDatabase();
  const { isLoaded } = useSettings();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (!isReady || !isLoaded || authLoading) {
        return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center flex-col gap-4">
        {error ? (
          <p className="text-red-500 text-sm px-4 text-center">Database error: {error}</p>
        ) : (
          <>
            <span className="text-5xl">🏃</span>
            <Spinner size="lg" className="text-primary-500" />
          </>
        )}
          </div>
        );
  }

  const isTabRoute =
    location.pathname.startsWith('/home') ||
    location.pathname.startsWith('/stats') ||
    location.pathname.startsWith('/runs') ||
    location.pathname.startsWith('/balance') ||
    location.pathname.startsWith('/query-builder');

  const showTabBar = !!user && isTabRoute;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to={user ? '/home' : '/auth'} replace />} />
          <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <AuthScreen />} />
          <Route path="/home" element={user ? <StatsScreen /> : <Navigate to="/auth" replace />} />
          <Route path="/stats" element={user ? <StatsScreen /> : <Navigate to="/auth" replace />} />
          <Route path="/runs" element={user ? <RunsScreen /> : <Navigate to="/auth" replace />} />
          <Route path="/runs/:uuid" element={user ? <RunDetailScreen /> : <Navigate to="/auth" replace />} />
          <Route path="/balance" element={user ? <BalanceScreen /> : <Navigate to="/auth" replace />} />
          <Route path="/query-builder" element={user ? <QueryBuilderScreen /> : <Navigate to="/auth" replace />} />
        </Routes>
      </div>

      {/* Tab bar only on main routes (exclude live run) */}
      {showTabBar && <TabBar />}

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DatabaseProvider>
        <SettingsProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </ToastProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </BrowserRouter>
  );
}
