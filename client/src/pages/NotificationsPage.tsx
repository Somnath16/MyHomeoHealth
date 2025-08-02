import React from 'react';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { useIsMobile } from '@/hooks/use-mobile';

export const NotificationsPage: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'mobile-container' : 'container mx-auto'} p-4 max-w-4xl`}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your push notifications and reminder preferences
          </p>
        </div>
        
        <NotificationSettings />
      </div>
    </div>
  );
};