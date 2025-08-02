import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, FileText, Upload, Trash2, Edit, Users, Settings, Eye, Sparkles, Bot } from "lucide-react";
import { format } from "date-fns";
import type { PrescriptionTemplate, DoctorTemplateAssignment, User } from "@shared/schema";

interface TemplateWithAssignments extends PrescriptionTemplate {
  assignedDoctors?: string[];
}

export default function AdminTemplateManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "html" as "html" | "upload",
    content: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    fileSize: 0
  });

  const [aiGeneratorForm, setAiGeneratorForm] = useState({
    templateName: "",
    clinicName: "",
    doctorName: "",
    degree: "",
    headerNotes: "",
    footerNotes: "",
    description: "",
    language: "bengali" as "bengali" | "english",
    isGenerating: false,
    generatedContent: "",
    showPreview: false
  });

  // Sample prescription data for preview
  const samplePrescriptionData = {
    patientName: "রাজু আহমেদ",
    patientAge: "32",
    patientGender: "পুরুষ",
    patientPhone: "01712345678",
    patientAddress: "১২৩ শাহবাগ, ঢাকা",
    doctorName: "ডা. রনজিৎ কুমার দাশ",
    clinicName: "My Homeo Health",
    clinicAddress: "হোমিওপ্যাথিক চিকিৎসা কেন্দ্র, ঢাকা",
    date: format(new Date(), 'dd/MM/yyyy'),
    prescriptionId: "MHH-2025-001",
    symptoms: "জ্বর, মাথা ব্যথা, শরীর ব্যথা",
    medicines: [
      {
        name: "Arnica Montana",
        power: "30C",
        dosage: "৫ ফোঁটা",
        frequency: "দিনে ৩ বার",
        duration: "৭ দিন",
        instructions: "খাওয়ার ৩০ মিনিট আগে"
      },
      {
        name: "Belladonna",
        power: "200C", 
        dosage: "৪ ফোঁটা",
        frequency: "দিনে ২ বার",
        duration: "৫ দিন",
        instructions: "খাওয়ার পর"
      }
    ],
    notes: "প্রচুর পানি পান করুন। ঠান্ডা খাবার এড়িয়ে চলুন।"
  };

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/admin/templates"],
  });

  // Fetch template assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/admin/template-assignments"],
  });

  // Fetch doctors
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ["/api/admin/doctors"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(templateData),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Template created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({ title: "Template updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-assignments"] });
      toast({ title: "Template deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Assign template mutation
  const assignTemplateMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await fetch("/api/admin/template-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(assignmentData),
      });
      if (!response.ok) throw new Error("Failed to assign template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-assignments"] });
      setIsAssignDialogOpen(false);
      toast({ title: "Template assigned successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to assign template", variant: "destructive" });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ doctorId, templateId }: { doctorId: string; templateId: string }) => {
      const response = await fetch(`/api/admin/template-assignments/${doctorId}/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove assignment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-assignments"] });
      toast({ title: "Template assignment removed!" });
    },
    onError: () => {
      toast({ title: "Failed to remove assignment", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTemplateForm({
      name: "",
      type: "html",
      content: "",
      fileUrl: "",
      fileName: "",
      fileType: "",
      fileSize: 0
    });
    setSelectedTemplate(null);
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }

    if (templateForm.type === "html" && !templateForm.content.trim()) {
      toast({ title: "Template content is required", variant: "destructive" });
      return;
    }

    createTemplateMutation.mutate(templateForm);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      data: templateForm
    });
  };

  const handleDeleteTemplate = (template: PrescriptionTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"? This will remove all doctor assignments.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const openEditDialog = (template: PrescriptionTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type as "html" | "upload",
      content: template.content || "",
      fileUrl: template.fileUrl || "",
      fileName: template.fileName || "",
      fileType: template.fileType || "",
      fileSize: template.fileSize || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setTemplateForm(prev => ({
          ...prev,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: result // In production, this would be uploaded to cloud storage
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getAssignedDoctorsForTemplate = (templateId: string) => {
    return (assignments as DoctorTemplateAssignment[])
      .filter((assignment: DoctorTemplateAssignment) => assignment.templateId === templateId)
      .map((assignment: DoctorTemplateAssignment) => {
        const doctor = (doctors as User[]).find((d: User) => d.id === assignment.doctorId);
        return doctor?.name || "Unknown Doctor";
      });
  };

  const getUnassignedDoctors = (templateId: string) => {
    const assignedDoctorIds = (assignments as DoctorTemplateAssignment[])
      .filter((assignment: DoctorTemplateAssignment) => assignment.templateId === templateId)
      .map((assignment: DoctorTemplateAssignment) => assignment.doctorId);
    
    return (doctors as User[]).filter((doctor: User) => !assignedDoctorIds.includes(doctor.id));
  };

  const handlePreviewTemplate = (template: PrescriptionTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const generatePreviewHTML = (template: PrescriptionTemplate) => {
    if (template.type === "html" && template.content) {
      let html = template.content;
      
      // Replace template variables with sample data
      html = html.replace(/\{\{patientName\}\}/g, samplePrescriptionData.patientName);
      html = html.replace(/\{\{patientAge\}\}/g, samplePrescriptionData.patientAge);
      html = html.replace(/\{\{patientGender\}\}/g, samplePrescriptionData.patientGender);
      html = html.replace(/\{\{patientPhone\}\}/g, samplePrescriptionData.patientPhone);
      html = html.replace(/\{\{patientAddress\}\}/g, samplePrescriptionData.patientAddress);
      html = html.replace(/\{\{doctorName\}\}/g, samplePrescriptionData.doctorName);
      html = html.replace(/\{\{clinicName\}\}/g, samplePrescriptionData.clinicName);
      html = html.replace(/\{\{clinicAddress\}\}/g, samplePrescriptionData.clinicAddress);
      html = html.replace(/\{\{date\}\}/g, samplePrescriptionData.date);
      html = html.replace(/\{\{prescriptionId\}\}/g, samplePrescriptionData.prescriptionId);
      html = html.replace(/\{\{symptoms\}\}/g, samplePrescriptionData.symptoms);
      html = html.replace(/\{\{notes\}\}/g, samplePrescriptionData.notes);
      
      // Generate medicines HTML
      const medicinesHTML = samplePrescriptionData.medicines.map((med, index) => `
        <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 5px;">
            ${index + 1}. ${med.name}${med.power ? ` (${med.power})` : ''}
          </div>
          <div style="font-size: 11px;">
            <span style="margin-right: 15px;"><strong>ডোজ:</strong> ${med.dosage}</span>
            <span style="margin-right: 15px;"><strong>সেবনবিধি:</strong> ${med.frequency}</span>
            <span style="margin-right: 15px;"><strong>সময়কাল:</strong> ${med.duration}</span>
          </div>
          ${med.instructions ? `<div style="font-size: 10px; color: #666; margin-top: 3px;"><strong>নির্দেশনা:</strong> ${med.instructions}</div>` : ''}
        </div>
      `).join('');
      
      html = html.replace(/\{\{medicines\}\}/g, medicinesHTML);
      
      return html;
    } else if (template.type === "upload") {
      return `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
          <h3>File Template Preview</h3>
          <p style="margin-bottom: 10px;"><strong>File:</strong> ${template.fileName}</p>
          <p style="color: #888; font-size: 14px;">File templates cannot be previewed directly. The actual file will be used when printing prescriptions.</p>
        </div>
      `;
    }
    
    return '<div style="text-align: center; padding: 40px; color: #999;">No preview available</div>';
  };

  // AI Template Generation
  const generateTemplateWithAI = async () => {
    setAiGeneratorForm(prev => ({ ...prev, isGenerating: true }));
    
    try {
      const response = await fetch('/api/admin/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clinicName: aiGeneratorForm.clinicName,
          doctorName: aiGeneratorForm.doctorName,
          degree: aiGeneratorForm.degree,
          headerNotes: aiGeneratorForm.headerNotes,
          footerNotes: aiGeneratorForm.footerNotes,
          description: aiGeneratorForm.description,
          language: aiGeneratorForm.language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate template');
      }

      const result = await response.json();
      
      setAiGeneratorForm(prev => ({
        ...prev,
        generatedContent: result.templateContent,
        showPreview: true,
        isGenerating: false
      }));

      toast({
        title: "Template Generated Successfully!",
        description: `Professional ${aiGeneratorForm.language === 'bengali' ? 'Bengali' : 'English'} prescription template created.`
      });

    } catch (error) {
      console.error('Template generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate template. Please try again.",
        variant: "destructive"
      });
      setAiGeneratorForm(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const saveGeneratedTemplate = () => {
    if (!aiGeneratorForm.generatedContent || !aiGeneratorForm.templateName) {
      toast({
        title: "Missing Information",
        description: "Please provide a template name and generate content first.",
        variant: "destructive"
      });
      return;
    }

    const templateData = {
      name: aiGeneratorForm.templateName,
      type: "html",
      content: aiGeneratorForm.generatedContent,
      fileUrl: "",
      fileName: "",
      fileType: "",
      fileSize: 0
    };

    createTemplateMutation.mutate(templateData);
    setIsAIGeneratorOpen(false);
    resetAIGeneratorForm();
  };

  const resetAIGeneratorForm = () => {
    setAiGeneratorForm({
      templateName: "",
      clinicName: "",
      doctorName: "",
      degree: "",
      headerNotes: "",
      footerNotes: "",
      description: "",
      language: "bengali",
      isGenerating: false,
      generatedContent: "",
      showPreview: false
    });
  };

  if (templatesLoading || assignmentsLoading || doctorsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template Management</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAIGeneratorOpen(true)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI Generator
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(templates as PrescriptionTemplate[]).map((template: PrescriptionTemplate) => {
              const assignedDoctors = getAssignedDoctorsForTemplate(template.id);
              
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {template.type === "html" ? (
                          <FileText className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Upload className="h-5 w-5 text-green-500" />
                        )}
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Type: {template.type === "html" ? "Custom HTML" : "File Upload"}
                    </div>
                    
                    {template.fileName && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        File: {template.fileName}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      {assignedDoctors.length} doctor(s) assigned
                    </div>

                    {assignedDoctors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assignedDoctors.slice(0, 2).map((doctorName: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {doctorName}
                          </Badge>
                        ))}
                        {assignedDoctors.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{assignedDoctors.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewTemplate(template)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview Prescription
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsAssignDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(doctors as User[]).map((doctor: User) => {
              const doctorAssignments = (assignments as DoctorTemplateAssignment[]).filter(
                (assignment: DoctorTemplateAssignment) => assignment.doctorId === doctor.id
              );
              
              return (
                <Card key={doctor.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {doctor.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {doctorAssignments.length} template(s) assigned
                    </div>
                    
                    {doctorAssignments.length > 0 ? (
                      <div className="space-y-2">
                        {doctorAssignments.map((assignment: DoctorTemplateAssignment) => {
                          const template = (templates as PrescriptionTemplate[]).find((t: PrescriptionTemplate) => t.id === assignment.templateId);
                          
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{template?.name}</span>
                                {assignment.isDefault && (
                                  <Badge variant="default" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAssignmentMutation.mutate({
                                  doctorId: doctor.id,
                                  templateId: assignment.templateId
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">No templates assigned</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label htmlFor="templateType">Template Type</Label>
              <Select
                value={templateForm.type}
                onValueChange={(value: "html" | "upload") => 
                  setTemplateForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">Custom HTML Template</SelectItem>
                  <SelectItem value="upload">File Upload (PDF/DOC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateForm.type === "html" ? (
              <div>
                <Label htmlFor="templateContent">HTML Content</Label>
                <Textarea
                  id="templateContent"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter HTML template content..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="templateFile">Upload File</Label>
                <Input
                  id="templateFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
                {templateForm.fileName && (
                  <div className="text-sm text-gray-600 mt-2">
                    Selected: {templateForm.fileName} ({(templateForm.fileSize / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTemplateName">Template Name</Label>
              <Input
                id="editTemplateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label htmlFor="editTemplateType">Template Type</Label>
              <Select
                value={templateForm.type}
                onValueChange={(value: "html" | "upload") => 
                  setTemplateForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">Custom HTML Template</SelectItem>
                  <SelectItem value="upload">File Upload (PDF/DOC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateForm.type === "html" ? (
              <div>
                <Label htmlFor="editTemplateContent">HTML Content</Label>
                <Textarea
                  id="editTemplateContent"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter HTML template content..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="editTemplateFile">Upload New File</Label>
                <Input
                  id="editTemplateFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
                {templateForm.fileName && (
                  <div className="text-sm text-gray-600 mt-2">
                    Current: {templateForm.fileName} ({(templateForm.fileSize / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleEditTemplate}
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Template to Doctors</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="font-medium">{selectedTemplate.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTemplate.type === "html" ? "Custom HTML Template" : "File Upload Template"}
                </div>
              </div>

              <div>
                <Label>Available Doctors</Label>
                <div className="space-y-2 mt-2">
                  {getUnassignedDoctors(selectedTemplate.id).map((doctor: User) => (
                    <div key={doctor.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{doctor.name}</span>
                      <Button
                        size="sm"
                        onClick={() => assignTemplateMutation.mutate({
                          doctorId: doctor.id,
                          templateId: selectedTemplate.id,
                          isDefault: false
                        })}
                        disabled={assignTemplateMutation.isPending}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                  {getUnassignedDoctors(selectedTemplate.id).length === 0 && (
                    <div className="text-sm text-gray-500 italic p-2">
                      All doctors have been assigned this template
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={() => setIsAssignDialogOpen(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prescription Preview - {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Template: {selectedTemplate.name}</span>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Type: {selectedTemplate.type === "html" ? "Custom HTML Template" : "File Upload Template"}
                </div>
              </div>

              <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Preview with Sample Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This shows how the prescription will look when printed</p>
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto">
                  <div 
                    className="prescription-preview"
                    dangerouslySetInnerHTML={{
                      __html: generatePreviewHTML(selectedTemplate)
                    }}
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.4',
                      color: '#333'
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewDialogOpen(false)}
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => {
                    // Print the preview
                    const printWindow = window.open('', '_blank');
                    if (printWindow && selectedTemplate) {
                      const previewHTML = generatePreviewHTML(selectedTemplate);
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Prescription Preview - ${selectedTemplate.name}</title>
                            <style>
                              body { 
                                font-family: Arial, sans-serif; 
                                margin: 20px; 
                                line-height: 1.4; 
                                color: #333; 
                              }
                              @media print {
                                body { margin: 0; }
                              }
                            </style>
                          </head>
                          <body>
                            ${previewHTML}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                >
                  Print Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Template Generator Dialog */}
      <Dialog open={isAIGeneratorOpen} onOpenChange={setIsAIGeneratorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Prescription Template Generator
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {!aiGeneratorForm.showPreview ? (
              // Generator Form
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                      id="templateName"
                      value={aiGeneratorForm.templateName}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, templateName: e.target.value }))}
                      placeholder="e.g., Modern Bengali Template"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinicName">Clinic Name *</Label>
                    <Input
                      id="clinicName"
                      value={aiGeneratorForm.clinicName}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, clinicName: e.target.value }))}
                      placeholder="e.g., My Homeo Health Clinic"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="doctorName">Doctor Name *</Label>
                    <Input
                      id="doctorName"
                      value={aiGeneratorForm.doctorName}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, doctorName: e.target.value }))}
                      placeholder="e.g., Dr. Ranajit Kumar"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="degree">Degree/Qualification</Label>
                    <Input
                      id="degree"
                      value={aiGeneratorForm.degree}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, degree: e.target.value }))}
                      placeholder="e.g., BHMS, MD (Hom)"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="language">Language *</Label>
                    <select
                      id="language"
                      value={aiGeneratorForm.language}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, language: e.target.value as 'bengali' | 'english' }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="bengali">Bengali (বাংলা)</option>
                      <option value="english">English</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="headerNotes">Header Notes</Label>
                    <textarea
                      id="headerNotes"
                      value={aiGeneratorForm.headerNotes}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, headerNotes: e.target.value }))}
                      placeholder="Additional information for header (e.g., clinic address, phone)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="footerNotes">Footer Notes</Label>
                    <textarea
                      id="footerNotes"
                      value={aiGeneratorForm.footerNotes}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, footerNotes: e.target.value }))}
                      placeholder="Additional information for footer (e.g., consultation hours, disclaimer)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Template Description</Label>
                    <textarea
                      id="description"
                      value={aiGeneratorForm.description}
                      onChange={(e) => setAiGeneratorForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your specific needs for this template (e.g., modern design, specific colors, layout preferences, special sections needed)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Preview Section
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Template Generated Successfully!</span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Language: {aiGeneratorForm.language === 'bengali' ? 'Bengali (বাংলা)' : 'English'}
                  </div>
                </div>

                <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Preview with Sample Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This shows how your generated template will look</p>
                  </div>
                  <div className="p-6 max-h-[400px] overflow-y-auto">
                    <div 
                      className="prescription-preview"
                      dangerouslySetInnerHTML={{
                        __html: aiGeneratorForm.generatedContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                          const sampleData: Record<string, string> = {
                            clinicName: aiGeneratorForm.clinicName,
                            doctorName: aiGeneratorForm.doctorName,
                            patientName: 'রহিমা খাতুন',
                            patientAge: '৩৫',
                            patientGender: 'মহিলা',
                            patientPhone: '০১৭১২৩৪৫৬৭৮',
                            patientAddress: 'ঢাকা, বাংলাদেশ',
                            date: new Date().toLocaleDateString('bn-BD'),
                            prescriptionId: 'RX-2025-001',
                            symptoms: 'মাথাব্যথা, জ্বর, শরীর ব্যথা',
                            medicines: `<div style="margin-bottom: 10px;">১. আর্নিকা মন্টানা ৩০ - ৩ ফোঁটা - দিনে ৩ বার - ৭ দিন</div>
                              <div style="margin-bottom: 10px;">২. বেলাডোনা ২০০ - ২ ফোঁটা - দিনে ২ বার - ৫ দিন</div>`,
                            notes: 'প্রচুর পানি পান করুন এবং বিশ্রাম নিন।'
                          };
                          return sampleData[key] || match;
                        })
                      }}
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: '1.4',
                        color: '#333'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              {!aiGeneratorForm.showPreview ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAIGeneratorOpen(false);
                      resetAIGeneratorForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateTemplateWithAI}
                    disabled={aiGeneratorForm.isGenerating || !aiGeneratorForm.clinicName || !aiGeneratorForm.doctorName}
                    className="flex items-center gap-2"
                  >
                    {aiGeneratorForm.isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Template
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setAiGeneratorForm(prev => ({ ...prev, showPreview: false }))}
                  >
                    Back to Edit
                  </Button>
                  <Button
                    onClick={saveGeneratedTemplate}
                    disabled={createTemplateMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}