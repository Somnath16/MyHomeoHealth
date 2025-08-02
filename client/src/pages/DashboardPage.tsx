import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarCheck, Users, FileText, Clock, Activity, AlertTriangle, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardPageProps {
  user: any;
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const { t, translateData } = useLanguage();
  const { data: stats, isLoading: isLoadingStats } = useQuery<any>({
    queryKey: ["/api/stats/dashboard"],
  });

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });

  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery<any[]>({
    queryKey: ["/api/prescriptions"],
  });

  const { data: medicines = [], isLoading: isLoadingMedicines } = useQuery<any[]>({
    queryKey: ["/api/medicines"],
  });

  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  
  const todayAppointments = appointments.filter((apt: any) => {
    const aptDate = format(new Date(apt.dateTime), 'yyyy-MM-dd');
    return aptDate === todayString && apt.status !== 'completed';
  });

  const recentPatients = patients
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Prepare data for symptoms breakdown chart
  const symptomsData = prescriptions.reduce((acc: any, prescription: any) => {
    if (prescription.symptoms) {
      const symptoms = prescription.symptoms.toLowerCase();
      // Extract common symptoms - more comprehensive matching
      const commonSymptoms = ['fever', 'headache', 'cough', 'cold', 'stomach', 'pain', 'anxiety', 'fatigue', 'weakness', 'nausea', 'dizziness', 'insomnia'];
      
      // Check for multiple symptoms in the text
      commonSymptoms.forEach(symptom => {
        if (symptoms.includes(symptom)) {
          acc[symptom] = (acc[symptom] || 0) + 1;
        }
      });
      
      // If no common symptoms found, categorize as 'other'
      const hasCommonSymptom = commonSymptoms.some(symptom => symptoms.includes(symptom));
      if (!hasCommonSymptom) {
        acc['other'] = (acc['other'] || 0) + 1;
      }
    }
    return acc;
  }, {});

  const symptomsChartData = Object.entries(symptomsData)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value as number,
    }))
    .sort((a, b) => b.value - a.value) // Sort by value descending
    .slice(0, 6); // Top 6 symptoms

  // Prepare data for patient type chart (new vs existing)
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const newPatients = patients.filter((patient: any) => 
    new Date(patient.createdAt) >= thirtyDaysAgo
  ).length;
  
  const existingPatients = patients.length - newPatients;

  const patientTypeData = [
    { name: 'New Patients (30 days)', value: newPatients },
    { name: 'Existing Patients', value: existingPatients },
  ];

  // Get low stock medicines
  const lowStockMedicines = medicines.filter((medicine: any) => 
    (medicine.currentStock || 0) <= (medicine.lowStockThreshold || 10)
  );

  // Export functions
  const exportToExcel = (data: any[], filename: string) => {
    // Simple CSV export (Excel compatible)
    const headers = ['Medicine Name', 'Code', 'Current Stock', 'Low Stock Threshold', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.map(medicine => [
        `"${medicine.name}"`,
        medicine.code,
        medicine.currentStock || 0,
        medicine.lowStockThreshold || 10,
        (medicine.currentStock || 0) <= (medicine.lowStockThreshold || 10) ? 'Low Stock' : 'In Stock'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], filename: string) => {
    // Create a simple HTML table for printing
    const htmlContent = `
      <html>
        <head>
          <title>Low Stock Medicines Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .low-stock { color: #dc2626; font-weight: bold; }
            .in-stock { color: #16a34a; }
          </style>
        </head>
        <body>
          <h1>Low Stock Medicines Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Code</th>
                <th>Current Stock</th>
                <th>Low Stock Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(medicine => `
                <tr>
                  <td>${medicine.name}</td>
                  <td>${medicine.code}</td>
                  <td>${medicine.currentStock || 0}</td>
                  <td>${medicine.lowStockThreshold || 10}</td>
                  <td class="${(medicine.currentStock || 0) <= (medicine.lowStockThreshold || 10) ? 'low-stock' : 'in-stock'}">
                    ${(medicine.currentStock || 0) <= (medicine.lowStockThreshold || 10) ? 'Low Stock' : 'In Stock'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  console.log('Prescriptions data:', prescriptions.length);
  console.log('Symptoms chart data:', symptomsChartData);
  console.log('Patient type data:', patientTypeData);

  // Colors for charts
  const SYMPTOM_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const PATIENT_TYPE_COLORS = ['#00C49F', '#0088FE'];

  const statCards = [
    {
      title: t('dashboard.stats.appointments'),
      value: stats?.todayAppointments || 0,
      icon: CalendarCheck,
      color: "bg-primary bg-opacity-10 text-primary",
      onClick: () => onNavigate('appointments'),
    },
    {
      title: t('dashboard.stats.patients'),
      value: stats?.totalPatients || 0,
      icon: Users,
      color: "bg-secondary bg-opacity-10 text-secondary",
      onClick: () => onNavigate('patients'),
    },
    {
      title: t('dashboard.stats.prescriptions'),
      value: stats?.prescriptionsToday || 0,
      icon: FileText,
      color: "bg-accent bg-opacity-10 text-accent",
      onClick: () => onNavigate('prescriptions'),
    },
    {
      title: t('dashboard.stats.pending'),
      value: stats?.pendingAppointments || 0,
      icon: Clock,
      color: "bg-orange-500 bg-opacity-10 text-orange-500",
      onClick: () => onNavigate('appointments'),
    },
  ];

  if (isLoadingStats || isLoadingAppointments || isLoadingPatients) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-neutral-200 rounded-lg"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-neutral-200 rounded w-12"></div>
                  <div className="h-4 bg-neutral-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="pb-20 space-y-6">
      {/* Dashboard Stats Cards */}
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-neutral-800">Today's Overview</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <Card 
                key={index}
                className="shadow-sm border border-neutral-200 card-hover cursor-pointer"
                onClick={stat.onClick}
              >
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
      </section>

      {/* Analytics Charts */}
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-neutral-800">Analytics Overview</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Symptoms Breakdown Chart */}
          <Card className="shadow-sm border border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Symptoms Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrescriptions ? (
                <div className="h-64 bg-gray-100 rounded animate-pulse" />
              ) : symptomsChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No symptoms data available</p>
                    <p className="text-xs text-neutral-400 mt-1">Add prescriptions with symptoms to see chart</p>
                  </div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={symptomsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {symptomsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SYMPTOM_COLORS[index % SYMPTOM_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Type Distribution Chart */}
          <Card className="shadow-sm border border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Patient Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPatients ? (
                <div className="h-64 bg-gray-100 rounded animate-pulse" />
              ) : patientTypeData.every(item => item.value === 0) ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No patient data available</p>
                    <p className="text-xs text-neutral-400 mt-1">Add patients to see distribution chart</p>
                  </div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={patientTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {patientTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PATIENT_TYPE_COLORS[index % PATIENT_TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Today's Appointments */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">{t('dashboard.stats.appointments')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-primary font-medium"
            onClick={() => onNavigate('appointments')}
          >
            {t('view.all')}
          </Button>
        </div>
        
        <div className="space-y-3">
          {todayAppointments.length === 0 ? (
            <Card className="shadow-sm border border-neutral-200">
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No appointments scheduled for today</p>
              </CardContent>
            </Card>
          ) : (
            todayAppointments.slice(0, 3).map((appointment: any) => (
              <Card key={appointment.id} className="shadow-sm border border-neutral-200 card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm">
                          {appointment.patientName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-neutral-800">{appointment.patientName || 'Unknown Patient'}</h4>
                        <p className="text-sm text-neutral-500">ID: {appointment.patientId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-800">
                        {format(new Date(appointment.dateTime), 'h:mm a')}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        appointment.status === 'completed' 
                          ? 'bg-green-100 text-green-600'
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {appointment.status === 'completed' ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => onNavigate('patients')}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => onNavigate('prescriptions')}
                    >
                      {appointment.status === 'completed' ? 'View Prescription' : 'Add Prescription'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Recent Patients */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">{t('recent.patients')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-primary font-medium"
            onClick={() => onNavigate('patients')}
          >
            {t('view.all')}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {recentPatients.length === 0 ? (
            <Card className="shadow-sm border border-neutral-200">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No patients registered yet</p>
              </CardContent>
            </Card>
          ) : (
            recentPatients.map((patient: any) => (
              <Card key={patient.id} className="shadow-sm border border-neutral-200 card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-secondary to-accent text-white text-sm">
                          {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-neutral-800">{patient.name}</h4>
                        <p className="text-sm text-neutral-500">
                          {patient.gender}, {patient.age} • {patient.patientId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">Registered</p>
                      <p className="text-sm font-medium text-neutral-700">
                        {format(new Date(patient.createdAt), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => onNavigate('patients')}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="touch-target px-3"
                      onClick={() => onNavigate('appointments')}
                    >
                      <CalendarCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Low Stock Medicines */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-neutral-800">Low Stock Medicines</h3>
            {lowStockMedicines.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                {lowStockMedicines.length}
              </span>
            )}
          </div>
          {lowStockMedicines.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(lowStockMedicines, 'low-stock-medicines')}
                className="text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPDF(lowStockMedicines, 'low-stock-medicines')}
                className="text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {lowStockMedicines.length === 0 ? (
            <Card className="shadow-sm border border-neutral-200">
              <CardContent className="p-6 text-center">
                <Activity className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-neutral-500">All medicines are well stocked</p>
                <p className="text-xs text-neutral-400 mt-1">No medicines below stock threshold</p>
              </CardContent>
            </Card>
          ) : (
            lowStockMedicines.map((medicine: any) => (
              <Card key={medicine.id} className="shadow-sm border border-neutral-200 card-hover bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-800">{medicine.name}</h4>
                        <p className="text-sm text-neutral-500">Code: {medicine.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">
                        Stock: {medicine.currentStock || 0}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Alert at: {medicine.lowStockThreshold || 10}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => onNavigate('medicines')}
                    >
                      Update Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="touch-target px-3"
                      onClick={() => onNavigate('medicines')}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
