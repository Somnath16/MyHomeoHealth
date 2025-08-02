import { useState } from "react";

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Pill, Eye, MessageCircle, Bot, Upload, FileText, FileSpreadsheet, File, Filter, Download, AlertTriangle, Mic, MicOff, Globe, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface MedicinesPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function MedicinesPage({ user, onNavigate }: MedicinesPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [recognition, setRecognition] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    code: "",
    company: "",
    description: "",
    power: "",
    dosage: "",
    symptoms: "",
    currentStock: 0,
    lowStockThreshold: 10,
  });

  const [showLowStockFilter, setShowLowStockFilter] = useState(false);
  const [editMedicine, setEditMedicine] = useState({
    name: "",
    code: "",
    company: "",
    description: "",
    power: "",
    dosage: "",
    symptoms: "",
    currentStock: 0,
    lowStockThreshold: 10,
  });

  const { toast } = useToast();
  const { t, translateData } = useLanguage();
  const queryClient = useQueryClient();

  const { data: medicines = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/medicines"],
  });

  const createMedicineMutation = useMutation({
    mutationFn: async (medicineData: any) => {
      const response = await apiRequest("POST", "/api/medicines", medicineData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: t('common.success'),
        description: t('medicines.add') + " " + t('common.success').toLowerCase(),
      });
      setShowAddModal(false);
      setNewMedicine({ name: "", code: "", company: "", description: "", power: "", dosage: "", symptoms: "", currentStock: 0, lowStockThreshold: 10 });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'), 
        description: error.message || t('medicines.add') + " " + t('common.error').toLowerCase(),
        variant: "destructive",
      });
    },
  });

  const updateMedicineMutation = useMutation({
    mutationFn: async ({ id, medicineData }: { id: string; medicineData: any }) => {
      const response = await apiRequest("PATCH", `/api/medicines/${id}`, medicineData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: t('common.success'),
        description: t('medicines.edit') + " " + t('common.success').toLowerCase(),
      });
      setShowEditModal(false);
      setEditingMedicine(null);
      setEditMedicine({ name: "", code: "", company: "", description: "", power: "", dosage: "", symptoms: "", currentStock: 0, lowStockThreshold: 10 });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('medicines.edit') + " " + t('common.error').toLowerCase(), 
        variant: "destructive",
      });
    },
  });

  const uploadMedicinesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/medicines/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setUploadResults(data);
      toast({
        title: "Upload Successful",
        description: `${data.successful} medicines imported, ${data.failed} failed`,
      });
      setUploadFile(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload medicines",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const deleteMedicineMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: t('common.success'),
        description: "Medicine deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Failed to delete medicine",
        variant: "destructive",
      });
    },
  });

  // Filter medicines based on search term and low stock filter
  const filteredMedicines = medicines.filter((medicine: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      medicine.name.toLowerCase().includes(searchLower) ||
      medicine.code.toLowerCase().includes(searchLower) ||
      (medicine.company && medicine.company.toLowerCase().includes(searchLower)) ||
      (medicine.symptoms && medicine.symptoms.toLowerCase().includes(searchLower)) ||
      (medicine.description && medicine.description.toLowerCase().includes(searchLower))
    );
    
    if (showLowStockFilter) {
      const threshold = medicine.lowStockThreshold || user?.globalLowStockThreshold || 10;
      const isLowStock = medicine.currentStock <= threshold;
      return matchesSearch && isLowStock;
    }
    
    return matchesSearch;
  });

  // Get low stock medicines for filtering and exports
  const lowStockMedicines = medicines.filter((medicine: any) => {
    const threshold = medicine.lowStockThreshold || user?.globalLowStockThreshold || 10;
    return medicine.currentStock <= threshold;
  });

  // Export functionality
  const exportLowStockToCSV = () => {
    if (lowStockMedicines.length === 0) {
      toast({
        title: "No Data",
        description: "No low stock medicines to export",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["Medicine Name", "Code", "Current Stock", "Low Stock Threshold", "Description"].join(","),
      ...lowStockMedicines.map((medicine: any) => [
        `"${medicine.name}"`,
        medicine.code,
        medicine.currentStock || 0,
        medicine.lowStockThreshold || user?.globalLowStockThreshold || 10,
        `"${medicine.description || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `low-stock-medicines-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: t('export.successful'),
      description: t('export.csv.description'),
    });
  };

  const exportLowStockToPDF = () => {
    if (lowStockMedicines.length === 0) {
      toast({
        title: "No Data",
        description: "No low stock medicines to export",
        variant: "destructive",
      });
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>Low Stock Medicines Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .low-stock { background-color: #fee; color: #c53030; font-weight: bold; }
            .date { text-align: right; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
          <h1>Low Stock Medicines Report</h1>
          <p>Total medicines requiring attention: <strong>${lowStockMedicines.length}</strong></p>
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Code</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockMedicines.map((medicine: any) => `
                <tr class="low-stock">
                  <td>${medicine.name}</td>
                  <td>${medicine.code}</td>
                  <td>${medicine.currentStock || 0}</td>
                  <td>${medicine.lowStockThreshold || user?.globalLowStockThreshold || 10}</td>
                  <td>${medicine.description || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }

    toast({
      title: t('export.successful'),
      description: t('export.pdf.description'),
    });
  };

  const handleEditMedicine = (medicine: any) => {
    setEditingMedicine(medicine);
    setEditMedicine({
      name: medicine.name,
      code: medicine.code,
      company: medicine.company || "",
      description: medicine.description || "",
      power: medicine.power || "",
      dosage: medicine.dosage || "",
      symptoms: medicine.symptoms || "",
      currentStock: medicine.currentStock || 0,
      lowStockThreshold: medicine.lowStockThreshold || 10,
    });
    setShowEditModal(true);
  };

  const handleFileUpload = () => {
    if (!uploadFile) {
      toast({
        title: t('common.error'),
        description: t('upload.select.file'),
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
    if (!allowedTypes.includes(uploadFile.type)) {
      toast({
        title: t('common.error'),
        description: t('upload.formats'),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(t('upload.uploading'));
    uploadMedicinesMutation.mutate(uploadFile);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('csv')) return <FileText className="h-4 w-4" />;
    if (file.type.includes('sheet') || file.type.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    if (file.type.includes('pdf')) return <File className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleUpdateMedicine = () => {
    if (!editMedicine.name.trim() || !editMedicine.code.trim()) {
      toast({
        title: t('common.error'),
        description: t('form.required'),
        variant: "destructive",
      });
      return;
    }

    updateMedicineMutation.mutate({
      id: editingMedicine.id,
      medicineData: editMedicine,
    });
  };

  const handleAddMedicine = () => {
    if (!newMedicine.name.trim() || !newMedicine.code.trim()) {
      toast({
        title: t('common.error'),
        description: t('form.required'),
        variant: "destructive",
      });
      return;
    }

    createMedicineMutation.mutate(newMedicine);
  };

  const generateCode = (name: string) => {
    if (name.length >= 3) {
      let baseCode = name.substring(0, 3).toUpperCase();
      let uniqueCode = baseCode;
      let counter = 1;
      
      // Check if code already exists and generate unique one
      while (medicines.find(med => med.code === uniqueCode)) {
        uniqueCode = `${baseCode}${counter}`;
        counter++;
      }
      
      setNewMedicine(prev => ({ ...prev, code: uniqueCode }));
    }
  };

  // Voice Recognition Functions
  const initializeVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: t('common.error'),
        description: "Voice recognition not supported in this browser",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = voiceLanguage;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast({
        title: t('common.error'),
        description: `Voice recognition error: ${event.error}`,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const startVoiceRecognition = () => {
    const recognitionInstance = initializeVoiceRecognition();
    if (recognitionInstance) {
      setRecognition(recognitionInstance);
      recognitionInstance.start();
      toast({
        title: "Voice Input",
        description: voiceLanguage === "bn-BD" ? "বাংলায় বলুন..." : "Speak now...",
      });
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleVoiceLanguage = () => {
    const newLang = voiceLanguage === "en-US" ? "bn-BD" : "en-US";
    setVoiceLanguage(newLang);
    toast({
      title: "Language Changed",
      description: newLang === "bn-BD" ? "বাংলা ভয়েস ইনপুট সক্রিয়" : "English voice input activated",
    });
  };

  const handleAIDiscussion = async () => {
    if (!aiQuery.trim()) {
      toast({
        title: t('common.error'),
        description: t('ai.query.placeholder'),
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAI(true);
    try {
      const response = await apiRequest("POST", "/api/medicines/ai-discuss", { 
        query: aiQuery,
        language: voiceLanguage === "bn-BD" ? "bengali" : "english"
      });
      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('ai.try.again.later'),
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
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
          <h1 className="text-xl font-semibold text-neutral-800">{t('medicines.title') || 'Medicines'}</h1>
          <div className="flex space-x-2">
            {user.aiFeatureEnabled !== false && (
              <Button
                size="sm"
                variant="outline"
                className="touch-target"
                onClick={() => setShowAIModal(true)}
              >
                <Bot className="h-4 w-4 mr-2" />
                {t('medicines.discuss.ai') || 'Discuss with AI'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="touch-target"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
{t('button.upload.list')}
            </Button>
            <Button
              size="sm"
              className="touch-target"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('medicines.add') || 'Add Medicine'}
            </Button>
          </div>
        </div>

        {/* Filters and Export Row */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showLowStockFilter ? "default" : "outline"}
              onClick={() => setShowLowStockFilter(!showLowStockFilter)}
              className="touch-target"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('filter.low.stock')}
              {lowStockMedicines.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0.5 text-xs">
                  {lowStockMedicines.length}
                </Badge>
              )}
            </Button>
          </div>

          {lowStockMedicines.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportLowStockToCSV}
                className="touch-target"
              >
                <Download className="h-4 w-4 mr-2" />
{t('export.low.stock.csv')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportLowStockToPDF}
                className="touch-target"
              >
                <FileText className="h-4 w-4 mr-2" />
{t('export.low.stock.pdf')}
              </Button>
            </div>
          )}
        </div>
        
        {/* Search with Voice Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-12 form-input"
          />
          {/* Voice Search Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-2 h-8 w-8 ${
              isListening 
                ? 'text-red-500 hover:text-red-600 bg-red-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              if (isListening) {
                stopVoiceRecognition();
              } else {
                // For search, we'll use the current voiceLanguage and set search term instead of AI query
                const recognitionInstance = initializeVoiceRecognition();
                if (recognitionInstance) {
                  recognitionInstance.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setSearchTerm(transcript);
                    setIsListening(false);
                  };
                  setRecognition(recognitionInstance);
                  recognitionInstance.start();
                  toast({
                    title: "Voice Search",
                    description: voiceLanguage === "bn-BD" ? "খুঁজে পেতে বাংলায় বলুন..." : "Speak to search...",
                  });
                }
              }
            }}
            title={isListening ? "Stop voice search" : "Start voice search"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Voice Status Indicator for Search */}
        {isListening && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            <span>
              {voiceLanguage === "bn-BD" ? "খুঁজছি... বাংলায় বলুন" : "Listening for search... Speak now"}
            </span>
          </div>
        )}
      </div>

      {/* Medicines List */}
      <div className="p-4 space-y-3">
        {filteredMedicines.length === 0 ? (
          <Card className="shadow-sm border border-neutral-200">
            <CardContent className="p-8 text-center">
              <Pill className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">
{searchTerm ? t('medicine.no.found') : t('medicine.no.medicines')}
              </h3>
              <p className="text-neutral-500 mb-4">
{searchTerm 
                  ? t('medicine.try.different') 
                  : t('medicine.add.first')
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
{t('medicines.add')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredMedicines.map((medicine: any) => (
            <Card key={medicine.id} className="shadow-sm border border-neutral-200 card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-neutral-800">{translateData(medicine.name)}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {medicine.code}
                      </Badge>
                      {(medicine.currentStock || 0) <= (medicine.lowStockThreshold || 10) && (
                        <Badge variant="destructive" className="text-xs">
{t('medicine.low.stock')}
                        </Badge>
                      )}
                    </div>
                    {medicine.description && (
                      <p className="text-sm text-neutral-600 mb-2">{medicine.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-neutral-500">
                      {medicine.company && (
                        <span><strong>{t('medicine.company')}:</strong> {translateData(medicine.company)}</span>
                      )}
                      {medicine.power && (
                        <span><strong>{t('medicines.power')}:</strong> {translateData(medicine.power)}</span>
                      )}
                      {medicine.dosage && (
                        <span><strong>{t('medicines.dosage')}:</strong> {translateData(medicine.dosage)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="touch-target"
                      onClick={() => setSelectedMedicine(medicine)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="touch-target"
                      onClick={() => {
                        setEditingMedicine(medicine);
                        setEditMedicine({
                          name: medicine.name,
                          code: medicine.code,
                          company: medicine.company || "",
                          description: medicine.description || "",
                          power: medicine.power || "",
                          dosage: medicine.dosage || "",
                          symptoms: medicine.symptoms || "",
                          currentStock: medicine.currentStock || 0,
                          lowStockThreshold: medicine.lowStockThreshold || 10,
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {user?.canDeletePatients && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="touch-target"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${medicine.name}? This action cannot be undone.`)) {
                            deleteMedicineMutation.mutate(medicine.id);
                          }
                        }}
                        disabled={deleteMedicineMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                
                {medicine.symptoms && (
                  <div className="mb-3">
                    <p className="text-sm text-neutral-600 font-medium mb-1">{t('medicine.used.for')}:</p>
                    <p className="text-sm text-neutral-700">{translateData(medicine.symptoms)}</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-neutral-500">
                  <span>{t('medicine.stock.info')}: {medicine.currentStock || 0}</span>
                  <span>{t('medicine.alert.at')}: {medicine.lowStockThreshold || 10}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Medicine Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medicines.add')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('medicines.name')} *</Label>
              <Input
                id="name"
                value={newMedicine.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setNewMedicine(prev => ({ ...prev, name: newName }));
                  generateCode(newName);
                }}
                placeholder="e.g., Arnica Montana"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="code">{t('medicine.code')} *</Label>
              <Input
                id="code"
                value={newMedicine.code}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase();
                  setNewMedicine(prev => ({ ...prev, code }));
                  
                  // Check if code already exists
                  const existingMedicine = medicines.find(med => med.code === code);
                  if (existingMedicine && code.length > 0) {
                    // Show warning but don't prevent input
                    console.warn("Medicine code already exists:", code);
                  }
                }}
                placeholder="e.g., ARN"
                className={`form-input ${medicines.find(med => med.code === newMedicine.code) && newMedicine.code ? 'border-red-500' : ''}`}
                maxLength={10}
              />
              {medicines.find(med => med.code === newMedicine.code) && newMedicine.code && (
                <p className="text-sm text-red-500 mt-1">This medicine code already exists. Please use a unique code.</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">
                Auto-generated from medicine name or enter custom code
              </p>
            </div>

            <div>
              <Label htmlFor="company">Company/Manufacturer</Label>
              <Input
                id="company"
                value={newMedicine.company}
                onChange={(e) => setNewMedicine(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Boiron, Heel, SBL"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the medicine"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="power">Power</Label>
              <Input
                id="power"
                value={newMedicine.power}
                onChange={(e) => setNewMedicine(prev => ({ ...prev, power: e.target.value }))}
                placeholder="e.g., 30, 200, 1M"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="dosage">Dosage Instructions</Label>
              <Input
                id="dosage"
                value={newMedicine.dosage}
                onChange={(e) => setNewMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="e.g., 3 times daily, 2 drops twice daily"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="symptoms">Symptoms/Indications</Label>
              <Textarea
                id="symptoms"
                value={newMedicine.symptoms}
                onChange={(e) => setNewMedicine(prev => ({ ...prev, symptoms: e.target.value }))}
                placeholder="What symptoms or conditions this medicine is used for..."
                className="form-input min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={newMedicine.currentStock}
                  onChange={(e) => setNewMedicine(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="1"
                  value={newMedicine.lowStockThreshold}
                  onChange={(e) => setNewMedicine(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 10 }))}
                  placeholder="10"
                  className="form-input"
                />
              </div>
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
                onClick={handleAddMedicine}
                disabled={createMedicineMutation.isPending}
              >
                {createMedicineMutation.isPending ? "Adding..." : "Add Medicine"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medicine Details Modal */}
      <Dialog open={!!selectedMedicine} onOpenChange={() => setSelectedMedicine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medicine Details</DialogTitle>
          </DialogHeader>
          
          {selectedMedicine && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <h3 className="text-xl font-semibold text-neutral-800">{selectedMedicine.name}</h3>
                  <Badge variant="secondary">{selectedMedicine.code}</Badge>
                </div>
                
                {selectedMedicine.description && (
                  <p className="text-neutral-600 mb-4">{selectedMedicine.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-700">Medicine Code:</span>
                  <p>{selectedMedicine.code}</p>
                </div>
                {selectedMedicine.company && (
                  <div>
                    <span className="font-medium text-neutral-700">Company:</span>
                    <p>{selectedMedicine.company}</p>
                  </div>
                )}
                {selectedMedicine.power && (
                  <div>
                    <span className="font-medium text-neutral-700">Power:</span>
                    <p>{selectedMedicine.power}</p>
                  </div>
                )}
                {selectedMedicine.dosage && (
                  <div>
                    <span className="font-medium text-neutral-700">Dosage:</span>
                    <p>{selectedMedicine.dosage}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-neutral-700">Current Stock:</span>
                  <p className={(selectedMedicine.currentStock || 0) <= (selectedMedicine.lowStockThreshold || 10) ? 'text-red-600 font-semibold' : ''}>
                    {selectedMedicine.currentStock || 0}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Low Stock Alert:</span>
                  <p>{selectedMedicine.lowStockThreshold || 10}</p>
                </div>
              </div>

              {selectedMedicine.symptoms && (
                <div>
                  <span className="font-medium text-neutral-700">Symptoms/Indications:</span>
                  <p className="text-sm mt-1">{selectedMedicine.symptoms}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedMedicine(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleEditMedicine(selectedMedicine);
                    setSelectedMedicine(null);
                  }}
                >
                  Edit/Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Medicine Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Medicine Name *</Label>
              <Input
                id="edit-name"
                value={editMedicine.name}
                onChange={(e) => {
                  setEditMedicine(prev => ({ ...prev, name: e.target.value }));
                }}
                placeholder="e.g., Arnica Montana"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-code">Medicine Code *</Label>
              <Input
                id="edit-code"
                value={editMedicine.code}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase();
                  setEditMedicine(prev => ({ ...prev, code }));
                }}
                placeholder="e.g., ARN"
                className={`form-input ${medicines.find(med => med.code === editMedicine.code && med.id !== editingMedicine?.id) && editMedicine.code ? 'border-red-500' : ''}`}
                maxLength={10}
              />
              {medicines.find(med => med.code === editMedicine.code && med.id !== editingMedicine?.id) && editMedicine.code && (
                <p className="text-sm text-red-500 mt-1">This medicine code already exists. Please use a unique code.</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-company">Company/Manufacturer</Label>
              <Input
                id="edit-company"
                value={editMedicine.company}
                onChange={(e) => setEditMedicine(prev => ({ ...prev, company: e.target.value }))}
                placeholder="e.g., Boiron, Heel, SBL"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editMedicine.description}
                onChange={(e) => setEditMedicine(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the medicine"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-power">Power</Label>
              <Input
                id="edit-power"
                value={editMedicine.power}
                onChange={(e) => setEditMedicine(prev => ({ ...prev, power: e.target.value }))}
                placeholder="e.g., 30, 200, 1M"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-dosage">Dosage Instructions</Label>
              <Input
                id="edit-dosage"
                value={editMedicine.dosage}
                onChange={(e) => setEditMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="e.g., 3 times daily, 2 drops twice daily"
                className="form-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-symptoms">Symptoms/Indications</Label>
              <Textarea
                id="edit-symptoms"
                value={editMedicine.symptoms}
                onChange={(e) => setEditMedicine(prev => ({ ...prev, symptoms: e.target.value }))}
                placeholder="What symptoms or conditions this medicine is used for..."
                className="form-input min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-currentStock">Current Stock</Label>
                <Input
                  id="edit-currentStock"
                  type="number"
                  min="0"
                  value={editMedicine.currentStock}
                  onChange={(e) => setEditMedicine(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="form-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-lowStockThreshold">Low Stock Alert</Label>
                <Input
                  id="edit-lowStockThreshold"
                  type="number"
                  min="1"
                  value={editMedicine.lowStockThreshold}
                  onChange={(e) => setEditMedicine(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 10 }))}
                  placeholder="10"
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMedicine(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateMedicine}
                disabled={updateMedicineMutation.isPending}
              >
                {updateMedicineMutation.isPending ? "Updating..." : "Update Medicine"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Discussion Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <span>{t('medicines.discuss.title') || 'Discuss with AI'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Voice Language Selection */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Voice Language:</span>
                <span className="text-sm text-gray-600">
                  {voiceLanguage === "bn-BD" ? "বাংলা" : "English"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleVoiceLanguage}
                className="text-xs px-3"
              >
                Switch to {voiceLanguage === "bn-BD" ? "English" : "বাংলা"}
              </Button>
            </div>

            <div>
              <Label htmlFor="ai-query" className="text-sm font-medium">
                {t('medicines.discuss.query') || 'Ask about medicine usage or get medicine recommendations for diseases'}
              </Label>
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Textarea
                    id="ai-query"
                    placeholder={
                      voiceLanguage === "bn-BD" 
                        ? 'যেমন: "অ্যার্নিকা মন্টানা কিসের জন্য ব্যবহৃত হয়?" বা "জ্বর এবং মাথাব্যথার জন্য ঔষধ"'
                        : 'e.g., "What is Arnica Montana used for?" or "Medicines for fever and headache"'
                    }
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="min-h-[80px] pr-12"
                  />
                  {/* Voice Input Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute top-2 right-2 p-2 h-8 w-8 ${
                      isListening 
                        ? 'text-red-500 hover:text-red-600 bg-red-50' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Voice Status Indicator */}
                {isListening && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span>
                      {voiceLanguage === "bn-BD" ? "শুনছি... বাংলায় বলুন" : "Listening... Speak now"}
                    </span>
                  </div>
                )}

                <Button 
                  onClick={handleAIDiscussion}
                  disabled={isLoadingAI || !aiQuery.trim()}
                  className="w-full"
                >
                  {isLoadingAI ? (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2 animate-spin" />
                      {t('medicines.discuss.loading') || 'Getting AI Response...'}
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {t('medicines.discuss.ask') || 'Ask AI'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {aiResponse && (
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-primary">
                  {t('medicines.discuss.response') || 'AI Response:'}
                </Label>
                <ScrollArea className="mt-2 h-64 w-full rounded-md border p-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {translateData(aiResponse)}
                    </div>
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAiQuery("");
                      setAiResponse("");
                    }}
                  >
                    {t('medicines.discuss.clear') || 'Clear & Ask Again'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Medicines Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <span>Upload Medicine List</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Upload Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Supported File Formats:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>CSV:</strong> Comma-separated values (.csv)</li>
                <li>• <strong>Excel:</strong> Spreadsheet files (.xlsx, .xls)</li>
                <li>• <strong>PDF:</strong> Text-based PDF documents (.pdf)</li>
              </ul>
            </div>

            {/* Expected Format */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Expected Column Format:</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Required:</strong> Name, Code</p>
                <p><strong>Optional:</strong> Description, Power, Dosage, Symptoms</p>
              </div>
              <div className="mt-2 text-xs text-green-700 bg-green-100 rounded p-2 font-mono">
                Name, Code, Description, Power, Dosage, Symptoms<br/>
                Arnica Montana, ARN, For trauma, 30C, 3 times daily, Bruises and shock
              </div>
            </div>

            {/* File Upload Area */}
            <div className="space-y-4">
              <Label htmlFor="medicine-file">Select File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  id="medicine-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      setUploadResults(null);
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="medicine-file" className="cursor-pointer">
                  {uploadFile ? (
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      {getFileIcon(uploadFile)}
                      <span className="font-medium">{uploadFile.name}</span>
                      <span className="text-sm text-gray-500">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-gray-600">Click to select file or drag and drop</p>
                      <p className="text-sm text-gray-500">CSV, Excel, or PDF files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-800">{uploadProgress}</span>
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Upload Results:</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>✅ Successfully imported: <strong>{uploadResults.successful}</strong> medicines</p>
                  {uploadResults.failed > 0 && (
                    <p>❌ Failed to import: <strong>{uploadResults.failed}</strong> medicines</p>
                  )}
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside text-xs space-y-1 max-h-20 overflow-y-auto">
                        {uploadResults.errors.slice(0, 5).map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                        {uploadResults.errors.length > 5 && (
                          <li>... and {uploadResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadResults(null);
                  setUploadProgress("");
                }}
              >
                {uploadResults ? "Close" : "Cancel"}
              </Button>
              <Button
                className="flex-1"
                onClick={handleFileUpload}
                disabled={!uploadFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Medicines"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
