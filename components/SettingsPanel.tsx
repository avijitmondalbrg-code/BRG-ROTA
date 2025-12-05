import React, { useState } from 'react';
import { Employee, Shift, Location, EMPLOYEE_CATEGORIES } from '../services/types';
import { Trash2, Plus, User, MapPin, Building2, UploadCloud, Clock } from 'lucide-react';

interface SettingsPanelProps {
  employees: Employee[];
  shifts: Shift[];
  locations: Location[];
  onAddEmployee: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onAddShift: (shift: Shift) => void;
  onRemoveShift: (id: string) => void;
  onAddLocation: (loc: Location) => void;
  onRemoveLocation: (id: string) => void;
  onSeedData?: () => void;
  isDbEmpty?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  employees,
  shifts,
  locations,
  onAddEmployee,
  onRemoveEmployee,
  onAddShift,
  onRemoveShift,
  onAddLocation,
  onRemoveLocation,
  onSeedData,
  isDbEmpty
}) => {
  // Employee Form
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpCategory, setNewEmpCategory] = useState<typeof EMPLOYEE_CATEGORIES[number]>(EMPLOYEE_CATEGORIES[0]);
  const [newEmpLocationId, setNewEmpLocationId] = useState('');

  // Shift Form
  const [newShiftName, setNewShiftName] = useState('Day');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');

  // Location Form
  const [newLocName, setNewLocName] = useState('');

  const handleAddEmp = () => {
    if (!newEmpName || !newEmpRole) return;
    onAddEmployee({
      id: Math.random().toString(36).substr(2, 9),
      name: newEmpName,
      role: newEmpRole,
      category: newEmpCategory,
      defaultLocationId: newEmpLocationId || (locations[0]?.id),
      preferredHours: 40
    });
    setNewEmpName('');
    setNewEmpRole('');
  };

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

  const handleAddLocation = () => {
    if(!newLocName) return;
    onAddLocation({
        id: Math.random().toString(36).substr(2, 9),
        name: newLocName,
        color: 'bg-indigo-50 text-indigo-700'
    });
    setNewLocName('');
  }

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
                        <button onClick={handleAddLocation} className="bg-indigo-600 text-white px-4 rounded-md text-sm"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {locations.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-sm font-medium">{l.name}</span>
                                <button onClick={() => onRemoveLocation(l.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
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
          <div className="flex flex-col gap-2">
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
            <button onClick={handleAddEmp} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                <Plus size={16} /> Add Staff
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {employees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{emp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-100">{emp.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{emp.role}</span>
                    <span className="flex items-center gap-1 text-indigo-600">
                         <Building2 size={10} /> Auto-Location: {getLocationName(emp.defaultLocationId)}
                    </span>
                  </div>
                </div>
                <button onClick={() => onRemoveEmployee(emp.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};