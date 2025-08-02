import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Clock, Calendar, ArrowLeft } from "lucide-react";

interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  slotDuration: number;
}

interface DoctorSettingsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", shortLabel: "Sun" },
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
];

export default function DoctorSettingsPage({ user, onNavigate }: DoctorSettingsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [daySettings, setDaySettings] = useState<Record<number, Partial<DoctorAvailability>>>({});

  // Fetch doctor availability
  const { data: availability = [], isLoading } = useQuery({
    queryKey: ["/api/doctor/availability"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/doctor/availability");
      return response.json();
    },
  });

  // Initialize day settings from availability data
  useEffect(() => {
    const settings: Record<number, Partial<DoctorAvailability>> = {};
    DAYS_OF_WEEK.forEach(day => {
      const existingAvailability = availability.find((a: DoctorAvailability) => a.dayOfWeek === day.value);
      settings[day.value] = existingAvailability || {
        dayOfWeek: day.value,
        isAvailable: false,
        startTime: "09:00",
        endTime: "19:00",
        lunchBreakStart: "13:00",
        lunchBreakEnd: "14:00",
        slotDuration: 20,
      };
    });
    setDaySettings(settings);
  }, [availability]);

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (availabilityData: Partial<DoctorAvailability>) => {
      const response = await apiRequest("POST", "/api/doctor/availability", availabilityData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
      setEditingDay(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    },
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      const response = await apiRequest("DELETE", `/api/doctor/availability/${dayOfWeek}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
      toast({
        title: "Success",
        description: "Day availability removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove availability",
        variant: "destructive",
      });
    },
  });

  const handleToggleAvailability = (dayOfWeek: number, isAvailable: boolean) => {
    const updatedSettings = { ...daySettings[dayOfWeek], isAvailable };
    setDaySettings(prev => ({ ...prev, [dayOfWeek]: updatedSettings }));
    
    if (isAvailable) {
      updateAvailabilityMutation.mutate(updatedSettings);
    } else {
      deleteAvailabilityMutation.mutate(dayOfWeek);
    }
  };

  const handleUpdateDaySettings = (dayOfWeek: number, field: string, value: string | number) => {
    setDaySettings(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value }
    }));
  };

  const handleSaveDaySettings = (dayOfWeek: number) => {
    const settings = daySettings[dayOfWeek];
    if (settings) {
      updateAvailabilityMutation.mutate(settings);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading availability settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-neutral-200 p-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("dashboard")}
          className="mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <Settings className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-neutral-800">Availability Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Header Info */}
        <Card className="shadow-sm border border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              Set Your Available Days & Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              Configure when patients can book appointments with you. Set your working hours, 
              lunch breaks, and appointment duration for each day of the week.
            </p>
          </CardContent>
        </Card>

        {/* Days Configuration */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const settings = daySettings[day.value];
            const isEditing = editingDay === day.value;

            return (
              <Card key={day.value} className="shadow-sm border border-neutral-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-neutral-800 mr-3">{day.label}</h3>
                      <Switch
                        checked={settings?.isAvailable || false}
                        onCheckedChange={(checked) => handleToggleAvailability(day.value, checked)}
                        disabled={updateAvailabilityMutation.isPending || deleteAvailabilityMutation.isPending}
                      />
                    </div>
                    {settings?.isAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingDay(isEditing ? null : day.value)}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        {isEditing ? "Cancel" : "Edit Times"}
                      </Button>
                    )}
                  </div>

                  {settings?.isAvailable && (
                    <div className="space-y-4">
                      {!isEditing ? (
                        // Display mode
                        <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                          <div>
                            <strong>Working Hours:</strong><br />
                            {settings.startTime} - {settings.endTime}
                          </div>
                          <div>
                            <strong>Lunch Break:</strong><br />
                            {settings.lunchBreakStart} - {settings.lunchBreakEnd}
                          </div>
                          <div className="col-span-2">
                            <strong>Appointment Duration:</strong> {settings.slotDuration} minutes
                          </div>
                        </div>
                      ) : (
                        // Edit mode
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Start Time</Label>
                              <Input
                                type="time"
                                value={settings.startTime || "09:00"}
                                onChange={(e) => handleUpdateDaySettings(day.value, "startTime", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">End Time</Label>
                              <Input
                                type="time"
                                value={settings.endTime || "19:00"}
                                onChange={(e) => handleUpdateDaySettings(day.value, "endTime", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Lunch Break Start</Label>
                              <Input
                                type="time"
                                value={settings.lunchBreakStart || "13:00"}
                                onChange={(e) => handleUpdateDaySettings(day.value, "lunchBreakStart", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Lunch Break End</Label>
                              <Input
                                type="time"
                                value={settings.lunchBreakEnd || "14:00"}
                                onChange={(e) => handleUpdateDaySettings(day.value, "lunchBreakEnd", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Appointment Duration (minutes)</Label>
                            <Input
                              type="number"
                              value={settings.slotDuration || 20}
                              onChange={(e) => handleUpdateDaySettings(day.value, "slotDuration", parseInt(e.target.value))}
                              min="10"
                              max="60"
                              step="5"
                            />
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleSaveDaySettings(day.value)}
                              disabled={updateAvailabilityMutation.isPending}
                              className="flex-1"
                            >
                              {updateAvailabilityMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingDay(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instructions */}
        <Card className="shadow-sm border border-neutral-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Toggle days on/off to set when you're available for appointments</li>
              <li>• Set working hours, lunch breaks, and appointment duration for each day</li>
              <li>• Patients will only see available time slots based on your settings</li>
              <li>• Changes take effect immediately for new bookings</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}