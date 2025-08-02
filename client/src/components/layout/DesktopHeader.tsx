import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Users, Pill, FileText, BarChart3, User, LogOut, ChevronDown, Settings, MessageCircle, Languages } from 'lucide-react';
import { MedicalLogo } from "@/components/ui/MedicalLogo";
import ProfileModal from "@/components/ProfileModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AuthUser } from '@/lib/auth';

interface DesktopHeaderProps {
  user: AuthUser;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  user,
  currentPage,
  onNavigate,
  onLogout
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';

  const navigationItems = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: BarChart3, show: true },
    { key: 'patients', label: t('nav.patients'), icon: Users, show: isAdmin || isDoctor },
    { key: 'medicines', label: t('nav.medicines'), icon: Pill, show: isAdmin || isDoctor },
    { key: 'appointments', label: t('nav.appointments'), icon: Calendar, show: isAdmin || isDoctor },
    { key: 'prescriptions', label: t('nav.prescriptions'), icon: FileText, show: isAdmin || isDoctor },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <MedicalLogo showBackground={true} size={48} />
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-blue-600">My Homeo</span>{" "}
              <span className="text-teal-600">Health</span>
            </h1>
            <p className="text-sm text-gray-500">{isAdmin ? t('dashboard.admin') : t('dashboard.doctor')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-1">
          {navigationItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            
            return (
              <Button
                key={item.key}
                variant={isActive ? "default" : "ghost"}
                className={`flex items-center space-x-2 px-4 py-2 ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => onNavigate(item.key)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 text-left p-2 hover:bg-gray-100"
              >
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback className="text-white text-sm font-medium">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || `Dr. ${user.username}`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
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
              {user?.role === 'doctor' && (
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
              {user?.role === 'admin' && (
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
};