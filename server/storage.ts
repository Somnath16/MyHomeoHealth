import { 
  type User, type InsertUser, type Patient, type InsertPatient, 
  type Appointment, type InsertAppointment, type Prescription, type InsertPrescription, 
  type Medicine, type InsertMedicine, type PrescriptionTemplate, type InsertPrescriptionTemplate,
  type DoctorTemplateAssignment, type InsertDoctorTemplateAssignment,
  type DoctorAvailability, type InsertDoctorAvailability,
  type WhatsappSession, type InsertWhatsappSession,
  users, patients, appointments, prescriptions, medicines, prescriptionTemplates, doctorTemplateAssignments, doctorAvailability, whatsappSessions 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getDoctors(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Patient methods
  getPatients(doctorId?: string): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined>;
  
  // Appointment methods
  getAppointments(doctorId?: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  getAppointmentsByDate(doctorId: string, date: string): Promise<Appointment[]>;
  
  // Prescription methods
  getPrescriptions(doctorId?: string, patientId?: string): Promise<Prescription[]>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined>;
  deletePrescription(id: string): Promise<boolean>;
  
  // Medicine methods
  getMedicines(doctorId?: string): Promise<Medicine[]>;
  getMedicine(id: string): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: string): Promise<boolean>;

  // Appointment methods (delete)
  deleteAppointment(id: string): Promise<boolean>;
  
  // Admin methods
  deleteUser(id: string): Promise<boolean>;
  deletePatient(id: string, doctorId?: string): Promise<void>;
  
  // Template methods
  getPrescriptionTemplates(): Promise<PrescriptionTemplate[]>;
  getPrescriptionTemplate(id: string): Promise<PrescriptionTemplate | undefined>;
  createPrescriptionTemplate(template: InsertPrescriptionTemplate): Promise<PrescriptionTemplate>;
  updatePrescriptionTemplate(id: string, updates: Partial<PrescriptionTemplate>): Promise<PrescriptionTemplate | undefined>;
  deletePrescriptionTemplate(id: string): Promise<boolean>;
  
  // Template assignment methods
  getAdminTemplateAssignments(): Promise<any[]>;
  getDoctorTemplateAssignments(doctorId: string): Promise<any[]>;
  assignTemplateToDoctor(assignment: InsertDoctorTemplateAssignment): Promise<DoctorTemplateAssignment>;
  removeTemplateFromDoctor(doctorId: string, templateId: string): Promise<boolean>;
  setDefaultTemplate(doctorId: string, templateId: string): Promise<boolean>;

  // Doctor availability methods
  getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  upsertDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability>;
  deleteDoctorAvailability(doctorId: string, dayOfWeek: number): Promise<boolean>;

  // WhatsApp methods
  getUserByWhatsApp(whatsappPhone: string): Promise<User | undefined>;
  findNextAvailableSlot(doctorId: string): Promise<Date | null>;
  getPatientByPhoneAndDoctor(phone: string, doctorId: string): Promise<Patient | undefined>;
  
  // WhatsApp session methods
  getWhatsappSession(patientPhone: string, doctorId: string): Promise<WhatsappSession | undefined>;
  createWhatsappSession(session: InsertWhatsappSession): Promise<WhatsappSession>;
  updateWhatsappSession(id: string, updates: Partial<WhatsappSession>): Promise<WhatsappSession | undefined>;
  deleteExpiredWhatsappSessions(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeData();
  }

  // Generate doctor-specific prefix from doctor name
  private generateDoctorPrefix(doctorName: string): string {
    // Remove "Dr." prefix if present and extract first name
    const cleanName = doctorName.replace(/^Dr\.\s*/i, '');
    const firstName = cleanName.split(' ')[0].toLowerCase();
    
    // Get first letter of first name, capitalize it
    const firstLetter = firstName.charAt(0).toUpperCase();
    
    // For names like "Dr. Rajesh Sharma" -> "R"
    // For names like "Ranajit" -> "R"
    return firstLetter;
  }

  // Generate unique patient ID
  private async generatePatientId(doctorId: string): Promise<string> {
    const doctor = await this.getUser(doctorId);
    if (!doctor) throw new Error("Doctor not found");
    
    const prefix = this.generateDoctorPrefix(doctor.name);
    
    // Count existing patients for this doctor to handle duplicates
    const existingPatients = await db.select().from(patients).where(eq(patients.doctorId, doctorId));
    const doctorPatientCount = existingPatients.length;
    
    // Check if we need to add a number suffix for duplicate doctor names
    const allDoctors = await db.select().from(users).where(eq(users.role, 'doctor'));
    const doctorsWithSamePrefix = allDoctors.filter(d => 
      d.id !== doctorId && this.generateDoctorPrefix(d.name) === prefix
    );
    
    let finalPrefix = `${prefix}HP`;
    if (doctorsWithSamePrefix.length > 0) {
      // Add number suffix (2, 3, etc.) for duplicate prefixes
      finalPrefix = `${prefix}HP${doctorsWithSamePrefix.length + 1}`;
    }
    
    // Generate sequential number
    const patientNumber = doctorPatientCount + 1;
    return `${finalPrefix}-${patientNumber}`;
  }

  // Generate unique appointment ID
  private async generateAppointmentId(doctorId: string): Promise<string> {
    const doctor = await this.getUser(doctorId);
    if (!doctor) throw new Error("Doctor not found");
    
    const prefix = this.generateDoctorPrefix(doctor.name);
    
    // Count existing appointments for this doctor
    const existingAppointments = await db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
    const doctorAppointmentCount = existingAppointments.length;
    
    // Check if we need to add a number suffix for duplicate doctor names
    const allDoctors = await db.select().from(users).where(eq(users.role, 'doctor'));
    const doctorsWithSamePrefix = allDoctors.filter(d => 
      d.id !== doctorId && this.generateDoctorPrefix(d.name) === prefix
    );
    
    let finalPrefix = `${prefix}HPA`;
    if (doctorsWithSamePrefix.length > 0) {
      // Add number suffix for duplicate prefixes
      finalPrefix = `${prefix}HPA${doctorsWithSamePrefix.length + 1}`;
    }
    
    // Generate sequential number
    const appointmentNumber = doctorAppointmentCount + 1;
    return `${finalPrefix}-${appointmentNumber}`;
  }

  private async initializeData() {
    try {
      // Check if we already have initial data
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return; // Data already exists, skip initialization
      }

      // Create admin user
      const [admin] = await db.insert(users).values({
        username: "admin",
        password: "admin123",
        role: "admin",
        name: "Administrator",
        email: "admin@homeohealth.com",
        phone: "9876543210",
        isActive: true,
      }).returning();

      // Create doctor user
      const [doctor] = await db.insert(users).values({
        username: "doctor",
        password: "doctor123",
        role: "doctor",
        name: "Dr. Rajesh Sharma",
        email: "doctor@homeohealth.com",
        phone: "9123456789",
        clinicName: "Homeo Health Clinic",
        clinicNameBengali: "হোমিও হেলথ ক্লিনিক",
        clinicLocation: "123 Main Street, Kolkata",
        clinicLocationBengali: "১২৩ মেইন স্ট্রিট, কলকাতা",
        degree: "BHMS, MD (Hom)",
        degreeBengali: "বিএইচএমএস, এমডি (হোমিও)",
        specialist: "General Homeopathy",
        specialistBengali: "সাধারণ হোমিওপ্যাথি",
        extraNotes: "15+ years of experience in homeopathic medicine",
        extraNotesBengali: "হোমিওপ্যাথিক ঔষধে ১৫+ বছরের অভিজ্ঞতা",
        isActive: true,
        canDeletePatients: true, // Enable delete permission for default doctor
      }).returning();

      // Create another doctor user (ranajit)
      const [ranajitDoctor] = await db.insert(users).values({
        username: "ranajit",
        password: "ranajit123",
        role: "doctor",
        name: "Dr. Ranajit Kumar",
        email: "ranajit@homeohealth.com",
        phone: "9234567890",
        clinicName: "Ranajit Homeo Clinic",
        clinicNameBengali: "রণজিৎ হোমিও ক্লিনিক",
        clinicLocation: "456 Park Street, Kolkata",
        clinicLocationBengali: "৪৫৬ পার্ক স্ট্রিট, কলকাতা",
        degree: "BHMS, MD (Hom)",
        degreeBengali: "বিএইচএমএস, এমডি (হোমিও)",
        specialist: "Chronic Diseases",
        specialistBengali: "দীর্ঘস্থায়ী রোগ",
        extraNotes: "Specialist in chronic and constitutional treatments",
        extraNotesBengali: "দীর্ঘস্থায়ী এবং গাঠনিক চিকিৎসায় বিশেষজ্ঞ",
        isActive: true,
        canDeletePatients: true, // Enable delete permission for ranajit doctor
      }).returning();

      // Create comprehensive sample medicines
      const medicineData = [
        { name: "Arnica Montana", code: "ARN", description: "For trauma and injury", dosage: "30C", symptoms: "Bruises, shock, trauma", company: "Dr. Willmar Schwabe", currentStock: 25, lowStockThreshold: 10 },
        { name: "Belladonna", code: "BELL", description: "For fever and inflammation", dosage: "30C", symptoms: "High fever, headache, inflammation", company: "SBL Pvt Ltd", currentStock: 18, lowStockThreshold: 15 },
        { name: "Nux Vomica", code: "NUX", description: "For digestive issues", dosage: "30C", symptoms: "Indigestion, constipation, hangover", company: "Hahnemann Laboratories", currentStock: 8, lowStockThreshold: 12 },
        { name: "Bryonia Alba", code: "BRY", description: "For respiratory and joint issues", dosage: "200C", symptoms: "Dry cough, arthritis, headache", company: "Dr. Reckeweg", currentStock: 22, lowStockThreshold: 10 },
        { name: "Pulsatilla", code: "PULS", description: "For emotional and hormonal issues", dosage: "30C", symptoms: "Mood swings, menstrual problems, weeping", company: "Bjain Pharmaceuticals", currentStock: 15, lowStockThreshold: 8 },
        { name: "Rhus Toxicodendron", code: "RHUS", description: "For joint and skin problems", dosage: "30C", symptoms: "Joint stiffness, eczema, restlessness", company: "SBL Pvt Ltd", currentStock: 30, lowStockThreshold: 12 },
        { name: "Calcarea Carbonica", code: "CALC", description: "For constitutional treatment", dosage: "200C", symptoms: "Weakness, cold tendency, delayed milestones", company: "Adel Pekana", currentStock: 5, lowStockThreshold: 15 },
        { name: "Lycopodium", code: "LYC", description: "For digestive and liver issues", dosage: "30C", symptoms: "Bloating, liver problems, right-sided symptoms", company: "Dr. Willmar Schwabe", currentStock: 20, lowStockThreshold: 10 },
        { name: "Sulphur", code: "SULPH", description: "For skin conditions", dosage: "30C", symptoms: "Itchy skin, burning sensation, heat intolerance", company: "Hahnemann Laboratories", currentStock: 12, lowStockThreshold: 8 },
        { name: "Arsenicum Album", code: "ARS", description: "For anxiety and gastric issues", dosage: "30C", symptoms: "Anxiety, restlessness, burning pains", company: "Bjain Pharmaceuticals", currentStock: 14, lowStockThreshold: 10 }
      ];

      const createdMedicines = await db.insert(medicines).values(
        medicineData.map(med => ({
          name: med.name,
          code: med.code,
          description: med.description,
          dosage: med.dosage,
          symptoms: med.symptoms,
          company: med.company,
          currentStock: med.currentStock,
          lowStockThreshold: med.lowStockThreshold,
          doctorId: doctor.id,
        }))
      ).returning();

      // Create comprehensive sample patients
      const patientData = [
        { name: "Somnath Roy", age: 25, gender: "Male", phone: "9874567543", address: "123 Park Street, Kolkata", location: "Kolkata" },
        { name: "Priya Sharma", age: 32, gender: "Female", phone: "9876543210", address: "45 Marine Drive, Mumbai", location: "Mumbai" },
        { name: "Rajesh Kumar", age: 45, gender: "Male", phone: "9123456789", address: "78 CP, Delhi", location: "Delhi" },
        { name: "Anita Das", age: 28, gender: "Female", phone: "9234567890", address: "12 Lake Road, Kolkata", location: "Kolkata" },
        { name: "Ravi Gupta", age: 38, gender: "Male", phone: "9345678901", address: "67 MG Road, Bangalore", location: "Bangalore" },
        { name: "Sunita Patel", age: 42, gender: "Female", phone: "9456789012", address: "34 Station Road, Pune", location: "Pune" },
        { name: "Amit Sen", age: 35, gender: "Male", phone: "9567890123", address: "56 Salt Lake, Kolkata", location: "Kolkata" },
        { name: "Neha Agarwal", age: 29, gender: "Female", phone: "9678901234", address: "89 Linking Road, Mumbai", location: "Mumbai" }
      ];

      const createdPatients = await db.insert(patients).values(
        await Promise.all(patientData.map(async (patientInfo) => {
          const patientId = await this.generatePatientId(doctor.id);
          return {
            patientId,
            name: patientInfo.name,
            age: patientInfo.age,
            gender: patientInfo.gender,
            phone: patientInfo.phone,
            address: patientInfo.address,
            location: patientInfo.location,
            doctorId: doctor.id,
          };
        }))
      ).returning();

      // Create sample appointments
      const appointmentData = [];
      if (createdPatients.length > 0) {
        // Create appointments for the first few patients
        for (let i = 0; i < Math.min(createdPatients.length, 5); i++) {
          const patient = createdPatients[i];
          const appointmentDate = new Date();
          appointmentDate.setDate(appointmentDate.getDate() + i); // Different dates
          appointmentDate.setHours(10 + i, 0, 0, 0); // Different times
          
          const appointmentId = await this.generateAppointmentId(doctor.id);
          
          appointmentData.push({
            appointmentId,
            patientId: patient.id,
            doctorId: doctor.id,
            dateTime: appointmentDate,
            notes: [
              "Chronic headache and fatigue",
              "Digestive issues and bloating", 
              "Joint pain and stiffness",
              "Skin problems and itching",
              "Anxiety and sleep disorders"
            ][i],
            status: i === 0 ? "completed" : "scheduled"
          });
        }
      }

      const createdAppointments = await db.insert(appointments).values(appointmentData).returning();

      // Create comprehensive sample prescriptions
      if (createdPatients.length > 0 && createdMedicines.length > 0) {
        const prescriptionData = [
          {
            prescriptionId: "RSX-001",
            patientId: createdPatients[0].id,
            doctorId: doctor.id,
            appointmentId: createdAppointments.length > 0 ? createdAppointments[0].id : null,
            symptoms: "Chronic headache, fatigue, general weakness, stress-related symptoms",
            medicines: [
              {
                medicineId: createdMedicines[0].id, // Arnica Montana
                dosage: "30C",
                frequency: "3 times daily",
                duration: "15 days",
                instructions: "Take 30 minutes before meals"
              },
              {
                medicineId: createdMedicines[1].id, // Belladonna
                dosage: "30C", 
                frequency: "2 times daily",
                duration: "10 days",
                instructions: "Take when headache is severe"
              }
            ],
            notes: "Patient showing gradual improvement with constitutional treatment. Continue for 2 weeks and follow up.",
          },
          {
            prescriptionId: "RSX-002",
            patientId: createdPatients[1].id,
            doctorId: doctor.id,
            appointmentId: createdAppointments.length > 1 ? createdAppointments[1].id : null,
            symptoms: "Digestive issues, bloating after meals, constipation, acid reflux",
            medicines: [
              {
                medicineId: createdMedicines[2].id, // Nux Vomica
                dosage: "30C",
                frequency: "3 times daily",
                duration: "20 days",
                instructions: "Take 1 hour after meals"
              },
              {
                medicineId: createdMedicines[7].id, // Lycopodium
                dosage: "30C",
                frequency: "2 times daily", 
                duration: "15 days",
                instructions: "Take before breakfast and dinner"
              }
            ],
            notes: "Lifestyle modifications recommended. Avoid spicy food. Regular meal timings essential.",
          },
          {
            prescriptionId: "RSX-003",
            patientId: createdPatients[2].id,
            doctorId: doctor.id,
            appointmentId: createdAppointments.length > 2 ? createdAppointments[2].id : null,
            symptoms: "Joint pain, morning stiffness, arthritis symptoms, weather sensitivity",
            medicines: [
              {
                medicineId: createdMedicines[5].id, // Rhus Tox
                dosage: "30C",
                frequency: "3 times daily",
                duration: "25 days",
                instructions: "Take during acute pain episodes"
              },
              {
                medicineId: createdMedicines[3].id, // Bryonia
                dosage: "200C",
                frequency: "Once daily",
                duration: "30 days",
                instructions: "Take in the morning on empty stomach"
              }
            ],
            notes: "Gentle exercise recommended. Hot water compress helps during pain. Avoid cold weather exposure.",
          }
        ];

        await db.insert(prescriptions).values(prescriptionData);
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getDoctors(): Promise<User[]> {
    // Get all doctors regardless of isActive status for admin dashboard
    return await db.select().from(users).where(eq(users.role, "doctor"));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Patient methods
  async getPatients(doctorId?: string): Promise<Patient[]> {
    if (doctorId) {
      return await db.select().from(patients).where(eq(patients.doctorId, doctorId));
    }
    return await db.select().from(patients);
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const patientId = await this.generatePatientId(insertPatient.doctorId);
    
    const [patient] = await db
      .insert(patients)
      .values({ ...insertPatient, patientId })
      .returning();
    return patient;
  }

  // Appointment methods
  async getAppointments(doctorId?: string): Promise<Appointment[]> {
    if (doctorId) {
      return await db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
    }
    return await db.select().from(appointments);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const appointmentId = await this.generateAppointmentId(insertAppointment.doctorId);
    
    const [appointment] = await db
      .insert(appointments)
      .values({ ...insertAppointment, appointmentId })
      .returning();
    
    // Update patient's last visit date when appointment is completed
    if (insertAppointment.patientId && insertAppointment.status === 'completed') {
      await db
        .update(patients)
        .set({ lastVisitDate: insertAppointment.dateTime || new Date() })
        .where(eq(patients.id, insertAppointment.patientId));
    }
    
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (error) {
      console.error('Delete appointment error:', error);
      return false;
    }
  }

  async getAppointmentsByDate(doctorId: string, date: string): Promise<Appointment[]> {
    return await db.select().from(appointments).where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.dateTime, new Date(date))
      )
    );
  }

  // Prescription methods
  async getPrescriptions(doctorId?: string, patientId?: string): Promise<any[]> {
    let conditions = [];
    if (doctorId) conditions.push(eq(prescriptions.doctorId, doctorId));
    if (patientId) conditions.push(eq(prescriptions.patientId, patientId));
    
    const prescriptionList = conditions.length > 0 
      ? await db.select().from(prescriptions).where(and(...conditions))
      : await db.select().from(prescriptions);

    // Get all medicines to create a lookup map
    const allMedicines = await db.select().from(medicines);
    const medicineMap = new Map(allMedicines.map(med => [med.id, med]));

    // Enrich prescriptions with actual medicine names
    return prescriptionList.map(prescription => {
      const enrichedMedicines = prescription.medicines.map((medicine: any) => {
        if (medicine.medicineId && medicineMap.has(medicine.medicineId)) {
          const medicineDetails = medicineMap.get(medicine.medicineId);
          return {
            ...medicine,
            name: medicineDetails.name,
            code: medicineDetails.code,
            description: medicineDetails.description,
            power: medicineDetails.power
          };
        }
        return medicine;
      });

      return {
        ...prescription,
        medicines: enrichedMedicines
      };
    });
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return prescription || undefined;
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    // Generate prescription ID
    const existingPrescriptions = await db.select().from(prescriptions).where(eq(prescriptions.doctorId, insertPrescription.doctorId));
    const prescriptionId = `RRX-${String(existingPrescriptions.length + 1).padStart(3, '0')}`;
    
    const [prescription] = await db
      .insert(prescriptions)
      .values({ ...insertPrescription, prescriptionId })
      .returning();
    
    // Update patient's last visit date
    if (insertPrescription.patientId) {
      await db
        .update(patients)
        .set({ lastVisitDate: new Date() })
        .where(eq(patients.id, insertPrescription.patientId));
    }
    
    return prescription;
  }

  async updatePrescription(id: string, updateData: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [prescription] = await db
      .update(prescriptions)
      .set(updateData)
      .where(eq(prescriptions.id, id))
      .returning();
    return prescription || undefined;
  }

  async deletePrescription(id: string): Promise<boolean> {
    try {
      await db.delete(prescriptions).where(eq(prescriptions.id, id));
      return true;
    } catch (error) {
      console.error('Delete prescription error:', error);
      return false;
    }
  }

  async deletePatient(id: string, doctorId?: string): Promise<void> {
    // Delete related prescriptions first
    await db.delete(prescriptions).where(eq(prescriptions.patientId, id));
    
    // Delete related appointments
    await db.delete(appointments).where(eq(appointments.patientId, id));
    
    // Delete the patient
    await db.delete(patients).where(eq(patients.id, id));
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Delete all related data first
      const userPatients = await db.select().from(patients).where(eq(patients.doctorId, id));
      for (const patient of userPatients) {
        await this.deletePatient(patient.id);
      }
      
      // Delete appointments
      await db.delete(appointments).where(eq(appointments.doctorId, id));
      
      // Delete prescriptions
      await db.delete(prescriptions).where(eq(prescriptions.doctorId, id));
      
      // Delete medicines
      await db.delete(medicines).where(eq(medicines.doctorId, id));
      
      // Finally delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.role, role));
    return userList;
  }

  async updatePatient(id: string, updateData: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  // Medicine methods
  async getMedicines(doctorId?: string): Promise<Medicine[]> {
    if (doctorId) {
      return await db.select().from(medicines).where(eq(medicines.doctorId, doctorId));
    }
    return await db.select().from(medicines);
  }

  async getMedicine(id: string): Promise<Medicine | undefined> {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
    return medicine || undefined;
  }

  async createMedicine(insertMedicine: InsertMedicine): Promise<Medicine> {
    const [medicine] = await db
      .insert(medicines)
      .values(insertMedicine)
      .returning();
    return medicine;
  }

  async updateMedicine(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined> {
    const [medicine] = await db
      .update(medicines)
      .set(updates)
      .where(eq(medicines.id, id))
      .returning();
    return medicine || undefined;
  }

  async deleteMedicine(id: string): Promise<boolean> {
    try {
      await db.delete(medicines).where(eq(medicines.id, id));
      return true;
    } catch (error) {
      console.error('Delete medicine error:', error);
      return false;
    }
  }

  // Template methods
  async getPrescriptionTemplates(): Promise<PrescriptionTemplate[]> {
    return await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.isActive, true));
  }

  async getPrescriptionTemplate(id: string): Promise<PrescriptionTemplate | undefined> {
    const [template] = await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.id, id));
    return template || undefined;
  }

  async createPrescriptionTemplate(template: InsertPrescriptionTemplate): Promise<PrescriptionTemplate> {
    const [newTemplate] = await db
      .insert(prescriptionTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updatePrescriptionTemplate(id: string, updates: Partial<PrescriptionTemplate>): Promise<PrescriptionTemplate | undefined> {
    const [template] = await db
      .update(prescriptionTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deletePrescriptionTemplate(id: string): Promise<boolean> {
    try {
      // First, remove all doctor assignments for this template
      await db.delete(doctorTemplateAssignments).where(eq(doctorTemplateAssignments.templateId, id));
      
      // Then delete the template
      const result = await db
        .delete(prescriptionTemplates)
        .where(eq(prescriptionTemplates.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  // Template assignment methods for admin (with doctor info)
  async getAdminTemplateAssignments(): Promise<any[]> {
    try {
      // Get all assignments
      const assignments = await db.select().from(doctorTemplateAssignments);
      
      // Get template and doctor details for each assignment
      const enrichedAssignments = [];
      for (const assignment of assignments) {
        // Get template details
        const template = await db.select().from(prescriptionTemplates)
          .where(eq(prescriptionTemplates.id, assignment.templateId))
          .limit(1);
        
        if (template.length === 0 || !template[0].isActive) continue;
        
        // Get doctor details
        const doctor = await db.select().from(users)
          .where(eq(users.id, assignment.doctorId))
          .limit(1);
        
        if (doctor.length === 0) continue;
        
        enrichedAssignments.push({
          ...assignment,
          templateName: template[0].name,
          templateType: template[0].type,
          doctorName: doctor[0].name,
          doctorUsername: doctor[0].username
        });
      }
      
      return enrichedAssignments;
    } catch (error) {
      console.error('Error in getAdminTemplateAssignments:', error);
      return [];
    }
  }

  // Template assignment methods for doctors (with template content)
  async getDoctorTemplateAssignments(doctorId: string): Promise<any[]> {
    try {
      const query = db
        .select({
          id: doctorTemplateAssignments.id,
          doctorId: doctorTemplateAssignments.doctorId,
          templateId: doctorTemplateAssignments.templateId,
          isDefault: doctorTemplateAssignments.isDefault,
          assignedBy: doctorTemplateAssignments.assignedBy,
          assignedAt: doctorTemplateAssignments.assignedAt,
          // Include template data
          templateName: prescriptionTemplates.name,
          templateContent: prescriptionTemplates.content,
          templateType: prescriptionTemplates.type,
          templateDescription: prescriptionTemplates.name
        })
        .from(doctorTemplateAssignments)
        .innerJoin(prescriptionTemplates, eq(doctorTemplateAssignments.templateId, prescriptionTemplates.id))
        .where(and(
          eq(prescriptionTemplates.isActive, true),
          eq(doctorTemplateAssignments.doctorId, doctorId)
        ));
      
      return await query;
    } catch (error) {
      console.error('Error in getDoctorTemplateAssignments:', error);
      return [];
    }
  }

  async assignTemplateToDoctor(assignment: InsertDoctorTemplateAssignment): Promise<DoctorTemplateAssignment> {
    // If this is being set as default, remove default from other templates for this doctor
    if (assignment.isDefault) {
      await db
        .update(doctorTemplateAssignments)
        .set({ isDefault: false })
        .where(eq(doctorTemplateAssignments.doctorId, assignment.doctorId));
    }

    const [newAssignment] = await db
      .insert(doctorTemplateAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async removeTemplateFromDoctor(doctorId: string, templateId: string): Promise<boolean> {
    const result = await db
      .delete(doctorTemplateAssignments)
      .where(
        and(
          eq(doctorTemplateAssignments.doctorId, doctorId),
          eq(doctorTemplateAssignments.templateId, templateId)
        )
      );
    
    return result.rowCount > 0;
  }

  async setDefaultTemplate(doctorId: string, templateId: string): Promise<boolean> {
    try {
      // First, remove default from all other templates for this doctor
      await db
        .update(doctorTemplateAssignments)
        .set({ isDefault: false })
        .where(eq(doctorTemplateAssignments.doctorId, doctorId));

      // Then set the specified template as default
      const result = await db
        .update(doctorTemplateAssignments)
        .set({ isDefault: true })
        .where(
          and(
            eq(doctorTemplateAssignments.doctorId, doctorId),
            eq(doctorTemplateAssignments.templateId, templateId)
          )
        );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error setting default template:', error);
      return false;
    }
  }

  // Doctor availability methods
  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    return await db
      .select()
      .from(doctorAvailability)
      .where(eq(doctorAvailability.doctorId, doctorId))
      .orderBy(doctorAvailability.dayOfWeek);
  }

  async upsertDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability> {
    // Check if availability already exists for this doctor and day
    const existing = await db
      .select()
      .from(doctorAvailability)
      .where(
        and(
          eq(doctorAvailability.doctorId, availability.doctorId),
          eq(doctorAvailability.dayOfWeek, availability.dayOfWeek)
        )
      );

    if (existing.length > 0) {
      // Update existing availability
      const [updated] = await db
        .update(doctorAvailability)
        .set({
          ...availability,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(doctorAvailability.doctorId, availability.doctorId),
            eq(doctorAvailability.dayOfWeek, availability.dayOfWeek)
          )
        )
        .returning();
      return updated;
    } else {
      // Create new availability
      const [created] = await db
        .insert(doctorAvailability)
        .values(availability)
        .returning();
      return created;
    }
  }

  async deleteDoctorAvailability(doctorId: string, dayOfWeek: number): Promise<boolean> {
    const result = await db
      .delete(doctorAvailability)
      .where(
        and(
          eq(doctorAvailability.doctorId, doctorId),
          eq(doctorAvailability.dayOfWeek, dayOfWeek)
        )
      );
    
    return result.rowCount > 0;
  }

  // WhatsApp methods
  async getUserByWhatsApp(whatsappPhone: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.whatsappPhone, whatsappPhone));
      return user || undefined;
    } catch (error) {
      console.error('Get user by WhatsApp error:', error);
      return undefined;
    }
  }

  async findNextAvailableSlot(doctorId: string): Promise<Date | null> {
    try {
      const availability = await this.getDoctorAvailability(doctorId);
      if (!availability.length) return null;

      const today = new Date();
      const maxDays = 7; // Look ahead 7 days

      for (let dayOffset = 0; dayOffset < maxDays; dayOffset++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + dayOffset);
        const dayOfWeek = checkDate.getDay();

        const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
        if (!dayAvailability) continue;

        // Simple slot finding: return first available hour of the day
        const slotTime = new Date(checkDate);
        const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
        slotTime.setHours(startHour, 0, 0, 0);

        // Check if this slot is already booked
        const existingAppointments = await this.getAppointmentsByDate(doctorId, checkDate.toISOString().split('T')[0]);
        const isSlotTaken = existingAppointments.some(apt => {
          const aptTime = new Date(apt.dateTime);
          return aptTime.getHours() === slotTime.getHours();
        });

        if (!isSlotTaken && slotTime > new Date()) {
          return slotTime;
        }
      }

      return null;
    } catch (error) {
      console.error('Find next available slot error:', error);
      return null;
    }
  }

  async getPatientByPhoneAndDoctor(phone: string, doctorId: string): Promise<Patient | undefined> {
    try {
      const [patient] = await db
        .select()
        .from(patients)
        .where(and(
          eq(patients.phone, phone),
          eq(patients.doctorId, doctorId)
        ));
      return patient || undefined;
    } catch (error) {
      console.error('Get patient by phone and doctor error:', error);
      return undefined;
    }
  }

  // WhatsApp session methods
  async getWhatsappSession(patientPhone: string, doctorId: string): Promise<WhatsappSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(whatsappSessions)
        .where(and(
          eq(whatsappSessions.patientPhone, patientPhone),
          eq(whatsappSessions.doctorId, doctorId)
        ));
      return session || undefined;
    } catch (error) {
      console.error('Get WhatsApp session error:', error);
      return undefined;
    }
  }

  async createWhatsappSession(session: InsertWhatsappSession): Promise<WhatsappSession> {
    try {
      const [newSession] = await db
        .insert(whatsappSessions)
        .values(session)
        .returning();
      return newSession;
    } catch (error) {
      console.error('Create WhatsApp session error:', error);
      throw error;
    }
  }

  async updateWhatsappSession(id: string, updates: Partial<WhatsappSession>): Promise<WhatsappSession | undefined> {
    try {
      const [updatedSession] = await db
        .update(whatsappSessions)
        .set({ ...updates, lastMessageAt: new Date() })
        .where(eq(whatsappSessions.id, id))
        .returning();
      return updatedSession || undefined;
    } catch (error) {
      console.error('Update WhatsApp session error:', error);
      return undefined;
    }
  }

  async deleteExpiredWhatsappSessions(): Promise<void> {
    try {
      await db
        .delete(whatsappSessions)
        .where(sql`expires_at < NOW()`);
    } catch (error) {
      console.error('Delete expired WhatsApp sessions error:', error);
    }
  }
}

export const storage = new DatabaseStorage();