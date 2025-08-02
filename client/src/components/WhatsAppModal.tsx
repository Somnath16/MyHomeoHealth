import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function WhatsAppModal({ isOpen, onClose, user }: WhatsAppModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [whatsappData, setWhatsappData] = useState({
    whatsappPhone: user?.whatsappPhone || '',
    whatsappEnabled: user?.whatsappEnabled || false,
  });

  // Update WhatsApp settings mutation
  const updateWhatsAppMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/users/${user?.id}/whatsapp`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Success',
        description: 'WhatsApp settings updated successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update WhatsApp settings',
        variant: 'destructive',
      });
    },
  });

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setWhatsappData({
        whatsappPhone: user.whatsappPhone || '',
        whatsappEnabled: user.whatsappEnabled || false,
      });
    }
  }, [user]);

  const handleWhatsAppUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppMutation.mutate(whatsappData);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Appointment Booking
          </DialogTitle>
          <DialogDescription>
            Configure WhatsApp booking settings for your patients
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <Card>
            <CardContent className="pt-6">
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
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={updateWhatsAppMutation.isPending}
                  >
                    {updateWhatsAppMutation.isPending ? 'Updating...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}