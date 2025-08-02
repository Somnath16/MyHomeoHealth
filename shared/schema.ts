import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("patient"), // admin, doctor, patient
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  clinicName: text("clinic_name"),
  clinicNameBengali: text("clinic_name_bengali"),
  clinicLocation: text("clinic_location"),
  clinicLocationBengali: text("clinic_location_bengali"),
  degree: text("degree"),
  degreeBengali: text("degree_bengali"),
  specialist: text("specialist"),
  specialistBengali: text("specialist_bengali"),
  extraNotes: text("extra_notes"),
  extraNotesBengali: text("extra_notes_bengali"),
  isActive: boolean("is_active").notNull().default(true),
  canDeletePatients: boolean("can_delete_patients").notNull().default(false),
  aiFeatureEnabled: boolean("ai_feature_enabled").notNull().default(true),
  whatsappPhone: text("whatsapp_phone"),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  globalLowStockThreshold: integer("global_low_stock_threshold").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  location: text("location"),
  lastVisitDate: timestamp("last_visit_date"),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: text("appointment_id").notNull().unique(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  dateTime: timestamp("date_time").notNull(),
  type: text("type").notNull().default("consultation"), // consultation, follow-up, emergency
  status: text("status").notNull().default("upcoming"), // upcoming, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: text("prescription_id").notNull().unique(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  symptoms: text("symptoms").notNull(),
  medicines: jsonb("medicines").notNull(), // Array of medicine objects
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientPhone: text("patient_phone").notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  step: text("step").notNull().default("initial"), // initial, awaiting_name, awaiting_age, awaiting_gender, awaiting_location, completed
  sessionData: jsonb("session_data"), // Store collected data: {name, age, gender, location}
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicines = pgTable("medicines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(),
  company: text("company"), // Medicine company/manufacturer name
  description: text("description"),
  power: text("power"), // e.g., "30", "200", "1M"
  dosage: text("dosage"), // e.g., "3 times daily", "2 drops"
  symptoms: text("symptoms"),
  currentStock: integer("current_stock").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  doctorId: varchar("doctor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const doctorAvailability = pgTable("doctor_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday to Saturday)
  isAvailable: boolean("is_available").notNull().default(true),
  startTime: text("start_time").notNull().default("09:00"), // HH:MM format
  endTime: text("end_time").notNull().default("19:00"), // HH:MM format
  lunchBreakStart: text("lunch_break_start").default("13:00"),
  lunchBreakEnd: text("lunch_break_end").default("14:00"),
  slotDuration: integer("slot_duration").notNull().default(20), // minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  medicines: many(medicines),
  availability: many(doctorAvailability),
  whatsappSessions: many(whatsappSessions),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  doctor: one(users, { fields: [patients.doctorId], references: [users.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(users, { fields: [appointments.doctorId], references: [users.id] }),
  prescriptions: many(prescriptions),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  doctor: one(users, { fields: [prescriptions.doctorId], references: [users.id] }),
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
}));

export const medicinesRelations = relations(medicines, ({ one }) => ({
  doctor: one(users, { fields: [medicines.doctorId], references: [users.id] }),
}));

export const doctorAvailabilityRelations = relations(doctorAvailability, ({ one }) => ({
  doctor: one(users, { fields: [doctorAvailability.doctorId], references: [users.id] }),
}));

export const whatsappSessionsRelations = relations(whatsappSessions, ({ one }) => ({
  doctor: one(users, { fields: [whatsappSessions.doctorId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  patientId: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  appointmentId: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  prescriptionId: true,
  createdAt: true,
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
  createdAt: true,
});

export const insertDoctorAvailabilitySchema = createInsertSchema(doctorAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type DoctorAvailability = typeof doctorAvailability.$inferSelect;
export type InsertDoctorAvailability = z.infer<typeof insertDoctorAvailabilitySchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;

// Push Subscriptions table
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification Settings table
export const notificationSettings = pgTable("notification_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  appointmentReminders: boolean("appointment_reminders").default(true),
  reminderTime: integer("reminder_time").default(30), // minutes before appointment
  dailyReminders: boolean("daily_reminders").default(false),
  weeklyReports: boolean("weekly_reports").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

// Insert schemas for notifications
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
});

// Prescription Templates table
export const prescriptionTemplates = pgTable("prescription_templates", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'html', 'upload'
  content: text("content"), // HTML template content for custom templates
  fileUrl: text("file_url"), // URL for uploaded PDF/DOC files
  fileName: text("file_name"), // Original filename
  fileType: text("file_type"), // MIME type of uploaded file
  fileSize: integer("file_size"), // File size in bytes
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Doctor Template Assignments table
export const doctorTemplateAssignments = pgTable("doctor_template_assignments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: text("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => prescriptionTemplates.id, { onDelete: "cascade" }),
  isDefault: boolean("is_default").notNull().default(false),
  assignedBy: text("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Template Relations
export const prescriptionTemplatesRelations = relations(prescriptionTemplates, ({ one, many }) => ({
  createdBy: one(users, { fields: [prescriptionTemplates.createdBy], references: [users.id] }),
  assignments: many(doctorTemplateAssignments),
}));

export const doctorTemplateAssignmentsRelations = relations(doctorTemplateAssignments, ({ one }) => ({
  doctor: one(users, { fields: [doctorTemplateAssignments.doctorId], references: [users.id] }),
  template: one(prescriptionTemplates, { fields: [doctorTemplateAssignments.templateId], references: [prescriptionTemplates.id] }),
  assignedBy: one(users, { fields: [doctorTemplateAssignments.assignedBy], references: [users.id] }),
}));

// Insert schemas for templates
export const insertPrescriptionTemplateSchema = createInsertSchema(prescriptionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDoctorTemplateAssignmentSchema = createInsertSchema(doctorTemplateAssignments).omit({
  id: true,
  assignedAt: true,
});

// Types for templates
export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type InsertPrescriptionTemplate = z.infer<typeof insertPrescriptionTemplateSchema>;
export type DoctorTemplateAssignment = typeof doctorTemplateAssignments.$inferSelect;
export type InsertDoctorTemplateAssignment = z.infer<typeof insertDoctorTemplateAssignmentSchema>;

// Types for notifications
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
