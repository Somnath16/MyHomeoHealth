import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users, Clock, CheckCircle, Search, Activity, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { AuthUser } from '@/lib/auth';
import type { Appointment, Patient } from '@shared/schema';

interface DashboardPageDesktopProps {
  user: AuthUser;
  onNavigate: (page: string) => void;
}

export const DashboardPageDesktop: React.FC<DashboardPageDesktopProps> = ({
  user,
  onNavigate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const itemsPerPage = 4;
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery<any[]>({
    queryKey: ["/api/prescriptions"],
  });

  // Enrich appointments with patient data
  const enrichedAppointments = appointments.map((appointment: any) => {
    const patient = patients.find((p: any) => p.id === appointment.patientId);
    return {
      ...appointment,
      patientName: patient?.name || 'Unknown Patient',
      patientCustomId: patient?.patientId || 'N/A',
    };
  });

  const todayAppointments = enrichedAppointments.filter((apt) => {
    const today = new Date().toDateString();
    return new Date(apt.dateTime).toDateString() === today && apt.status !== 'completed';
  });

  const pendingAppointments = enrichedAppointments.filter((apt) => apt.status === 'upcoming');
  const completedToday = enrichedAppointments.filter((apt) => {
    const today = new Date().toDateString();
    return new Date(apt.dateTime).toDateString() === today && apt.status === 'completed';
  });

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

  // Colors for charts
  const SYMPTOM_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const PATIENT_TYPE_COLORS = ['#00C49F', '#0088FE'];

  // Filter appointments for display (excluding completed ones)
  const upcomingAppointments = enrichedAppointments.filter((apt: any) => apt.status !== 'completed');
  
  // Filter appointments based on search term
  const filteredAppointments = upcomingAppointments.filter((apt: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      apt.patientName?.toLowerCase().includes(searchLower) ||
      apt.patientCustomId?.toLowerCase().includes(searchLower) ||
      apt.id?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Prepare medicine usage data based on selected period
  const getMedicineUsageData = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Filter prescriptions by date range
    const filteredPrescriptions = prescriptions.filter((prescription: any) => {
      const prescriptionDate = new Date(prescription.createdAt);
      return prescriptionDate >= startDate && prescriptionDate <= now;
    });

    // Count medicine usage
    const medicineUsage: { [key: string]: number } = {};
    
    filteredPrescriptions.forEach((prescription: any) => {
      if (prescription.medicines && Array.isArray(prescription.medicines)) {
        prescription.medicines.forEach((medicine: any) => {
          // Now medicine.name should be populated from the backend
          const medicineName = medicine.name;
          
          if (medicineName && medicineName !== 'Unknown Medicine') {
            medicineUsage[medicineName] = (medicineUsage[medicineName] || 0) + 1;
          }
        });
      }
    });

    // Convert to chart data and sort by usage
    return Object.entries(medicineUsage)
      .map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 medicines
  };

  const medicineUsageData = getMedicineUsageData();

  const periodOptions = [
    { value: 'week', label: '1 Week' },
    { value: 'month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
  ];

  const stats = [
    {
      title: "TODAY'S APPOINTMENTS",
      value: todayAppointments.length,
      icon: Calendar,
      color: "bg-blue-500",
      bgClass: "bg-blue-50"
    },
    {
      title: "TOTAL PATIENTS", 
      value: patients.length,
      icon: Users,
      color: "bg-green-500",
      bgClass: "bg-green-50"
    },
    {
      title: "PENDING",
      value: pendingAppointments.length,
      icon: Clock,
      color: "bg-orange-500", 
      bgClass: "bg-orange-50"
    },
    {
      title: "COMPLETED TODAY",
      value: completedToday.length,
      icon: CheckCircle,
      color: "bg-green-500",
      bgClass: "bg-green-50"
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={`${stat.bgClass} border-0 shadow-sm`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 tracking-wide uppercase">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-full`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Appointments Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Upcoming Appointments</CardTitle>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'numeric', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search patient..." 
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                {searchTerm ? `No appointments found for "${searchTerm}"` : 'No upcoming appointments'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Appointment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentAppointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appointment.appointmentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(appointment.dateTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.patientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.patientCustomId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            appointment.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => onNavigate('appointments')}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symptoms Breakdown Chart */}
        <Card className="shadow-sm">
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
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No symptoms data available</p>
                  <p className="text-xs text-gray-400 mt-1">Add prescriptions with symptoms to see chart</p>
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
                      {symptomsChartData.map((entry: any, index: number) => (
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
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Patient Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No patient data available</p>
                  <p className="text-xs text-gray-400 mt-1">Add patients to see distribution chart</p>
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

      {/* Bottom Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicine Usage Volume Chart (Circular) */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Medicine Usage Volume</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                {periodOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedPeriod === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingPrescriptions ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : medicineUsageData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-center">
                  No medicine usage data available for the selected period
                </p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={medicineUsageData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {medicineUsageData.slice(0, 6).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={SYMPTOM_COLORS[index % SYMPTOM_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value} times`, 
                        'Used'
                      ]}
                      labelFormatter={(label: any, payload: any) => {
                        const data = payload?.[0]?.payload;
                        return data ? data.fullName : label;
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {medicineUsageData.length > 0 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Top 6 medicines in the last {periodOptions.find(p => p.value === selectedPeriod)?.label.toLowerCase()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointments vs Prescriptions Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Appointments vs Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: `Total Appointments (${appointments.length})`, value: appointments.length },
                      { name: `Total Prescriptions (${prescriptions.length})`, value: prescriptions.length }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#0088FE" />
                    <Cell fill="#00C49F" />
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              Appointments: {appointments.length} | Prescriptions: {prescriptions.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};