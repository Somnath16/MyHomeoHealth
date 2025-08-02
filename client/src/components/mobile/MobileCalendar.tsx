import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendarSwipe } from "@/hooks/use-swipe";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isSameDay, isPast, isToday, isBefore, startOfDay } from "date-fns";

interface CalendarSlot {
  id: string;
  time: string;
  status: 'available' | 'booked' | 'blocked';
  patientName?: string;
  patientId?: string;
}

interface MobileCalendarProps {
  appointments: any[];
  onSlotSelect: (date: Date, time: string) => void;
  onAppointmentClick: (appointment: any) => void;
  user: any;
}

interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  slotDuration: number;
}

export default function MobileCalendar({ appointments, onSlotSelect, onAppointmentClick, user }: MobileCalendarProps) {
  const today = new Date();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(today));
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Fetch doctor availability settings
  const { data: availability = [], isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/doctor/availability", user?.role === 'doctor' ? user.id : null],
    queryFn: async () => {
      if (user?.role === 'doctor') {
        const response = await apiRequest("GET", "/api/doctor/availability");
        return response.json();
      } else if (user?.role === 'admin') {
        // For admin, we might need to pass a specific doctor ID or get default availability
        // For now, return empty array
        return [];
      }
      return [];
    },
    enabled: !!user,
  });

  // Generate time slots based on doctor availability
  useEffect(() => {
    const generateTimeSlots = () => {
      // Default time slots if no availability is set
      const defaultSlots = [
        "9:00 AM", "9:20 AM", "9:40 AM", "10:00 AM", "10:20 AM", "10:40 AM",
        "11:00 AM", "11:20 AM", "11:40 AM", "12:00 PM", "12:20 PM", "12:40 PM",
        // Lunch break from 1:00 PM - 2:00 PM (excluded)
        "2:00 PM", "2:20 PM", "2:40 PM", "3:00 PM", "3:20 PM", "3:40 PM",
        "4:00 PM", "4:20 PM", "4:40 PM", "5:00 PM", "5:20 PM", "5:40 PM",
        "6:00 PM", "6:20 PM", "6:40 PM", "7:00 PM"
      ];

      if (availability.length === 0) {
        setTimeSlots(defaultSlots);
        return;
      }

      // Generate slots based on the first availability setting (assuming same slots for all days)
      const firstAvailability = availability[0];
      const slots: string[] = [];
      
      const startTime = firstAvailability.startTime || "09:00";
      const endTime = firstAvailability.endTime || "19:00";
      const slotDuration = firstAvailability.slotDuration || 20;
      const lunchStart = firstAvailability.lunchBreakStart || "13:00";
      const lunchEnd = firstAvailability.lunchBreakEnd || "14:00";

      // Convert time strings to minutes for easier calculation
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const minutesToTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
      };

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      const lunchStartMinutes = timeToMinutes(lunchStart);
      const lunchEndMinutes = timeToMinutes(lunchEnd);

      for (let current = startMinutes; current < endMinutes; current += slotDuration) {
        // Skip lunch break times
        if (current >= lunchStartMinutes && current < lunchEndMinutes) {
          continue;
        }
        slots.push(minutesToTime(current));
      }

      setTimeSlots(slots);
    };

    generateTimeSlots();
  }, [availability]);

  const goToPreviousWeek = () => {
    const newWeek = addDays(currentWeek, -7);
    // Don't allow navigating to weeks in the past
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today);
    
    if (newWeek >= startOfCurrentWeek) {
      setCurrentWeek(newWeek);
    }
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const swipeHandlers = useCalendarSwipe(goToPreviousWeek, goToNextWeek);

  const getSlotStatus = (date: Date, time: string): CalendarSlot => {
    const dayOfWeek = date.getDay();
    const now = new Date();
    
    // Block past dates completely
    if (isBefore(startOfDay(date), startOfDay(now))) {
      return {
        id: `${date.toISOString()}-${time}`,
        time,
        status: 'blocked'
      };
    }
    
    // For today, block past times
    if (isToday(date)) {
      const timeToMinutes = (timeStr: string) => {
        const [time, ampm] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        const adjustedHours = ampm === 'PM' && hours !== 12 ? hours + 12 : ampm === 'AM' && hours === 12 ? 0 : hours;
        return adjustedHours * 60 + minutes;
      };
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = timeToMinutes(time);
      
      // Block past times on current day
      if (slotMinutes <= currentMinutes) {
        return {
          id: `${date.toISOString()}-${time}`,
          time,
          status: 'blocked'
        };
      }
    }
    
    // Check if doctor is available on this day
    const dayAvailability = availability.find((a: DoctorAvailability) => a.dayOfWeek === dayOfWeek);
    
    // If no availability set for this day, it's blocked
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return {
        id: `${date.toISOString()}-${time}`,
        time,
        status: 'blocked'
      };
    }

    // Check if time falls within lunch break
    const lunchStart = dayAvailability.lunchBreakStart || "13:00";
    const lunchEnd = dayAvailability.lunchBreakEnd || "14:00";
    
    const timeToMinutes = (timeStr: string) => {
      const [time, ampm] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const adjustedHours = ampm === 'PM' && hours !== 12 ? hours + 12 : ampm === 'AM' && hours === 12 ? 0 : hours;
      return adjustedHours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(time);
    const lunchStartMinutes = timeToMinutes(lunchStart.includes(':') ? `${lunchStart.split(':')[0]}:${lunchStart.split(':')[1]} ${parseInt(lunchStart.split(':')[0]) >= 12 ? 'PM' : 'AM'}` : lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd.includes(':') ? `${lunchEnd.split(':')[0]}:${lunchEnd.split(':')[1]} ${parseInt(lunchEnd.split(':')[0]) >= 12 ? 'PM' : 'AM'}` : lunchEnd);

    if (slotMinutes >= lunchStartMinutes && slotMinutes < lunchEndMinutes) {
      return {
        id: `${date.toISOString()}-${time}`,
        time,
        status: 'blocked'
      };
    }



    // Check if there's an appointment
    const appointment = appointments.find(apt => {
      const aptDate = new Date(apt.dateTime);
      const aptTime = format(aptDate, 'h:mm a');
      return isSameDay(aptDate, date) && aptTime === time;
    });

    if (appointment) {
      return {
        id: `${date.toISOString()}-${time}`,
        time,
        status: 'booked',
        patientName: appointment.patientName,
        patientId: appointment.patientId
      };
    }

    return {
      id: `${date.toISOString()}-${time}`,
      time,
      status: 'available'
    };
  };

  const handleSlotClick = (date: Date, time: string, slot: CalendarSlot) => {
    if (slot.status === 'available') {
      onSlotSelect(date, time);
    } else if (slot.status === 'booked') {
      const appointment = appointments.find(apt => {
        const aptDate = new Date(apt.dateTime);
        const aptTime = format(aptDate, 'h:mm a');
        return isSameDay(aptDate, date) && aptTime === time;
      });
      if (appointment) {
        onAppointmentClick(appointment);
      }
    }
  };

  return (
    <Card className="mx-4 shadow-sm border border-neutral-200">
      <CardHeader className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-neutral-800">Weekly Calendar</CardTitle>
            <p className="text-xs text-neutral-500 mt-1">
              Hours: 9AM-7PM • Lunch: 1-2PM • Tue: Closed • Sun: 12PM-7PM
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="touch-target p-2"
              onClick={goToPreviousWeek}
              disabled={currentWeek <= startOfWeek(today)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-neutral-700 min-w-24 text-center">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="touch-target p-2"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="calendar-swipe overflow-x-auto custom-scrollbar">
          <div className="min-w-full">
            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 gap-px bg-neutral-200">
              {weekDays.map((date, index) => {
                const isPastDate = isBefore(startOfDay(date), startOfDay(today));
                return (
                  <div key={index} className={cn(
                    "bg-white p-3 text-center",
                    isPastDate && "bg-neutral-50"
                  )}>
                    <div className={cn(
                      "text-xs font-medium",
                      isPastDate ? "text-neutral-400" : "text-neutral-500"
                    )}>
                      {format(date, 'EEE')}
                    </div>
                    <div className={cn(
                      "text-sm font-semibold mt-1",
                      isPastDate ? "text-neutral-400" : 
                      date.getDay() === 2 ? "text-neutral-400" : "text-neutral-800"
                    )}>
                      {format(date, 'd')}
                    </div>
                    {isPastDate ? (
                      <div className="text-xs text-neutral-400 mt-1">Past</div>
                    ) : (
                      <>
                        {date.getDay() === 2 && (
                          <div className="text-xs text-red-500 mt-1">Closed</div>
                        )}
                        {date.getDay() === 0 && (
                          <div className="text-xs text-orange-500 mt-1">Half Day</div>
                        )}
                        {date.getDay() !== 2 && date.getDay() !== 0 && (
                          <div className="text-xs text-blue-500 mt-1">9AM-7PM</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Time Slots */}
            <div className="p-4 space-y-2">
              {timeSlots.map((time) => (
                <div key={time} className="flex items-center space-x-3">
                  <div className="w-16 text-sm font-medium text-neutral-600">
                    {time}
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-2">
                    {weekDays.map((date, dayIndex) => {
                      const slot = getSlotStatus(date, time);
                      
                      return (
                        <button
                          key={dayIndex}
                          className={cn(
                            "h-8 rounded-md text-xs font-medium transition-smooth touch-target flex items-center justify-center",
                            slot.status === 'available' && "bg-primary bg-opacity-10 border border-primary border-opacity-30 text-primary hover:bg-primary hover:text-white",
                            slot.status === 'booked' && "bg-secondary bg-opacity-90 text-white",
                            slot.status === 'blocked' && "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                          )}
                          onClick={() => handleSlotClick(date, time, slot)}
                          disabled={slot.status === 'blocked'}
                        >
                          {slot.status === 'available' && 'Available'}
                          {slot.status === 'booked' && (slot.patientName?.split(' ')[0] || 'Patient')}
                          {slot.status === 'blocked' && (() => {
                            if (date.getDay() === 2) return 'Closed';
                            if (date.getDay() === 0 && time.includes('AM') && !time.includes('12:')) return 'Half Day';
                            if (time === '1:00 PM' || time === '1:20 PM' || time === '1:40 PM') return 'Lunch';
                            
                            // Check if it's a past time slot
                            const now = new Date();
                            const slotDateTime = new Date(date);
                            const [time12, period] = time.split(' ');
                            const [hours, minutes] = time12.split(':');
                            let hour24 = parseInt(hours);
                            
                            if (period === 'PM' && hour24 !== 12) {
                              hour24 += 12;
                            } else if (period === 'AM' && hour24 === 12) {
                              hour24 = 0;
                            }
                            
                            slotDateTime.setHours(hour24, parseInt(minutes), 0, 0);
                            
                            return slotDateTime < now ? 'Past' : 'Off';
                          })()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
