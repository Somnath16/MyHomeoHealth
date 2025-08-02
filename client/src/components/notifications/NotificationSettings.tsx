import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, BellOff, Smartphone, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';

export const NotificationSettings: React.FC = () => {
  const {
    permission,
    subscription,
    isSupported,
    isLoading,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showTestNotification
  } = useNotifications();

  const [reminderSettings, setReminderSettings] = useState({
    appointmentReminders: true,
    reminderTime: 30, // minutes before appointment
    dailyReminders: false,
    weeklyReports: false
  });

  // Load existing settings on component mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/notifications/settings');
        if (response.ok) {
          const settings = await response.json();
          setReminderSettings(settings);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleEnableNotifications = async () => {
    const success = await subscribeToPush();
    if (success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } else {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleDisableNotifications = async () => {
    await unsubscribeFromPush();
  };

  const handleTestNotification = async () => {
    const success = await showTestNotification(
      'Test Notification',
      'This is a test notification from My Homeo Health!'
    );
    setTestStatus(success ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleReminderSettingChange = (key: keyof typeof reminderSettings, value: boolean | number) => {
    setReminderSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Save to server
    saveReminderSettings({ ...reminderSettings, [key]: value });
  };

  const saveReminderSettings = async (settings: typeof reminderSettings) => {
    try {
      await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error('Error saving reminder settings:', error);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellOff className="h-5 w-5" />
            <span>Push Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this browser. Please use a modern browser for the best experience.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Push Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permission.denied && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings to receive appointment reminders.
              </AlertDescription>
            </Alert>
          )}

          {permission.default && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Enable push notifications to receive appointment reminders and important updates.
              </AlertDescription>
            </Alert>
          )}

          {permission.granted && subscription && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Push notifications are enabled! You'll receive appointment reminders.
              </AlertDescription>
            </Alert>
          )}

          {testStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Test notification sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {testStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to send test notification. Please check your settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col space-y-3">
            {!subscription ? (
              <Button 
                onClick={handleEnableNotifications}
                disabled={isLoading || permission.denied}
                className="w-full"
              >
                {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleTestNotification}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Test Notification
                </Button>
                <Button 
                  onClick={handleDisableNotifications}
                  variant="destructive"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Disable
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Reminder Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Appointment Reminders</Label>
                <p className="text-sm text-gray-500">
                  Get notified before your appointments
                </p>
              </div>
              <Switch
                checked={reminderSettings.appointmentReminders}
                onCheckedChange={(checked) => 
                  handleReminderSettingChange('appointmentReminders', checked)
                }
              />
            </div>

            {reminderSettings.appointmentReminders && (
              <div className="space-y-2">
                <Label>Reminder Time</Label>
                <select
                  value={reminderSettings.reminderTime}
                  onChange={(e) => 
                    handleReminderSettingChange('reminderTime', parseInt(e.target.value))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Daily Reminders</Label>
                <p className="text-sm text-gray-500">
                  Daily summary of upcoming appointments
                </p>
              </div>
              <Switch
                checked={reminderSettings.dailyReminders}
                onCheckedChange={(checked) => 
                  handleReminderSettingChange('dailyReminders', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-gray-500">
                  Weekly summary of appointments and patient updates
                </p>
              </div>
              <Switch
                checked={reminderSettings.weeklyReports}
                onCheckedChange={(checked) => 
                  handleReminderSettingChange('weeklyReports', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};