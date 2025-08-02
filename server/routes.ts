import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import crypto from "crypto";
import multer from "multer";
import csv from "csv-parser";
import * as XLSX from "xlsx";
import { Readable } from "stream";
import { insertUserSchema, insertPatientSchema, insertAppointmentSchema, insertPrescriptionSchema, insertMedicineSchema, whatsappSessions } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";
import { config } from "./config";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

declare module "express" {
  interface Request {
    user?: {
      id: string;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads using config settings
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.upload.maxFileSize,
    },
    fileFilter: (req, file, cb) => {
      if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV, Excel, and PDF files are allowed'));
      }
    }
  });

  // Session configuration using centralized config
  app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    name: 'homeo.sid', // Custom session name
    cookie: {
      secure: config.session.secure, // HTTPS only in production
      httpOnly: true,
      maxAge: config.session.maxAge,
      sameSite: config.session.sameSite
    },
    // Use database session store in production for scalability
    store: config.isProduction ? undefined : undefined // Can be configured with connect-pg-simple if needed
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // Add user to request for convenience
    req.user = { id: req.session.userId, role: req.session.userRole };
    next();
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  // Push notification subscription management
  app.post("/api/notifications/subscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      const userId = req.session.userId!;
      
      // Store subscription in database
      const subscription = {
        id: crypto.randomUUID(),
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,

      };
      
      await db.insert(schema.pushSubscriptions).values(subscription);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.post("/api/notifications/unsubscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      await db.delete(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.endpoint, endpoint));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  app.post("/api/notifications/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = req.body;
      
      // Store notification settings using UPSERT functionality
      const notificationSetting = {
        id: crypto.randomUUID(),
        userId,
        appointmentReminders: settings.appointmentReminders,
        reminderTime: settings.reminderTime,
        dailyReminders: settings.dailyReminders,
        weeklyReports: settings.weeklyReports
      };

      await db.insert(schema.notificationSettings)
        .values(notificationSetting)
        .onConflictDoUpdate({
          target: schema.notificationSettings.userId,
          set: {
            appointmentReminders: settings.appointmentReminders,
            reminderTime: settings.reminderTime,
            dailyReminders: settings.dailyReminders,
            weeklyReports: settings.weeklyReports
          }
        });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.get("/api/notifications/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const [settings] = await db.select().from(schema.notificationSettings)
        .where(eq(schema.notificationSettings.userId, userId));
      
      res.json(settings || {
        appointmentReminders: true,
        reminderTime: 30,
        dailyReminders: false,
        weeklyReports: false
      });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // User routes
  app.get("/api/users/doctors", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      const doctorsWithoutPasswords = doctors.map(({ password, ...doctor }) => doctor);
      res.json(doctorsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  // Patient routes
  app.get("/api/patients", requireAuth, async (req, res) => {
    try {
      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const patients = await storage.getPatients(doctorId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check if doctor can access this patient
      if (req.session.userRole === "doctor" && patient.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse({
        ...req.body,
        doctorId: req.session.userRole === "doctor" ? req.session.userId : req.body.doctorId
      });
      const patient = await storage.createPatient(patientData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Invalid patient data" });
      }
    }
  });

  // Appointment routes
  app.get("/api/appointments", requireAuth, async (req, res) => {
    try {
      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const appointments = await storage.getAppointments(doctorId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/date/:date", requireAuth, async (req, res) => {
    try {
      const { date } = req.params;
      const doctorId = req.session.userRole === "doctor" ? req.session.userId! : req.query.doctorId as string;
      const appointments = await storage.getAppointmentsByDate(doctorId, date);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      // Convert dateTime string to Date object
      const appointmentInput = {
        ...req.body,
        doctorId: req.session.userRole === "doctor" ? req.session.userId : req.body.doctorId,
        dateTime: new Date(req.body.dateTime) // Convert string to Date
      };
      
      const appointmentData = insertAppointmentSchema.parse(appointmentInput);
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Invalid appointment data" });
      }
    }
  });

  app.put("/api/appointments/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get appointment first to check access
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Check if doctor can access this appointment
      if (req.session.userRole === "doctor" && existingAppointment.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const appointment = await storage.updateAppointment(id, updates);
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // For doctors, check if they own this appointment
      if (req.session.userRole === 'doctor' && appointment.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete appointment" });
      }
      
      res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Prescription routes
  app.get("/api/prescriptions", requireAuth, async (req, res) => {
    try {
      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const patientId = req.query.patientId as string;
      const prescriptions = await storage.getPrescriptions(doctorId, patientId);
      res.json(prescriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  app.get("/api/prescriptions/patient/:patientId", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const prescriptions = await storage.getPrescriptions(doctorId, patientId);
      res.json(prescriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient prescriptions" });
    }
  });

  app.post("/api/prescriptions", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse({
        ...req.body,
        doctorId: req.session.userRole === "doctor" ? req.session.userId : req.body.doctorId
      });
      const prescription = await storage.createPrescription(prescriptionData);
      res.json(prescription);
    } catch (error) {
      res.status(400).json({ message: "Invalid prescription data" });
    }
  });

  app.patch("/api/prescriptions/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Get existing prescription to check access
      const existingPrescription = await storage.getPrescription(id);
      if (!existingPrescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }
      
      // Check if doctor can access this prescription
      if (req.session.userRole === "doctor" && existingPrescription.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate required fields
      if (!updateData.symptoms || !updateData.medicines || !Array.isArray(updateData.medicines)) {
        return res.status(400).json({ message: "Invalid prescription data" });
      }

      const prescription = await storage.updatePrescription(id, updateData);
      res.json(prescription);
    } catch (error) {
      console.error("Error updating prescription:", error);
      res.status(500).json({ message: "Failed to update prescription" });
    }
  });

  app.delete("/api/prescriptions/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const prescription = await storage.getPrescription(id);
      
      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      // For doctors, check if they own this prescription
      if (req.session.userRole === 'doctor' && prescription.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deletePrescription(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete prescription" });
      }
      
      res.json({ message: "Prescription deleted successfully" });
    } catch (error) {
      console.error('Delete prescription error:', error);
      res.status(500).json({ message: "Failed to delete prescription" });
    }
  });

  // Patient deletion route
  app.delete("/api/patients/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get existing patient to check access
      const existingPatient = await storage.getPatient(id);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check if doctor can access this patient
      if (req.session.userRole === "doctor" && existingPatient.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if doctor has delete permission (only if role is doctor)
      if (req.session.userRole === "doctor") {
        const doctor = await storage.getUser(req.session.userId!);
        if (!doctor?.canDeletePatients) {
          return res.status(403).json({ message: "Delete permission not granted. Contact admin to enable patient deletion." });
        }
      }
      
      // Delete patient and related data
      await storage.deletePatient(id);
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Admin route to manage doctor permissions
  app.patch("/api/users/:id/permissions", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { canDeletePatients } = req.body;
      
      const user = await storage.updateUser(id, { canDeletePatients });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  // Route to get all doctors (admin only)
  app.get("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { role } = req.query;
      const users = await storage.getUsersByRole(role as string || "doctor");
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      // Users can only update their own profile, or admin can update any
      if (id !== userId && req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated via this endpoint
      delete updateData.password;
      delete updateData.username;
      delete updateData.role;
      
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user password
  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const { currentPassword, newPassword } = req.body;
      
      // Users can only change their own password
      if (id !== userId) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Get current user to verify password
      const currentUser = await storage.getUser(id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password (in a real app, you'd hash and compare)
      if (currentUser.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update password
      const updatedUser = await storage.updateUser(id, { password: newPassword });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Patient update route
  app.patch("/api/patients/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Get existing patient to check access
      const existingPatient = await storage.getPatient(id);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check if doctor can access this patient
      if (req.session.userRole === "doctor" && existingPatient.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate required fields
      if (!updateData.name || !updateData.age || !updateData.gender || !updateData.phone) {
        return res.status(400).json({ message: "Name, age, gender, and phone are required" });
      }
      
      const patient = await storage.updatePatient(id, updateData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  // Medicine routes
  app.get("/api/medicines", requireAuth, async (req, res) => {
    try {
      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const medicines = await storage.getMedicines(doctorId);
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medicines" });
    }
  });

  app.post("/api/medicines", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const medicineData = insertMedicineSchema.parse({
        ...req.body,
        doctorId: req.session.userRole === "doctor" ? req.session.userId : req.body.doctorId
      });
      
      // Check if medicine code already exists
      const existingMedicines = await storage.getMedicines();
      const existingMedicine = existingMedicines.find(m => m.code === medicineData.code);
      if (existingMedicine) {
        return res.status(400).json({ message: "Medicine code already exists. Please use a unique code." });
      }
      
      const medicine = await storage.createMedicine(medicineData);
      res.json(medicine);
    } catch (error) {
      res.status(400).json({ message: "Invalid medicine data" });
    }
  });

  app.patch("/api/medicines/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if medicine exists and belongs to the doctor
      const existingMedicine = await storage.getMedicine(id);
      if (!existingMedicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      // Check if doctor is trying to update their own medicine
      if (req.session.userRole === "doctor" && existingMedicine.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertMedicineSchema.partial().parse(req.body);
      
      // Check if medicine code is being updated and if it already exists
      if (updateData.code && updateData.code !== existingMedicine.code) {
        const existingMedicines = await storage.getMedicines();
        const codeExists = existingMedicines.find(m => m.code === updateData.code && m.id !== id);
        if (codeExists) {
          return res.status(400).json({ message: "Medicine code already exists. Please use a unique code." });
        }
      }
      
      const medicine = await storage.updateMedicine(id, updateData);
      
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      res.json(medicine);
    } catch (error) {
      res.status(400).json({ message: "Invalid medicine data" });
    }
  });

  app.delete("/api/medicines/:id", requireAuth, requireRole(["doctor", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const medicine = await storage.getMedicine(id);
      
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }

      // For doctors, check if they own this medicine
      if (req.session.userRole === 'doctor' && medicine.doctorId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deleteMedicine(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete medicine" });
      }
      
      res.json({ message: "Medicine deleted successfully" });
    } catch (error) {
      console.error('Delete medicine error:', error);
      res.status(500).json({ message: "Failed to delete medicine" });
    }
  });

  // Medicine suggestion routes
  app.get("/api/medicines/suggestions", requireAuth, async (req, res) => {
    try {
      const { symptoms } = req.query;
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({ message: "Symptoms parameter is required" });
      }

      const doctorId = req.session.userRole === "doctor" ? req.session.userId : undefined;
      const allMedicines = await storage.getMedicines(doctorId);
      
      // Database-based suggestions: search medicines by symptoms
      const dbSuggestions = allMedicines.filter(medicine => {
        if (!medicine.symptoms) return false;
        const medicineSymptoms = medicine.symptoms.toLowerCase();
        const searchSymptoms = symptoms.toLowerCase();
        
        // Check if any word in symptoms matches medicine symptoms
        const searchWords = searchSymptoms.split(/\s+/);
        return searchWords.some(word => medicineSymptoms.includes(word));
      }).slice(0, 5); // Limit to 5 suggestions

      res.json({
        suggestions: dbSuggestions.map(medicine => ({
          id: medicine.id,
          name: medicine.name,
          power: medicine.power,
          dosage: medicine.dosage,
          symptoms: medicine.symptoms,
          description: medicine.description,
          source: 'database'
        }))
      });
    } catch (error) {
      console.error('Medicine suggestion error:', error);
      res.status(500).json({ message: "Failed to get medicine suggestions" });
    }
  });

  // Medicine upload route
  app.post("/api/medicines/upload", requireAuth, requireRole(["doctor", "admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const doctorId = req.session.userRole === "doctor" ? req.session.userId : req.body.doctorId;
      if (!doctorId) {
        return res.status(400).json({ message: "Doctor ID is required" });
      }

      let medicines: any[] = [];
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Parse file based on type
      if (req.file.mimetype === 'text/csv') {
        // Parse CSV
        medicines = await parseCSV(req.file.buffer);
      } else if (req.file.mimetype.includes('sheet') || req.file.mimetype.includes('excel')) {
        // Parse Excel
        medicines = await parseExcel(req.file.buffer);
      } else if (req.file.mimetype === 'application/pdf') {
        // Parse PDF
        const pdfParse = await import('pdf-parse');
        medicines = await parsePDF(req.file.buffer, pdfParse.default);
      } else {
        return res.status(400).json({ message: "Unsupported file format" });
      }

      // Get existing medicines to check for duplicate codes
      const existingMedicines = await storage.getMedicines();
      const existingCodes = new Set(existingMedicines.map(m => m.code.toUpperCase()));

      // Process each medicine
      for (const medicineData of medicines) {
        try {
          // Validate required fields
          if (!medicineData.name || !medicineData.code) {
            results.failed++;
            results.errors.push(`Missing required fields (name or code) for: ${medicineData.name || 'unknown'}`);
            continue;
          }

          // Generate unique code if duplicate
          let uniqueCode = medicineData.code.toUpperCase();
          let counter = 1;
          while (existingCodes.has(uniqueCode)) {
            uniqueCode = `${medicineData.code.toUpperCase()}${counter}`;
            counter++;
          }

          // Create medicine object
          const medicineToCreate = {
            name: medicineData.name.trim(),
            code: uniqueCode,
            description: medicineData.description?.trim() || "",
            power: medicineData.power?.trim() || "",
            dosage: medicineData.dosage?.trim() || "",
            symptoms: medicineData.symptoms?.trim() || "",
            doctorId
          };

          // Validate with schema
          const validatedMedicine = insertMedicineSchema.parse(medicineToCreate);
          
          // Create medicine
          await storage.createMedicine(validatedMedicine);
          existingCodes.add(uniqueCode); // Add to set to avoid duplicates in this batch
          results.successful++;

        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to create medicine "${medicineData.name}": ${error.message}`);
        }
      }

      res.json({
        message: `Upload completed. ${results.successful} medicines imported, ${results.failed} failed.`,
        ...results
      });

    } catch (error: any) {
      console.error('Medicine upload error:', error);
      res.status(500).json({ 
        message: "Failed to process file upload",
        error: error.message 
      });
    }
  });

  // Helper functions for file parsing
  function parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const medicines: any[] = [];
      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim()
        }))
        .on('data', (data) => {
          medicines.push({
            name: data.name || data['medicine name'] || data['name'],
            code: data.code || data['medicine code'] || data['code'],
            company: data.company || data['manufacturer'] || data['company/manufacturer'],
            description: data.description || data['desc'],
            power: data.power || data['potency'],
            dosage: data.dosage || data['dose'],
            symptoms: data.symptoms || data['indications'] || data['used for'],
            currentStock: parseInt(data['current stock'] || data['stock'] || data['currentstock']) || 0,
            lowStockThreshold: parseInt(data['low stock threshold'] || data['threshold'] || data['lowstockthreshold']) || 10
          });
        })
        .on('end', () => resolve(medicines))
        .on('error', reject);
    });
  }

  function parseExcel(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          return resolve([]);
        }

        const headers = (jsonData[0] as string[]).map(h => h.toLowerCase().trim());
        const medicines: any[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const medicine: any = {};
          headers.forEach((header, index) => {
            const value = row[index];
            if (value !== undefined && value !== null && value !== '') {
              if (header.includes('name')) medicine.name = String(value).trim();
              else if (header.includes('code')) medicine.code = String(value).trim();
              else if (header.includes('company') || header.includes('manufacturer')) medicine.company = String(value).trim();
              else if (header.includes('description') || header.includes('desc')) medicine.description = String(value).trim();
              else if (header.includes('power') || header.includes('potency')) medicine.power = String(value).trim();
              else if (header.includes('dosage') || header.includes('dose')) medicine.dosage = String(value).trim();
              else if (header.includes('symptoms') || header.includes('indications') || header.includes('used for')) medicine.symptoms = String(value).trim();
              else if (header.includes('current stock') || header.includes('stock')) medicine.currentStock = parseInt(String(value)) || 0;
              else if (header.includes('threshold') || header.includes('low stock')) medicine.lowStockThreshold = parseInt(String(value)) || 10;
            }
          });

          if (medicine.name || medicine.code) {
            medicines.push(medicine);
          }
        }

        resolve(medicines);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function parsePDF(buffer: Buffer, pdfParseFunc: any): Promise<any[]> {
    try {
      const pdfData = await pdfParseFunc(buffer);
      const text = pdfData.text;
      
      // Simple PDF parsing - look for patterns like:
      // Medicine Name, Code, Description, etc.
      const lines = text.split('\n').filter(line => line.trim());
      const medicines: any[] = [];

      for (const line of lines) {
        // Skip headers and empty lines
        if (!line || line.toLowerCase().includes('medicine') || line.toLowerCase().includes('name') || line.length < 10) {
          continue;
        }

        // Try to parse comma-separated or tab-separated values
        const parts = line.split(/[,\t]/).map(p => p.trim()).filter(p => p);
        
        if (parts.length >= 2) {
          medicines.push({
            name: parts[0],
            code: parts[1],
            company: parts[2] || "",
            description: parts[3] || "",
            power: parts[4] || "",
            dosage: parts[5] || "",
            symptoms: parts[6] || "",
            currentStock: parseInt(parts[7]) || 0,
            lowStockThreshold: parseInt(parts[8]) || 10
          });
        }
      }

      return medicines;
    } catch (error) {
      throw new Error('Failed to parse PDF file');
    }
  }

  app.post("/api/medicines/ai-suggestions", requireAuth, async (req, res) => {
    try {
      const { symptoms } = req.body;
      if (!symptoms || typeof symptoms !== 'string') {
        return res.status(400).json({ message: "Symptoms are required" });
      }

      const { getHomeopathicMedicineSuggestions } = await import('./gemini');
      const aiSuggestions = await getHomeopathicMedicineSuggestions(symptoms);
      
      res.json({
        suggestions: aiSuggestions.map(suggestion => ({
          ...suggestion,
          source: 'ai'
        }))
      });
    } catch (error) {
      console.error('AI suggestion error:', error);
      res.status(500).json({ message: "Failed to get AI suggestions. Please check your API configuration." });
    }
  });

  // AI Discussion endpoint for medicines
  app.post("/api/medicines/ai-discuss", requireAuth, async (req, res) => {
    try {
      const { query, language } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      const isBengali = language === 'bengali';
      
      // Create a comprehensive prompt for homeopathic medicine consultation
      const systemPrompt = isBengali 
        ? `আপনি একজন অভিজ্ঞ হোমিওপ্যাথিক ডাক্তার যার হোমিওপ্যাথিক ওষুধ এবং তাদের প্রয়োগ সম্পর্কে ব্যাপক জ্ঞান রয়েছে। 
      হোমিওপ্যাথিক ওষুধ সম্পর্কে নিম্নলিখিত প্রশ্নের জন্য বাংলা ভাষায় সম্পূর্ণ তথ্য প্রদান করুন।
      
      যদি ব্যবহারকারী একটি নির্দিষ্ট ওষুধ সম্পর্কে জিজ্ঞাসা করেন (যেমন অ্যার্নিকা মন্টানা, বেলাডোনা ইত্যাদি), প্রদান করুন:
      1. ওষুধটি কিসের জন্য ব্যবহৃত হয় (লক্ষণ/অবস্থা)
      2. সাধারণ ডোজ এবং শক্তি
      3. কখন এটি ব্যবহার করতে হবে
      4. কোনো গুরুত্বপূর্ণ নোট বা সতর্কতা
      
      যদি ব্যবহারকারী লক্ষণ বা রোগ সম্পর্কে জিজ্ঞাসা করেন, প্রদান করুন:
      1. হোমিওপ্যাথিক ওষুধের তালিকা যা সাহায্য করতে পারে
      2. প্রতিটি ওষুধের ক্রিয়ার সংক্ষিপ্ত বিবরণ
      3. প্রস্তাবিত শক্তি
      4. ব্যবহারের নির্দেশাবলী
      
      সর্বদা বাংলায় উত্তর দিন এবং হোমিওপ্যাথিক অনুশীলনের জন্য তথ্য সঠিক এবং সহায়ক রাখুন।
      
      ব্যবহারকারীর প্রশ্ন: ${query}`
        : `You are an expert homeopathic doctor with extensive knowledge of homeopathic medicines and their applications. 
      Please provide comprehensive information in English for the following query about homeopathic medicines.
      
      If the user asks about a specific medicine (like Arnica Montana, Belladonna, etc.), provide:
      1. What the medicine is used for (symptoms/conditions)
      2. Common dosage and potency
      3. When to use it
      4. Any important notes or precautions
      
      If the user asks about symptoms or diseases, provide:
      1. List of homeopathic medicines that can help
      2. Brief description of each medicine's action
      3. Recommended potencies
      4. Usage instructions
      
      Always respond in English and keep the information accurate and helpful for homeopathic practice.
      
      User Query: ${query}`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt,
      });

      const aiResponse = response.text || "দুঃখিত, এই মুহূর্তে তথ্য প্রদান করা সম্ভব হচ্ছে না।";
      
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error in AI discussion:", error);
      res.status(500).json({ 
        message: "AI সেবা সাময়িকভাবে অনুপলব্ধ",
        response: "দুঃখিত, এই মুহূর্তে AI সেবা পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।" 
      });
    }
  });

  // Statistics routes
  app.get("/api/stats/dashboard", requireAuth, async (req, res) => {
    try {
      const doctorId = req.session.userRole === "doctor" ? req.session.userId! : undefined;
      
      const patients = await storage.getPatients(doctorId);
      const appointments = await storage.getAppointments(doctorId);
      const prescriptions = await storage.getPrescriptions(doctorId);
      const medicines = await storage.getMedicines(doctorId);
      
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointments.filter(a => {
        const appointmentDate = a.dateTime.toISOString().split('T')[0];
        return appointmentDate === today;
      });
      
      const prescriptionsToday = prescriptions.filter(p => {
        const prescriptionDate = p.createdAt!.toISOString().split('T')[0];
        return prescriptionDate === today;
      });
      
      const pendingAppointments = appointments.filter(a => a.status === "upcoming");

      res.json({
        totalPatients: patients.length,
        todayAppointments: todayAppointments.length,
        prescriptionsToday: prescriptionsToday.length,
        pendingAppointments: pendingAppointments.length,
        totalMedicines: medicines.length,
        totalDoctors: doctorId ? 1 : (await storage.getDoctors()).length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      const patients = await storage.getPatients();
      const medicines = await storage.getMedicines();
      const appointments = await storage.getAppointments();

      // Get appointments count by doctor
      const appointmentsByDoctor = doctors.map(doctor => {
        const doctorAppointments = appointments.filter(apt => apt.doctorId === doctor.id);
        return {
          doctorName: doctor.name,
          count: doctorAppointments.length
        };
      }).filter(item => item.count > 0);

      res.json({
        doctorsCount: doctors.length,
        patientsCount: patients.length,
        medicinesCount: medicines.length,
        appointmentsCount: appointments.length,
        appointmentsByDoctor
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.get("/api/admin/doctors", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      const result = doctors.map(doctor => ({
        ...doctor,
        isActive: doctor.isActive !== false // Default to true if not explicitly false
      }));
      res.json(result);
    } catch (error) {
      console.error('Admin doctors error:', error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.post("/api/admin/doctors", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse({
        ...req.body,
        role: 'doctor'
      });
      
      const newDoctor = await storage.createUser(userData);
      res.json(newDoctor);
    } catch (error) {
      console.error('Admin create doctor error:', error);
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  app.patch("/api/admin/doctors/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Remove password if empty
      if (updateData.password === "") {
        delete updateData.password;
      }
      
      const updatedDoctor = await storage.updateUser(id, updateData);
      if (!updatedDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json(updatedDoctor);
    } catch (error) {
      console.error('Admin update doctor error:', error);
      res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  // Admin user management routes
  app.get("/api/admin/admins", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const admins = await db.select().from(schema.users).where(eq(schema.users.role, 'admin'));
      const result = admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        createdAt: admin.createdAt,
        isActive: admin.isActive !== false
      }));
      res.json(result);
    } catch (error) {
      console.error('Admin fetch admins error:', error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.post("/api/admin/admins", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse({
        ...req.body,
        role: 'admin'
      });
      
      const newAdmin = await storage.createUser(userData);
      res.json({
        id: newAdmin.id,
        name: newAdmin.name,
        username: newAdmin.username,
        email: newAdmin.email,
        createdAt: newAdmin.createdAt,
        isActive: newAdmin.isActive
      });
    } catch (error) {
      console.error('Admin create admin error:', error);
      if (error.message.includes('duplicate key')) {
        res.status(400).json({ message: "Username already exists" });
      } else {
        res.status(500).json({ message: "Failed to create admin user" });
      }
    }
  });

  app.patch("/api/admin/admins/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Prevent admin from deactivating themselves
      if (id === req.session.userId && updateData.isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own admin account" });
      }
      
      // Remove password if empty
      if (updateData.password === "") {
        delete updateData.password;
      }
      
      const updatedAdmin = await storage.updateUser(id, updateData);
      if (!updatedAdmin) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      res.json({
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        createdAt: updatedAdmin.createdAt,
        isActive: updatedAdmin.isActive
      });
    } catch (error) {
      console.error('Admin update admin error:', error);
      res.status(500).json({ message: "Failed to update admin user" });
    }
  });

  app.delete("/api/admin/admins/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the admin user to be deleted
      const adminToDelete = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      if (adminToDelete.length === 0) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      // Prevent deleting the main 'admin' username
      if (adminToDelete[0].username === 'admin') {
        return res.status(400).json({ message: "Cannot delete the main admin user" });
      }
      
      // Prevent admin from deleting themselves
      if (id === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }
      
      // Check if there are other active admins
      const activeAdmins = await db.select().from(schema.users)
        .where(eq(schema.users.role, 'admin'))
        .where(eq(schema.users.isActive, true));
      
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ message: "Cannot delete the last active admin user" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      res.json({ message: "Admin user deleted successfully" });
    } catch (error) {
      console.error('Admin delete admin error:', error);
      res.status(500).json({ message: "Failed to delete admin user" });
    }
  });

  app.delete("/api/admin/doctors/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete all related data first
      const patients = await storage.getPatients(id);
      for (const patient of patients) {
        await storage.deletePatient(patient.id, id);
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json({ message: "Doctor deleted successfully" });
    } catch (error) {
      console.error('Admin delete doctor error:', error);
      res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  app.patch("/api/admin/doctors/:id/ai-feature", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { aiFeatureEnabled } = req.body;
      
      const updatedDoctor = await storage.updateUser(id, { aiFeatureEnabled });
      if (!updatedDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json({ 
        message: "AI feature setting updated successfully",
        aiFeatureEnabled: updatedDoctor.aiFeatureEnabled 
      });
    } catch (error) {
      console.error('Admin toggle AI feature error:', error);
      res.status(500).json({ message: "Failed to update AI feature setting" });
    }
  });

  app.patch("/api/admin/doctors/:id/delete-permission", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { canDeletePatients } = req.body;
      
      const updatedDoctor = await storage.updateUser(id, { canDeletePatients });
      if (!updatedDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json({ 
        message: "Delete permission updated successfully",
        canDeletePatients: updatedDoctor.canDeletePatients 
      });
    } catch (error) {
      console.error('Admin toggle delete permission error:', error);
      res.status(500).json({ message: "Failed to update delete permission" });
    }
  });

  app.get("/api/admin/patients", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const patients = await storage.getPatients();
      const doctors = await storage.getDoctors();
      
      // Add doctor names and prescription counts
      const patientsWithDetails = await Promise.all(
        patients.map(async (patient) => {
          const doctor = doctors.find(d => d.id === patient.doctorId);
          const prescriptions = await storage.getPrescriptions(patient.doctorId);
          const patientPrescriptions = prescriptions.filter(p => p.patientId === patient.id);
          
          return {
            ...patient,
            doctorName: doctor?.name || 'Unknown',
            prescriptionCount: patientPrescriptions.length
          };
        })
      );
      
      res.json(patientsWithDetails);
    } catch (error) {
      console.error('Admin patients error:', error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  // Prescription Template Management Routes
  app.get("/api/admin/templates", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const templates = await storage.getPrescriptionTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/admin/templates", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        createdBy: req.session.userId!
      };
      
      const newTemplate = await storage.createPrescriptionTemplate(templateData);
      res.json(newTemplate);
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/admin/templates/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedTemplate = await storage.updatePrescriptionTemplate(id, updateData);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/admin/templates/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePrescriptionTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Template Assignment Routes
  app.get("/api/admin/template-assignments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const assignments = await storage.getAdminTemplateAssignments();
      res.json(assignments);
    } catch (error) {
      console.error('Get template assignments error:', error);
      res.status(500).json({ message: "Failed to fetch template assignments" });
    }
  });

  app.get("/api/doctor/templates", requireAuth, requireRole(['doctor']), async (req, res) => {
    try {
      const assignments = await storage.getDoctorTemplateAssignments((req as any).user.id);
      res.json(assignments);
    } catch (error) {
      console.error('Get doctor templates error:', error);
      res.status(500).json({ message: "Failed to fetch assigned templates" });
    }
  });

  app.post("/api/admin/template-assignments", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const assignmentData = {
        ...req.body,
        assignedBy: (req as any).user.id
      };
      
      const newAssignment = await storage.assignTemplateToDoctor(assignmentData);
      res.json(newAssignment);
    } catch (error) {
      console.error('Assign template error:', error);
      res.status(500).json({ message: "Failed to assign template" });
    }
  });

  app.delete("/api/admin/template-assignments/:doctorId/:templateId", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { doctorId, templateId } = req.params;
      const success = await storage.removeTemplateFromDoctor(doctorId, templateId);
      
      if (!success) {
        return res.status(404).json({ message: "Template assignment not found" });
      }
      
      res.json({ message: "Template assignment removed successfully" });
    } catch (error) {
      console.error('Remove template assignment error:', error);
      res.status(500).json({ message: "Failed to remove template assignment" });
    }
  });

  app.patch("/api/admin/template-assignments/:doctorId/:templateId/default", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { doctorId, templateId } = req.params;
      const success = await storage.setDefaultTemplate(doctorId, templateId);
      
      if (!success) {
        return res.status(404).json({ message: "Template assignment not found" });
      }
      
      res.json({ message: "Default template set successfully" });
    } catch (error) {
      console.error('Set default template error:', error);
      res.status(500).json({ message: "Failed to set default template" });
    }
  });

  // AI Template Generation Route
  app.post("/api/admin/generate-template", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { clinicName, doctorName, degree, headerNotes, footerNotes, description, language } = req.body;
      
      if (!clinicName || !doctorName || !language) {
        return res.status(400).json({ message: "Clinic name, doctor name, and language are required" });
      }

      const { generatePrescriptionTemplate } = await import('./gemini');
      
      const templateContent = await generatePrescriptionTemplate({
        clinicName,
        doctorName,
        degree: degree || '',
        headerNotes: headerNotes || '',
        footerNotes: footerNotes || '',
        description: description || '',
        language
      });
      
      res.json({ 
        templateContent,
        message: "Template generated successfully"
      });
    } catch (error) {
      console.error('AI template generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate template. Please check your AI configuration and try again."
      });
    }
  });

  // WhatsApp Settings Routes
  app.patch("/api/users/:id/whatsapp", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { whatsappPhone, whatsappEnabled } = req.body;
      
      // Check if user can update this profile
      if (req.session.userId !== id && !['admin'].includes((req.session as any).role || '')) {
        return res.status(403).json({ message: "Not authorized to update this profile" });
      }

      const updatedUser = await storage.updateUser(id, {
        whatsappPhone,
        whatsappEnabled
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "WhatsApp settings updated successfully", user: updatedUser });
    } catch (error) {
      console.error('Update WhatsApp settings error:', error);
      res.status(500).json({ message: "Failed to update WhatsApp settings" });
    }
  });

  // Update user settings
  app.patch("/api/users/:id/settings", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { globalLowStockThreshold } = req.body;
      
      // Check if user can update this profile
      if (req.session.userId !== id && !['admin'].includes((req.session as any).role || '')) {
        return res.status(403).json({ message: "Not authorized to update this profile" });
      }

      const updatedUser = await storage.updateUser(id, {
        globalLowStockThreshold
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Settings updated successfully", user: updatedUser });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Enhanced Conversational WhatsApp Booking Route (Public endpoint for webhook/API)
  app.post("/api/whatsapp/message", async (req, res) => {
    try {
      const { doctorPhone, patientPhone, message } = req.body;
      
      if (!doctorPhone || !patientPhone || !message) {
        return res.status(400).json({ 
          message: "Missing required parameters: doctorPhone, patientPhone, message" 
        });
      }

      // Find doctor by WhatsApp phone
      const doctor = await storage.getUserByWhatsApp(doctorPhone);
      if (!doctor || !doctor.whatsappEnabled) {
        return res.status(404).json({ 
          message: "Doctor not found or WhatsApp booking not enabled" 
        });
      }

      // Clean up expired sessions
      await storage.deleteExpiredWhatsappSessions();

      // Check for existing session
      let session = await storage.getWhatsappSession(patientPhone, doctor.id);
      
      // Appointment keywords to detect booking intent
      const appointmentKeywords = [
        'appointment', 'booking', 'book', 'schedule', 'visit', 'consultation',
        'অ্যাপয়েন্টমেন্ট', 'বুকিং', 'সময়', 'দেখা', 'চিকিৎসা'
      ];
      
      const hasAppointmentKeyword = appointmentKeywords.some(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
      );

      // If no session and appointment keyword detected, start new session
      if (!session && hasAppointmentKeyword) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes session

        session = await storage.createWhatsappSession({
          patientPhone,
          doctorId: doctor.id,
          step: 'awaiting_name',
          sessionData: {},
          expiresAt
        });

        return res.json({
          success: true,
          message: `Hello! I can help you book an appointment with Dr. ${doctor.name}.\n\n👤 Please tell me your full name:`
        });
      }

      // If no session and no appointment keyword, provide general info
      if (!session) {
        return res.json({
          success: true,
          message: `Hello! I'm Dr. ${doctor.name}'s appointment booking assistant.\n\n🏥 Clinic: ${doctor.clinicName || 'Homeo Health Clinic'}\n📍 Location: ${doctor.clinicLocation || 'Kolkata'}\n\nTo book an appointment, please type "appointment" or "booking".`
        });
      }

      // Handle session-based conversation
      const sessionData = session.sessionData || {};
      let responseMessage = '';
      let nextStep = session.step;

      switch (session.step) {
        case 'awaiting_name':
          sessionData.name = message.trim();
          nextStep = 'awaiting_age';
          responseMessage = `Thank you, ${sessionData.name}!\n\n🎂 Please tell me your age:`;
          break;

        case 'awaiting_age':
          const age = parseInt(message.trim());
          if (isNaN(age) || age < 1 || age > 150) {
            responseMessage = `Please provide a valid age (1-150):\n\nExample: 25`;
            nextStep = session.step; // Stay in same step
          } else {
            sessionData.age = age;
            nextStep = 'awaiting_gender';
            responseMessage = `Age: ${age} years\n\n⚧️ Please tell me your gender:\n\n• Type "Male" or "M"\n• Type "Female" or "F"\n• Type "Other" or "O"`;
          }
          break;

        case 'awaiting_gender':
          const genderInput = message.trim().toLowerCase();
          let gender = '';
          if (['male', 'm', 'পুরুষ'].includes(genderInput)) {
            gender = 'Male';
          } else if (['female', 'f', 'মহিলা'].includes(genderInput)) {
            gender = 'Female';
          } else if (['other', 'o', 'অন্যান্য'].includes(genderInput)) {
            gender = 'Other';
          } else {
            responseMessage = `Please choose a valid gender:\n\n• Type "Male" or "M"\n• Type "Female" or "F"\n• Type "Other" or "O"`;
            nextStep = session.step; // Stay in same step
            break;
          }
          sessionData.gender = gender;
          nextStep = 'awaiting_location';
          responseMessage = `Gender: ${gender}\n\n📍 Please tell me your location/area:\n\nExample: Kolkata, Dhaka, etc.`;
          break;

        case 'awaiting_location':
          sessionData.location = message.trim();
          nextStep = 'completed';
          
          // Now process the booking with collected data
          try {
            // Check doctor availability
            const availability = await storage.getDoctorAvailability(doctor.id);
            if (!availability.length) {
              responseMessage = `Sorry, Dr. ${doctor.name} currently has no available appointment slots. Please try again later.`;
              break;
            }

            // Find next available slot
            const nextSlot = await storage.findNextAvailableSlot(doctor.id);
            if (!nextSlot) {
              responseMessage = `Sorry, no available appointment slots in the next 7 days. Please try again later.`;
              break;
            }

            // Create or find existing patient
            let patient = await storage.getPatientByPhoneAndDoctor(patientPhone, doctor.id);
            
            if (!patient) {
              patient = await storage.createPatient({
                name: sessionData.name,
                age: sessionData.age,
                gender: sessionData.gender,
                phone: patientPhone,
                location: sessionData.location,
                doctorId: doctor.id
              });
            }

            // Create appointment
            const appointment = await storage.createAppointment({
              patientId: patient.id,
              doctorId: doctor.id,
              dateTime: nextSlot,
              type: 'consultation',
              status: 'upcoming',
              notes: `Booked via WhatsApp conversation`
            });

            // Format confirmation
            const appointmentDate = new Date(nextSlot).toLocaleDateString('en-BD');
            const appointmentTime = new Date(nextSlot).toLocaleTimeString('en-BD', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });

            responseMessage = `✅ Appointment Confirmed!\n\n👤 Patient: ${sessionData.name}\n🎂 Age: ${sessionData.age}\n⚧️ Gender: ${sessionData.gender}\n📍 Location: ${sessionData.location}\n\n📅 Date: ${appointmentDate}\n⏰ Time: ${appointmentTime}\n🆔 Appointment ID: ${appointment.appointmentId}\n👨‍⚕️ Doctor: ${doctor.name}\n🏥 Clinic: ${doctor.clinicName || 'Homeo Health Clinic'}\n\nPlease arrive 10 minutes early. Thank you!`;

          } catch (error) {
            console.error('Appointment creation error:', error);
            responseMessage = `Sorry, there was an error creating your appointment. Please try again later.`;
          }
          break;

        default:
          responseMessage = `Session expired. To book a new appointment, please type "appointment" or "booking".`;
          nextStep = 'initial';
      }

      // Update session
      if (nextStep === 'completed') {
        // Delete completed session
        await db.delete(whatsappSessions).where(eq(whatsappSessions.id, session.id));
      } else {
        await storage.updateWhatsappSession(session.id, {
          step: nextStep,
          sessionData
        });
      }

      res.json({
        success: true,
        message: responseMessage
      });

    } catch (error) {
      console.error('WhatsApp message processing error:', error);
      res.status(500).json({ 
        message: "Sorry, there was an error processing your message. Please try again later." 
      });
    }
  });

  // Doctor Availability Routes
  app.get("/api/doctor/availability", requireAuth, requireRole(['doctor']), async (req, res) => {
    try {
      const availability = await storage.getDoctorAvailability(req.session.userId!);
      res.json(availability);
    } catch (error) {
      console.error('Get doctor availability error:', error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.get("/api/doctor/availability/:doctorId", requireAuth, async (req, res) => {
    try {
      const { doctorId } = req.params;
      const availability = await storage.getDoctorAvailability(doctorId);
      res.json(availability);
    } catch (error) {
      console.error('Get doctor availability error:', error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/doctor/availability", requireAuth, requireRole(['doctor']), async (req, res) => {
    try {
      const availabilityData = {
        ...req.body,
        doctorId: req.session.userId!
      };
      
      const availability = await storage.upsertDoctorAvailability(availabilityData);
      res.json(availability);
    } catch (error) {
      console.error('Update doctor availability error:', error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.delete("/api/doctor/availability/:dayOfWeek", requireAuth, requireRole(['doctor']), async (req, res) => {
    try {
      const { dayOfWeek } = req.params;
      const success = await storage.deleteDoctorAvailability(req.session.userId!, parseInt(dayOfWeek));
      
      if (!success) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      res.json({ message: "Availability deleted successfully" });
    } catch (error) {
      console.error('Delete doctor availability error:', error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
