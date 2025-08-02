import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, FileText, Calendar, User, Phone, MapPin, Clock, Edit, X, Trash2, Printer, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useState } from "react";
import React from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Patient, Prescription, Medicine } from "@shared/schema";

const prescriptionFormSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
  medicines: z.array(z.object({
    medicineId: z.string(),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().min(1, "Duration is required"),
    instructions: z.string().optional()
  })).min(1, "At least one medicine is required"),
  notes: z.string().optional()
});

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

export default function PatientDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, translateData } = useLanguage();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isAddingPrescription, setIsAddingPrescription] = useState(false);
  const [prescriptionType, setPrescriptionType] = useState<'new' | 'existing' | 'form' | null>(null);
  const [selectedExistingPrescription, setSelectedExistingPrescription] = useState<Prescription | null>(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedPrescriptionToPrint, setSelectedPrescriptionToPrint] = useState<Prescription | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<any>(null);
  const [showMedicineForm, setShowMedicineForm] = useState(false);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ['/api/patients', id],
    enabled: !!id
  });

  // Fetch patient prescriptions
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ['/api/prescriptions', 'patient', id],
    enabled: !!id
  });

  // Fetch medicines for prescription form
  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines']
  });

  // Fetch current user to check permissions
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });

  // Fetch doctor's assigned templates for print preview
  const { data: assignedTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/doctor/templates'],
    enabled: !!(user && (user as any).role === 'doctor')
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

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      symptoms: "",
      medicines: [],
      notes: ""
    }
  });

  // Get unique diseases/symptoms from previous prescriptions
  const previousDiseases = prescriptions.reduce((unique: string[], prescription: Prescription) => {
    if (!unique.includes(prescription.symptoms)) {
      unique.push(prescription.symptoms);
    }
    return unique;
  }, []);

  const addPrescriptionMutation = useMutation({
    mutationFn: (data: PrescriptionFormValues) => 
      apiRequest('POST', '/api/prescriptions', {
        ...data,
        patientId: id,
        doctorId: 1 // This should come from auth context
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      setIsAddingPrescription(false);
      setPrescriptionType(null);
      setSelectedExistingPrescription(null);
      setShowMedicineForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Prescription added successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add prescription",
        variant: "destructive"
      });
    }
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: ({ id: prescriptionId, data }: { id: string, data: PrescriptionFormValues }) => 
      apiRequest('PATCH', `/api/prescriptions/${prescriptionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions', 'patient', id] });
      setShowEditModal(false);
      setEditingPrescription(null);
      setShowMedicineForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Prescription updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update prescription",
        variant: "destructive"
      });
    }
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
      setLocation('/patients'); // Navigate back to patients list
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

  const showPrintPreviewModal = (prescription: Prescription) => {
    setSelectedPrescriptionToPrint(prescription);
    setShowPrintPreview(true);
  };

  const sendPrescriptionViaWhatsApp = (prescription: Prescription) => {
    if (!patient?.phone) {
      toast({
        title: "Error",
        description: "Patient phone number is required to send via WhatsApp",
        variant: "destructive"
      });
      return;
    }

    const doctorName = (user as any)?.name || 'Dr. [Doctor Name]';
    const clinicName = (user as any)?.clinicName || 'My Homeo Health Clinic';
    
    // Generate prescription text for WhatsApp
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

    // Create WhatsApp message
    const message = `
🏥 *${clinicName}*
👨‍⚕️ Dr. ${doctorName}
${(user as any)?.degree ? `(${(user as any)?.degree})` : ''}

📋 *PRESCRIPTION*
📅 Date: ${format(new Date(prescription.createdAt!), 'dd/MM/yyyy')}
🆔 Prescription ID: ${prescription.prescriptionId}

👤 *Patient Details:*
Name: ${patient.name}
Age: ${patient.age} years
Gender: ${patient.gender}
Patient ID: ${patient.patientId}

🔍 *Chief Complaints:*
${prescription.symptoms}

💊 *Medicines Prescribed:*
${medicineDetails.map((med, index) => `
${index + 1}. *${med.name}${med.power ? ` (${med.power})` : ''}*
   • Dosage: ${med.dosage}
   • Frequency: ${med.frequency}
   • Duration: ${med.duration}${med.instructions ? `\n   • Instructions: ${med.instructions}` : ''}
`).join('')}

${prescription.notes ? `📝 *Additional Notes:*\n${prescription.notes}\n` : ''}
---
This is a digital prescription from ${clinicName}.
For any queries, please contact the clinic.

📞 Contact: ${(user as any)?.phone || 'Contact clinic for details'}
`.trim();

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = patient.phone.replace(/\D/g, '');
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp opened",
      description: `Prescription ready to send to ${patient.name}`
    });
  };

  const getTemplateStyles = (template: string) => {
    const baseStyles = `
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        line-height: 1.6;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    `;

    switch (template) {
      case 'modern':
        return baseStyles + `
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .doctor-name {
            font-size: 20px;
            opacity: 0.9;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #667eea;
          }
          .symptoms {
            background: #fef3c7;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 5px solid #f59e0b;
          }
          .medicine-item {
            border: none;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            background: #f1f5f9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .notes {
            background: #dbeafe;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 5px solid #3b82f6;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
          }
        `;
      
      case 'minimal':
        return baseStyles + `
          .header {
            text-align: center;
            padding-bottom: 20px;
            margin-bottom: 40px;
            border-bottom: 1px solid #e5e5e5;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: 300;
            color: #333;
            margin-bottom: 5px;
          }
          .doctor-name {
            font-size: 16px;
            color: #666;
            font-weight: 300;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
            padding: 0;
            background: none;
          }
          .symptoms {
            background: none;
            padding: 0;
            border-left: 3px solid #333;
            padding-left: 15px;
            margin-bottom: 30px;
          }
          .medicine-item {
            border: none;
            padding: 15px 0;
            margin-bottom: 15px;
            background: none;
            border-bottom: 1px solid #f0f0f0;
          }
          .notes {
            background: none;
            padding: 0;
            border-left: 3px solid #666;
            padding-left: 15px;
            margin-bottom: 30px;
          }
          .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
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

  const printPrescription = (prescription: Prescription, templateId: string) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get doctor name (this would normally come from auth context)
    const doctorName = (user as any)?.name || 'Dr. [Doctor Name]';
    
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

    // Handle HTML templates
    if (template.templateType === 'html' && template.templateContent) {
      let templateHtml = template.templateContent;
      
      // Replace template variables with actual data
      templateHtml = templateHtml.replace(/\{\{doctorName\}\}/g, doctorName);
      templateHtml = templateHtml.replace(/\{\{clinicName\}\}/g, (user as any)?.clinicName || 'My Homeo Health Clinic');
      templateHtml = templateHtml.replace(/\{\{degree\}\}/g, (user as any)?.degree || '');
      templateHtml = templateHtml.replace(/\{\{specialist\}\}/g, (user as any)?.specialist || 'Homeopathic Specialist');
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
                @page { margin: 1cm; }
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
      printWindow.focus();
      
      // Wait a bit for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const addMedicineToForm = () => {
    const currentMedicines = form.getValues("medicines");
    form.setValue("medicines", [
      ...currentMedicines,
      { medicineId: "", dosage: "", frequency: "", duration: "", instructions: "" }
    ]);
    setShowMedicineForm(true);
  };

  const removeMedicineFromForm = (index: number) => {
    const currentMedicines = form.getValues("medicines");
    const newMedicines = currentMedicines.filter((_, i) => i !== index);
    form.setValue("medicines", newMedicines);
    
    // Hide medicine form if no medicines left
    if (newMedicines.length === 0) {
      setShowMedicineForm(false);
    }
  };

  // Add medicine from suggestion - automatically adds to form
  const addSuggestedMedicine = (suggestion: any) => {
    const currentMedicines = form.getValues("medicines");
    
    // Find medicine in our database if it exists
    const matchingMedicine = (medicines as Medicine[]).find(m => 
      m.name.toLowerCase() === suggestion.name.toLowerCase()
    );
    
    const newMedicine = {
      medicineId: matchingMedicine?.id || "",
      dosage: suggestion.dosage || suggestion.power || "",
      frequency: suggestion.frequency || "",
      duration: suggestion.duration || "",
      instructions: suggestion.instructions || ""
    };

    form.setValue("medicines", [...currentMedicines, newMedicine]);
    setShowMedicineForm(true);
  };

  const onSubmit = (data: PrescriptionFormValues) => {
    if (editingPrescription) {
      updatePrescriptionMutation.mutate({ id: editingPrescription.id, data });
    } else {
      addPrescriptionMutation.mutate(data);
    }
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setShowEditModal(true);
    
    // Pre-fill form with existing data
    form.setValue("symptoms", prescription.symptoms);
    form.setValue("notes", prescription.notes || "");
    
    // Pre-fill medicines if they exist
    if (Array.isArray(prescription.medicines) && prescription.medicines.length > 0) {
      form.setValue("medicines", prescription.medicines.map((med: any) => ({
        medicineId: med.medicineId || "",
        dosage: med.dosage || "",
        frequency: med.frequency || "",
        duration: med.duration || "",
        instructions: med.instructions || ""
      })));
    }
  };

  const handleExistingDiseaseSelect = (symptoms: string) => {
    // Find the most recent prescription with these symptoms
    const recentPrescription = prescriptions
      .filter(p => p.symptoms === symptoms)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
    
    if (recentPrescription) {
      setSelectedExistingPrescription(recentPrescription);
      // Pre-fill form with existing data
      form.setValue("symptoms", recentPrescription.symptoms);
      form.setValue("notes", recentPrescription.notes || "");
      
      // Pre-fill medicines if they exist
      if (Array.isArray(recentPrescription.medicines) && recentPrescription.medicines.length > 0) {
        form.setValue("medicines", recentPrescription.medicines.map((med: any) => ({
          medicineId: med.medicineId || "",
          dosage: med.dosage || "",
          frequency: med.frequency || "",
          duration: med.duration || "",
          instructions: med.instructions || ""
        })));
      }
    }
  };

  const resetPrescriptionModal = () => {
    setIsAddingPrescription(false);
    setPrescriptionType(null);
    setSelectedExistingPrescription(null);
    setMedicineSuggestions([]);
    setShowSuggestions(false);
    setShowEditModal(false);
    setEditingPrescription(null);
    form.reset();
  };

  const getMedicineSuggestions = async (symptoms: string) => {
    if (!symptoms.trim()) return;
    
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/medicines/suggestions?symptoms=${encodeURIComponent(symptoms)}`);
      const data = await response.json();
      setMedicineSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to get medicine suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const getAISuggestions = async () => {
    const symptoms = form.getValues("symptoms");
    if (!symptoms.trim()) {
      toast({
        title: "Error",
        description: "Please enter symptoms first",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await apiRequest('POST', '/api/medicines/ai-suggestions', { symptoms });
      const aiSuggestions = (response as any).suggestions || [];
      setMedicineSuggestions(prev => [...prev, ...aiSuggestions]);
      setShowSuggestions(true);
      toast({
        title: "Success",
        description: `Found ${aiSuggestions.length} AI-powered suggestions`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };



  if (patientLoading || !patient) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile && (
          <div className="mobile-header">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/patients')}
                  className="touch-target p-2 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">Patient Details</h1>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile && (
          <div className="mobile-header">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/patients')}
                  className="touch-target p-2 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">Patient Details</h1>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Patient not found</h2>
            <p className="text-muted-foreground">The patient you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile && (
        <div className="mobile-header">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/patients')}
                className="touch-target p-2 -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Patient Details</h1>
            </div>
            {(user as any)?.canDeletePatients && (
              <Button
                size="sm"
                variant="destructive"
                className="touch-target"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${patient?.name}? This will also delete all their prescriptions and appointments. This action cannot be undone.`)) {
                    deletePatientMutation.mutate(patient?.id!);
                  }
                }}
                disabled={deletePatientMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className={`${isMobile ? 'pt-16 pb-20' : 'p-6'} space-y-6 max-w-4xl mx-auto`}>
        {!isMobile && (
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/patients')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Patients</span>
            </Button>
          </div>
        )}

        {/* Patient Information Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{patient.name}</h2>
                  <p className="text-sm text-muted-foreground">Patient ID: {patient.patientId}</p>
                </div>
              </CardTitle>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary">
                  {patient.gender}, {patient.age} years
                </Badge>
                {/* Desktop Delete Button */}
                {(user as any)?.canDeletePatients && !isMobile && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="touch-target"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${patient.name}? This will also delete all their prescriptions and appointments. This action cannot be undone.`)) {
                        deletePatientMutation.mutate(patient.id);
                      }
                    }}
                    disabled={deletePatientMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletePatientMutation.isPending ? 'Deleting...' : 'Delete Patient'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{patient.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{patient.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Registered: {format(new Date(patient.createdAt!), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </CardContent>
          
          {/* Mobile Delete Button */}
          {(user as any)?.canDeletePatients && isMobile && (
            <CardContent className="pt-0">
              <Button
                variant="destructive"
                className="w-full touch-target"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${patient.name}? This will also delete all their prescriptions and appointments. This action cannot be undone.`)) {
                    deletePatientMutation.mutate(patient.id);
                  }
                }}
                disabled={deletePatientMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deletePatientMutation.isPending ? 'Deleting Patient...' : 'Delete Patient'}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Prescriptions Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Prescriptions ({prescriptions.length})</span>
            </CardTitle>
            <Button 
              size={isMobile ? "sm" : "default"} 
              className="flex items-center space-x-2"
              onClick={() => {
                console.log('Add Prescription clicked');
                setIsAddingPrescription(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Prescription</span>
            </Button>
            
            <Dialog open={isAddingPrescription} onOpenChange={resetPrescriptionModal}>
              <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[90vh]' : 'max-w-2xl max-h-[80vh]'} overflow-hidden`}>
                <DialogHeader>
                  <DialogTitle>Add New Prescription</DialogTitle>
                  <DialogDescription>
                    Create a new prescription for {patient.name}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {!prescriptionType ? (
                    // Disease Type Selection
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <h3 className="text-lg font-medium mb-2">Select Prescription Type</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Choose whether this is for a new condition or an existing one
                        </p>
                      </div>
                      
                      <div className="grid gap-4">
                        <Card 
                          className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/50"
                          onClick={() => setPrescriptionType('form')}
                        >
                          <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <h4 className="font-medium mb-2">New Disease/Condition</h4>
                            <p className="text-sm text-muted-foreground">
                              Create a prescription for a new health condition or symptoms
                            </p>
                          </CardContent>
                        </Card>
                        
                        {previousDiseases.length > 0 && (
                          <Card 
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/50"
                            onClick={() => setPrescriptionType('existing')}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="h-6 w-6 text-secondary-foreground" />
                              </div>
                              <h4 className="font-medium mb-2">Existing Disease/Condition</h4>
                              <p className="text-sm text-muted-foreground">
                                Select from previous conditions ({previousDiseases.length} available)
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetPrescriptionModal}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : prescriptionType === 'existing' ? (
                    // Existing Disease Selection
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Select Existing Condition</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrescriptionType(null)}
                        >
                          Back
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {previousDiseases.map((disease, index) => {
                          const prescriptionCount = prescriptions.filter(p => p.symptoms === disease).length;
                          const lastPrescription = prescriptions
                            .filter(p => p.symptoms === disease)
                            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
                            
                          return (
                            <Card 
                              key={index}
                              className="cursor-pointer hover:bg-accent/50 transition-colors border hover:border-primary/50"
                              onClick={() => {
                                handleExistingDiseaseSelect(disease);
                                setPrescriptionType('form');
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium mb-1">{disease}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {prescriptionCount} previous prescription{prescriptionCount !== 1 ? 's' : ''}
                                    </p>
                                    {lastPrescription && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Last treated: {format(new Date(lastPrescription.createdAt!), 'MMM dd, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="secondary">
                                    {prescriptionCount}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Prescription Form
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                          {selectedExistingPrescription ? 'Update Prescription' : 'New Prescription'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedExistingPrescription) {
                              setPrescriptionType('existing');
                              setSelectedExistingPrescription(null);
                              form.reset();
                            } else {
                              setPrescriptionType(null);
                            }
                          }}
                        >
                          Back
                        </Button>
                      </div>
                      
                      {selectedExistingPrescription && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Form is pre-filled with previous prescription data. 
                            You can modify medicines and dosages as needed.
                          </p>
                        </div>
                      )}
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="symptoms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Symptoms</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe symptoms (suggestions will appear automatically)" 
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Debounce the suggestion call
                                      clearTimeout((window as any).suggestionTimeout);
                                      (window as any).suggestionTimeout = setTimeout(() => {
                                        getMedicineSuggestions(e.target.value);
                                      }, 500);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                                
                                <div className="flex gap-2 mt-2">
                                  {(user as any)?.aiFeatureEnabled !== false && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={getAISuggestions}
                                      disabled={isLoadingSuggestions}
                                    >
                                      {isLoadingSuggestions ? "Getting AI Suggestions..." : "🤖 Get AI Suggestions"}
                                    </Button>
                                  )}
                                  {showSuggestions && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowSuggestions(!showSuggestions)}
                                    >
                                      {showSuggestions ? "Hide" : "Show"} Suggestions ({medicineSuggestions.length})
                                    </Button>
                                  )}
                                </div>
                                
                                {showSuggestions && medicineSuggestions.length > 0 && (
                                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2">Medicine Suggestions:</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {medicineSuggestions
                                        .filter(suggestion => (user as any)?.aiFeatureEnabled !== false || suggestion.source !== 'ai')
                                        .map((suggestion, index) => (
                                        <div key={index} className="flex items-start justify-between bg-white p-2 rounded border">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">
                                              {suggestion.name} {suggestion.power && `(${suggestion.power})`}
                                              <span className="ml-2 text-xs bg-gray-100 px-1 rounded">
                                                {suggestion.source === 'ai' ? '🤖 AI' : '💾 DB'}
                                              </span>
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {suggestion.dosage} • {suggestion.frequency || 'As needed'} • {suggestion.duration || 'As directed'}
                                            </p>
                                            {suggestion.reasoning && (
                                              <p className="text-xs text-gray-500 mt-1">{suggestion.reasoning}</p>
                                            )}
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addSuggestedMedicine(suggestion)}
                                            className="ml-2 text-xs"
                                          >
                                            Add
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <FormLabel>Medicines</FormLabel>
                              <Button type="button" variant="outline" size="sm" onClick={addMedicineToForm}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Medicine
                              </Button>
                            </div>

                            {form.watch("medicines").map((_, index) => (
                              <Card key={index} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Medicine {index + 1}</h4>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeMedicineFromForm(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`medicines.${index}.medicineId`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Medicine</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select medicine" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {medicines.map((medicine) => (
                                              <SelectItem key={medicine.id} value={medicine.id}>
                                                {medicine.name} {medicine.power && `(${medicine.power})`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                      control={form.control}
                                      name={`medicines.${index}.dosage`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Dosage</FormLabel>
                                          <FormControl>
                                            <Input placeholder="e.g., 3 drops, 2 pills" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`medicines.${index}.frequency`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Frequency</FormLabel>
                                          <FormControl>
                                            <Input placeholder="e.g., 3x daily" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`medicines.${index}.duration`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Duration</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g., 15 days" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`medicines.${index}.instructions`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Instructions (Optional)</FormLabel>
                                        <FormControl>
                                          <Textarea placeholder="Special instructions" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </Card>
                            ))}
                          </div>

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Additional notes" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                      <div className="flex space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (selectedExistingPrescription) {
                              setPrescriptionType('existing');
                              setSelectedExistingPrescription(null);
                              form.reset();
                            } else {
                              setPrescriptionType(null);
                            }
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addPrescriptionMutation.isPending}
                          className="flex-1"
                        >
                          {addPrescriptionMutation.isPending ? "Adding..." : "Add Prescription"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {prescriptionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No prescriptions yet</h3>
                <p className="text-muted-foreground">Add the first prescription for this patient.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <Card key={prescription.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">Prescription #{prescription.prescriptionId}</h4>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(prescription.createdAt!), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} medicines
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => showPrintPreviewModal(prescription)}
                              className="h-8 w-8 p-0"
                              title="Print Prescription"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendPrescriptionViaWhatsApp(prescription)}
                              className="h-8 w-8 p-0"
                              title="Send via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPrescription(prescription)}
                              className="h-8 w-8 p-0"
                              title="Edit Prescription"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium">Symptoms:</p>
                            <p className="text-sm text-muted-foreground">{prescription.symptoms}</p>
                          </div>
                          
                          {Array.isArray(prescription.medicines) && prescription.medicines.length > 0 && (
                            <div>
                              <p className="text-sm font-medium">Medicines:</p>
                              <div className="space-y-2 mt-2">
                                {(prescription.medicines as any[]).map((med: any, index: number) => (
                                  <div key={index} className="bg-muted rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {medicines.find(m => m.id === med.medicineId)?.name || 'Unknown Medicine'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {med.dosage} • {med.frequency} • {med.duration}
                                        </p>
                                        {med.instructions && (
                                          <p className="text-xs text-muted-foreground italic mt-1">
                                            {med.instructions}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {prescription.notes && (
                            <div>
                              <p className="text-sm font-medium">Notes:</p>
                              <p className="text-sm text-muted-foreground">{prescription.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Edit Prescription Modal */}
        <Dialog open={showEditModal} onOpenChange={() => setShowEditModal(false)}>
          <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[90vh]' : 'max-w-2xl max-h-[80vh]'} overflow-hidden`}>
            <DialogHeader>
              <DialogTitle>Edit Prescription</DialogTitle>
              <DialogDescription>
                Update prescription for {patient?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symptoms/Disease</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the symptoms..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Medicines</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMedicineToForm}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medicine
                      </Button>
                    </div>
                    
                    {form.watch("medicines").map((_, index) => (
                      <Card key={index} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Medicine {index + 1}</h4>
                          {form.watch("medicines").length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMedicineFromForm(index)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`medicines.${index}.medicineId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Medicine</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select medicine" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {medicines.map((medicine) => (
                                      <SelectItem key={medicine.id} value={medicine.id}>
                                        {medicine.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`medicines.${index}.dosage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dosage</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 30C" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`medicines.${index}.frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 3 times daily" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`medicines.${index}.duration`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 15 days" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`medicines.${index}.instructions`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instructions (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Take before meals" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Card>
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updatePrescriptionMutation.isPending}
                      className="min-w-[100px]"
                    >
                      {updatePrescriptionMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Updating...</span>
                        </div>
                      ) : (
                        "Update Prescription"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
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
            
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-3">
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
                          <h5 className="font-medium text-sm">{template.templateName}</h5>
                          <p className="text-xs text-muted-foreground">{template.templateDescription || 'Custom template'}</p>
                          {template.isDefault && (
                            <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Section */}
              {selectedPrescriptionToPrint && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Preview:</h4>
                  <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          if (!selectedCustomTemplate) {
                            return '<div class="text-center py-8">Select a template to preview</div>';
                          }

                          const doctorName = (user as any)?.name || 'Dr. [Doctor Name]';
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

                          // If it's a custom HTML template, use the template content with variable replacement
                          if (selectedCustomTemplate.templateType === 'html' && selectedCustomTemplate.templateContent) {
                            let templateHtml = selectedCustomTemplate.templateContent;
                            
                            // Replace template variables with actual data
                            templateHtml = templateHtml.replace(/\{\{doctorName\}\}/g, doctorName);
                            templateHtml = templateHtml.replace(/\{\{clinicName\}\}/g, (user as any)?.clinicName || 'My Homeo Health Clinic');
                            templateHtml = templateHtml.replace(/\{\{degree\}\}/g, (user as any)?.degree || '');
                            templateHtml = templateHtml.replace(/\{\{specialist\}\}/g, (user as any)?.specialist || 'Homeopathic Specialist');
                            templateHtml = templateHtml.replace(/\{\{patientName\}\}/g, patient?.name || '');
                            templateHtml = templateHtml.replace(/\{\{patientId\}\}/g, patient?.patientId || '');
                            templateHtml = templateHtml.replace(/\{\{patientAge\}\}/g, patient?.age?.toString() || '');
                            templateHtml = templateHtml.replace(/\{\{patientGender\}\}/g, patient?.gender || '');
                            templateHtml = templateHtml.replace(/\{\{patientPhone\}\}/g, patient?.phone || '');
                            templateHtml = templateHtml.replace(/\{\{date\}\}/g, format(new Date(selectedPrescriptionToPrint.createdAt!), 'dd/MM/yyyy'));
                            templateHtml = templateHtml.replace(/\{\{prescriptionId\}\}/g, selectedPrescriptionToPrint.prescriptionId || '');
                            templateHtml = templateHtml.replace(/\{\{symptoms\}\}/g, selectedPrescriptionToPrint.symptoms || '');
                            templateHtml = templateHtml.replace(/\{\{notes\}\}/g, selectedPrescriptionToPrint.notes || '');
                            
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
                            
                            return `<div style="transform: scale(0.8); transform-origin: top left;">${templateHtml}</div>`;
                          }
                          
                          // If it's a file template, show file info
                          if (selectedCustomTemplate.templateType === 'file') {
                            return `
                              <div class="text-center py-8">
                                <div class="text-lg font-medium mb-2">File Template Preview</div>
                                <div class="text-sm text-muted-foreground mb-4">
                                  Template: ${selectedCustomTemplate.templateName}<br>
                                  File: ${selectedCustomTemplate.fileName || 'Custom file'}
                                </div>
                                <div class="text-xs text-muted-foreground">
                                  File templates will be used directly for printing.<br>
                                  Preview is not available for uploaded files.
                                </div>
                              </div>
                            `;
                          }
                          
                          return '<div class="text-center py-8">Template type not supported</div>';
                        })()
                      }}
                    />
                  </div>
                </div>
              )}
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
    </div>
  );
}