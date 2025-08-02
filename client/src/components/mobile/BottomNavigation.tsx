import { Calendar, Users, BarChart3, FileText, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/use-pwa";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: string;
}

export default function BottomNavigation({ currentPage, onNavigate, userRole }: BottomNavigationProps) {
  const { lightTap } = useHapticFeedback();
  const { t } = useLanguage();

  const handleNavigate = (page: string) => {
    lightTap();
    onNavigate(page);
  };

  const navigationItems = [
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar, roles: ['doctor'] },
    { id: 'patients', label: t('nav.patients'), icon: Users, roles: ['admin', 'doctor'] },
    { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3, roles: ['admin', 'doctor'] },
    { id: 'prescriptions', label: t('nav.prescriptions'), icon: FileText, roles: ['admin', 'doctor'] },
    { id: 'medicines', label: t('nav.medicines'), icon: Pill, roles: ['admin', 'doctor'] },
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(userRole || 'patient')
  );

  return (
    <nav className="mobile-nav">
      <div className={`grid h-16 ${filteredItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              className={cn(
                "flex flex-col items-center justify-center transition-smooth touch-target",
                isActive 
                  ? "text-primary" 
                  : "text-neutral-400 hover:text-neutral-600"
              )}
              onClick={() => handleNavigate(item.id)}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
