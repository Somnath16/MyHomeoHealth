import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Stethoscope, Pill, Calendar, Edit, Trash2, Plus, Bot, FileImage } from "lucide-react";
import AdminTemplateManagement from "@/components/AdminTemplateManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const doctorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  clinicName: z.string().optional(),
  clinicLocation: z.string().optional(),
  degree: z.string().optional(),
  specialist: z.string().optional(),
});

type DoctorFormData = z.infer<typeof doctorFormSchema>;

// Admin form schema removed - now handled elsewhere

const medicineFormSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  code: z.string().min(1, "Medicine code is required"),
  description: z.string().optional(),
  power: z.string().optional(),
  dosage: z.string().optional(),
  symptoms: z.string().optional(),
});

type MedicineFormData = z.infer<typeof medicineFormSchema>;

export default function AdminDashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);

  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stats API response:', data);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch all doctors
  const { data: doctorsData, isLoading: isLoadingDoctors, error: doctorsError, refetch: refetchDoctors } = useQuery({
    queryKey: ['/api/admin/doctors'],
    queryFn: async () => {
      const response = await fetch('/api/admin/doctors', {
        method: 'GET',
        credentials: 'include', // Important: include cookies for session
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });
  
  // Ensure doctors is always an array
  const doctors = Array.isArray(doctorsData) ? doctorsData : [];
  
  // Debug logging (can be removed in production)
  // console.log('Doctors data:', { doctorsData, doctors, isLoadingDoctors, doctorsError });
  
  // Force refetch on mount
  useEffect(() => {
    refetchDoctors();
  }, [refetchDoctors]);

  // Fetch all medicines
  const { data: medicinesData, isLoading: isLoadingMedicines, error: medicinesError } = useQuery({
    queryKey: ['/api/medicines'],
  });
  
  // Ensure medicines is always an array
  const medicines = Array.isArray(medicinesData) ? medicinesData : [];

  // Fetch all patients
  const { data: patientsData, isLoading: isLoadingPatients, error: patientsError } = useQuery({
    queryKey: ['/api/admin/patients'],
    queryFn: () => apiRequest('GET', '/api/admin/patients'),
  });
  
  // Ensure patients is always an array
  const patients = Array.isArray(patientsData) ? patientsData : [];

  // Fetch all admin users
  const { data: adminsData, isLoading: isLoadingAdmins, error: adminsError } = useQuery({
    queryKey: ['/api/admin/admins'],
    queryFn: () => apiRequest('GET', '/api/admin/admins'),
  });
  
  // Ensure admins is always an array
  const admins = Array.isArray(adminsData) ? adminsData : [];

  const doctorForm = useForm<DoctorFormData>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      email: "",
      phone: "",
      clinicName: "",
      clinicLocation: "",
      degree: "",
      specialist: "",
    },
  });

  const medicineForm = useForm<MedicineFormData>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      power: "",
      dosage: "",
      symptoms: "",
    },
  });

  // Admin form removed - editing handled via inline interface

  // Admin creation removed - handled via separate admin management interface

  // Admin update functionality simplified for inline editing

  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Success",
        description: "Admin user deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive",
      });
    },
  });

  const addDoctorMutation = useMutation({
    mutationFn: (data: DoctorFormData) => apiRequest('POST', '/api/admin/doctors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowAddDoctorModal(false);
      doctorForm.reset();
      toast({
        title: "Success",
        description: "Doctor added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add doctor",
        variant: "destructive",
      });
    },
  });

  const updateDoctorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DoctorFormData> }) => 
      apiRequest('PATCH', `/api/admin/doctors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      setEditingDoctor(null);
      toast({
        title: "Success",
        description: "Doctor updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update doctor",
        variant: "destructive",
      });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/doctors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete doctor",
        variant: "destructive",
      });
    },
  });

  const toggleAIFeatureMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      apiRequest('PATCH', `/api/admin/doctors/${id}/ai-feature`, { aiFeatureEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      toast({
        title: "Success",
        description: "AI feature setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI feature setting",
        variant: "destructive",
      });
    },
  });

  const toggleDeletePermissionMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      apiRequest('PATCH', `/api/admin/doctors/${id}/delete-permission`, { canDeletePatients: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      toast({
        title: "Success",
        description: "Delete permission updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update delete permission",
        variant: "destructive",
      });
    },
  });

  const addMedicineMutation = useMutation({
    mutationFn: (data: MedicineFormData) => apiRequest('POST', '/api/medicines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowAddMedicineModal(false);
      medicineForm.reset();
      toast({
        title: "Success",
        description: "Medicine added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add medicine",
        variant: "destructive",
      });
    },
  });

  const updateMedicineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MedicineFormData> }) => 
      apiRequest('PATCH', `/api/medicines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] });
      setEditingMedicine(null);
      toast({
        title: "Success",
        description: "Medicine updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update medicine",
        variant: "destructive",
      });
    },
  });

  const deleteMedicineMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/medicines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Success",
        description: "Medicine deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete medicine",
        variant: "destructive",
      });
    },
  });

  const onSubmitDoctor = (data: DoctorFormData) => {
    if (editingDoctor) {
      updateDoctorMutation.mutate({ id: editingDoctor.id, data });
    } else {
      // Add role as doctor for new users
      addDoctorMutation.mutate({ ...data, role: 'doctor' } as any);
    }
  };

  const onSubmitMedicine = (data: MedicineFormData) => {
    if (editingMedicine) {
      updateMedicineMutation.mutate({ id: editingMedicine.id, data });
    } else {
      addMedicineMutation.mutate(data);
    }
  };

  // Admin form submission removed - now handled via profile menu

  const handleEditDoctor = (doctor: any) => {
    setEditingDoctor(doctor);
    doctorForm.reset({
      name: doctor.name,
      username: doctor.username,
      password: "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      clinicName: doctor.clinicName || "",
      clinicLocation: doctor.clinicLocation || "",
      degree: doctor.degree || "",
      specialist: doctor.specialist || "",
    });
    setShowAddDoctorModal(true);
  };

  const handleEditMedicine = (medicine: any) => {
    setEditingMedicine(medicine);
    medicineForm.reset({
      name: medicine.name,
      code: medicine.code,
      description: medicine.description || "",
      power: medicine.power || "",
      dosage: medicine.dosage || "",
      symptoms: medicine.symptoms || "",
    });
    setShowAddMedicineModal(true);
  };

  const handleDeleteDoctor = (doctor: any) => {
    if (window.confirm(`Are you sure you want to delete Dr. ${doctor.name}? This will also delete all their patients and prescriptions.`)) {
      deleteDoctorMutation.mutate(doctor.id);
    }
  };

  const handleDeleteMedicine = (medicine: any) => {
    if (window.confirm(`Are you sure you want to delete ${medicine.name}?`)) {
      deleteMedicineMutation.mutate(medicine.id);
    }
  };

  // Admin editing simplified - no longer uses modal

  const handleDeleteAdmin = (admin: any) => {
    if (window.confirm(`Are you sure you want to delete admin user ${admin.name}? This action cannot be undone.`)) {
      deleteAdminMutation.mutate(admin.id);
    }
  };

  // Loading state
  const isLoading = isLoadingDoctors || isLoadingMedicines || isLoadingPatients || isLoadingAdmins;

  // Error handling
  if (doctorsError || medicinesError || patientsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading admin data</h2>
          <p className="text-muted-foreground mb-4">
            {doctorsError?.message || medicinesError?.message || patientsError?.message || 'Unknown error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className={`${isMobile ? 'p-4 pb-20' : 'p-6'} space-y-6`}>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={`${isMobile ? 'p-4 pb-20' : 'p-6'} space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your clinic operations</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.doctorsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Active medical professionals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.patientsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Registered patients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.medicinesCount || 0}</div>
              <p className="text-xs text-muted-foreground">Available medicines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.appointmentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled appointments</p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments by Doctor */}
        {(stats as any)?.appointmentsByDoctor && (stats as any).appointmentsByDoctor.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Appointments by Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(stats as any).appointmentsByDoctor.map((item: any) => (
                  <div key={item.doctorName} className="flex items-center justify-between">
                    <span className="font-medium">{item.doctorName}</span>
                    <Badge variant="outline">{item.count} appointments</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Management Tabs */}
        <Tabs defaultValue="doctors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="medicines">Medicines</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Doctors Management</h2>
              <Dialog open={showAddDoctorModal} onOpenChange={setShowAddDoctorModal}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingDoctor(null);
                      doctorForm.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Doctor
                  </Button>
                </DialogTrigger>
                <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[85vh] overflow-y-auto' : 'max-w-2xl'}`}>
                  <DialogHeader>
                    <DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
                    <DialogDescription>
                      {editingDoctor ? 'Update doctor information' : 'Create a new doctor account'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className={`${isMobile ? 'max-h-[65vh] overflow-y-auto' : ''}`}>
                    <Form {...doctorForm}>
                      <form onSubmit={doctorForm.handleSubmit(onSubmitDoctor)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={doctorForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Dr. John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={doctorForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={doctorForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={doctorForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="doctor@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={doctorForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={doctorForm.control}
                          name="clinicName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Name (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Medical Center" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={doctorForm.control}
                          name="clinicLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Location (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="City, State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={doctorForm.control}
                          name="degree"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Degree (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="BHMS, MD" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={doctorForm.control}
                          name="specialist"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialization (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Homeopathic Specialist" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDoctorModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addDoctorMutation.isPending || updateDoctorMutation.isPending}
                        >
                          {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {isLoadingDoctors ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading doctors data...
                </div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No doctors found. Add your first doctor using the button above.
                </div>
              ) : (
                doctors.map((doctor: any) => (
                  <Card key={doctor.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{doctor.name}</h3>
                          <p className="text-sm text-muted-foreground">@{doctor.username}</p>
                          {doctor.specialist && (
                            <p className="text-sm text-muted-foreground">{doctor.specialist}</p>
                          )}
                          {doctor.clinicName && (
                            <p className="text-sm text-muted-foreground">{doctor.clinicName}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col space-y-2">
                            <Badge variant={doctor.isActive ? "default" : "secondary"}>
                              {doctor.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <div className="flex items-center space-x-2">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                              <Switch
                                checked={doctor.aiFeatureEnabled !== false}
                                onCheckedChange={(enabled) => 
                                  toggleAIFeatureMutation.mutate({ id: doctor.id, enabled })
                                }
                                disabled={toggleAIFeatureMutation.isPending}
                              />
                              <span className="text-xs text-muted-foreground">
                                AI {doctor.aiFeatureEnabled !== false ? "On" : "Off"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                              <Switch
                                checked={doctor.canDeletePatients !== false}
                                onCheckedChange={(enabled) => 
                                  toggleDeletePermissionMutation.mutate({ id: doctor.id, enabled })
                                }
                                disabled={toggleDeletePermissionMutation.isPending}
                              />
                              <span className="text-xs text-muted-foreground">
                                Delete {doctor.canDeletePatients !== false ? "On" : "Off"}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDoctor(doctor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDoctor(doctor)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Medicines Tab */}
          <TabsContent value="medicines" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Medicines Management</h2>
              <Dialog open={showAddMedicineModal} onOpenChange={setShowAddMedicineModal}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingMedicine(null);
                      medicineForm.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medicine
                  </Button>
                </DialogTrigger>
                <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[85vh] overflow-y-auto' : 'max-w-2xl'}`}>
                  <DialogHeader>
                    <DialogTitle>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
                    <DialogDescription>
                      {editingMedicine ? 'Update medicine information' : 'Add a new medicine to the database'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className={`${isMobile ? 'max-h-[65vh] overflow-y-auto' : ''}`}>
                    <Form {...medicineForm}>
                      <form onSubmit={medicineForm.handleSubmit(onSubmitMedicine)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={medicineForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medicine Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Arnica Montana" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={medicineForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medicine Code</FormLabel>
                              <FormControl>
                                <Input placeholder="ARN" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={medicineForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Medicine description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={medicineForm.control}
                          name="power"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Power (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="30, 200, 1M" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={medicineForm.control}
                          name="dosage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dosage (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="3 times daily" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={medicineForm.control}
                        name="symptoms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symptoms (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Fever, headache, body pain" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddMedicineModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addMedicineMutation.isPending || updateMedicineMutation.isPending}
                        >
                          {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {isLoadingMedicines ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading medicines data...
                </div>
              ) : !medicines || medicines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No medicines found. Add your first medicine using the button above.
                </div>
              ) : (
                medicines.map((medicine: any) => (
                <Card key={medicine.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{medicine.name}</h3>
                        <p className="text-sm text-muted-foreground">Code: {medicine.code}</p>
                        {medicine.power && (
                          <p className="text-sm text-muted-foreground">Power: {medicine.power}</p>
                        )}
                        {medicine.symptoms && (
                          <p className="text-sm text-muted-foreground">For: {medicine.symptoms}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMedicine(medicine)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMedicine(medicine)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Patients Management</h2>
            </div>

            <div className="grid gap-4">
              {isLoadingPatients ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading patients data...
                </div>
              ) : !patients || patients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No patients found.
                </div>
              ) : (
                patients.map((patient: any) => (
                <Card key={patient.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.age} years, {patient.gender}
                        </p>
                        <p className="text-sm text-muted-foreground">Phone: {patient.phone}</p>
                        {patient.doctorName && (
                          <p className="text-sm text-muted-foreground">Doctor: {patient.doctorName}</p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {patient.prescriptionCount || 0} prescriptions
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Admin Users Tab */}
          <TabsContent value="admins" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Admin Users Management</h2>
              <div className="text-sm text-muted-foreground">
                Manage system administrators (Note: Main 'admin' user cannot be deleted)
              </div>
            </div>

            <div className="grid gap-4">
              {isLoadingAdmins ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading admin users...
                </div>
              ) : !admins || admins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No admin users found.
                </div>
              ) : (
                admins.map((admin: any) => (
                <Card key={admin.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{admin.name}</h3>
                        <p className="text-sm text-muted-foreground">Username: {admin.username}</p>
                        {admin.email && (
                          <p className="text-sm text-muted-foreground">Email: {admin.email}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(admin.createdAt).toLocaleDateString()}
                        </p>
                        <Badge variant={admin.isActive ? "default" : "secondary"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // Simple inline editing could be added here
                            toast({
                              title: "Info",
                              description: "Admin editing functionality moved to dedicated interface",
                            });
                          }}
                          title="Admin details (read-only)"
                          disabled
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {admin.username !== 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAdmin(admin)}
                            className="text-destructive hover:text-destructive"
                            title="Delete admin user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <AdminTemplateManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}