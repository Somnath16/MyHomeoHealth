import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart3, Users, UserPlus, Pill, Calendar, FileText, Eye, Edit, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function AdminPage({ user, onNavigate }: AdminPageProps) {
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    clinicName: "",
    clinicNameBengali: "",
    clinicLocation: "",
    clinicLocationBengali: "",
    degree: "",
    degreeBengali: "",
    specialist: "",
    specialistBengali: "",
    extraNotes: "",
    extraNotesBengali: "",
    role: "doctor",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ["/api/users/doctors"],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["/api/prescriptions"],
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ["/api/medicines"],
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (doctorData: any) => {
      const response = await apiRequest("POST", "/api/users", doctorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      toast({
        title: "Success",
        description: isEditing ? "Doctor updated successfully" : "Doctor added successfully",
      });
      setShowAddDoctorModal(false);
      setIsEditing(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update doctor" : "Failed to add doctor",
        variant: "destructive",
      });
    },
  });

  const updateDoctorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      toast({
        title: "Success",
        description: "Doctor updated successfully",
      });
      setSelectedDoctor(null);
      setIsEditing(false);
      setShowAddDoctorModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update doctor",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewDoctor({
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      clinicName: "",
      clinicNameBengali: "",
      clinicLocation: "",
      clinicLocationBengali: "",
      degree: "",
      degreeBengali: "",
      specialist: "",
      specialistBengali: "",
      extraNotes: "",
      extraNotesBengali: "",
      role: "doctor",
    });
  };

  const handleAddDoctor = () => {
    if (!newDoctor.username.trim() || !newDoctor.password.trim() || !newDoctor.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in username, password, and name",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && selectedDoctor) {
      updateDoctorMutation.mutate({
        id: selectedDoctor.id,
        updates: newDoctor
      });
    } else {
      createDoctorMutation.mutate(newDoctor);
    }
  };

  const handleEditDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    setNewDoctor({
      username: doctor.username || "",
      password: "", // Don't pre-fill password for security
      name: doctor.name || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      clinicName: doctor.clinicName || "",
      clinicNameBengali: doctor.clinicNameBengali || "",
      clinicLocation: doctor.clinicLocation || "",
      clinicLocationBengali: doctor.clinicLocationBengali || "",
      degree: doctor.degree || "",
      degreeBengali: doctor.degreeBengali || "",
      specialist: doctor.specialist || "",
      specialistBengali: doctor.specialistBengali || "",
      extraNotes: doctor.extraNotes || "",
      extraNotesBengali: doctor.extraNotesBengali || "",
      role: "doctor",
    });
    setIsEditing(true);
    setShowAddDoctorModal(true);
  };

  const handleDeleteDoctor = (doctor: any) => {
    // In a real implementation, you'd show a confirmation dialog
    // and implement a soft delete or deactivation
    updateDoctorMutation.mutate({
      id: doctor.id,
      updates: { isActive: false }
    });
  };

  // Get doctor-specific statistics
  const getDoctorStats = (doctorId: string) => {
    const doctorPatients = patients.filter((p: any) => p.doctorId === doctorId);
    const doctorAppointments = appointments.filter((a: any) => a.doctorId === doctorId);
    const doctorPrescriptions = prescriptions.filter((p: any) => p.doctorId === doctorId);
    
    return {
      patients: doctorPatients.length,
      appointments: doctorAppointments.length,
      prescriptions: doctorPrescriptions.length,
    };
  };

  const dashboardStats = [
    {
      title: "Total Doctors",
      value: stats?.totalDoctors || 0,
      icon: Users,
      color: "bg-primary bg-opacity-10 text-primary",
    },
    {
      title: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
      color: "bg-secondary bg-opacity-10 text-secondary",
    },
    {
      title: "Total Appointments",
      value: appointments.length,
      icon: Calendar,
      color: "bg-accent bg-opacity-10 text-accent",
    },
    {
      title: "Total Medicines",
      value: stats?.totalMedicines || 0,
      icon: Pill,
      color: "bg-orange-500 bg-opacity-10 text-orange-500",
    },
  ];

  if (isLoadingStats || isLoadingDoctors) {
    return (
      <div className="p-4 space-y-4 pb-20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-16 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-800">Admin Panel</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/admin/settings')}
            className="touch-target"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {dashboardStats.map((stat, index) => {
                const Icon = stat.icon;
                
                return (
                  <Card key={index} className="shadow-sm border border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
                          <p className="text-sm text-neutral-500">{stat.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <Card className="shadow-sm border border-neutral-200">
              <CardHeader>
                <CardTitle className="text-lg">System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Active Doctors</span>
                  <span className="font-semibold">{doctors.filter((d: any) => d.isActive).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Total Prescriptions</span>
                  <span className="font-semibold">{prescriptions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Available Medicines</span>
                  <span className="font-semibold">{medicines.length}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-800">Doctor Management</h2>
              <Button
                size="sm"
                className="touch-target"
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                  setShowAddDoctorModal(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
            </div>

            <div className="space-y-3">
              {doctors.length === 0 ? (
                <Card className="shadow-sm border border-neutral-200">
                  <CardContent className="p-8 text-center">
                    <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-800 mb-2">No doctors registered</h3>
                    <p className="text-neutral-500 mb-4">Add your first doctor to get started</p>
                    <Button onClick={() => setShowAddDoctorModal(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Doctor
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                doctors.map((doctor: any) => {
                  const doctorStats = getDoctorStats(doctor.id);
                  
                  return (
                    <Card key={doctor.id} className="shadow-sm border border-neutral-200 card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                                {doctor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-neutral-800">{doctor.name}</h3>
                              <p className="text-sm text-neutral-500">@{doctor.username}</p>
                              {doctor.specialist && (
                                <p className="text-xs text-neutral-400">{doctor.specialist}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditDoctor(doctor)}
                              className="p-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDoctor(doctor)}
                              className="p-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-semibold text-neutral-800">{doctorStats.patients}</p>
                            <p className="text-neutral-500">Patients</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-neutral-800">{doctorStats.appointments}</p>
                            <p className="text-neutral-500">Appointments</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-neutral-800">{doctorStats.prescriptions}</p>
                            <p className="text-neutral-500">Prescriptions</p>
                          </div>
                        </div>

                        <div className="flex space-x-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 touch-target"
                            onClick={() => setSelectedDoctor(doctor)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
          
          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card className="shadow-sm border border-neutral-200">
              <CardHeader>
                <CardTitle className="text-lg">System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Application Version:</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Database Status:</span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Last Backup:</span>
                    <span className="font-medium">Never</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full touch-target mb-2">
                    Export Data
                  </Button>
                  <Button variant="outline" className="w-full touch-target">
                    System Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Doctor Modal */}
      <Dialog open={showAddDoctorModal} onOpenChange={setShowAddDoctorModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={newDoctor.username}
                  onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
                  placeholder="Username for login"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newDoctor.password}
                  onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                  placeholder={isEditing ? "Leave blank to keep current" : "Password"}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newDoctor.name}
                onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                placeholder="Dr. Full Name"
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  placeholder="email@example.com"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newDoctor.phone}
                  onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  placeholder="Phone number"
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                value={newDoctor.clinicName}
                onChange={(e) => setNewDoctor({ ...newDoctor, clinicName: e.target.value })}
                placeholder="Clinic name in English"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="clinicNameBengali">Clinic Name (Bengali)</Label>
              <Input
                id="clinicNameBengali"
                value={newDoctor.clinicNameBengali}
                onChange={(e) => setNewDoctor({ ...newDoctor, clinicNameBengali: e.target.value })}
                placeholder="ক্লিনিকের নাম বাংলায়"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="clinicLocation">Location</Label>
              <Input
                id="clinicLocation"
                value={newDoctor.clinicLocation}
                onChange={(e) => setNewDoctor({ ...newDoctor, clinicLocation: e.target.value })}
                placeholder="Clinic location in English"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                value={newDoctor.degree}
                onChange={(e) => setNewDoctor({ ...newDoctor, degree: e.target.value })}
                placeholder="e.g., BHMS, MD (Hom)"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="specialist">Specialization</Label>
              <Input
                id="specialist"
                value={newDoctor.specialist}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialist: e.target.value })}
                placeholder="Area of specialization"
                className="form-input"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddDoctorModal(false);
                  setIsEditing(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddDoctor}
                disabled={createDoctorMutation.isPending || updateDoctorMutation.isPending}
              >
                {createDoctorMutation.isPending || updateDoctorMutation.isPending 
                  ? (isEditing ? "Updating..." : "Adding...") 
                  : (isEditing ? "Update Doctor" : "Add Doctor")
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Details Modal */}
      <Dialog open={!!selectedDoctor && !isEditing} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
          </DialogHeader>
          
          {selectedDoctor && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg">
                    {selectedDoctor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedDoctor.name}</h3>
                  <p className="text-neutral-600">@{selectedDoctor.username}</p>
                  {selectedDoctor.degree && (
                    <p className="text-sm text-neutral-500">{selectedDoctor.degree}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedDoctor.email && (
                  <div>
                    <span className="font-medium text-neutral-700">Email:</span>
                    <p>{selectedDoctor.email}</p>
                  </div>
                )}
                {selectedDoctor.phone && (
                  <div>
                    <span className="font-medium text-neutral-700">Phone:</span>
                    <p>{selectedDoctor.phone}</p>
                  </div>
                )}
                {selectedDoctor.clinicName && (
                  <div className="col-span-2">
                    <span className="font-medium text-neutral-700">Clinic:</span>
                    <p>{selectedDoctor.clinicName}</p>
                    {selectedDoctor.clinicLocation && (
                      <p className="text-neutral-500">{selectedDoctor.clinicLocation}</p>
                    )}
                  </div>
                )}
              </div>

              {selectedDoctor.specialist && (
                <div>
                  <span className="font-medium text-neutral-700">Specialization:</span>
                  <p className="text-sm mt-1">{selectedDoctor.specialist}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedDoctor(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleEditDoctor(selectedDoctor)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Doctor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
