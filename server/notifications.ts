// Notification service for sending push notifications
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  icon?: string;
  badge?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// This would require web-push library in production
// For demo purposes, we'll simulate the notification sending
export class NotificationService {
  async sendToUser(userId: string, payload: NotificationPayload) {
    try {
      // Get user's push subscriptions
      const subscriptions = await db.select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, userId));

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      // In production, this would use web-push to send actual notifications
      console.log(`Sending notification to ${subscriptions.length} devices:`, {
        userId,
        payload,
        subscriptions: subscriptions.map(sub => ({ endpoint: sub.endpoint }))
      });

      // Simulate successful delivery
      return {
        success: true,
        delivered: subscriptions.length,
        message: `Notification sent to ${subscriptions.length} devices`
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendAppointmentReminder(appointmentId: string) {
    try {
      // Get appointment details
      const [appointment] = await db.select({
        id: schema.appointments.id,
        patientName: schema.patients.name,
        doctorName: schema.users.username,
        dateTime: schema.appointments.dateTime,
        type: schema.appointments.type,
        patientId: schema.appointments.patientId,
        doctorId: schema.appointments.doctorId
      })
      .from(schema.appointments)
      .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
      .innerJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
      .where(eq(schema.appointments.id, appointmentId));

      if (!appointment) {
        console.log(`Appointment ${appointmentId} not found`);
        return;
      }

      const appointmentDate = new Date(appointment.dateTime);
      const timeString = appointmentDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      const payload: NotificationPayload = {
        title: 'Appointment Reminder',
        body: `Your ${appointment.type} appointment with Dr. ${appointment.doctorName} is coming up at ${timeString}`,
        data: {
          appointmentId: appointment.id,
          type: 'appointment_reminder',
          url: '/appointments'
        },
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        actions: [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      // Send to patient
      await this.sendToUser(appointment.patientId, payload);

      // Send to doctor with different message
      const doctorPayload: NotificationPayload = {
        ...payload,
        body: `Upcoming appointment with ${appointment.patientName} at ${timeString}`,
        data: {
          ...payload.data,
          type: 'doctor_reminder'
        }
      };

      await this.sendToUser(appointment.doctorId, doctorPayload);

      return {
        success: true,
        message: 'Appointment reminders sent successfully'
      };
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      throw error;
    }
  }

  async scheduleDailyReminders() {
    try {
      // Get all appointments for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const appointments = await db.select({
        id: schema.appointments.id,
        patientName: schema.patients.name,
        doctorName: schema.users.username,
        dateTime: schema.appointments.dateTime,
        type: schema.appointments.type,
        patientId: schema.appointments.patientId,
      })
      .from(schema.appointments)
      .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
      .innerJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
      .where(eq(schema.appointments.status, 'pending'));

      const tomorrowAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.dateTime);
        return aptDate >= tomorrow && aptDate < dayAfter;
      });

      if (tomorrowAppointments.length === 0) {
        console.log('No appointments scheduled for tomorrow');
        return;
      }

      // Group by patient
      const patientAppointments = tomorrowAppointments.reduce((acc, apt) => {
        if (!acc[apt.patientId]) {
          acc[apt.patientId] = [];
        }
        acc[apt.patientId].push(apt);
        return acc;
      }, {} as Record<string, typeof tomorrowAppointments>);

      // Send daily reminders
      for (const [patientId, appointments] of Object.entries(patientAppointments)) {
        const appointmentList = appointments
          .map(apt => `${apt.type} at ${new Date(apt.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`)
          .join(', ');

        const payload: NotificationPayload = {
          title: 'Tomorrow\'s Appointments',
          body: `You have ${appointments.length} appointment${appointments.length > 1 ? 's' : ''} tomorrow: ${appointmentList}`,
          data: {
            type: 'daily_reminder',
            url: '/appointments',
            appointmentIds: appointments.map(apt => apt.id)
          },
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png'
        };

        await this.sendToUser(patientId, payload);
      }

      return {
        success: true,
        message: `Daily reminders sent to ${Object.keys(patientAppointments).length} patients`
      };
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();