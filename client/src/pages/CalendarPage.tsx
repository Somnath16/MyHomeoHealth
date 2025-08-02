import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import MobileCalendar from "@/components/mobile/MobileCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CalendarPageProps {
  user: any;
}

export default function CalendarPage({ user }: CalendarPageProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [patientType, setPatientType] = useState<"existing" | "new">("existing");
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    age: "",
    location: "",
    gender: "",
    phone: ""
  });
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ["/api/patients"],
  });

  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await apiRequest("POST", "/api/patients", patientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      setSelectedSlot(null);
      setSelectedPatient("");
      setNewPatientData({ name: "", age: "", location: "", gender: "", phone: "" });
      setPatientSearchQuery("");
      setPatientType("existing");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  const handleSlotSelect = (date: Date, time: string) => {
    setSelectedSlot({ date, time });
  };

  const handleAppointmentClick = (appointment: any) => {
    // Navigate to appointment details or patient profile
    console.log("Appointment clicked:", appointment);
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    let patientId = selectedPatient;

    // If booking for a new patient, create the patient first
    if (patientType === "new") {
      if (!newPatientData.name || !newPatientData.age || !newPatientData.gender) {
        toast({
          title: "Error",
          description: "Please fill in all required fields for the new patient",
          variant: "destructive",
        });
        return;
      }

      try {
        const newPatient = await createPatientMutation.mutateAsync({
          name: newPatientData.name,
          age: parseInt(newPatientData.age),
          gender: newPatientData.gender,
          location: newPatientData.location,
          phone: newPatientData.phone,
          doctorId: user.id,
        });
        patientId = newPatient.id;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create new patient",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!selectedPatient) {
        toast({
          title: "Error",
          description: "Please select a patient",
          variant: "destructive",
        });
        return;
      }
    }

    const [time, period] = selectedSlot.time.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    const dateTime = new Date(selectedSlot.date);
    dateTime.setHours(hour24, parseInt(minutes), 0, 0);
    
    createAppointmentMutation.mutate({
      patientId: patientId,
      dateTime: dateTime.toISOString(),
      status: "upcoming",
      notes: "",
    });
  };

  // Filter patients based on search query
  const filteredPatients = (patients as any[]).filter((patient: any) =>
    patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  if (isLoadingAppointments || isLoadingPatients) {
    return (
      <div className="p-4">
        <div className="animate-pulse bg-white rounded-xl shadow-sm border border-neutral-200 h-96"></div>
      </div>
    );
  }

  const enrichedAppointments = (appointments as any[]).map((appointment: any) => {
    const patient = (patients as any[]).find((p: any) => p.id === appointment.patientId);
    return {
      ...appointment,
      patientName: patient?.name || 'Unknown Patient',
      patientId: patient?.patientId || 'N/A',
    };
  });

  return (
    <div className="pb-20">
      <MobileCalendar
        appointments={enrichedAppointments}
        onSlotSelect={handleSlotSelect}
        onAppointmentClick={handleAppointmentClick}
        user={user}
      />

      {/* Appointment Booking Modal */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600 mb-2">Selected Time:</p>
              <p className="font-medium">
                {selectedSlot && format(selectedSlot.date, 'EEEE, MMMM d, yyyy')} at {selectedSlot?.time}
              </p>
            </div>

            <Tabs value={patientType} onValueChange={(value) => setPatientType(value as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Patient</TabsTrigger>
                <TabsTrigger value="new">New Patient</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-3">
                <div>
                  <Label htmlFor="patient-search" className="text-sm font-medium">
                    Search Patient
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="patient-search"
                      type="text"
                      placeholder="Search by name or ID..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Select Patient</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPatients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} ({patient.patientId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="new" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="patient-name" className="text-sm font-medium">
                      Name *
                    </Label>
                    <Input
                      id="patient-name"
                      type="text"
                      value={newPatientData.name}
                      onChange={(e) => setNewPatientData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Patient name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patient-age" className="text-sm font-medium">
                      Age *
                    </Label>
                    <Input
                      id="patient-age"
                      type="number"
                      value={newPatientData.age}
                      onChange={(e) => setNewPatientData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="Age"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="patient-gender" className="text-sm font-medium">
                    Gender *
                  </Label>
                  <Select 
                    value={newPatientData.gender} 
                    onValueChange={(value) => setNewPatientData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="patient-location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="patient-location"
                    type="text"
                    value={newPatientData.location}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Patient location"
                  />
                </div>
                
                <div>
                  <Label htmlFor="patient-phone" className="text-sm font-medium">
                    Phone
                  </Label>
                  <Input
                    id="patient-phone"
                    type="tel"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedSlot(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleBookAppointment}
                disabled={
                  (patientType === "existing" && !selectedPatient) ||
                  (patientType === "new" && (!newPatientData.name || !newPatientData.age || !newPatientData.gender)) ||
                  createAppointmentMutation.isPending ||
                  createPatientMutation.isPending
                }
              >
                {(createAppointmentMutation.isPending || createPatientMutation.isPending) 
                  ? "Booking..." 
                  : "Book Appointment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
