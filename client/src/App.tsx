import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authApi, type AuthUser } from "@/lib/auth";
import { Plus } from "lucide-react";

// Components
import MobileHeader from "@/components/mobile/MobileHeader";
import NavigationDrawer from "@/components/mobile/NavigationDrawer";
import BottomNavigation from "@/components/mobile/BottomNavigation";
import QuickActionsModal from "@/components/mobile/QuickActionsModal";
import LoadingOverlay from "@/components/mobile/LoadingOverlay";
import { DesktopHeader } from "@/components/layout/DesktopHeader";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import { DashboardPageDesktop } from "@/pages/DashboardPageDesktop";
import CalendarPage from "@/pages/CalendarPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import PrescriptionsPage from "@/pages/PrescriptionsPage";
import MedicinesPage from "@/pages/MedicinesPage";
import AdminPage from "@/pages/AdminPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import DoctorSettingsPage from "@/pages/DoctorSettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import NotFound from "@/pages/not-found";

// Hooks
import { usePWA, useNetworkStatus, useHapticFeedback } from "@/hooks/use-pwa";
import { usePullToRefresh } from "@/hooks/use-swipe";
import { useScreenSize } from "@/hooks/use-screen-size";

function AppContent() {
  const [location, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  
  const { isInstallable, installApp } = usePWA();
  const isOnline = useNetworkStatus();
  const { lightTap } = useHapticFeedback();
  const { isMobileOrTablet, isDesktop } = useScreenSize();

  // Authentication state
  const { data: user, isLoading: isLoadingAuth, error: authError } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
    staleTime: 0, // Always check auth state
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    gcTime: 0, // Don't cache auth state (updated property name for v5)
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Force re-authentication check
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Navigate to login page
      setLocation("/login");
    },
    onError: (error) => {
      // Even if logout request fails, clear local state
      queryClient.clear();
      setLocation("/login");
    },
  });

  // Pull to refresh
  const refreshData = () => {
    queryClient.invalidateQueries();
  };

  const pullToRefreshHandlers = usePullToRefresh(refreshData);

  // Update current page based on location
  useEffect(() => {
    const path = location.substring(1) || "dashboard";
    setCurrentPage(path.split('/')[0]);
  }, [location]);

  // Handle navigation
  const handleNavigate = (page: string) => {
    lightTap();
    setLocation(`/${page}`);
    setCurrentPage(page);
  };

  const handleLogout = () => {
    lightTap();
    logoutMutation.mutate();
  };

  const handleQuickAction = (action: string) => {
    lightTap();
    switch (action) {
      case 'add-patient':
        handleNavigate('patients');
        break;
      case 'book-appointment':
        handleNavigate('calendar');
        break;
      case 'create-prescription':
        handleNavigate('prescriptions');
        break;
      case 'add-medicine':
        handleNavigate('medicines');
        break;
    }
  };

  // Debug authentication state
  // console.log("Auth state:", { user, isLoadingAuth, authError, location });

  // Show loading while checking authentication
  if (isLoadingAuth) {
    return <LoadingOverlay isVisible={true} message="Loading..." />;
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Protected routes based on user role
  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Header */}
        <DesktopHeader
          user={user}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="min-h-screen">
          <Switch>
            <Route path="/dashboard">
              {isAdmin ? (
                <AdminDashboard />
              ) : (
                <DashboardPageDesktop user={user} onNavigate={handleNavigate} />
              )}
            </Route>
            
            {isDoctor && (
              <Route path="/calendar">
                <CalendarPage user={user} />
              </Route>
            )}
            
            {(isAdmin || isDoctor) && (
              <>
                <Route path="/patients">
                  <PatientsPage user={user} onNavigate={handleNavigate} />
                </Route>
                <Route path="/patients/:id">
                  <PatientDetailPage />
                </Route>
                <Route path="/appointments">
                  <AppointmentsPage user={user} onNavigate={handleNavigate} />
                </Route>
                <Route path="/prescriptions">
                  <PrescriptionsPage user={user} onNavigate={handleNavigate} />
                </Route>
                <Route path="/medicines">
                  <MedicinesPage user={user} onNavigate={handleNavigate} />
                </Route>
              </>
            )}
            
            {isDoctor && (
              <Route path="/doctor/settings">
                <DoctorSettingsPage user={user} onNavigate={handleNavigate} />
              </Route>
            )}
            
            {isAdmin && (
              <>
                <Route path="/admin">
                  <AdminDashboard />
                </Route>
                <Route path="/admin/settings">
                  <AdminSettingsPage user={user} onNavigate={handleNavigate} />
                </Route>
              </>
            )}
            
            <Route path="/notifications">
              <NotificationsPage />
            </Route>
            
            {/* Default route */}
            <Route path="/">
              {isAdmin ? (
                <AdminDashboard />
              ) : (
                <DashboardPageDesktop user={user} onNavigate={handleNavigate} />
              )}
            </Route>
            
            {/* 404 */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </main>
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="min-h-screen bg-neutral-50"
         onTouchStart={pullToRefreshHandlers.onTouchStart as any}
         onTouchMove={pullToRefreshHandlers.onTouchMove as any}
         onTouchEnd={pullToRefreshHandlers.onTouchEnd as any}>
      {/* PWA Install Banner */}
      {isInstallable && (
        <div className="pwa-install-banner text-white p-3 text-center">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <span className="text-sm">Install My Homeo Health for better experience</span>
            <button
              onClick={installApp}
              className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-orange-500 text-white p-2 text-center text-sm">
          You're offline. Some features may not be available.
        </div>
      )}

      {/* Mobile Header */}
      <MobileHeader
        user={user}
        onMenuClick={() => setIsDrawerOpen(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        notificationCount={0}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="pb-20">
        <Switch>
          <Route path="/dashboard">
            {isAdmin ? (
              <AdminDashboard />
            ) : (
              <DashboardPage user={user} onNavigate={handleNavigate} />
            )}
          </Route>
          
          {isDoctor && (
            <Route path="/calendar">
              <CalendarPage user={user} />
            </Route>
          )}
          
          {(isAdmin || isDoctor) && (
            <>
              <Route path="/patients">
                <PatientsPage user={user} onNavigate={handleNavigate} />
              </Route>
              <Route path="/patients/:id">
                <PatientDetailPage />
              </Route>
              <Route path="/appointments">
                <AppointmentsPage user={user} onNavigate={handleNavigate} />
              </Route>
              <Route path="/prescriptions">
                <PrescriptionsPage user={user} onNavigate={handleNavigate} />
              </Route>
              <Route path="/medicines">
                <MedicinesPage user={user} onNavigate={handleNavigate} />
              </Route>
            </>
          )}
          
          {isDoctor && (
            <Route path="/doctor/settings">
              <DoctorSettingsPage user={user} onNavigate={handleNavigate} />
            </Route>
          )}
          
          {isAdmin && (
            <>
              <Route path="/admin">
                <AdminDashboard />
              </Route>
              <Route path="/admin/settings">
                <AdminSettingsPage user={user} onNavigate={handleNavigate} />
              </Route>
            </>
          )}
          
          <Route path="/notifications">
            <NotificationsPage />
          </Route>
          
          {/* Default route */}
          <Route path="/">
            {isAdmin ? (
              <AdminDashboard />
            ) : (
              <DashboardPage user={user} onNavigate={handleNavigate} />
            )}
          </Route>
          
          {/* 404 */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userRole={user.role}
      />

      {/* Floating Action Button */}
      {(isAdmin || isDoctor) && (
        <button
          className="mobile-fab bg-primary text-white fab"
          onClick={() => setShowQuickActions(true)}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Quick Actions Modal */}
      <QuickActionsModal
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onAction={handleQuickAction}
        userRole={user.role}
      />

      {/* Loading Overlay for mutations */}
      <LoadingOverlay 
        isVisible={logoutMutation.isPending} 
        message="Signing out..." 
      />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        <Toaster />
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
