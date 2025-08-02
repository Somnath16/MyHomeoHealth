import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, FileText, Eye, Printer, X, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";

interface PrescriptionsPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export default function PrescriptionsPage({ user, onNavigate }: PrescriptionsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [newPrescription, setNewPrescription] = useState({
    patientId: "",
    symptoms: "",
    medicines: [] as Medicine[],
    notes: "",
  });
  const [currentMedicine, setCurrentMedicine] = useState<Medicine>({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Medicine search functionality state
  const [medicineSearchTerm, setMedicineSearchTerm] = useState("");
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  
  // Print functionality state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedPrescriptionToPrint, setSelectedPrescriptionToPrint] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, translateData } = useLanguage();
  const isMobile = useIsMobile();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ["/api/medicines"],
  });

  // Fetch doctor's assigned templates for print preview
  const { data: assignedTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/doctor/templates'],
    enabled: !!(user && user.role === 'doctor')
  });

  // Set default template when assigned templates load
  React.useEffect(() => {
    if ((assignedTemplates as any[])?.length > 0 && !selectedTemplate) {
      const templatesArray = assignedTemplates as any[];
      const defaultTemplate = templatesArray.find(t => t.isDefault) || templatesArray[0];
      setSelectedTemplate(defaultTemplate.templateId);
      setSelectedCustomTemplate(defaultTemplate);
    }
  }, [assignedTemplates, selectedTemplate]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.medicine-dropdown-container')) {
        setShowMedicineDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter medicines based on search term
  const filteredMedicines = medicines.filter((medicine: any) =>
    medicine.name?.toLowerCase().includes(medicineSearchTerm.toLowerCase()) ||
    medicine.code?.toLowerCase().includes(medicineSearchTerm.toLowerCase()) ||
    medicine.company?.toLowerCase().includes(medicineSearchTerm.toLowerCase())
  ).slice(0, 10); // Limit to 10 results for performance

  // Handle medicine selection from dropdown
  const handleMedicineSelect = (medicine: any) => {
    setSelectedMedicine(medicine);
    setMedicineSearchTerm(medicine.name || medicine.code || '');
    setCurrentMedicine(prev => ({
      ...prev,
      name: medicine.name || medicine.code || ''
    }));
    setShowMedicineDropdown(false);
  };

  // Handle medicine search input change
  const handleMedicineSearchChange = (value: string) => {
    setMedicineSearchTerm(value);
    setCurrentMedicine(prev => ({
      ...prev,
      name: value
    }));
    setShowMedicineDropdown(value.length > 0);
    if (value.length === 0) {
      setSelectedMedicine(null);
    }
  };

  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      const response = await apiRequest("POST", "/api/prescriptions", prescriptionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Success",
        description: "Prescription created successfully",
      });
      setShowAddModal(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return await apiRequest("PATCH", `/api/prescriptions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Success",
        description: "Prescription updated successfully",
      });
      setShowEditModal(false);
      setEditingPrescription(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update prescription",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/prescriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prescription",
        variant: "destructive",
      });
    },
  });

  // Enrich prescriptions with patient data
  const enrichedPrescriptions = prescriptions.map((prescription: any) => {
    const patient = patients.find((p: any) => p.id === prescription.patientId);
    return {
      ...prescription,
      patientName: patient?.name || 'Unknown Patient',
      patientAge: patient?.age || '',
      patientGender: patient?.gender || '',
      patientPhone: patient?.phone || '',
      patientIdDisplay: patient?.patientId || 'N/A',
    };
  });

  // Filter prescriptions
  const filteredPrescriptions = enrichedPrescriptions.filter((prescription: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      prescription.patientName.toLowerCase().includes(searchLower) ||
      prescription.patientIdDisplay.toLowerCase().includes(searchLower) ||
      prescription.prescriptionId.toLowerCase().includes(searchLower) ||
      prescription.symptoms.toLowerCase().includes(searchLower)
    );
  });

  // Filter patients for search
  const filteredPatients = patients.filter((patient: any) => {
    if (!patientSearchTerm) return true;
    const searchLower = patientSearchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(searchLower) ||
      patient.patientId.toLowerCase().includes(searchLower) ||
      (patient.phone && patient.phone.includes(patientSearchTerm))
    );
  });

  const resetForm = () => {
    setNewPrescription({
      patientId: "",
      symptoms: "",
      medicines: [],
      notes: "",
    });
    setCurrentMedicine({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setShowMedicineForm(false);
    setEditingPrescription(null);
    setShowEditModal(false);
    setPatientSearchTerm("");
    setShowPatientDropdown(false);
    setMedicineSearchTerm("");
    setShowMedicineDropdown(false);
    setSelectedMedicine(null);
  };

  const addMedicine = () => {
    if (!currentMedicine.name || !currentMedicine.dosage || !currentMedicine.frequency) {
      toast({
        title: "Error",
        description: "Please fill in medicine name, dosage, and frequency",
        variant: "destructive",
      });
      return;
    }

    setNewPrescription(prev => ({
      ...prev,
      medicines: [...prev.medicines, currentMedicine]
    }));

    setCurrentMedicine({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setMedicineSearchTerm("");
    setShowMedicineDropdown(false);
    setSelectedMedicine(null);
    setShowMedicineForm(false);
  };

  const removeMedicine = (index: number) => {
    setNewPrescription(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  // Add medicine from suggestion list - automatically clears blank form
  const addMedicineFromSuggestion = (suggestionMedicine: any) => {
    const newMedicine: Medicine = {
      name: suggestionMedicine.name,
      dosage: suggestionMedicine.power || "",
      frequency: suggestionMedicine.frequency || "",
      duration: suggestionMedicine.duration || "",
      instructions: suggestionMedicine.instructions || "",
    };

    setNewPrescription(prev => ({
      ...prev,
      medicines: [...prev.medicines, newMedicine]
    }));

    // Clear the current medicine form and hide it
    setCurrentMedicine({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setShowMedicineForm(false);
  };

  const handleCreatePrescription = () => {
    if (!newPrescription.patientId || !newPrescription.symptoms || newPrescription.medicines.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one medicine",
        variant: "destructive",
      });
      return;
    }

    if (editingPrescription) {
      updatePrescriptionMutation.mutate({ 
        id: editingPrescription.id, 
        data: {
          symptoms: newPrescription.symptoms,
          medicines: newPrescription.medicines.map((med: Medicine) => ({
            medicineId: (medicines as any[]).find((m: any) => m.name === med.name)?.id || "",
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions
          })),
          notes: newPrescription.notes
        }
      });
    } else {
      createPrescriptionMutation.mutate({
        ...newPrescription,
        medicines: newPrescription.medicines,
      });
    }
  };

  const handleEditPrescription = (prescription: any) => {
    setEditingPrescription(prescription);
    setShowEditModal(true);
    
    // Pre-fill form with existing data
    setNewPrescription({
      patientId: prescription.patientId,
      symptoms: prescription.symptoms,
      medicines: Array.isArray(prescription.medicines) ? prescription.medicines.map((med: any) => {
        const medicineData = (medicines as any[]).find((m: any) => m.id === med.medicineId);
        return {
          name: medicineData?.name || 'Unknown Medicine',
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          duration: med.duration || '',
          instructions: med.instructions || ''
        };
      }) : [],
      notes: prescription.notes || ""
    });
  };

  const showPrintPreviewModal = (prescription: any) => {
    setSelectedPrescriptionToPrint(prescription);
    setShowPrintPreview(true);
  };

  const getTemplateStyles = (template: string) => {
    const baseStyles = `
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        line-height: 1.6;
        color: #333;
      }
      .prescription-container {
        border: 1px solid #ddd;
        padding: 30px;
        border-radius: 8px;
        background: white;
      }
      h1, h2, h3 { margin-bottom: 15px; }
      .medicine-list { margin: 20px 0; }
      .medicine-item { 
        margin: 10px 0; 
        padding: 10px; 
        border: 1px solid #eee; 
        border-radius: 4px; 
      }
      @media print { 
        body { margin: 0; padding: 10px; } 
        .prescription-container { border: none; }
      }
    `;

    switch (template) {
      case 'modern':
        return baseStyles + `
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 25px;
            margin: -30px -30px 30px -30px;
            border-radius: 8px 8px 0 0;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .doctor-name {
            font-size: 16px;
            opacity: 0.9;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
            background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
            padding: 15px;
            border-radius: 8px;
            color: white;
          }
          .symptoms {
            background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .medicine-item {
            background: linear-gradient(45deg, #43e97b 0%, #38f9d7 100%);
            color: white;
            border: none;
            border-radius: 8px;
          }
          .notes {
            background: linear-gradient(45deg, #fa709a 0%, #fee140 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #667eea;
            color: #667eea;
          }
        `;
      
      case 'minimal':
        return baseStyles + `
          .header {
            text-align: left;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .clinic-name {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 3px;
          }
          .doctor-name {
            font-size: 14px;
            color: #666;
          }
          .patient-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          .symptoms {
            margin-bottom: 20px;
            padding: 10px 0;
          }
          .medicine-item {
            border: none;
            border-left: 3px solid #333;
            padding: 8px 12px;
            margin-bottom: 8px;
            background: #fafafa;
          }
          .notes {
            margin-bottom: 20px;
            padding: 10px 0;
            border-top: 1px solid #f0f0f0;
          }
          .footer {
            text-align: right;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        `;
      
      default: // classic
        return baseStyles + `
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .doctor-name {
            font-size: 18px;
            color: #666;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
          }
          .symptoms {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .medicine-item {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            background: #f8f9fa;
          }
          .notes {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
          }
        `;
    }
  };

  const printPrescription = (prescription: any, templateId: string) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get doctor name
    const doctorName = user?.name || 'Dr. [Doctor Name]';
    
    // Get medicines details
    const medicineDetails = Array.isArray(prescription.medicines) 
      ? (prescription.medicines as any[]).map((med: any) => {
          const medicine = medicines.find(m => m.id === med.medicineId);
          return {
            name: medicine?.code || medicine?.name || 'Unknown Medicine',
            power: medicine?.power || '',
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions
          };
        })
      : [];

    // Find the selected template
    const template = (assignedTemplates as any[])?.find(t => t.templateId === templateId);
    
    if (!template) {
      toast({
        title: "Error",
        description: "Selected template not found",
        variant: "destructive"
      });
      printWindow.close();
      return;
    }

    // Handle file templates
    if (template.templateType === 'file') {
      toast({
        title: "Info", 
        description: "File templates are not yet supported for direct printing. Please use the file directly.",
        variant: "destructive"
      });
      printWindow.close();
      return;
    }

    // Find patient data
    const patient = patients.find(p => p.id === prescription.patientId);

    // Handle HTML templates
    if (template.templateType === 'html' && template.templateContent) {
      let templateHtml = template.templateContent;
      
      // Replace template variables with actual data
      templateHtml = templateHtml.replace(/\{\{doctorName\}\}/g, doctorName);
      templateHtml = templateHtml.replace(/\{\{clinicName\}\}/g, user?.clinicName || 'My Homeo Health Clinic');
      templateHtml = templateHtml.replace(/\{\{degree\}\}/g, user?.degree || '');
      templateHtml = templateHtml.replace(/\{\{specialist\}\}/g, user?.specialist || 'Homeopathic Specialist');
      templateHtml = templateHtml.replace(/\{\{patientName\}\}/g, patient?.name || '');
      templateHtml = templateHtml.replace(/\{\{patientId\}\}/g, patient?.patientId || '');
      templateHtml = templateHtml.replace(/\{\{patientAge\}\}/g, patient?.age?.toString() || '');
      templateHtml = templateHtml.replace(/\{\{patientGender\}\}/g, patient?.gender || '');
      templateHtml = templateHtml.replace(/\{\{patientPhone\}\}/g, patient?.phone || '');
      templateHtml = templateHtml.replace(/\{\{date\}\}/g, format(new Date(prescription.createdAt!), 'dd/MM/yyyy'));
      templateHtml = templateHtml.replace(/\{\{prescriptionId\}\}/g, prescription.prescriptionId || '');
      templateHtml = templateHtml.replace(/\{\{symptoms\}\}/g, prescription.symptoms || '');
      templateHtml = templateHtml.replace(/\{\{notes\}\}/g, prescription.notes || '');
      
      // Replace medicines list
      const medicinesHtml = medicineDetails.map((med, index) => `
        <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 5px;">
            ${index + 1}. ${med.name}${med.power ? ` (${med.power})` : ''}
          </div>
          <div style="font-size: 11px;">
            <span style="margin-right: 15px;"><strong>Dosage:</strong> ${med.dosage}</span>
            <span style="margin-right: 15px;"><strong>Frequency:</strong> ${med.frequency}</span>
            <span><strong>Duration:</strong> ${med.duration}</span>
            ${med.instructions ? `<br><strong>Instructions:</strong> ${med.instructions}` : ''}
          </div>
        </div>
      `).join('');
      templateHtml = templateHtml.replace(/\{\{medicines\}\}/g, medicinesHtml);

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Prescription - ${prescription.prescriptionId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              @media print { 
                body { margin: 0; }
                @page { margin: 0.5in; }
              }
            </style>
          </head>
          <body>
            ${templateHtml}
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      return;
    }

    // Fallback to default template rendering
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription - ${prescription.prescriptionId}</title>
          <style>
            ${getTemplateStyles(template.templateName || 'classic')}
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <div class="header">
              <div class="clinic-name">${user?.clinicName || 'My Homeo Health Clinic'}</div>
              <div class="doctor-name">${doctorName}</div>
              ${user?.degree ? `<div>${user.degree}</div>` : ''}
              ${user?.specialist ? `<div>${user.specialist}</div>` : ''}
            </div>
            
            <div class="patient-info">
              <div>
                <strong>Patient:</strong> ${patient?.name || 'Patient Name'}<br>
                <strong>Age:</strong> ${patient?.age || 'N/A'}<br>
                <strong>Gender:</strong> ${patient?.gender || 'N/A'}
              </div>
              <div>
                <strong>Date:</strong> ${format(new Date(prescription.createdAt!), 'dd/MM/yyyy')}<br>
                <strong>Prescription ID:</strong> ${prescription.prescriptionId}<br>
                <strong>Patient ID:</strong> ${patient?.patientId || 'N/A'}
              </div>
            </div>

            ${prescription.symptoms ? `
              <div class="symptoms">
                <h3>Chief Complaints / Symptoms:</h3>
                <p>${prescription.symptoms}</p>
              </div>
            ` : ''}

            <div class="medicine-list">
              <h3>Prescribed Medicines:</h3>
              ${medicineDetails.map((med, index) => `
                <div class="medicine-item">
                  <div style="font-weight: bold; margin-bottom: 5px;">
                    ${index + 1}. ${med.name}${med.power ? ` (${med.power})` : ''}
                  </div>
                  <div>
                    <strong>Dosage:</strong> ${med.dosage} | 
                    <strong>Frequency:</strong> ${med.frequency} | 
                    <strong>Duration:</strong> ${med.duration}
                    ${med.instructions ? `<br><strong>Instructions:</strong> ${med.instructions}` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            ${prescription.notes ? `
              <div class="notes">
                <h3>Additional Notes:</h3>
                <p>${prescription.notes}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Clinic:</strong> ${user?.clinicName || 'Clinic Name'}</p>
              ${user?.clinicLocation ? `<p><strong>Address:</strong> ${user.clinicLocation}</p>` : ''}
              ${user?.phone ? `<p><strong>Contact:</strong> ${user.phone}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

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
          <h1 className="text-xl font-semibold text-neutral-800">{t('prescriptions.title')}</h1>
          <Button
            size="sm"
            className="touch-target"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('prescriptions.add')}
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            placeholder={t('prescriptions.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 form-input"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="p-4 space-y-3">
        {filteredPrescriptions.length === 0 ? (
          <Card className="shadow-sm border border-neutral-200">
            <CardContent className="p-8 text-center">
              <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">
{searchTerm ? t('no.data.found') : t('prescriptions.title')}
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
{t('prescriptions.add')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPrescriptions
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((prescription: any) => (
              <Card key={prescription.id} className="shadow-sm border border-neutral-200 card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white">
                          {prescription.patientName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-neutral-800">{prescription.patientName}</h3>
                        <p className="text-sm text-neutral-500">
                          {prescription.patientGender}, {prescription.patientAge} • {prescription.patientIdDisplay}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-700">{prescription.prescriptionId}</p>
                      <p className="text-xs text-neutral-500">
                        {format(new Date(prescription.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-neutral-600 font-medium mb-1">Symptoms:</p>
                    <p className="text-sm text-neutral-700 line-clamp-2">{prescription.symptoms}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-1">
                      {prescription.medicines.slice(0, 2).map((med: Medicine, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {med.name}
                        </Badge>
                      ))}
                      {prescription.medicines.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{prescription.medicines.length - 2} more
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">
                      {prescription.medicines.length} medicine{prescription.medicines.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 touch-target"
                      onClick={() => setSelectedPrescription(prescription)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 touch-target"
                      onClick={() => handleEditPrescription(prescription)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => showPrintPreviewModal(prescription)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                    {user?.canDeletePatients && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="touch-target"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete this prescription? This action cannot be undone.`)) {
                            deletePrescriptionMutation.mutate(prescription.id);
                          }
                        }}
                        disabled={deletePrescriptionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Add Prescription Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Prescription</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="patient">Patient *</Label>
              <div className="relative">
                <Input
                  placeholder="Search patient by name, ID, or mobile number..."
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => {
                    // Delay hiding dropdown to allow click on options
                    setTimeout(() => setShowPatientDropdown(false), 200);
                  }}
                  className="form-input"
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredPatients.map((patient: any) => (
                      <div
                        key={patient.id}
                        className="p-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
                        onClick={() => {
                          setNewPrescription({ ...newPrescription, patientId: patient.id });
                          setPatientSearchTerm(`${patient.name} (${patient.patientId})`);
                          setShowPatientDropdown(false);
                        }}
                      >
                        <div className="font-medium text-neutral-800">{patient.name}</div>
                        <div className="text-sm text-neutral-600">
                          ID: {patient.patientId} • Age: {patient.age} • {patient.gender}
                        </div>
                        {patient.phone && (
                          <div className="text-sm text-neutral-500">Phone: {patient.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showPatientDropdown && filteredPatients.length === 0 && patientSearchTerm && (
                  <div className="absolute z-10 w-full bg-white border border-neutral-200 rounded-md shadow-lg mt-1 p-3 text-center text-neutral-500">
                    No patients found matching "{patientSearchTerm}"
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="symptoms">Symptoms *</Label>
              <Textarea
                id="symptoms"
                value={newPrescription.symptoms}
                onChange={(e) => setNewPrescription({ ...newPrescription, symptoms: e.target.value })}
                placeholder="Describe the patient's symptoms..."
                className="form-input min-h-20"
              />
            </div>

            {/* Medicine Selection */}
            <div className="space-y-3">
              <Label>Medicines *</Label>
              
              {/* Current Medicines */}
              {newPrescription.medicines.length > 0 && (
                <div className="space-y-2">
                  {newPrescription.medicines.map((medicine, index) => (
                    <div key={index} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{medicine.name}</p>
                        <p className="text-xs text-neutral-600">
                          {medicine.dosage} • {medicine.frequency}
                          {medicine.duration && ` • ${medicine.duration}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedicine(index)}
                        className="p-1 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Medicine Button or Form */}
              {!showMedicineForm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMedicineForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medicine
                </Button>
              ) : (
                <div className="space-y-3 border rounded-lg p-3 bg-neutral-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="medicine-dropdown-container relative">
                      <Label htmlFor="medicineName">Medicine Name</Label>
                      <Input
                        id="medicineName"
                        value={medicineSearchTerm}
                        onChange={(e) => handleMedicineSearchChange(e.target.value)}
                        onFocus={() => setShowMedicineDropdown(medicineSearchTerm.length > 0)}
                        placeholder="Search medicine by name, code, or company..."
                        className="form-input"
                      />
                      
                      {showMedicineDropdown && filteredMedicines.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                          {filteredMedicines.map((medicine: any) => (
                            <div
                              key={medicine.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleMedicineSelect(medicine)}
                            >
                              <div className="font-medium text-sm">
                                {medicine.name || medicine.code}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {medicine.code && medicine.name !== medicine.code && (
                                  <span className="mr-2">Code: {medicine.code}</span>
                                )}
                                {medicine.company && (
                                  <span className="mr-2">Company: {medicine.company}</span>
                                )}
                                {medicine.power && (
                                  <span>Power: {medicine.power}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {showMedicineDropdown && medicineSearchTerm.length > 0 && filteredMedicines.length === 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                          <div className="p-3 text-center text-gray-500 text-sm">
                            No medicines found matching "{medicineSearchTerm}"
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="dosage">Dosage</Label>
                      <Input
                        id="dosage"
                        value={currentMedicine.dosage}
                        onChange={(e) => setCurrentMedicine({ ...currentMedicine, dosage: e.target.value })}
                        placeholder="e.g., 30C"
                        className="form-input"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select
                        value={currentMedicine.frequency}
                        onValueChange={(value) => setCurrentMedicine({ ...currentMedicine, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Once daily">Once daily</SelectItem>
                          <SelectItem value="Twice daily">Twice daily</SelectItem>
                          <SelectItem value="Three times daily">Three times daily</SelectItem>
                          <SelectItem value="Four times daily">Four times daily</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={currentMedicine.duration}
                        onChange={(e) => setCurrentMedicine({ ...currentMedicine, duration: e.target.value })}
                        placeholder="e.g., 7 days"
                        className="form-input"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <Input
                      id="instructions"
                      value={currentMedicine.instructions}
                      onChange={(e) => setCurrentMedicine({ ...currentMedicine, instructions: e.target.value })}
                      placeholder="Special instructions (optional)"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowMedicineForm(false);
                        setCurrentMedicine({
                          name: "",
                          dosage: "",
                          frequency: "",
                          duration: "",
                          instructions: "",
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addMedicine}
                      className="flex-1"
                    >
                      Add Medicine
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={newPrescription.notes}
                onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                placeholder="Any additional notes or instructions..."
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
                onClick={handleCreatePrescription}
                disabled={createPrescriptionMutation.isPending}
              >
                {createPrescriptionMutation.isPending ? "Creating..." : "Create Prescription"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Details Modal */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white text-lg">
                    {selectedPrescription.patientName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPrescription.patientName}</h3>
                  <p className="text-neutral-600">Patient ID: {selectedPrescription.patientIdDisplay}</p>
                  <p className="text-sm text-neutral-500">
                    {selectedPrescription.patientGender}, {selectedPrescription.patientAge} years
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-700">Prescription ID:</span>
                  <p>{selectedPrescription.prescriptionId}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Date:</span>
                  <p>{format(new Date(selectedPrescription.createdAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              <div>
                <span className="font-medium text-neutral-700">Symptoms:</span>
                <p className="text-sm mt-1">{selectedPrescription.symptoms}</p>
              </div>

              <div>
                <span className="font-medium text-neutral-700">Medicines:</span>
                <div className="space-y-3 mt-2">
                  {selectedPrescription.medicines.map((medicine: Medicine, index: number) => (
                    <div key={index} className="bg-neutral-50 p-3 rounded-lg">
                      <p className="font-medium text-sm">{medicine.name}</p>
                      <div className="text-xs text-neutral-600 mt-1 space-y-1">
                        <p><strong>Dosage:</strong> {medicine.dosage}</p>
                        <p><strong>Frequency:</strong> {medicine.frequency}</p>
                        {medicine.duration && <p><strong>Duration:</strong> {medicine.duration}</p>}
                        {medicine.instructions && <p><strong>Instructions:</strong> {medicine.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPrescription.notes && (
                <div>
                  <span className="font-medium text-neutral-700">Additional Notes:</span>
                  <p className="text-sm mt-1">{selectedPrescription.notes}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPrescription(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => showPrintPreviewModal(selectedPrescription)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prescription Modal */}
      <Dialog open={showEditModal} onOpenChange={() => setShowEditModal(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prescription</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="patient">Patient *</Label>
              <Select
                value={newPrescription.patientId}
                onValueChange={(value) => setNewPrescription({ ...newPrescription, patientId: value })}
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.patientId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="symptoms">Symptoms *</Label>
              <Textarea
                id="symptoms"
                value={newPrescription.symptoms}
                onChange={(e) => setNewPrescription({ ...newPrescription, symptoms: e.target.value })}
                placeholder="Describe the patient's symptoms..."
                className="form-input min-h-20"
              />
            </div>

            {/* Medicine Selection */}
            <div className="space-y-3">
              <Label>Medicines *</Label>
              
              {/* Current Medicines */}
              {newPrescription.medicines.length > 0 && (
                <div className="space-y-2">
                  {newPrescription.medicines.map((medicine, index) => (
                    <div key={index} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{medicine.name}</p>
                        <p className="text-xs text-neutral-600">
                          {medicine.dosage} • {medicine.frequency}
                          {medicine.duration && ` • ${medicine.duration}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedicine(index)}
                        className="p-1 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Medicine Form */}
              <div className="border rounded-lg p-4 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="medicine-dropdown-container relative">
                    <Label htmlFor="medicine-name">Medicine *</Label>
                    <Input
                      id="medicine-name"
                      value={medicineSearchTerm}
                      onChange={(e) => handleMedicineSearchChange(e.target.value)}
                      onFocus={() => setShowMedicineDropdown(medicineSearchTerm.length > 0)}
                      placeholder="Search medicine by name, code, or company..."
                      className="form-input"
                    />
                    
                    {showMedicineDropdown && filteredMedicines.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                        {filteredMedicines.map((medicine: any) => (
                          <div
                            key={medicine.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => handleMedicineSelect(medicine)}
                          >
                            <div className="font-medium text-sm">
                              {medicine.name || medicine.code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {medicine.code && medicine.name !== medicine.code && (
                                <span className="mr-2">Code: {medicine.code}</span>
                              )}
                              {medicine.company && (
                                <span className="mr-2">Company: {medicine.company}</span>
                              )}
                              {medicine.power && (
                                <span>Power: {medicine.power}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {showMedicineDropdown && medicineSearchTerm.length > 0 && filteredMedicines.length === 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                        <div className="p-3 text-center text-gray-500 text-sm">
                          No medicines found matching "{medicineSearchTerm}"
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dosage">Dosage *</Label>
                    <Input
                      id="dosage"
                      value={currentMedicine.dosage}
                      onChange={(e) => setCurrentMedicine({ ...currentMedicine, dosage: e.target.value })}
                      placeholder="e.g., 30C"
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="frequency">Frequency *</Label>
                    <Select
                      value={currentMedicine.frequency}
                      onValueChange={(value) => setCurrentMedicine({ ...currentMedicine, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Once daily">Once daily</SelectItem>
                        <SelectItem value="Twice daily">Twice daily</SelectItem>
                        <SelectItem value="Three times daily">Three times daily</SelectItem>
                        <SelectItem value="Four times daily">Four times daily</SelectItem>
                        <SelectItem value="As needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={currentMedicine.duration}
                      onChange={(e) => setCurrentMedicine({ ...currentMedicine, duration: e.target.value })}
                      placeholder="e.g., 7 days"
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Input
                    id="instructions"
                    value={currentMedicine.instructions}
                    onChange={(e) => setCurrentMedicine({ ...currentMedicine, instructions: e.target.value })}
                    placeholder="Special instructions (optional)"
                    className="form-input"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMedicine}
                  className="w-full"
                >
                  Add Medicine
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={newPrescription.notes}
                onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                placeholder="Any additional notes or instructions..."
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
                onClick={handleCreatePrescription}
                disabled={updatePrescriptionMutation.isPending}
              >
                {updatePrescriptionMutation.isPending ? "Updating..." : "Update Prescription"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Preview Modal */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[90vh]' : 'max-w-4xl max-h-[85vh]'} overflow-hidden`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Print Prescription Preview</DialogTitle>
                <DialogDescription>
                  Select a template and preview before printing
                </DialogDescription>
              </div>
              <Button
                onClick={() => {
                  if (selectedPrescriptionToPrint) {
                    printPrescription(selectedPrescriptionToPrint, selectedTemplate);
                    setShowPrintPreview(false);
                  }
                }}
                className="flex items-center space-x-2"
                size="sm"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col space-y-4">
              <div className="flex-shrink-0">
                <h4 className="text-sm font-medium">Select Template:</h4>
                {templatesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading assigned templates...
                  </div>
                ) : (assignedTemplates as any[])?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No templates assigned by admin</p>
                    <p className="text-xs mt-1">Contact your administrator to assign prescription templates</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(assignedTemplates as any[]).map((template: any) => (
                      <Card 
                        key={template.templateId}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.templateId 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template.templateId);
                          setSelectedCustomTemplate(template);
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="font-medium text-sm">{template.templateName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{template.templateType}</p>
                          {template.isDefault && (
                            <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {selectedPrescriptionToPrint && selectedTemplate && (
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-medium mb-2">Preview:</h4>
                  <ScrollArea className="h-full border rounded-lg">
                    <div className="p-4 bg-white">
                      <div 
                        dangerouslySetInnerHTML={{
                          __html: selectedCustomTemplate?.templateType === 'html' && selectedCustomTemplate?.templateContent 
                            ? (() => {
                                let html = selectedCustomTemplate.templateContent;
                                const patient = patients.find(p => p.id === selectedPrescriptionToPrint.patientId);
                                const medicineDetails = Array.isArray(selectedPrescriptionToPrint.medicines) 
                                  ? (selectedPrescriptionToPrint.medicines as any[]).map((med: any) => {
                                      const medicine = medicines.find(m => m.id === med.medicineId);
                                      return {
                                        name: medicine?.code || medicine?.name || 'Unknown Medicine',
                                        power: medicine?.power || '',
                                        dosage: med.dosage,
                                        frequency: med.frequency,
                                        duration: med.duration,
                                        instructions: med.instructions
                                      };
                                    })
                                  : [];

                                // Replace template variables
                                html = html.replace(/\{\{doctorName\}\}/g, user?.name || 'Dr. [Doctor Name]');
                                html = html.replace(/\{\{clinicName\}\}/g, user?.clinicName || 'My Homeo Health Clinic');
                                html = html.replace(/\{\{degree\}\}/g, user?.degree || '');
                                html = html.replace(/\{\{specialist\}\}/g, user?.specialist || 'Homeopathic Specialist');
                                html = html.replace(/\{\{patientName\}\}/g, patient?.name || '');
                                html = html.replace(/\{\{patientId\}\}/g, patient?.patientId || '');
                                html = html.replace(/\{\{patientAge\}\}/g, patient?.age?.toString() || '');
                                html = html.replace(/\{\{patientGender\}\}/g, patient?.gender || '');
                                html = html.replace(/\{\{patientPhone\}\}/g, patient?.phone || '');
                                html = html.replace(/\{\{date\}\}/g, format(new Date(selectedPrescriptionToPrint.createdAt!), 'dd/MM/yyyy'));
                                html = html.replace(/\{\{prescriptionId\}\}/g, selectedPrescriptionToPrint.prescriptionId || '');
                                html = html.replace(/\{\{symptoms\}\}/g, selectedPrescriptionToPrint.symptoms || '');
                                html = html.replace(/\{\{notes\}\}/g, selectedPrescriptionToPrint.notes || '');
                                
                                const medicinesHtml = medicineDetails.map((med, index) => `
                                  <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <div style="font-weight: bold; margin-bottom: 5px;">
                                      ${index + 1}. ${med.name}${med.power ? ` (${med.power})` : ''}
                                    </div>
                                    <div style="font-size: 11px;">
                                      <span style="margin-right: 15px;"><strong>Dosage:</strong> ${med.dosage}</span>
                                      <span style="margin-right: 15px;"><strong>Frequency:</strong> ${med.frequency}</span>
                                      <span><strong>Duration:</strong> ${med.duration}</span>
                                      ${med.instructions ? `<br><strong>Instructions:</strong> ${med.instructions}` : ''}
                                    </div>
                                  </div>
                                `).join('');
                                html = html.replace(/\{\{medicines\}\}/g, medicinesHtml);

                                return html;
                              })()
                            : `<div style="text-align: center; padding: 40px; color: #666;">
                                <h3>Template Preview</h3>
                                <p>No custom template content available. Default template will be used for printing.</p>
                              </div>`
                        }}
                      />
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPrintPreview(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPrescriptionToPrint) {
                  printPrescription(selectedPrescriptionToPrint, selectedTemplate);
                  setShowPrintPreview(false);
                }
              }}
              className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
            >
              <Printer className="h-5 w-5" />
              <span>Print</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
