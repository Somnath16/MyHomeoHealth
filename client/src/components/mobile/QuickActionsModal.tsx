import { UserPlus, CalendarPlus, FileText, Pill, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHapticFeedback } from "@/hooks/use-pwa";

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  userRole: string;
}

export default function QuickActionsModal({ isOpen, onClose, onAction, userRole }: QuickActionsModalProps) {
  const { lightTap } = useHapticFeedback();

  if (!isOpen) return null;

  const handleAction = (action: string) => {
    lightTap();
    onAction(action);
    onClose();
  };

  const actions = [
    {
      id: 'add-patient',
      label: 'Add Patient',
      icon: UserPlus,
      color: 'primary',
      roles: ['doctor', 'admin']
    },
    {
      id: 'book-appointment',
      label: 'Book Appointment',
      icon: CalendarPlus,
      color: 'secondary',
      roles: ['doctor', 'admin']
    },
    {
      id: 'create-prescription',
      label: 'Add Prescription',
      icon: FileText,
      color: 'accent',
      roles: ['doctor', 'admin']
    },
    {
      id: 'add-medicine',
      label: 'Add Medicine',
      icon: Pill,
      color: 'orange',
      roles: ['doctor', 'admin']
    }
  ];

  const filteredActions = actions.filter(action => 
    action.roles.includes(userRole)
  );

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'secondary':
        return 'bg-secondary bg-opacity-10 text-secondary';
      case 'accent':
        return 'bg-accent bg-opacity-10 text-accent';
      case 'orange':
        return 'bg-orange-500 bg-opacity-10 text-orange-500';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-end">
      <Card className="w-full max-h-80 overflow-y-auto rounded-t-3xl rounded-b-none border-t border-x-0 border-b-0">
        <CardContent className="p-6">
          <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-6"></div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800">Quick Actions</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {filteredActions.map((action) => {
              const Icon = action.icon;
              
              return (
                <button
                  key={action.id}
                  className={`flex flex-col items-center p-4 rounded-xl touch-target transition-smooth ${getColorClasses(action.color)}`}
                  onClick={() => handleAction(action.id)}
                >
                  <Icon className="text-xl mb-2" size={24} />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
          
          <Button
            variant="secondary"
            className="w-full py-3 font-medium touch-target"
            onClick={onClose}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
