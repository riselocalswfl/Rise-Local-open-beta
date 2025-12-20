import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const TIME_OPTIONS = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM",
];

export interface HoursData {
  byAppointment?: boolean;
  appointmentNote?: string;
  schedule?: Record<string, { open: string; close: string; closed: boolean }>;
}

interface HoursEditorProps {
  value: HoursData | Record<string, string> | null;
  onChange: (hours: HoursData) => void;
  disabled?: boolean;
}

function parseHoursToData(value: HoursData | Record<string, string> | null): HoursData {
  if (!value) {
    return {
      byAppointment: false,
      schedule: DAYS.reduce((acc, day) => ({
        ...acc,
        [day]: { open: "9:00 AM", close: "5:00 PM", closed: day === "sunday" },
      }), {}),
    };
  }

  if ("byAppointment" in value || "schedule" in value) {
    return value as HoursData;
  }

  const legacyHours = value as Record<string, string>;
  const schedule: Record<string, { open: string; close: string; closed: boolean }> = {};
  
  DAYS.forEach((day) => {
    const dayValue = legacyHours[day] || "";
    const isClosed = dayValue.toLowerCase() === "closed" || !dayValue;
    
    if (isClosed) {
      schedule[day] = { open: "9:00 AM", close: "5:00 PM", closed: true };
    } else {
      const match = dayValue.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
      if (match) {
        schedule[day] = { open: match[1].toUpperCase(), close: match[2].toUpperCase(), closed: false };
      } else {
        schedule[day] = { open: "9:00 AM", close: "5:00 PM", closed: false };
      }
    }
  });

  return { byAppointment: false, schedule };
}

export function HoursEditor({ value, onChange, disabled }: HoursEditorProps) {
  const [hoursData, setHoursData] = useState<HoursData>(() => parseHoursToData(value));

  useEffect(() => {
    setHoursData(parseHoursToData(value));
  }, [value]);

  const handleChange = (newData: Partial<HoursData>) => {
    const updated = { ...hoursData, ...newData };
    setHoursData(updated);
    onChange(updated);
  };

  const handleDayChange = (day: string, field: "open" | "close" | "closed", val: string | boolean) => {
    const schedule = { ...hoursData.schedule };
    schedule[day] = { ...schedule[day], [field]: val };
    handleChange({ schedule });
  };

  const copyMondayToAll = () => {
    const mondaySchedule = hoursData.schedule?.monday;
    if (!mondaySchedule) return;
    
    const schedule = DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { ...mondaySchedule },
    }), {});
    handleChange({ schedule });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <Label htmlFor="byAppointment" className="text-sm font-medium">By appointment only</Label>
          <p className="text-xs text-muted-foreground">Hide daily hours and show appointment note</p>
        </div>
        <Switch
          id="byAppointment"
          checked={hoursData.byAppointment || false}
          onCheckedChange={(checked) => handleChange({ byAppointment: checked })}
          disabled={disabled}
          data-testid="switch-by-appointment"
        />
      </div>

      {!hoursData.byAppointment && (
        <>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyMondayToAll}
              disabled={disabled}
              data-testid="button-copy-monday"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy Mon to all
            </Button>
          </div>

          <div className="space-y-2">
            {DAYS.map((day) => {
              const dayData = hoursData.schedule?.[day] || { open: "9:00 AM", close: "5:00 PM", closed: false };
              return (
                <div key={day} className="flex items-center gap-2 py-2">
                  <div className="w-12 text-sm font-medium">{DAY_LABELS[day]}</div>
                  
                  <Switch
                    checked={!dayData.closed}
                    onCheckedChange={(checked) => handleDayChange(day, "closed", !checked)}
                    disabled={disabled}
                    data-testid={`switch-${day}-open`}
                  />
                  
                  {dayData.closed ? (
                    <span className="text-sm text-muted-foreground ml-2">Closed</span>
                  ) : (
                    <div className="flex items-center gap-1 flex-1">
                      <Select
                        value={dayData.open}
                        onValueChange={(val) => handleDayChange(day, "open", val)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-[110px] h-9" data-testid={`select-${day}-open`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">–</span>
                      <Select
                        value={dayData.close}
                        onValueChange={(val) => handleDayChange(day, "close", val)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-[110px] h-9" data-testid={`select-${day}-close`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function HoursDisplay({ hours }: { hours: HoursData | Record<string, string> | null }) {
  const data = parseHoursToData(hours);

  if (data.byAppointment) {
    return (
      <p className="text-sm text-muted-foreground">By appointment only</p>
    );
  }

  if (!data.schedule) return null;

  const openDays = DAYS.filter((day) => !data.schedule?.[day]?.closed);
  if (openDays.length === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      {DAYS.map((day) => {
        const dayData = data.schedule?.[day];
        if (!dayData || dayData.closed) return null;
        return (
          <div key={day} className="flex justify-between">
            <span className="text-muted-foreground capitalize">{day}</span>
            <span>{dayData.open} – {dayData.close}</span>
          </div>
        );
      })}
    </div>
  );
}
