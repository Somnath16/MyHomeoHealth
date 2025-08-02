import { X, BarChart3, Calendar, Users, Clock, FileText, Pill, LogOut, User, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/use-pwa";
import { useLanguage } from "@/contexts/LanguageContext";
import { MedicalLogo } from "@/components/ui/MedicalLogo";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export default function NavigationDrawer({ 
  isOpen, 
  onClose, 
  user, 
  currentPage, 
  onNavigate, 
  onLogout 
}: NavigationDrawerProps) {
  const { lightTap } = useHapticFeedback();
  const { t } = useLanguage();

  const handleNavigate = (page: string) => {
    lightTap();
    onNavigate(page);
    onClose();
  };

  const handleLogout = () => {
    lightTap();
    onLogout();
  };

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3, roles: ['admin', 'doctor'] },
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar, roles: ['doctor'] },
    { id: 'patients', label: t('nav.patients'), icon: Users, roles: ['admin', 'doctor'] },
    { id: 'appointments', label: t('nav.appointments'), icon: Clock, roles: ['admin', 'doctor'] },
    { id: 'prescriptions', label: t('nav.prescriptions'), icon: FileText, roles: ['admin', 'doctor'] },
    { id: 'medicines', label: t('nav.medicines'), icon: Pill, roles: ['admin', 'doctor'] },
    { id: 'doctor/settings', label: 'Availability Settings', icon: Settings, roles: ['doctor'] },
    { id: 'notifications', label: t('nav.notifications'), icon: Bell, roles: ['admin', 'doctor'] },
    { id: 'admin', label: t('nav.admin'), icon: User, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'patient')
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <nav className={cn(
        "mobile-drawer",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-800">{t('nav.menu')}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <MedicalLogo showBackground={true} size={48} />
            <div>
              <h3 className="font-semibold">
                <span className="text-blue-600">My Homeo</span>{" "}
                <span className="text-teal-600">Health</span>
              </h3>
              <p className="text-sm text-neutral-500">{user?.role === 'admin' ? t('dashboard.admin') : t('dashboard.doctor')}</p>
            </div>
          </div>
        </div>
        
        <div className="py-4 flex-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                className={cn(
                  "flex items-center w-full px-6 py-3 text-left transition-smooth",
                  isActive 
                    ? "text-white bg-primary" 
                    : "text-neutral-700 hover:bg-primary hover:text-white"
                )}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="p-6 border-t border-neutral-200">
          <Button
            variant="ghost"
            className="flex items-center w-full px-4 py-3 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-smooth justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </Button>
        </div>
      </nav>
    </>
  );
}
