import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Shift, Location, RotaAssignment, DAYS_OF_WEEK } from '../services/types';
import { Plus, Trash2, X, Building2, MapPin, User, Users, Stethoscope } from 'lucide-react';

interface RotaGridProps {
  weekStart: Date;
  employees: Employee[];
  shifts: Shift[];
  locations: Location[];
  assignments: RotaAssignment[];
  onAssign: (date: string, employeeId: string, shiftId: string, locationId?: string) => void;
  onRemove: (assignmentId: string) => void;
  onUpdateLocation: (assignmentId: string, locationId: string) => void;
  onClear?: () => void;
  readOnly?: boolean;
  searchTerm?: string;
}

export const RotaGrid: React.FC<RotaGridProps> = ({ 
  weekStart,
  employees, 
  shifts, 
  locations,
  assignments, 
  onAssign, 
  onRemove,
  onUpdateLocation,
  onClear,
  readOnly = false,
  searchTerm = ''
}) => {
  const [activeCell, setActiveCell] = useState<{ dateStr: string; empId: string } | null>(null);
  const [targetLocationId, setTargetLocationId] = useState<string>("");

  // Initialize target location when cell opens
  useEffect(() => {
    if (activeCell) {
        const emp = employees.find(e => e.id === activeCell.empId);
        // Default to employee's base location, or the first available location
        const defaultLoc = emp?.defaultLocationId || (locations[0]?.id || "");
        setTargetLocationId(defaultLoc);
    }
  }, [activeCell, employees, locations]);

  // Generate 7 days starting from weekStart using robust date handling
  const weekDates = useMemo(() => {
    const dates: { dateObj: Date; dateStr: string; dayName: string }[] = [];
    const tempDate = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
        dates.push({
            dateObj: new Date(tempDate),
            dateStr: tempDate.toISOString().split('T')[0],
            // Use locale for day name instead of array index to be safe against offset changes
            dayName: tempDate.toLocaleDateString('en-GB', { weekday: 'short' }) 
        });
        tempDate.setDate(tempDate.getDate() + 1);
    }
    return dates;
  }, [weekStart]);

  const getCellAssignments = (dateStr: string, empId: string) => {
    if (!assignments) return [];
    return assignments.filter(a => a.date === dateStr && a.employeeId === empId);
  };

  const getShift = (shiftId: string) => shifts.find(s => s.id === shiftId);
  const getLocation = (locId: string) => locations.find(l => l.id === locId);

  // Filter Employees Logic (Search by Name or Role)
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return e.name.toLowerCase().includes(term) || e.role.toLowerCase().includes(term);
    });
  }, [employees, searchTerm]);

  // Group Employees by Category
  const audiologists = useMemo(() => filteredEmployees
    .filter(e => e.category === 'Audiologist')
    .sort((a, b) => a.name.localeCompare(b.name)), [filteredEmployees]);
    
  const supportStaff = useMemo(() => filteredEmployees
    .filter(e => e.category === 'Support Staff')
    .sort((a, b) => a.name.localeCompare(b.name)), [filteredEmployees]);

  const renderTable = (title: string, staff: Employee[], titleColorClass?: string, icon?: React.ReactNode) => {
    if (staff.length === 0) return null;
    
    return (
      <div className="mb-10 last:mb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-3 px-1 border-l-4 border-transparent pl-2">
             <div className={`p-2 rounded-lg shadow-sm ${titleColorClass || 'bg-slate-100 text-slate-700'}`}>
                {icon || <Building2 size={20} />}
             </div>
             <div>
                <h3 className="text-xl font-bold text-slate-800 leading-none">{title}</h3>
                <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{staff.length} Staff Members</span>
             </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
          {/* Scroll Container for Freeze Panes */}
          <div className="overflow-auto max-h-[70vh] w-full pb-32">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                <tr>
                  {/* Sticky Corner */}
                  <th className="px-6 py-4 font-bold min-w-[200px] sticky left-0 top-0 z-30 bg-slate-50 border-b border-r border-slate-200 shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.05)]">
                    Employee
                  </th>
                  {/* Sticky Header Row */}
                  {weekDates.map((d) => {
                    const isSun = d.dayName === 'Sun';
                    const headerClass = isSun 
                      ? 'bg-red-50 text-red-700 border-b-red-200' 
                      : 'bg-indigo-50 text-indigo-700 border-b-indigo-100';
                    
                    return (
                        <th key={d.dateStr} className={`px-4 py-4 min-w-[140px] text-center sticky top-0 z-20 border-b ${headerClass} shadow-[0_2px_5px_-2px_rgba(0,0,0,0.05)]`}>
                          <div className="font-bold">{d.dayName}</div>
                          <div className="text-[10px] opacity-75">{d.dateObj.getDate()}/{d.dateObj.getMonth()+1}</div>
                        </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Sticky First Column */}
                    <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
                        <div className="flex flex-wrap gap-1">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                               employee.category === 'Audiologist' 
                               ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                               : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                           }`}>
                               {employee.category}
                           </span>
                           <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{employee.role}</span>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d) => {
                      const cellAssignments = getCellAssignments(d.dateStr, employee.id);
                      const isActive = activeCell?.dateStr === d.dateStr && activeCell?.empId === employee.id;

                      return (
                        <td key={d.dateStr} className="px-2 py-3 relative align-top">
                          {isActive && !readOnly && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                               <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="text-xs font-semibold text-slate-700">Manage Slot</span>
                                  <button onClick={() => setActiveCell(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                               </div>

                               {/* Existing Assignments */}
                               {cellAssignments.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase">Assigned</span>
                                    {cellAssignments.map(a => {
                                        const s = getShift(a.shiftId);
                                        return (
                                            <div key={a.id} className="flex flex-col gap-1 text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold">{s?.name}</span>
                                                    <button onClick={() => onRemove(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin size={10} className="text-slate-400"/>
                                                    <select 
                                                        className="w-full text-[10px] border border-slate-200 rounded p-1 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        value={a.locationId || ''}
                                                        onChange={(e) => onUpdateLocation(a.id, e.target.value)}
                                                    >
                                                        <option value="">Select Location...</option>
                                                        {locations.map(loc => (
                                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                               )}

                               {/* Add New Shift */}
                               <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 mt-1">
                                <span className="text-[10px] font-medium text-slate-400 uppercase">Add Shift</span>
                                
                                {/* Location Selector for New Shift */}
                                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                                     <Building2 size={14} className="text-slate-400 shrink-0"/>
                                     <select 
                                        className="w-full bg-transparent text-[11px] text-slate-700 font-medium outline-none cursor-pointer"
                                        value={targetLocationId}
                                        onChange={(e) => setTargetLocationId(e.target.value)}
                                     >
                                        <option value="">Select Hospital...</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                     </select>
                                </div>

                                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                                    {shifts.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                          onAssign(d.dateStr, employee.id, s.id, targetLocationId);
                                          setActiveCell(null);
                                        }}
                                        className={`text-center px-2 py-2 rounded text-xs border transition-all hover:bg-slate-100 hover:border-slate-300 text-slate-600`}
                                    >
                                        {s.name}
                                    </button>
                                    ))}
                                </div>
                               </div>
                            </div>
                          )}

                          {/* Cell Content */}
                          <button
                            disabled={readOnly}
                            onClick={() => setActiveCell(isActive ? null : { dateStr: d.dateStr, empId: employee.id })}
                            className={`w-full h-full min-h-[72px] rounded-lg border-2 border-dashed flex flex-col items-center justify-start p-1 gap-1 transition-all overflow-hidden ${
                              cellAssignments.length > 0
                                ? 'border-transparent bg-slate-50/50' 
                                : 'border-slate-100 text-slate-300 bg-slate-50/20 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            {cellAssignments.length > 0 ? (
                              cellAssignments.map(a => {
                                  const s = getShift(a.shiftId);
                                  const l = getLocation(a.locationId);
                                  const shiftColor = s?.color || 'bg-slate-100 text-slate-700 border-slate-200';
                                  
                                  return (
                                    <div key={a.id} className={`w-full text-[10px] p-1.5 rounded-md border shadow-sm mb-1 text-left relative overflow-hidden bg-white ${shiftColor.replace('bg-', 'border-').split(' ')[2] || 'border-slate-200'}`}>
                                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${l?.color?.split(' ')[0] || 'bg-slate-400'}`}></div>
                                        <div className="font-bold pl-2 leading-tight">{s?.name}</div>
                                        <div className="text-slate-500 pl-2 flex items-center gap-1 truncate mt-0.5" title={l?.name}>
                                            <MapPin size={8} /> {l?.name || '...'}
                                        </div>
                                    </div>
                                  );
                              })
                            ) : (
                              !readOnly && <Plus size={16} className="mt-5 opacity-20 hover:opacity-100 transition-opacity text-slate-400"/>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12">
        {/* Clear Button */}
        {!readOnly && onClear && (
            <div className="flex justify-end px-1 animate-in fade-in slide-in-from-top-2">
                <button 
                    onClick={onClear}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-red-200 transition-all hover:shadow hover:border-red-300"
                >
                    <Trash2 size={14} /> Clear This Week
                </button>
            </div>
        )}

        {renderTable("Audiologists", audiologists, "bg-indigo-100 text-indigo-800", <Stethoscope size={20}/>)}
        {renderTable("Support Staff", supportStaff, "bg-emerald-100 text-emerald-800", <Users size={20}/>)}
        
        {audiologists.length === 0 && supportStaff.length === 0 && (
             <div className="text-center py-12 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-400">
                {searchTerm ? `No staff matching "${searchTerm}" found.` : 'No staff members found matching criteria.'}
             </div>
        )}
    </div>
  );
};
