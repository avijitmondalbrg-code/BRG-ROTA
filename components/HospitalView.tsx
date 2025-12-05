
import React from 'react';
import { Location, Employee, Shift, RotaAssignment, DAYS_OF_WEEK } from '../services/types';
import { Building2 } from 'lucide-react';

interface HospitalViewProps {
  weekStart: Date;
  locations: Location[];
  assignments: RotaAssignment[];
  employees: Employee[];
  shifts: Shift[];
}

export const HospitalView: React.FC<HospitalViewProps> = ({
  weekStart,
  locations,
  assignments,
  employees,
  shifts
}) => {
  // Generate dates
  const weekDates: { dateStr: string; dayName: string; dateObj: Date }[] = [];
  const tempDate = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    weekDates.push({
      dateObj: new Date(tempDate),
      dateStr: tempDate.toISOString().split('T')[0],
      dayName: DAYS_OF_WEEK[i]
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const getEmployeesForLocationAndDate = (locId: string, dateStr: string) => {
    const relevantAssignments = assignments.filter(a => a.locationId === locId && a.date === dateStr);
    return relevantAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      const shift = shifts.find(s => s.id === a.shiftId);
      return { emp, shift };
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="text-indigo-600" size={20}/>
                <span>Hospital Daily Overview</span>
             </h3>
             <span className="text-xs text-slate-500 bg-white border px-2 py-1 rounded-md">View only</span>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-bold min-w-[200px] sticky left-0 z-20 bg-slate-50 border-r border-slate-200">
                Hospital / Location
              </th>
              {weekDates.map(d => (
                <th key={d.dateStr} className={`px-4 py-4 min-w-[160px] text-center ${d.dayName === 'Sun' ? 'text-red-600 bg-red-50/50' : ''}`}>
                  <div className="font-bold">{d.dayName}</div>
                  <div className="text-[10px] opacity-75">{d.dateObj.getDate()}/{d.dateObj.getMonth() + 1}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {locations.map(loc => (
              <tr key={loc.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-8 rounded-full ${loc.color.split(' ')[0]}`}></div>
                    <span className="text-sm font-semibold">{loc.name}</span>
                  </div>
                </td>
                {weekDates.map(d => {
                  const data = getEmployeesForLocationAndDate(loc.id, d.dateStr);
                  const isWeekend = d.dayName === 'Sun';
                  
                  return (
                    <td key={d.dateStr} className={`px-2 py-3 align-top ${isWeekend ? 'bg-slate-50/30' : ''}`}>
                      <div className="flex flex-col gap-1.5">
                        {data.length > 0 ? (
                          data.map((item, idx) => (
                             <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-md p-2 flex flex-col gap-0.5">
                                <div className="font-semibold text-slate-700 text-xs leading-tight">{item.emp?.name || 'Unknown'}</div>
                                <div className="text-[10px] text-slate-500 font-medium bg-slate-100 self-start px-1.5 rounded-sm">{item.shift?.name || 'Shift'}</div>
                             </div>
                          ))
                        ) : (
                          <div className="h-8 flex items-center justify-center">
                             <span className="text-slate-300 text-lg">·</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {locations.length === 0 && (
                <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No hospitals defined yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
