import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: 'en' | 'bn';
  setLanguage: (lang: 'en' | 'bn') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations: Record<'en' | 'bn', Record<string, string>> = {
  en: {
    // Header and Navigation
    'app.title': 'My Homeo Health',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patients',
    'nav.medicines': 'Medicines',
    'nav.appointments': 'Appointments',
    'nav.prescriptions': 'Prescriptions',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.calendar': 'Calendar',
    'nav.notifications': 'Notifications',
    'nav.admin': 'Admin Panel',
    'nav.menu': 'Menu',
    
    // Profile Modal
    'profile.title': 'Profile Settings',
    'profile.subtitle': 'Manage your profile information and account settings',
    'profile.tab.profile': 'Profile',
    'profile.tab.edit': 'Edit',
    'profile.tab.password': 'Password',
    'profile.tab.language': 'Language',
    'profile.tab.account': 'Account',
    'profile.information': 'Profile Information',
    'profile.user.details': 'User Details',
    'profile.edit.profile': 'Edit Profile',
    'profile.edit.information': 'Edit Profile Information',
    'profile.fullname': 'Full Name',
    'profile.username': 'Username',
    'profile.email': 'Email',
    'profile.phone': 'Phone',
    'profile.role': 'Role',
    'profile.clinic.name': 'Clinic Name',
    'profile.clinic.location': 'Clinic Location',
    'profile.degree': 'Degree',
    'profile.specialization': 'Specialization',
    'profile.not.provided': 'Not provided',
    'profile.username.readonly': 'Username (Read-only)',
    'profile.update': 'Update Profile',
    'profile.updating': 'Updating...',
    'profile.cancel': 'Cancel',
    
    // Password Tab
    'password.change': 'Change Password',
    'password.current': 'Current Password',
    'password.new': 'New Password',
    'password.confirm': 'Confirm New Password',
    'password.current.placeholder': 'Enter current password',
    'password.new.placeholder': 'Enter new password (min 6 chars)',
    'password.confirm.placeholder': 'Confirm new password',
    'password.update': 'Update Password',
    
    // Language Tab
    'language.settings': 'Language Settings',
    'language.select': 'Select Language',
    'language.description': 'Choose your preferred language for the interface',
    'language.english': 'English',
    'language.bengali': 'Bengali',
    'language.save': 'Save Language',
    'language.saving': 'Saving...',
    
    // Account Tab
    'account.actions': 'Account Actions',
    'account.information': 'Account Information',
    'account.name': 'Name',
    'account.username': 'Username',
    'account.role': 'Role',
    'account.email': 'Email',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.doctor': 'Doctor Dashboard',
    'dashboard.overview': 'Today\'s Overview',
    'dashboard.stats.appointments': 'Today\'s Appointments',
    'dashboard.stats.patients': 'Total Patients',
    'dashboard.stats.prescriptions': 'Prescriptions Today',
    'dashboard.stats.pending': 'Pending',
    
    // Patients
    'patients.title': 'Patients',
    'patients.add': 'Add Patient',
    'patients.edit': 'Edit Patient',
    'patients.delete': 'Delete Patient',
    'patients.view.details': 'View Details',
    'patients.name': 'Patient Name',
    'patients.age': 'Age',
    'patients.gender': 'Gender',
    'patients.phone': 'Phone',
    'patients.location': 'Location',
    'patients.address': 'Address',
    'patients.male': 'Male',
    'patients.female': 'Female',
    'patients.other': 'Other',
    'patients.created': 'Created',
    'patients.total': 'Total Patients',
    
    // Medicines
    'medicines.title': 'Medicines',
    'medicines.add': 'Add Medicine',
    'medicines.edit': 'Edit Medicine',
    'medicines.delete': 'Delete Medicine',
    'medicines.name': 'Medicine Name',
    'medicines.power': 'Power',
    'medicines.type': 'Type',
    'medicines.manufacturer': 'Manufacturer',
    'medicines.description': 'Description',
    'medicines.dosage': 'Dosage',
    'medicines.frequency': 'Frequency',
    'medicines.duration': 'Duration',
    'medicines.instructions': 'Instructions',
    'medicines.stock': 'Stock',
    'medicines.total': 'Total Medicines',
    
    // Appointments
    'appointments.title': 'Appointments',
    'appointments.book': 'Book Appointment',
    'appointments.edit': 'Edit Appointment',
    'appointments.cancel': 'Cancel Appointment',
    'appointments.date': 'Date',
    'appointments.time': 'Time',
    'appointments.patient': 'Patient',
    'appointments.doctor': 'Doctor',
    'appointments.status': 'Status',
    'appointments.notes': 'Notes',
    'appointments.scheduled': 'Scheduled',
    'appointments.completed': 'Completed',
    'appointments.cancelled': 'Cancelled',
    'appointments.today': 'Today\'s Appointments',
    'appointments.total': 'Total Appointments',
    
    // Prescriptions
    'prescriptions.title': 'Prescriptions',
    'prescriptions.add': 'Add Prescription',
    'prescriptions.edit': 'Edit Prescription',
    'prescriptions.view': 'View Prescription',
    'prescriptions.print': 'Print Prescription',
    'prescriptions.patient': 'Patient',
    'prescriptions.doctor': 'Doctor',
    'prescriptions.date': 'Date',
    'prescriptions.medicines': 'Medicines',
    'prescriptions.symptoms': 'Symptoms',
    'prescriptions.diagnosis': 'Diagnosis',
    'prescriptions.advice': 'Advice',
    'prescriptions.followup': 'Follow-up',
    'prescriptions.total': 'Total Prescriptions',
    
    // Forms
    'form.required': 'Required field',
    'form.invalid.email': 'Invalid email format',
    'form.invalid.phone': 'Invalid phone number',
    'form.password.mismatch': 'Passwords do not match',
    'form.submit': 'Submit',
    'form.reset': 'Reset',
    'form.clear': 'Clear',
    
    // Common Actions
    'action.add': 'Add',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.close': 'Close',
    'action.view': 'View',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.previous': 'Previous',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.refresh': 'Refresh',
    'action.print': 'Print',
    'action.download': 'Download',
    
    // Additional specific translations for pages
    'patients.search.placeholder': 'Search by name, ID, phone, or location...',
    'prescriptions.search.placeholder': 'Search by patient name, ID, or prescription ID...',
    'appointments.search.placeholder': 'Search by patient name or appointment ID...',
    'no.data.found': 'No data found',
    'try.different.search': 'Try adjusting your search terms',
    'add.first.item': 'Add your first item to get started',
    'filter.by.status': 'Filter by Status',
    'mark.completed': 'Mark Completed',
    'mark.cancelled': 'Mark Cancelled',
    'view.prescriptions': 'View Prescriptions',
    'prescription.id': 'Prescription ID',
    'appointment.id': 'Appointment ID',
    'patient.id': 'Patient ID',
    'created.date': 'Created Date',
    'date.time': 'Date & Time',
    'upcoming': 'Upcoming',
    'recent.patients': 'Recent Patients',
    'registered': 'Registered',
    'view.profile': 'View Profile',
    'low.stock.medicines': 'Low Stock Medicines',
    'update.stock': 'Update Stock',
    'symptoms.breakdown': 'Symptoms Breakdown',
    'patient.types': 'Patient Types',
    'medicine.usage.volume': 'Medicine Usage Volume',
    'new.patients.30.days': 'New Patients (30 days)',
    'existing.patients': 'Existing Patients',

    // Medicine Powers/Potencies (Homeopathic)
    'medicine.power.3x': '3X',
    'medicine.power.6x': '6X',
    'medicine.power.12x': '12X',
    'medicine.power.30': '30C',
    'medicine.power.200': '200C',
    'medicine.power.1m': '1M',
    'medicine.power.10m': '10M',
    'medicine.power.mother': 'Mother Tincture',
    
    // Common Symptoms
    'symptom.fever': 'Fever',
    'symptom.headache': 'Headache',
    'symptom.cough': 'Cough',
    'symptom.cold': 'Cold',
    'symptom.nausea': 'Nausea',
    'symptom.vomiting': 'Vomiting',
    'symptom.diarrhea': 'Diarrhea',
    'symptom.constipation': 'Constipation',
    'symptom.stomach.pain': 'Stomach Pain',
    'symptom.back.pain': 'Back Pain',
    'symptom.joint.pain': 'Joint Pain',
    'symptom.anxiety': 'Anxiety',
    'symptom.depression': 'Depression',
    'symptom.insomnia': 'Insomnia',
    'symptom.fatigue': 'Fatigue',
    
    // Time Frequencies
    'frequency.once.daily': 'Once daily',
    'frequency.twice.daily': 'Twice daily',
    'frequency.thrice.daily': 'Three times daily',
    'frequency.four.times': 'Four times daily',
    'frequency.every.4.hours': 'Every 4 hours',
    'frequency.every.6.hours': 'Every 6 hours',
    'frequency.every.8.hours': 'Every 8 hours',
    'frequency.as.needed': 'As needed',
    'frequency.before.meals': 'Before meals',
    'frequency.after.meals': 'After meals',
    
    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    
    // Messages
    'message.loading': 'Loading...',
    'message.saving': 'Saving...',
    'message.success': 'Success',
    'message.error': 'Error',
    'message.no.data': 'No data available',
    'message.no.results': 'No results found',
    
    // Admin Dashboard
    'admin.dashboard': 'Admin Dashboard',
    'admin.operations': 'Manage your clinic operations',
    'admin.stats.doctors': 'Total Doctors',
    'admin.stats.patients': 'Total Patients',
    'admin.stats.medicines': 'Total Medicines',
    'admin.stats.appointments': 'Total Appointments',
    'admin.doctors.management': 'Doctors Management',
    'admin.medicines.management': 'Medicines Management',
    'admin.patients.overview': 'Patients Overview',
    
    // Buttons and Actions
    'button.add': 'Add',
    'button.edit': 'Edit', 
    'button.update': 'Update',
    'button.delete': 'Delete',
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.close': 'Close',
    'button.submit': 'Submit',
    'button.reset': 'Reset',
    'button.clear': 'Clear',
    'button.back': 'Back',
    'button.next': 'Next',
    'button.previous': 'Previous',
    'button.continue': 'Continue',
    'button.confirm': 'Confirm',
    'button.upload': 'Upload',
    'button.download': 'Download',
    'button.export': 'Export',
    'button.import': 'Import',
    'button.print': 'Print',
    'button.preview': 'Preview',
    'button.view.details': 'View Details',
    'button.discuss.ai': 'Discuss with AI',
    'button.upload.list': 'Upload List',
    'button.set.availability': 'Set Availability',
    'button.whatsapp.booking': 'WhatsApp Booking',
    
    // Medicine specific
    'medicine.code': 'Medicine Code',
    'medicine.company': 'Company/Manufacturer',
    'medicine.current.stock': 'Current Stock',
    'medicine.low.stock.threshold': 'Low Stock Alert',
    'medicine.low.stock': 'Low Stock',
    'medicine.symptoms': 'Symptoms/Indications',
    'medicine.used.for': 'Used for',
    'medicine.no.medicines': 'No medicines yet',
    'medicine.no.found': 'No medicines found',
    'medicine.add.first': 'Add your first medicine to get started',
    'medicine.try.different': 'Try adjusting your search terms',
    'medicine.stock.info': 'Stock',
    'medicine.alert.at': 'Alert at',
    'medicine.update.stock': 'Update Stock',
    'medicine.adding': 'Adding...',
    'medicine.updating': 'Updating...',
    'medicine.auto.generated': 'Auto-generated from medicine name or enter custom code',
    'medicine.code.exists': 'This medicine code already exists. Please use a unique code.',
    'medicine.dosage.instructions': 'Dosage Instructions',
    'medicine.brief.description': 'Brief description of the medicine',
    'medicine.what.symptoms': 'What symptoms or conditions this medicine is used for...',
    
    // Search and Filter
    'search.placeholder': 'Search by name, code, company, or symptoms...',
    'filter.low.stock': 'Show Low Stock Only',
    'filter.all': 'Show All',
    
    // Upload functionality
    'upload.title': 'Upload Medicine List',
    'upload.formats': 'Supported formats: CSV, Excel (.xlsx, .xls), PDF',
    'upload.drag.drop': 'Drag and drop your file here, or click to browse',
    'upload.max.size': 'Maximum file size: 10MB',
    'upload.select.file': 'Select File',
    'upload.no.file': 'No file selected',
    'upload.uploading': 'Uploading...',
    'upload.medicines': 'Upload Medicines',
    'upload.sample.format': 'Sample Format Guide',
    'upload.csv.should': 'Your CSV/Excel file should contain columns',
    'upload.pdf.format': 'For PDF files, ensure the text contains medicine information in a structured format',
    'upload.results': 'Upload Results',
    'upload.successful': 'Upload Successful',
    'upload.failed': 'Upload Failed',
    'upload.completed': 'Upload completed',
    'upload.medicines.imported': 'medicines imported',
    'upload.failed.count': 'failed',
    
    // Export functionality  
    'export.low.stock.csv': 'Export to Excel',
    'export.low.stock.pdf': 'Export to PDF', 
    'export.successful': 'Export Successful',
    'export.no.data': 'No Data',
    'export.no.low.stock': 'No low stock medicines to export',
    'export.csv.description': 'Low stock medicines exported to CSV',
    'export.pdf.description': 'Low stock medicines report opened for printing',
    
    // Dashboard specific
    'dashboard.low.stock.medicines': 'Low Stock Medicines',
    'dashboard.medicines.need.attention': 'medicines need attention',
    'dashboard.view.all': 'View All',
    'dashboard.no.low.stock': 'No medicines are running low on stock',
    
    // AI Discussion
    'ai.discuss.title': 'Discuss with AI',
    'ai.query.placeholder': 'Ask about medicine usage or get medicine recommendations for diseases',
    'ai.query.example': 'e.g., "What is Arnica Montana used for?" or "Medicines for fever and headache"',
    'ai.loading': 'Getting AI Response...',
    'ai.ask': 'Ask AI',
    'ai.response': 'AI Response:',
    'ai.clear.ask.again': 'Clear & Ask Again',
    'ai.service.unavailable': 'AI service temporarily unavailable',
    'ai.try.again.later': 'Sorry, AI service is not available right now. Please try again later.',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.update': 'Update',
    'common.cancel': 'Cancel',
    'common.search': 'Search',
    'common.filter': 'Filter',
  },
  bn: {
    // Header and Navigation
    'app.title': 'মাই হোমিও হেলথ',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.patients': 'রোগীরা',
    'nav.medicines': 'ওষুধ',
    'nav.appointments': 'অ্যাপয়েন্টমেন্ট',
    'nav.prescriptions': 'প্রেসক্রিপশন',
    'nav.profile': 'প্রোফাইল',
    'nav.logout': 'লগআউট',
    'nav.calendar': 'ক্যালেন্ডার',
    'nav.notifications': 'বিজ্ঞপ্তি',
    'nav.admin': 'অ্যাডমিন প্যানেল',
    'nav.menu': 'মেনু',
    
    // Profile Modal
    'profile.title': 'প্রোফাইল সেটিংস',
    'profile.subtitle': 'আপনার প্রোফাইল তথ্য এবং অ্যাকাউন্ট সেটিংস পরিচালনা করুন',
    'profile.tab.profile': 'প্রোফাইল',
    'profile.tab.edit': 'সম্পাদনা',
    'profile.tab.password': 'পাসওয়ার্ড',
    'profile.tab.language': 'ভাষা',
    'profile.tab.account': 'অ্যাকাউন্ট',
    'profile.information': 'প্রোফাইল তথ্য',
    'profile.user.details': 'ব্যবহারকারীর বিবরণ',
    'profile.edit.profile': 'প্রোফাইল সম্পাদনা',
    'profile.edit.information': 'প্রোফাইল তথ্য সম্পাদনা',
    'profile.fullname': 'পূর্ণ নাম',
    'profile.username': 'ব্যবহারকারীর নাম',
    'profile.email': 'ইমেইল',
    'profile.phone': 'ফোন',
    'profile.role': 'ভূমিকা',
    'profile.clinic.name': 'ক্লিনিকের নাম',
    'profile.clinic.location': 'ক্লিনিকের অবস্থান',
    'profile.degree': 'ডিগ্রি',
    'profile.specialization': 'বিশেষত্ব',
    'profile.not.provided': 'প্রদান করা হয়নি',
    'profile.username.readonly': 'ব্যবহারকারীর নাম (শুধুমাত্র পঠনযোগ্য)',
    'profile.update': 'প্রোফাইল আপডেট',
    'profile.updating': 'আপডেট করা হচ্ছে...',
    'profile.cancel': 'বাতিল',
    
    // Password Tab
    'password.change': 'পাসওয়ার্ড পরিবর্তন',
    'password.current': 'বর্তমান পাসওয়ার্ড',
    'password.new': 'নতুন পাসওয়ার্ড',
    'password.confirm': 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
    'password.current.placeholder': 'বর্তমান পাসওয়ার্ড লিখুন',
    'password.new.placeholder': 'নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)',
    'password.confirm.placeholder': 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
    'password.update': 'পাসওয়ার্ড আপডেট',
    
    // Language Tab
    'language.settings': 'ভাষা সেটিংস',
    'language.select': 'ভাষা নির্বাচন',
    'language.description': 'ইন্টারফেসের জন্য আপনার পছন্দের ভাষা বেছে নিন',
    'language.english': 'ইংরেজি',
    'language.bengali': 'বাংলা',
    'language.save': 'ভাষা সংরক্ষণ',
    'language.saving': 'সংরক্ষণ করা হচ্ছে...',
    
    // Account Tab
    'account.actions': 'অ্যাকাউন্টের কার্যক্রম',
    'account.information': 'অ্যাকাউন্টের তথ্য',
    'account.name': 'নাম',
    'account.username': 'ব্যবহারকারীর নাম',
    'account.role': 'ভূমিকা',
    'account.email': 'ইমেইল',
    
    // Dashboard
    'dashboard.title': 'ড্যাশবোর্ড',
    'dashboard.admin': 'অ্যাডমিন ড্যাশবোর্ড',
    'dashboard.doctor': 'ডাক্তার ড্যাশবোর্ড',
    'dashboard.overview': 'আজকের সংক্ষিপ্ত বিবরণ',
    'dashboard.stats.appointments': 'আজকের অ্যাপয়েন্টমেন্ট',
    'dashboard.stats.patients': 'মোট রোগী',
    'dashboard.stats.prescriptions': 'আজকের প্রেসক্রিপশন',
    'dashboard.stats.pending': 'অপেক্ষমাণ',
    
    // Patients
    'patients.title': 'রোগীরা',
    'patients.add': 'রোগী যোগ করুন',
    'patients.edit': 'রোগীর তথ্য সম্পাদনা',
    'patients.delete': 'রোগী মুছে ফেলুন',
    'patients.view.details': 'বিস্তারিত দেখুন',
    'patients.name': 'রোগীর নাম',
    'patients.age': 'বয়স',
    'patients.gender': 'লিঙ্গ',
    'patients.phone': 'ফোন',
    'patients.location': 'অবস্থান',
    'patients.address': 'ঠিকানা',
    'patients.male': 'পুরুষ',
    'patients.female': 'মহিলা',
    'patients.other': 'অন্যান্য',
    'patients.created': 'তৈরি হয়েছে',
    'patients.total': 'মোট রোগী',
    
    // Medicines
    'medicines.title': 'ওষুধ',
    'medicines.add': 'ওষুধ যোগ করুন',
    'medicines.edit': 'ওষুধ সম্পাদনা',
    'medicines.delete': 'ওষুধ মুছে ফেলুন',
    'medicines.name': 'ওষুধের নাম',
    'medicines.power': 'শক্তি',
    'medicines.type': 'ধরন',
    'medicines.manufacturer': 'প্রস্তুতকারক',
    'medicines.description': 'বিবরণ',
    'medicines.dosage': 'ডোজ',
    'medicines.frequency': 'কত ঘণ্টা পর পর',
    'medicines.duration': 'কতদিন',
    'medicines.instructions': 'নির্দেশনা',
    'medicines.stock': 'স্টক',
    'medicines.total': 'মোট ওষুধ',
    
    // Appointments
    'appointments.title': 'অ্যাপয়েন্টমেন্ট',
    'appointments.book': 'অ্যাপয়েন্টমেন্ট বুক করুন',
    'appointments.edit': 'অ্যাপয়েন্টমেন্ট সম্পাদনা',
    'appointments.cancel': 'অ্যাপয়েন্টমেন্ট বাতিল',
    'appointments.date': 'তারিখ',
    'appointments.time': 'সময়',
    'appointments.patient': 'রোগী',
    'appointments.doctor': 'ডাক্তার',
    'appointments.status': 'অবস্থা',
    'appointments.notes': 'নোট',
    'appointments.scheduled': 'নির্ধারিত',
    'appointments.completed': 'সম্পন্ন',
    'appointments.cancelled': 'বাতিল',
    'appointments.today': 'আজকের অ্যাপয়েন্টমেন্ট',
    'appointments.total': 'মোট অ্যাপয়েন্টমেন্ট',
    
    // Prescriptions
    'prescriptions.title': 'প্রেসক্রিপশন',
    'prescriptions.add': 'প্রেসক্রিপশন যোগ করুন',
    'prescriptions.edit': 'প্রেসক্রিপশন সম্পাদনা',
    'prescriptions.view': 'প্রেসক্রিপশন দেখুন',
    'prescriptions.print': 'প্রেসক্রিপশন প্রিন্ট',
    'prescriptions.patient': 'রোগী',
    'prescriptions.doctor': 'ডাক্তার',
    'prescriptions.date': 'তারিখ',
    'prescriptions.medicines': 'ওষুধসমূহ',
    'prescriptions.symptoms': 'লক্ষণসমূহ',
    'prescriptions.diagnosis': 'রোগ নির্ণয়',
    'prescriptions.advice': 'পরামর্শ',
    'prescriptions.followup': 'ফলো-আপ',
    'prescriptions.total': 'মোট প্রেসক্রিপশন',
    
    // Forms
    'form.required': 'আবশ্যক ক্ষেত্র',
    'form.invalid.email': 'ভুল ইমেইল ফরম্যাট',
    'form.invalid.phone': 'ভুল ফোন নম্বর',
    'form.password.mismatch': 'পাসওয়ার্ড মিলছে না',
    'form.submit': 'জমা দিন',
    'form.reset': 'রিসেট',
    'form.clear': 'মুছে ফেলুন',
    
    // Common Actions
    'action.add': 'যোগ করুন',
    'action.edit': 'সম্পাদনা',
    'action.delete': 'মুছে ফেলুন',
    'action.save': 'সংরক্ষণ',
    'action.cancel': 'বাতিল',
    'action.close': 'বন্ধ',
    'action.view': 'দেখুন',
    'action.back': 'পিছনে',
    'action.next': 'পরবর্তী',
    'action.previous': 'পূর্ববর্তী',
    'action.search': 'খুঁজুন',
    'action.filter': 'ফিল্টার',
    'action.refresh': 'রিফ্রেশ',
    'action.print': 'প্রিন্ট',
    'action.download': 'ডাউনলোড',
    
    // Additional specific translations for pages  
    'patients.search.placeholder': 'নাম, আইডি, ফোন, বা অবস্থান দিয়ে খুঁজুন...',
    'prescriptions.search.placeholder': 'রোগীর নাম, আইডি, বা প্রেসক্রিপশন আইডি দিয়ে খুঁজুন...',
    'appointments.search.placeholder': 'রোগীর নাম বা অ্যাপয়েন্টমেন্ট আইডি দিয়ে খুঁজুন...',
    'no.data.found': 'কোনো তথ্য পাওয়া যায়নি',
    'try.different.search': 'অন্য শব্দ দিয়ে খুঁজে দেখুন',
    'add.first.item': 'শুরু করতে প্রথম আইটেম যোগ করুন',
    'filter.by.status': 'স্ট্যাটাস অনুযায়ী ফিল্টার',
    'mark.completed': 'সম্পূর্ণ চিহ্নিত করুন',
    'mark.cancelled': 'বাতিল চিহ্নিত করুন',
    'view.prescriptions': 'প্রেসক্রিপশন দেখুন',
    'prescription.id': 'প্রেসক্রিপশন আইডি',
    'appointment.id': 'অ্যাপয়েন্টমেন্ট আইডি',
    'patient.id': 'রোগীর আইডি',
    'created.date': 'তৈরির তারিখ',
    'date.time': 'তারিখ ও সময়',
    'upcoming': 'আসন্ন',
    'recent.patients': 'সাম্প্রতিক রোগীরা',
    'registered': 'নিবন্ধিত',
    'view.profile': 'প্রোফাইল দেখুন',
    'low.stock.medicines': 'কম স্টকের ওষুধ',
    'update.stock': 'স্টক আপডেট',
    'symptoms.breakdown': 'লক্ষণের বিশ্লেষণ',
    'patient.types': 'রোগীর ধরন',
    'medicine.usage.volume': 'ওষুধ ব্যবহারের পরিমাণ',
    'new.patients.30.days': 'নতুন রোগী (৩০ দিন)',
    'existing.patients': 'বিদ্যমান রোগীরা',
    
    // Medicine Powers/Potencies (Homeopathic)
    'medicine.power.3x': '৩এক্স',
    'medicine.power.6x': '৬এক্স',
    'medicine.power.12x': '১২এক্স',
    'medicine.power.30': '৩০সি',
    'medicine.power.200': '২০০সি',
    'medicine.power.1m': '১এম',
    'medicine.power.10m': '১০এম',
    'medicine.power.mother': 'মাদার টিংচার',
    
    // Common Symptoms
    'symptom.fever': 'জ্বর',
    'symptom.headache': 'মাথাব্যথা',
    'symptom.cough': 'কাশি',
    'symptom.cold': 'সর্দি',
    'symptom.nausea': 'বমি বমি ভাব',
    'symptom.vomiting': 'বমি',
    'symptom.diarrhea': 'ডায়রিয়া',
    'symptom.constipation': 'কোষ্ঠকাঠিন্য',
    'symptom.stomach.pain': 'পেট ব্যথা',
    'symptom.back.pain': 'পিঠের ব্যথা',
    'symptom.joint.pain': 'জয়েন্টের ব্যথা',
    'symptom.anxiety': 'উদ্বেগ',
    'symptom.depression': 'বিষাদ',
    'symptom.insomnia': 'অনিদ্রা',
    'symptom.fatigue': 'অবসাদ',
    
    // Time Frequencies
    'frequency.once.daily': 'দিনে একবার',
    'frequency.twice.daily': 'দিনে দুইবার',
    'frequency.thrice.daily': 'দিনে তিনবার',
    'frequency.four.times': 'দিনে চারবার',
    'frequency.every.4.hours': 'প্রতি ৪ ঘণ্টায়',
    'frequency.every.6.hours': 'প্রতি ৬ ঘণ্টায়',
    'frequency.every.8.hours': 'প্রতি ৮ ঘণ্টায়',
    'frequency.as.needed': 'প্রয়োজন অনুযায়ী',
    'frequency.before.meals': 'খাবারের আগে',
    'frequency.after.meals': 'খাবারের পরে',
    
    // Status
    'status.active': 'সক্রিয়',
    'status.inactive': 'নিষ্ক্রিয়',
    'status.pending': 'অপেক্ষমাণ',
    'status.confirmed': 'নিশ্চিত',
    'status.completed': 'সম্পন্ন',
    'status.cancelled': 'বাতিল',
    
    // Messages
    'message.loading': 'লোড হচ্ছে...',
    'message.saving': 'সংরক্ষণ করা হচ্ছে...',
    'message.success': 'সফল',
    'message.error': 'ত্রুটি',
    'message.no.data': 'কোন তথ্য নেই',
    'message.no.results': 'কোন ফলাফল পাওয়া যায়নি',
    
    // Admin Dashboard
    'admin.dashboard': 'অ্যাডমিন ড্যাশবোর্ড',
    'admin.operations': 'আপনার ক্লিনিক পরিচালনা করুন',
    'admin.stats.doctors': 'মোট ডাক্তার',
    'admin.stats.patients': 'মোট রোগী',
    'admin.stats.medicines': 'মোট ওষুধ',
    'admin.stats.appointments': 'মোট অ্যাপয়েন্টমেন্ট',
    'admin.doctors.management': 'ডাক্তার পরিচালনা',
    'admin.medicines.management': 'ওষুধ পরিচালনা',
    'admin.patients.overview': 'রোগীদের সংক্ষিপ্ত বিবরণ',
    
    // Buttons and Actions
    'button.add': 'যোগ করুন',
    'button.edit': 'সম্পাদনা', 
    'button.update': 'আপডেট',
    'button.delete': 'মুছে ফেলুন',
    'button.save': 'সংরক্ষণ',
    'button.cancel': 'বাতিল',
    'button.close': 'বন্ধ',
    'button.submit': 'জমা দিন',
    'button.reset': 'রিসেট',
    'button.clear': 'মুছে ফেলুন',
    'button.back': 'পিছনে',
    'button.next': 'পরবর্তী',
    'button.previous': 'পূর্ববর্তী',
    'button.continue': 'চালিয়ে যান',
    'button.confirm': 'নিশ্চিত করুন',
    'button.upload': 'আপলোড',
    'button.download': 'ডাউনলোড',
    'button.export': 'এক্সপোর্ট',
    'button.import': 'ইমপোর্ট',
    'button.print': 'প্রিন্ট',
    'button.preview': 'প্রিভিউ',
    'button.view.details': 'বিস্তারিত দেখুন',
    'button.discuss.ai': 'AI এর সাথে আলোচনা',
    'button.upload.list': 'তালিকা আপলোড',
    'button.set.availability': 'সময়সূচী নির্ধারণ',
    'button.whatsapp.booking': 'হোয়াটসঅ্যাপ বুকিং',
    
    // Medicine specific
    'medicine.code': 'ওষুধের কোড',
    'medicine.company': 'কোম্পানি/প্রস্তুতকারক',
    'medicine.current.stock': 'বর্তমান স্টক',
    'medicine.low.stock.threshold': 'কম স্টক সতর্কতা',
    'medicine.low.stock': 'কম স্টক',
    'medicine.symptoms': 'লক্ষণ/ইন্ডিকেশন',
    'medicine.used.for': 'ব্যবহৃত হয়',
    'medicine.no.medicines': 'এখনো কোনো ওষুধ নেই',
    'medicine.no.found': 'কোনো ওষুধ পাওয়া যায়নি',
    'medicine.add.first': 'শুরু করতে আপনার প্রথম ওষুধ যোগ করুন',
    'medicine.try.different': 'আপনার অনুসন্ধানের শর্তাবলী সমন্বয় করার চেষ্টা করুন',
    'medicine.stock.info': 'স্টক',
    'medicine.alert.at': 'সতর্কতা',
    'medicine.update.stock': 'স্টক আপডেট',
    'medicine.adding': 'যোগ করা হচ্ছে...',
    'medicine.updating': 'আপডেট হচ্ছে...',
    'medicine.auto.generated': 'ওষুধের নাম থেকে স্বয়ংক্রিয় তৈরি বা কাস্টম কোড লিখুন',
    'medicine.code.exists': 'এই ওষুধের কোড ইতিমধ্যে আছে। দয়া করে একটি অনন্য কোড ব্যবহার করুন।',
    'medicine.dosage.instructions': 'ডোজের নির্দেশাবলী',
    'medicine.brief.description': 'ওষুধের সংক্ষিপ্ত বিবরণ',
    'medicine.what.symptoms': 'এই ওষুধটি কোন লক্ষণ বা অবস্থার জন্য ব্যবহৃত হয়...',
    
    // Search and Filter
    'search.placeholder': 'নাম, কোড, কোম্পানি বা লক্ষণ দিয়ে খুঁজুন...',
    'filter.low.stock': 'শুধুমাত্র কম স্টক দেখান',
    'filter.all': 'সব দেখান',
    
    // Upload functionality
    'upload.title': 'ওষুধের তালিকা আপলোড',
    'upload.formats': 'সমর্থিত ফরম্যাট: CSV, Excel (.xlsx, .xls), PDF',
    'upload.drag.drop': 'আপনার ফাইলটি এখানে টেনে এনে ছাড়ুন বা ব্রাউজ করতে ক্লিক করুন',
    'upload.max.size': 'সর্বোচ্চ ফাইল সাইজ: ১০এমবি',
    'upload.select.file': 'ফাইল নির্বাচন',
    'upload.no.file': 'কোনো ফাইল নির্বাচিত হয়নি',
    'upload.uploading': 'আপলোড হচ্ছে...',
    'upload.medicines': 'ওষুধ আপলোড',
    'upload.sample.format': 'নমুনা ফরম্যাট গাইড',
    'upload.csv.should': 'আপনার CSV/Excel ফাইলে কলাম থাকা উচিত',
    'upload.pdf.format': 'PDF ফাইলের জন্য, নিশ্চিত করুন যে টেক্সটে কাঠামোবদ্ধ ফরম্যাটে ওষুধের তথ্য রয়েছে',
    'upload.results': 'আপলোডের ফলাফল',
    'upload.successful': 'আপলোড সফল',
    'upload.failed': 'আপলোড ব্যর্থ',
    'upload.completed': 'আপলোড সম্পন্ন',
    'upload.medicines.imported': 'ওষুধ ইমপোর্ট হয়েছে',
    'upload.failed.count': 'ব্যর্থ',
    
    // Export functionality  
    'export.low.stock.csv': 'এক্সেলে এক্সপোর্ট',
    'export.low.stock.pdf': 'PDF এ এক্সপোর্ট', 
    'export.successful': 'এক্সপোর্ট সফল',
    'export.no.data': 'কোনো ডেটা নেই',
    'export.no.low.stock': 'এক্সপোর্ট করার জন্য কোনো কম স্টক ওষুধ নেই',
    'export.csv.description': 'কম স্টক ওষুধ CSV তে এক্সপোর্ট হয়েছে',
    'export.pdf.description': 'কম স্টক ওষুধের রিপোর্ট প্রিন্টের জন্য খোলা হয়েছে',
    
    // Dashboard specific
    'dashboard.low.stock.medicines': 'কম স্টক ওষুধ',
    'dashboard.medicines.need.attention': 'ওষুধের মনোযোগ প্রয়োজন',
    'dashboard.view.all': 'সব দেখুন',
    'dashboard.no.low.stock': 'কোনো ওষুধের স্টক কম নেই',
    
    // AI Discussion
    'ai.discuss.title': 'AI এর সাথে আলোচনা',
    'ai.query.placeholder': 'ওষুধের ব্যবহার সম্পর্কে জিজ্ঞাসা করুন বা রোগের জন্য ওষুধের সুপারিশ পান',
    'ai.query.example': 'যেমন: "আর্নিকা মন্টানা কি কাজে ব্যবহৃত হয়?" বা "জ্বর ও মাথাব্যথার জন্য ওষুধ"',
    'ai.loading': 'AI উত্তর পাওয়া হচ্ছে...',
    'ai.ask': 'AI কে জিজ্ঞাসা করুন',
    'ai.response': 'AI এর উত্তর:',
    'ai.clear.ask.again': 'মুছে আবার জিজ্ঞাসা করুন',
    'ai.service.unavailable': 'AI সেবা সাময়িকভাবে অনুপলব্ধ',
    'ai.try.again.later': 'দুঃখিত, AI সেবা এখন উপলব্ধ নেই। দয়া করে পরে আবার চেষ্টা করুন।',
    
    // Common
    'common.loading': 'লোড হচ্ছে...',
    'common.error': 'ত্রুটি',
    'common.success': 'সফল',
    'common.close': 'বন্ধ',
    'common.save': 'সংরক্ষণ',
    'common.edit': 'সম্পাদনা',
    'common.delete': 'মুছে ফেলুন',
    'common.add': 'যোগ করুন',
    'common.update': 'আপডেট',
    'common.cancel': 'বাতিল',
    'common.search': 'অনুসন্ধান',
    'common.filter': 'ফিল্টার',
    
    // AI Discussion
    'medicines.discuss.ai': 'AI এর সাথে আলোচনা',
    'medicines.discuss.title': 'AI এর সাথে আলোচনা',
    'medicines.discuss.query': 'ওষুধের ব্যবহার সম্পর্কে জিজ্ঞাসা করুন বা রোগের জন্য ওষুধের সুপারিশ পান',
    'medicines.discuss.placeholder': 'যেমন: "আর্নিকা মন্টানা কীসের জন্য ব্যবহৃত হয়?" বা "জ্বর এবং মাথাব্যথার জন্য ওষুধ"',
    'medicines.discuss.loading': 'AI উত্তর পাওয়া হচ্ছে...',
    'medicines.discuss.ask': 'AI কে জিজ্ঞাসা করুন',
    'medicines.discuss.response': 'AI উত্তর:',
    'medicines.discuss.clear': 'পরিষ্কার করে আবার জিজ্ঞাসা করুন',
  }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<'en' | 'bn'>('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') as 'en' | 'bn';
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'bn')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage
  const setLanguage = (lang: 'en' | 'bn') => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Data translation mapping for medical content
const dataTranslations: Record<string, string> = {
  // Patient names (common Bengali names as examples)
  'John Doe': 'রহিম উদ্দিন',
  'Jane Smith': 'ফাতেমা খাতুন',
  'Mike Johnson': 'করিম আহমেদ',
  'Sarah Wilson': 'রাবেয়া বেগম',
  'David Brown': 'আব্দুল কাদের',
  
  // Medicine names (homeopathic medicines with Bengali equivalents)
  'Arnica Montana': 'আর্নিকা মন্টানা',
  'Belladonna': 'বেলাডোনা',
  'Pulsatilla': 'পালসেটিলা',
  'Nux Vomica': 'নাক্স ভমিকা',
  'Sulphur': 'সালফার',
  'Lycopodium': 'লাইকোপোডিয়াম',
  'Bryonia': 'ব্রায়োনিয়া',
  'Rhus Tox': 'রাস টক্স',
  'Sepia': 'সিপিয়া',
  'Calcarea Carb': 'ক্যালকেরিয়া কার্ব',
  
  // Common symptoms and conditions
  'fever': 'জ্বর',
  'headache': 'মাথাব্যথা',
  'cough': 'কাশি',
  'cold': 'সর্দি',
  'stomach pain': 'পেট ব্যথা',
  'back pain': 'পিঠের ব্যথা',
  'joint pain': 'জয়েন্টের ব্যথা',
  'nausea': 'বমি বমি ভাব',
  'vomiting': 'বমি',
  'diarrhea': 'ডায়রিয়া',
  'constipation': 'কোষ্ঠকাঠিন্য',
  'anxiety': 'উদ্বেগ',
  'depression': 'বিষাদ',
  'insomnia': 'অনিদ্রা',
  'fatigue': 'অবসাদ',
  
  // Dosage and frequency
  'once daily': 'দিনে একবার',
  'twice daily': 'দিনে দুইবার',
  'three times daily': 'দিনে তিনবার',
  'four times daily': 'দিনে চারবার',
  'every 4 hours': 'প্রতি ৪ ঘণ্টায়',
  'every 6 hours': 'প্রতি ৬ ঘণ্টায়',
  'every 8 hours': 'প্রতি ৮ ঘণ্টায়',
  'as needed': 'প্রয়োজন অনুযায়ী',
  'before meals': 'খাবারের আগে',
  'after meals': 'খাবারের পরে',
  
  // Gender
  'Male': 'পুরুষ',
  'Female': 'মহিলা',
  'Other': 'অন্যান্য',
  'male': 'পুরুষ',
  'female': 'মহিলা',
  'other': 'অন্যান্য',
  
  // Status
  'Active': 'সক্রিয়',
  'Inactive': 'নিষ্ক্রিয়',
  'Pending': 'অপেক্ষমাণ',
  'Confirmed': 'নিশ্চিত',
  'Completed': 'সম্পন্ন',
  'Cancelled': 'বাতিল',
  'Scheduled': 'নির্ধারিত',
  'active': 'সক্রিয়',
  'inactive': 'নিষ্ক্রিয়',
  'pending': 'অপেক্ষমাণ',
  'confirmed': 'নিশ্চিত',
  'completed': 'সম্পন্ন',
  'cancelled': 'বাতিল',
  'scheduled': 'নির্ধারিত',
  
  // Common locations (example Bengali locations)
  'New York': 'ঢাকা',
  'Los Angeles': 'চট্টগ্রাম',
  'Chicago': 'সিলেট',
  'Houston': 'রাজশাহী',
  'Phoenix': 'খুলনা',
  'Philadelphia': 'বরিশাল',
  'San Antonio': 'রংপুর',
  'San Diego': 'কুমিল্লা',
  'Dallas': 'নারায়ণগঞ্জ',
  'San Jose': 'গাজীপুর',
  
  // Medicine powers
  '30C': '৩০সি',
  '200C': '২০০সি',
  '1M': '১এম',
  '10M': '১০এম',
  '3X': '৩এক্স',
  '6X': '৬এক্স',
  '12X': '১২এক্স',
  'Mother Tincture': 'মাদার টিংচার',
};

// Function to translate data content
const translateData = (text: string, language: string): string => {
  if (language === 'bn' && text && typeof text === 'string') {
    // Check for exact matches first
    if (dataTranslations[text]) {
      return dataTranslations[text];
    }
    
    // Check for partial matches (case insensitive)
    const lowerText = text.toLowerCase();
    for (const [english, bengali] of Object.entries(dataTranslations)) {
      if (lowerText.includes(english.toLowerCase())) {
        return text.replace(new RegExp(english, 'gi'), bengali);
      }
    }
  }
  
  return text;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return {
    ...context,
    translateData: (text: string) => translateData(text, context.language)
  };
};