import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, LogOut, Settings, Key, Globe, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user?: any; // User data passed from parent component
}

export default function ProfileModal({ isOpen, onClose, onLogout, user: propUser }: ProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'bn'>(language);

  // Use user data from props or fetch if not available
  const { data: currentUser, isLoading: isUserLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch user data:', response.status, errorText);
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      const data = await response.json();
      console.log('User data fetched successfully:', data);
      return data;
    },
    enabled: isOpen && !propUser, // Only fetch if no user prop is provided and modal is open
    retry: 2,
    staleTime: 0,
  });

  const user = propUser || currentUser?.user;

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    clinicName: user?.clinicName || '',
    clinicLocation: user?.clinicLocation || '',
    degree: user?.degree || '',
    specialist: user?.specialist || '',
  });

  const [whatsappData, setWhatsappData] = useState({
    whatsappPhone: user?.whatsappPhone || '',
    whatsappEnabled: user?.whatsappEnabled || false,
  });

  const [settingsData, setSettingsData] = useState({
    globalLowStockThreshold: user?.globalLowStockThreshold || 10,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/users/${user?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setActiveTab("profile"); // Go back to view mode
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // WhatsApp settings mutation
  const updateWhatsAppMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/users/${user?.id}/whatsapp`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Success",
        description: "WhatsApp settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update WhatsApp settings",
        variant: "destructive",
      });
    },
  });

  // Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/users/${user?.id}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/users/${user?.id}/password`, data),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleWhatsAppUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppMutation.mutate(whatsappData);
  };

  const handleSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settingsData);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      onLogout();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  // Update form data when user data loads
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        clinicName: user.clinicName || '',
        clinicLocation: user.clinicLocation || '',
        degree: user.degree || '',
        specialist: user.specialist || '',
      });
      setWhatsappData({
        whatsappPhone: user.whatsappPhone || '',
        whatsappEnabled: user.whatsappEnabled || false,
      });
      setSettingsData({
        globalLowStockThreshold: user.globalLowStockThreshold || 10,
      });
    }
  }, [user]);

  if (isUserLoading && !propUser) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading profile...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-red-500 mb-2">
                {error ? `Error: ${error.message}` : 'Unable to load user profile'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Please try logging in again or contact support if the issue persists.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={onLogout} variant="outline">
                  Login Again
                </Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.title')}
          </DialogTitle>
          <DialogDescription>
            {t('profile.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${user?.role === 'doctor' ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password
            </TabsTrigger>
            {user?.role === 'doctor' && (
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            )}
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto">
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.information')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* View Mode - Display user info with edit button */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">{t('profile.user.details')}</h3>
                      <Button
                        onClick={() => setActiveTab("edit")}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {t('profile.edit.profile')}
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.fullname')}</Label>
                          <p className="text-sm">{user.name || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.username')}</Label>
                          <p className="text-sm">{user.username}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.email')}</Label>
                          <p className="text-sm">{user.email || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.phone')}</Label>
                          <p className="text-sm">{user.phone || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.role')}</Label>
                          <p className="text-sm capitalize">{user.role}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.clinic.name')}</Label>
                          <p className="text-sm">{user.clinicName || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.clinic.location')}</Label>
                          <p className="text-sm">{user.clinicLocation || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.degree')}</Label>
                          <p className="text-sm">{user.degree || t('profile.not.provided')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">{t('profile.specialization')}</Label>
                          <p className="text-sm">{user.specialist || t('profile.not.provided')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Dr. John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username (Read-only)</Label>
                        <Input
                          id="username"
                          value={user.username}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="doctor@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clinicName">Clinic Name</Label>
                        <Input
                          id="clinicName"
                          value={profileData.clinicName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, clinicName: e.target.value }))}
                          placeholder="Your Clinic Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clinicLocation">Clinic Location</Label>
                        <Input
                          id="clinicLocation"
                          value={profileData.clinicLocation}
                          onChange={(e) => setProfileData(prev => ({ ...prev, clinicLocation: e.target.value }))}
                          placeholder="City, State"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="degree">Degree</Label>
                        <Input
                          id="degree"
                          value={profileData.degree}
                          onChange={(e) => setProfileData(prev => ({ ...prev, degree: e.target.value }))}
                          placeholder="BHMS, MD"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialist">Specialization</Label>
                        <Input
                          id="specialist"
                          value={profileData.specialist}
                          onChange={(e) => setProfileData(prev => ({ ...prev, specialist: e.target.value }))}
                          placeholder="General Homeopathy"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("profile")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('password.change')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t('password.current')}</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder={t('password.current.placeholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('password.new')}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder={t('password.new.placeholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder={t('password.confirm.placeholder')}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? t('profile.updating') : t('password.update')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {user?.role === 'doctor' && (
              <TabsContent value="whatsapp" className="space-y-4">
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Appointment Booking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsappPhone">WhatsApp Phone Number</Label>
                      <Input
                        id="whatsappPhone"
                        type="tel"
                        value={whatsappData.whatsappPhone}
                        onChange={(e) => setWhatsappData(prev => ({ ...prev, whatsappPhone: e.target.value }))}
                        placeholder="+8801XXXXXXXXX"
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter your WhatsApp number with country code (e.g., +8801712345678)
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="whatsappEnabled"
                        checked={whatsappData.whatsappEnabled}
                        onChange={(e) => setWhatsappData(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="whatsappEnabled">Enable WhatsApp Appointment Booking</Label>
                    </div>
                    
                    {whatsappData.whatsappEnabled && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">How WhatsApp Booking Works:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Patients can text your WhatsApp number to book appointments</li>
                          <li>• They need to provide: Name, Age, Gender, and Location</li>
                          <li>• System automatically finds available slots based on your schedule</li>
                          <li>• Patient receives appointment ID, date, and time confirmation</li>
                          <li>• New appointments appear in your dashboard</li>
                        </ul>
                        {whatsappData.whatsappPhone && (
                          <p className="mt-3 text-sm font-medium text-blue-900">
                            Your booking link: <code className="bg-white px-2 py-1 rounded">
                              https://wa.me/{whatsappData.whatsappPhone.replace(/[^\d]/g, '')}?text=I%20want%20to%20book%20an%20appointment
                            </code>
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updateWhatsAppMutation.isPending}
                    >
                      {updateWhatsAppMutation.isPending ? 'Updating...' : 'Save WhatsApp Settings'}
                    </Button>
                  </form>
                </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Medicine Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSettingsUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="globalLowStockThreshold">Global Low Stock Threshold</Label>
                      <Input
                        id="globalLowStockThreshold"
                        type="number"
                        min="1"
                        max="100"
                        value={settingsData.globalLowStockThreshold}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, globalLowStockThreshold: parseInt(e.target.value) || 10 }))}
                        placeholder="10"
                      />
                      <p className="text-sm text-muted-foreground">
                        Set the default low stock alert threshold for all medicines. This will be applied to all medicines unless individually customized.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="flex-1"
                      >
                        {updateSettingsMutation.isPending ? "Updating..." : "Update Settings"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('language.settings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language-select">{t('language.select')}</Label>
                      <p className="text-sm text-muted-foreground">{t('language.description')}</p>
                      <Select 
                        value={selectedLanguage} 
                        onValueChange={(value: 'en' | 'bn') => setSelectedLanguage(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('language.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{t('language.english')}</SelectItem>
                          <SelectItem value="bn">{t('language.bengali')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={() => {
                        setLanguage(selectedLanguage);
                        toast({
                          title: t('common.success'),
                          description: `Language changed to ${selectedLanguage === 'en' ? 'English' : 'Bengali'}`,
                        });
                      }}
                      className="w-full"
                    >
                      {t('language.save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('account.actions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">{t('account.information')}</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><strong>{t('account.name')}:</strong> {user.name}</p>
                      <p><strong>{t('account.username')}:</strong> {user.username}</p>
                      <p><strong>{t('account.role')}:</strong> {user.role}</p>
                      <p><strong>{t('account.email')}:</strong> {user.email || t('profile.not.provided')}</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleLogout}
                    variant="destructive" 
                    className="w-full flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}