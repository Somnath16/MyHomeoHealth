import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminSettingsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function AdminSettingsPage({ user, onNavigate }: AdminSettingsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["/api/users/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=doctor");
      if (!response.ok) throw new Error("Failed to fetch doctors");
      return response.json();
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, canDeletePatients }: { userId: string; canDeletePatients: boolean }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/permissions`, {
        canDeletePatients,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/doctors"] });
      toast({
        title: "Success",
        description: "Doctor permissions updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (doctorId: string, canDeletePatients: boolean) => {
    updatePermissionMutation.mutate({ userId: doctorId, canDeletePatients });
  };

  if (user.role !== "admin") {
    return (
      <div className="p-4">
        <Card className="shadow-sm border border-neutral-200">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-800 mb-2">Access Denied</h3>
            <p className="text-neutral-500">Admin privileges required to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold text-neutral-800">Admin Settings</h1>
          <Settings className="h-6 w-6 text-neutral-600" />
        </div>
      </div>

      {/* Doctor Permissions */}
      <div className="p-4 space-y-4">
        <Card className="shadow-sm border border-neutral-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Doctor Permissions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {doctors.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No doctors found</p>
              </div>
            ) : (
              doctors.map((doctor: any) => (
                <div key={doctor.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {doctor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-neutral-800">{doctor.name}</h3>
                      <p className="text-sm text-neutral-500">{doctor.email || doctor.username}</p>
                      {doctor.clinicName && (
                        <p className="text-xs text-neutral-400">{doctor.clinicName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`delete-permission-${doctor.id}`} className="text-sm font-medium">
                        Delete Patients
                      </Label>
                      <Switch
                        id={`delete-permission-${doctor.id}`}
                        checked={doctor.canDeletePatients || false}
                        onCheckedChange={(checked) => handlePermissionChange(doctor.id, checked)}
                        disabled={updatePermissionMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-neutral-200">
          <CardHeader>
            <CardTitle>Permission Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Delete Patients Permission</p>
                <p>Allows doctors to permanently delete patients from their patient list. This will also delete all associated prescriptions and appointments.</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <p className="text-yellow-800 text-sm">
                <strong>Warning:</strong> Patient deletion is permanent and cannot be undone. Only grant this permission to trusted doctors who understand the implications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}