
export interface Location {
  id: string;
  name: string;
  color: string;
}

export const EMPLOYEE_CATEGORIES = ['Audiologist', 'Admin', 'Support Staff', 'Tele Caller/Receptionist'] as const;

export interface Employee {
  id: string;
  name: string;
  role: string;
  category: typeof EMPLOYEE_CATEGORIES[number];
  defaultLocationId?: string; // Auto-generated hospital based on post
  preferredHours: number;
  availableDays?: string[]; // Array of days they can work e.g. ["Mon", "Tue"]
}

export interface Shift {
  id: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface RotaAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  dayIndex?: number; // Added for compatibility with root types
  employeeId: string;
  shiftId: string;
  locationId: string;
}

export interface AppState {
  employees: Employee[];
  shifts: Shift[];
  locations: Location[];
  assignments: RotaAssignment[];
}

export enum ViewMode {
  GRID = 'GRID',
  HOSPITAL_VIEW = 'HOSPITAL_VIEW',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Initial Data for Seeding
export const INITIAL_LOCATIONS: Location[] = [
  { id: 'l1', name: 'HO', color: 'bg-slate-100 text-slate-800' },
  { id: 'l2', name: 'Fortis', color: 'bg-red-50 text-red-700' },
  { id: 'l3', name: 'CMRI', color: 'bg-blue-50 text-blue-700' },
  { id: 'l4', name: 'Manipal Saltlake', color: 'bg-orange-50 text-orange-700' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Alice Johnson', role: 'Manager', category: 'Audiologist', defaultLocationId: 'l1', preferredHours: 40, availableDays: DAYS_OF_WEEK },
  { id: '2', name: 'Bob Smith', role: 'Assistant', category: 'Support Staff', defaultLocationId: 'l1', preferredHours: 30, availableDays: DAYS_OF_WEEK },
  { id: '3', name: 'Charlie Brown', role: 'Junior Audio', category: 'Audiologist', defaultLocationId: 'l2', preferredHours: 20, availableDays: ['Mon', 'Wed', 'Fri'] },
];

export const INITIAL_SHIFTS: Shift[] = [
  { id: 's1', name: 'Morning', color: 'bg-blue-100 text-blue-800 border-blue-200', startTime: '06:00', endTime: '14:00', hours: 8 },
  { id: 's2', name: 'Day', color: 'bg-green-100 text-green-800 border-green-200', startTime: '09:00', endTime: '17:00', hours: 8 },
  { id: 's3', name: 'Evening', color: 'bg-purple-100 text-purple-800 border-purple-200', startTime: '14:00', endTime: '22:00', hours: 8 },
];
