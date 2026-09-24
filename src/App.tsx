import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { CasesListPage } from './pages/CasesListPage.tsx';
import { CaseDetailPage } from './pages/CaseDetailPage.tsx';
import { VerificationPage } from './pages/VerificationPage.tsx';
import { IncidentMapPage } from './pages/IncidentMapPage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { CitizenPortalPage } from './pages/CitizenPortalPage.tsx';
import { AuditLogsPage } from './pages/AuditLogsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { CreateCaseModal } from './components/CreateCaseModal.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { api } from './services/api.ts';
import { NotificationItem, Case } from './types/index.ts';

function AppContent() {
  const { user, role, isLoading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Global Modals State
  const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Notifications & Badges
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [openTasksCount, setOpenTasksCount] = useState(0);

  const loadOperationalMetrics = async () => {
    try {
      const [notifsRes, statsRes] = await Promise.all([
        api.getNotifications(),
        api.getAnalytics(),
      ]);

      setNotifications(notifsRes.notifications);
      setUnreadNotificationsCount(notifsRes.unreadCount);
      setPendingVerifications(statsRes.pendingReviewReports);
      setOpenTasksCount(statsRes.openTasks);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOperationalMetrics();
    const interval = setInterval(loadOperationalMetrics, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setSelectedCaseId(null);
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationsCount(0);
  };

  const handleCaseCreated = (newCase: Case) => {
    loadOperationalMetrics();
    setSelectedCaseId(newCase.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span>Initializing Emergency Command Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Operations Header */}
      <Navbar
        onOpenNewCase={() => setCreateCaseModalOpen(true)}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
        onOpenSearch={() => setSearchModalOpen(true)}
        unreadCount={unreadNotificationsCount}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={selectedCaseId ? 'cases' : currentTab}
          onSelectTab={(tab) => {
            setSelectedCaseId(null);
            setCurrentTab(tab);
          }}
          pendingVerifications={pendingVerifications}
          openTasksCount={openTasksCount}
        />

        {/* Dynamic Center Stage Content */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] bg-slate-950">
          {selectedCaseId ? (
            <CaseDetailPage
              caseId={selectedCaseId}
              onBack={handleBackToDirectory}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  onSelectCase={handleSelectCase}
                  onOpenNewCase={() => setCreateCaseModalOpen(true)}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'cases' && (
                <CasesListPage
                  onSelectCase={handleSelectCase}
                  onOpenNewCase={() => setCreateCaseModalOpen(true)}
                />
              )}

              {currentTab === 'verification' && (
                <VerificationPage onSelectCase={handleSelectCase} />
              )}

              {currentTab === 'map' && (
                <IncidentMapPage onSelectCase={handleSelectCase} />
              )}

              {currentTab === 'tasks' && (
                <TasksPage onSelectCase={handleSelectCase} />
              )}

              {currentTab === 'citizen-portal' && <CitizenPortalPage />}

              {currentTab === 'audit-logs' && <AuditLogsPage />}

              {currentTab === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CreateCaseModal
        isOpen={createCaseModalOpen}
        onClose={() => setCreateCaseModalOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectCase={(id) => {
          setSelectedCaseId(id);
          setNotificationDrawerOpen(false);
        }}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectCase={handleSelectCase}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
