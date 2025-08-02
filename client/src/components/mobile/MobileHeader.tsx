import { User, Menu, Bell, LogOut, Settings, MessageCircle, Languages, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MedicalLogo } from "@/components/ui/MedicalLogo";
import { useHapticFeedback } from "@/hooks/use-pwa";
import { useState } from "react";
import ProfileModal from "@/components/ProfileModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface MobileHeaderProps {
  user: any;
  onMenuClick: () => void;
  onLogout: () => void;
  onNavigate?: (page: string) => void;
  notificationCount?: number;
}

export default function MobileHeader({ user, onMenuClick, onLogout, onNavigate, notificationCount = 0 }: MobileHeaderProps) {
  const { lightTap } = useHapticFeedback();
  const { t, language, setLanguage } = useLanguage();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const handleMenuClick = () => {
    lightTap();
    onMenuClick();
  };

  return (
    <header className="mobile-header">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="touch-target p-2 -ml-2 text-neutral-600 hover:text-primary transition-smooth"
            onClick={handleMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <MedicalLogo showBackground={true} size={32} />
            <div>
              <h1 className="text-lg font-semibold">
                <span className="text-blue-600">My Homeo</span>{" "}
                <span className="text-teal-600">Health</span>
              </h1>
              <p className="text-xs text-neutral-500">
                {user?.role === 'admin' ? t('dashboard.admin') : t('dashboard.doctor')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="touch-target p-2 text-neutral-600 hover:text-primary transition-smooth relative"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="touch-target p-2 text-neutral-600 hover:text-primary transition-smooth"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                <User className="h-4 w-4 mr-2" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
                <Languages className="h-4 w-4 mr-2" />
                {language === 'en' ? 'বাংলা' : 'English'}
              </DropdownMenuItem>
              {user?.role === 'doctor' && onNavigate && (
                <DropdownMenuItem onClick={() => onNavigate('doctor/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Set Availability
                </DropdownMenuItem>
              )}
              {user?.role === 'doctor' && (
                <DropdownMenuItem onClick={() => setShowWhatsAppModal(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp Booking
                </DropdownMenuItem>
              )}
              {user?.role === 'admin' && onNavigate && (
                <DropdownMenuItem onClick={() => {
                  onNavigate('dashboard');
                  setTimeout(() => {
                    const adminTab = document.querySelector('[data-value="admins"]') as HTMLElement;
                    if (adminTab) {
                      adminTab.click();
                    }
                  }, 200);
                }}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Admin Users
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onLogout={onLogout}
          user={user}
        />
        <WhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          user={user}
        />
      </div>
    </header>
  );
}
