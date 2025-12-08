
import React, { useState } from 'react';
import { Employee, Shift, Location, EMPLOYEE_CATEGORIES, DAYS_OF_WEEK } from '../services/types';
import { Trash2, Plus, User, MapPin, Building2, UploadCloud, Clock, Pencil, Check, X, CalendarCheck } from 'lucide-react';

interface SettingsPanelProps {
  employees: Employee[];
  shifts: Shift[];
  locations: Location[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onAddShift: (shift: Shift) => void;
  onRemoveShift: (id: string) => void;
  onAddLocation: (loc: Location) => void;
  onUpdateLocation: (loc: Location) => void;
  onRemoveLocation: (id: string) => void;
  onSeedData?: () => void;
  isDbEmpty?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  employees,
  shifts,
  locations,
  onAddEmployee,
  onUpdateEmployee,
  onRemoveEmployee,
  onAddShift,
  onRemoveShift,
  onAddLocation,
  onUpdateLocation,
  onRemoveLocation,
  onSeedData,
  isDbEmpty
}) => {
  // Employee Form
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpCategory, setNewEmpCategory] = useState<typeof EMPLOYEE_CATEGORIES[number]>(EMPLOYEE_CATEGORIES[0]);
  const [newEmpLocationId, setNewEmpLocationId] = useState('');
  const [newEmpAvailableDays, setNewEmpAvailableDays] = useState<string[]>(DAYS_OF_WEEK);
  
  // State for Editing Employee
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  // Shift Form
  const [newShiftName, setNewShiftName] = useState('Day');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');

  // Location Form
  const [newLocName, setNewLocName] = useState('');
  // State for Editing Location
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  // --- Location Handlers ---
  const handleAddOrUpdateLocation = () => {
    if(!newLocName) return;
    
    if (editingLocId) {
        // Update existing
        const existing = locations.find(l => l.id === editingLocId);
        if (existing) {
            onUpdateLocation({ ...existing, name: newLocName });
        }
        setEditingLocId(null);
        setNewLocName('');
    } else {
        // Add new
        onAddLocation({
            id: Math.random().toString(36).substr(2, 9),
            name: newLocName,
            color: 'bg-indigo-50 text-indigo-700'
        });
        setNewLocName('');
    }
  }

  const startEditLocation = (loc: Location) => {
      setEditingLocId(loc.id);
      setNewLocName(loc.name);
  };

  const cancelEditLocation = () => {
      setEditingLocId(null);
      setNewLocName('');
  };

  // --- Employee Handlers ---
  const toggleDay = (day: string) => {
    setNewEmpAvailableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  const handleAddOrUpdateEmp = () => {
    if (!newEmpName || !newEmpRole) return;

    if (editingEmpId) {
        // Update existing
        const existing = employees.find(e => e.id === editingEmpId);
        if (existing) {
            onUpdateEmployee({
                ...existing,
                name: newEmpName,
                role: newEmpRole,
                category: newEmpCategory,
                defaultLocationId: newEmpLocationId || undefined,
                availableDays: newEmpAvailableDays
            });
        }
        setEditingEmpId(null);
        setNewEmpName('');
        setNewEmpRole('');
        setNewEmpLocationId('');
        setNewEmpAvailableDays(DAYS_OF_WEEK);
    } else {
        // Add new
        onAddEmployee({
            id: Math.random().toString(36).substr(2, 9),
            name: newEmpName,
            role: newEmpRole,
            category: newEmpCategory,
            defaultLocationId: newEmpLocationId || (locations[0]?.id),
            preferredHours: 40,
            availableDays: newEmpAvailableDays
        });
        setNewEmpName('');
        setNewEmpRole('');
        setNewEmpAvailableDays(DAYS_OF_WEEK);
    }
  };

  const startEditEmployee = (emp: Employee) => {
      setEditingEmpId(emp.id);
      setNewEmpName(emp.name);
      setNewEmpRole(emp.role);
      // @ts-ignore
      setNewEmpCategory(emp.category);
      setNewEmpLocationId(emp.defaultLocationId || '');
      setNewEmpAvailableDays(emp.availableDays || DAYS_OF_WEEK);
  };

  const cancelEditEmployee = () => {
      setEditingEmpId(null);
      setNewEmpName('');
      setNewEmpRole('');
      setNewEmpLocationId('');
      setNewEmpAvailableDays(DAYS_OF_WEEK);
  };

  // --- Shift Handlers ---
  const handleAddShift = () => {
    if (!newShiftName) return;
    onAddShift({
      id: Math.random().toString(36).substr(2, 9),
      name: newShiftName,
      startTime: newShiftStart,
      endTime: newShiftEnd,
      hours: 8,
      color: 'bg-slate-100 text-slate-800 border-slate-200'
    });
  };

  const getLocationName = (id?: string) => locations.find(l => l.id === id)?.name || 'N/A';

  return (
    <div className="space-y-8">
        
        {isDbEmpty && onSeedData && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-amber-800">
                   <strong>Setup Required:</strong> Database seems empty. Load default locations/staff?
                </div>
                <button onClick={onSeedData} className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs px-3 py-2 rounded-md font-medium flex items-center gap-1">
                   <UploadCloud size={14} /> Load Defaults
                </button>
             </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. LOCATIONS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2"><MapPin size={18} /> Hospitals / Locations</h3>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        <input className="flex-1 px-3 py-2 border rounded-md text-sm" placeholder="Hospital Name (e.g. Fortis)" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                        {editingLocId ? (
                             <div className="flex gap-1">
                                <button onClick={handleAddOrUpdateLocation} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-md text-sm"><Check size={16}/></button>
                                <button onClick={cancelEditLocation} className="bg-slate-400 hover:bg-slate-500 text-white px-3 rounded-md text-sm"><X size={16}/></button>
                             </div>
                        ) : (
                            <button onClick={handleAddOrUpdateLocation} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-md text-sm"><Plus size={16}/></button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {locations.map(l => (
                            <div key={l.id} className={`flex justify-between items-center p-2 rounded border ${editingLocId === l.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                <span className="text-sm font-medium">{l.name}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => startEditLocation(l)} className="text-slate-400 hover:text-indigo-600 p-1"><Pencil size={14}/></button>
                                    <button onClick={() => onRemoveLocation(l.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. SHIFTS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Clock size={18} /> Shift Times</h3>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        <input className="px-2 py-2 border rounded text-sm" placeholder="Name" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} />
                        <input className="px-2 py-2 border rounded text-sm" type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} />
                        <input className="px-2 py-2 border rounded text-sm" type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} />
                    </div>
                    <button onClick={handleAddShift} className="w-full bg-indigo-600 text-white py-2 rounded text-sm flex justify-center items-center gap-2"><Plus size={16}/> Add Shift</button>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {shifts.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                <div>
                                    <div className="text-sm font-medium">{s.name}</div>
                                    <div className="text-xs text-slate-500">{s.startTime} - {s.endTime}</div>
                                </div>
                                <button onClick={() => onRemoveShift(s.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

      {/* 3. EMPLOYEES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <User size={18} /> Staff Members
          </h3>
          <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">{employees.length} Total</span>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex flex-col gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">{editingEmpId ? 'Edit Employee' : 'Add New Employee'}</span>
                {editingEmpId && <button onClick={cancelEditEmployee} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><X size={12}/> Cancel</button>}
            </div>
            <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 border rounded text-sm" placeholder="Name" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} />
                <input className="w-1/3 px-3 py-2 border rounded text-sm" placeholder="Role" value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border rounded text-sm bg-white" value={newEmpCategory} onChange={(e) => setNewEmpCategory(e.target.value as any)}>
                    {EMPLOYEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="flex-1 px-3 py-2 border rounded text-sm bg-white" value={newEmpLocationId} onChange={(e) => setNewEmpLocationId(e.target.value)}>
                    <option value="">Select Default Hospital...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
            </div>
            
            {/* Availability Selector */}
            <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1">
                    <CalendarCheck size={10} /> Available Days
                </span>
                <div className="flex gap-1 flex-wrap">
                    {DAYS_OF_WEEK.map(day => {
                        const isSelected = newEmpAvailableDays.includes(day);
                        return (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`px-2 py-1 text-xs rounded border transition-all ${
                                    isSelected 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 font-medium' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-2">
                {editingEmpId ? (
                    <button onClick={handleAddOrUpdateEmp} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <Check size={16} /> Update Staff Details
                    </button>
                ) : (
                    <button onClick={handleAddOrUpdateEmp} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <Plus size={16} /> Add Staff
                    </button>
                )}
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {employees.map(emp => (
              <div key={emp.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${editingEmpId === emp.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{emp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-100">{emp.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{emp.role}</span>
                    <span className="flex items-center gap-1 text-indigo-600">
                         <Building2 size={10} /> {getLocationName(emp.defaultLocationId)}
                    </span>
                  </div>
                  {/* Show summary of availability if not all days */}
                  {emp.availableDays && emp.availableDays.length < 7 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                          {DAYS_OF_WEEK.map(d => (
                              <span key={d} className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full ${emp.availableDays?.includes(d) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>
                                  {d.charAt(0)}
                              </span>
                          ))}
                      </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => startEditEmployee(emp)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Details">
                        <Pencil size={16} />
                    </button>
                    <button onClick={() => onRemoveEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove">
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
