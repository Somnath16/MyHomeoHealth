import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Calendar, Clock, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppointmentsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function AppointmentsPage({ user, onNavigate }: AppointmentsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, translateData } = useLanguage();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/appointments/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive",
      });
    },
  });

  // Enrich appointments with patient data
  const enrichedAppointments = appointments.map((appointment: any) => {
    const patient = patients.find((p: any) => p.id === appointment.patientId);
    return {
      ...appointment,
      patientName: patient?.name || 'Unknown Patient',
      patientPhone: patient?.phone || '',
      patientAge: patient?.age || '',
      patientGender: patient?.gender || '',
      patientId: patient?.patientId || 'N/A',
    };
  });

  // Filter appointments
  const filteredAppointments = enrichedAppointments.filter((appointment: any) => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.appointmentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group appointments by status
  const upcomingAppointments = filteredAppointments.filter((apt: any) => apt.status === "upcoming");
  const completedAppointments = filteredAppointments.filter((apt: any) => apt.status === "completed");
  const cancelledAppointments = filteredAppointments.filter((apt: any) => apt.status === "cancelled");

  const handleStatusUpdate = (appointmentId: string, newStatus: string) => {
    updateAppointmentMutation.mutate({
      id: appointmentId,
      updates: { status: newStatus }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-orange-100 text-orange-600';
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: any }) => (
    <Card className="shadow-sm border border-neutral-200 card-hover">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {appointment.patientName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-neutral-800">{appointment.patientName}</h3>
              <p className="text-sm text-neutral-500">
                {appointment.patientGender}, {appointment.patientAge} • {appointment.patientId}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-700">
              {format(parseISO(appointment.dateTime), 'h:mm a')}
            </p>
            <p className="text-xs text-neutral-500">
              {format(parseISO(appointment.dateTime), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
            {getStatusIcon(appointment.status)}
            <span className="capitalize">{appointment.status}</span>
          </span>
          <span className="text-xs text-neutral-500">ID: {appointment.appointmentId}</span>
        </div>
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 touch-target"
            onClick={() => setSelectedAppointment(appointment)}
          >
            <Eye className="h-4 w-4 mr-1" />
{t('view.details')}
          </Button>
          {appointment.status === 'upcoming' && (
            <Button
              size="sm"
              className="flex-1 touch-target"
              onClick={() => handleStatusUpdate(appointment.id, 'completed')}
              disabled={updateAppointmentMutation.isPending}
            >
              {t('mark.complete')}
            </Button>
          )}
          {user?.canDeletePatients && (
            <Button
              size="sm"
              variant="destructive"
              className="touch-target"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete this appointment? This action cannot be undone.`)) {
                  deleteAppointmentMutation.mutate(appointment.id);
                }
              }}
              disabled={deleteAppointmentMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 pb-20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-16 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-neutral-800">{t('appointments.title')}</h1>
          <Button
            size="sm"
            className="touch-target"
            onClick={() => onNavigate('calendar')}
          >
            <Plus className="h-4 w-4 mr-2" />
{t('appointments.book')}
          </Button>
        </div>
        
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
            <Input
              placeholder={t('appointments.search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 form-input"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('filter.by.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('appointments.all')}</SelectItem>
              <SelectItem value="upcoming">{t('appointments.upcoming')}</SelectItem>
              <SelectItem value="completed">{t('appointments.completed')}</SelectItem>
              <SelectItem value="cancelled">{t('appointments.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="p-4">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({filteredAppointments.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="completed">Done ({completedAppointments.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelledAppointments.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <Card className="shadow-sm border border-neutral-200">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">{t('no.data.found')}</h3>
                  <p className="text-neutral-500 mb-4">
{searchTerm ? t('try.different.search') : t('no.appointments.scheduled')}
                  </p>
                  <Button onClick={() => onNavigate('calendar')}>
                    <Plus className="h-4 w-4 mr-2" />
{t('appointments.book')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments
                .sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <Card className="shadow-sm border border-neutral-200">
                <CardContent className="p-8 text-center">
                  <Clock className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No upcoming appointments</h3>
                  <p className="text-neutral-500">All caught up!</p>
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments
                .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-3">
            {completedAppointments.length === 0 ? (
              <Card className="shadow-sm border border-neutral-200">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No completed appointments</h3>
                  <p className="text-neutral-500">Completed appointments will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedAppointments
                .sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
            )}
          </TabsContent>
          
          <TabsContent value="cancelled" className="space-y-3">
            {cancelledAppointments.length === 0 ? (
              <Card className="shadow-sm border border-neutral-200">
                <CardContent className="p-8 text-center">
                  <XCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No cancelled appointments</h3>
                  <p className="text-neutral-500">Cancelled appointments will appear here</p>
                </CardContent>
              </Card>
            ) : (
              cancelledAppointments
                .sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg">
                    {selectedAppointment.patientName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedAppointment.patientName}</h3>
                  <p className="text-neutral-600">Patient ID: {selectedAppointment.patientId}</p>
                  <p className="text-sm text-neutral-500">
                    {selectedAppointment.patientGender}, {selectedAppointment.patientAge} years
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-700">Appointment ID:</span>
                  <p>{selectedAppointment.appointmentId}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Status:</span>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {getStatusIcon(selectedAppointment.status)}
                    <span className="capitalize">{selectedAppointment.status}</span>
                  </span>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Date:</span>
                  <p>{format(parseISO(selectedAppointment.dateTime), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Time:</span>
                  <p>{format(parseISO(selectedAppointment.dateTime), 'h:mm a')}</p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span className="font-medium text-neutral-700">Notes:</span>
                  <p className="text-sm mt-1">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </Button>
                {selectedAppointment.status === 'upcoming' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedAppointment.id, 'completed');
                      setSelectedAppointment(null);
                    }}
                    disabled={updateAppointmentMutation.isPending}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
