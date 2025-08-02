import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Users, Eye, Trash2, Edit, Calendar, MapPin, Phone, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface PatientsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function PatientsPage({ user, onNavigate }: PatientsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const { t, translateData } = useLanguage();
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    location: "",
  });
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["/api/prescriptions"],
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await apiRequest("POST", "/api/patients", patientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient added successfully",
      });
      setShowAddModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const response = await apiRequest("DELETE", `/api/patients/${patientId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Patient deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete patient",
        variant: "destructive",
      });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient updated successfully",
      });
      setShowEditModal(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update patient",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = (patients as any[]).filter((patient: any) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm) ||
    (patient.location && patient.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddPatient = () => {
    if (!newPatient.name.trim() || !newPatient.age || !newPatient.gender || !newPatient.phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const patientData = {
      ...newPatient,
      age: parseInt(newPatient.age),
    };

    if (editingPatient) {
      updatePatientMutation.mutate({ id: editingPatient.id, data: patientData });
    } else {
      createPatientMutation.mutate(patientData);
    }
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient(patient);
    setNewPatient({
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address || "",
      location: patient.location || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setNewPatient({
      name: "",
      age: "",
      gender: "",
      phone: "",
      address: "",
      location: "",
    });
    setEditingPatient(null);
  };

  const getPatientPrescriptions = (patientId: string) => {
    return (prescriptions as any[]).filter((p: any) => p.patientId === patientId);
  };

  const getPatientAppointments = (patientId: string) => {
    return (appointments as any[]).filter((a: any) => a.patientId === patientId);
  };

  const getLastVisitDate = (patient: any) => {
    if (patient.lastVisitDate) {
      return new Date(patient.lastVisitDate);
    }
    
    const patientPrescriptions = getPatientPrescriptions(patient.id);
    const patientAppointments = getPatientAppointments(patient.id);
    
    const allDates = [
      ...patientPrescriptions.map((p: any) => new Date(p.createdAt)),
      ...patientAppointments.filter((a: any) => a.status === 'completed').map((a: any) => new Date(a.dateTime))
    ];
    
    if (allDates.length === 0) return null;
    
    return new Date(Math.max(...allDates.map(d => d.getTime())));
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 pb-20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-neutral-800">{t('patients.title')}</h1>
          <Button
            size="sm"
            className="touch-target"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('patients.add')}
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            placeholder={t('patients.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 form-input"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="p-4">
        {filteredPatients.length === 0 ? (
          <Card className="shadow-sm border border-neutral-200">
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">
                {searchTerm ? t('no.data.found') : t('patients.title')}
              </h3>
              <p className="text-neutral-500 mb-4">
                {searchTerm 
                  ? t('try.different.search') 
                  : t('add.first.item')
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('patients.add')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop View - Hidden on mobile */}
            <div className="hidden md:block">
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-neutral-600">
                    <div className="col-span-3">Patient Name</div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-2">Last Visit</div>
                    <div className="col-span-2">Statistics</div>
                    <div className="col-span-3">Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-neutral-100">
                  {filteredPatients.map((patient: any) => {
                    const patientPrescriptions = getPatientPrescriptions(patient.id);
                    const patientAppointments = getPatientAppointments(patient.id);
                    const lastVisit = getLastVisitDate(patient);
                    
                    return (
                      <div key={patient.id} className="px-6 py-4 hover:bg-neutral-50 transition-colors">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Patient Info */}
                          <div className="col-span-3">
                            <div className="flex items-center space-x-3">
                              <Avatar 
                                className="w-10 h-10 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setLocation(`/patients/${patient.id}`)}
                                title="Click to view patient details"
                              >
                                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm">
                                  {patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 
                                  className="font-semibold text-primary text-sm hover:text-primary/80 cursor-pointer transition-colors underline-offset-2 hover:underline"
                                  onClick={() => setLocation(`/patients/${patient.id}`)}
                                  title="Click to view patient details"
                                >
                                  {translateData(patient.name)}
                                </h3>
                                <p className="text-xs text-neutral-500">
                                  {translateData(patient.gender)}, {patient.age}y • {patient.patientId}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact */}
                          <div className="col-span-2">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-neutral-700">
                                <Phone className="h-3 w-3 mr-1 text-neutral-400" />
                                {patient.phone}
                              </div>
                              {patient.location && (
                                <div className="flex items-center text-xs text-neutral-500">
                                  <MapPin className="h-3 w-3 mr-1 text-neutral-400" />
                                  {translateData(patient.location)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Last Visit */}
                          <div className="col-span-2">
                            <div className="flex items-center text-sm">
                              <Clock className="h-3 w-3 mr-1 text-neutral-400" />
                              {lastVisit ? (
                                <div>
                                  <div className="text-neutral-700 font-medium">
                                    {format(lastVisit, 'MMM d, yyyy')}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {format(lastVisit, 'h:mm a')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-neutral-500 italic">No visits yet</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Statistics */}
                          <div className="col-span-2">
                            <div className="space-y-1">
                              <div className="flex items-center text-xs text-neutral-600">
                                <FileText className="h-3 w-3 mr-1 text-neutral-400" />
                                {patientPrescriptions.length} prescriptions
                              </div>
                              <div className="flex items-center text-xs text-neutral-600">
                                <Calendar className="h-3 w-3 mr-1 text-neutral-400" />
                                {patientAppointments.length} appointments
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="col-span-3">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setLocation(`/patients/${patient.id}`)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPatient(patient);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {user?.canDeletePatients && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete ${patient.name}? This will also delete all their prescriptions and appointments. This action cannot be undone.`)) {
                                      deletePatientMutation.mutate(patient.id);
                                    }
                                  }}
                                  disabled={deletePatientMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile View - Hidden on desktop */}
            <div className="md:hidden space-y-4">
              {filteredPatients.map((patient: any) => {
                const patientPrescriptions = getPatientPrescriptions(patient.id);
                const patientAppointments = getPatientAppointments(patient.id);
                const lastVisit = getLastVisitDate(patient);
                
                return (
                  <Card key={patient.id} className="shadow-sm border border-neutral-200 card-hover">
                    <CardContent className="p-4">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLocation(`/patients/${patient.id}`)}
                            title="Click to view patient details"
                          >
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                              {patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 
                              className="font-semibold text-primary leading-tight hover:text-primary/80 cursor-pointer transition-colors underline-offset-2 hover:underline"
                              onClick={() => setLocation(`/patients/${patient.id}`)}
                              title="Click to view patient details"
                            >
                              {translateData(patient.name)}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {translateData(patient.gender)}, {patient.age} years • {patient.patientId}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Info */}
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        <div className="flex items-center text-sm text-neutral-700">
                          <Phone className="h-4 w-4 mr-2 text-neutral-400" />
                          {patient.phone}
                        </div>
                        {patient.location && (
                          <div className="flex items-center text-sm text-neutral-500">
                            <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                            {translateData(patient.location)}
                          </div>
                        )}
                      </div>
                      
                      {/* Visit Info & Statistics */}
                      <div className="bg-neutral-50 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center text-xs text-neutral-500 mb-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Last Visit
                            </div>
                            {lastVisit ? (
                              <div className="text-sm font-medium text-neutral-700">
                                {format(lastVisit, 'MMM d, yyyy')}
                                <div className="text-xs text-neutral-500">
                                  {format(lastVisit, 'h:mm a')}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-neutral-500 italic">No visits yet</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center text-xs text-neutral-500 mb-1">
                              <FileText className="h-3 w-3 mr-1" />
                              Records
                            </div>
                            <div className="text-sm">
                              <div className="text-neutral-700 font-medium">{patientPrescriptions.length} prescriptions</div>
                              <div className="text-xs text-neutral-500">{patientAppointments.length} appointments</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 touch-target"
                          onClick={() => setLocation(`/patients/${patient.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="touch-target"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPatient(patient);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user?.canDeletePatients && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="touch-target"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete ${patient.name}? This will also delete all their prescriptions and appointments. This action cannot be undone.`)) {
                                deletePatientMutation.mutate(patient.id);
                              }
                            }}
                            disabled={deletePatientMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Patient Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="Patient name"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  placeholder="Age"
                  className="form-input"
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="Phone number"
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newPatient.location}
                onChange={(e) => setNewPatient({ ...newPatient, location: e.target.value })}
                placeholder="City or area"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                placeholder="Full address (optional)"
                className="form-input"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddPatient}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? "Adding..." : "Add Patient"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Details Modal */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg">
                    {selectedPatient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPatient.name}</h3>
                  <p className="text-neutral-600">ID: {selectedPatient.patientId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-700">Age:</span>
                  <p>{selectedPatient.age} years</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">{t('patients.gender')}:</span>
                  <p>{translateData(selectedPatient.gender)}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Phone:</span>
                  <p>{selectedPatient.phone}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Registered:</span>
                  <p>{format(new Date(selectedPatient.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {selectedPatient.location && (
                <div>
                  <span className="font-medium text-neutral-700">{t('patients.location')}:</span>
                  <p className="text-sm">{translateData(selectedPatient.location)}</p>
                </div>
              )}

              {selectedPatient.address && (
                <div>
                  <span className="font-medium text-neutral-700">Address:</span>
                  <p className="text-sm">{selectedPatient.address}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPatient(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSelectedPatient(null);
                    onNavigate('prescriptions');
                  }}
                >
                  View Prescriptions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={showEditModal} onOpenChange={() => setShowEditModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="Patient name"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-age">Age *</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  placeholder="Age"
                  className="form-input"
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-gender">Gender *</Label>
                <Select value={newPatient.gender} onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="Phone number"
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={newPatient.location}
                onChange={(e) => setNewPatient({ ...newPatient, location: e.target.value })}
                placeholder="City or area"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                placeholder="Full address (optional)"
                className="form-input"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddPatient}
                disabled={updatePatientMutation.isPending}
              >
                {updatePatientMutation.isPending ? "Updating..." : "Update Patient"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
