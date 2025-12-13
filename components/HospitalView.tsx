
import React, { useState, useMemo } from 'react';
import { Location, Employee, Shift, RotaAssignment } from '../services/types';
import { Building2, Search, Calendar, FileSpreadsheet, X, Info, Download } from 'lucide-react';

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
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  
  // Default range: current week (Mon-Sun)
  const defaultToDate = new Date(weekStart);
  defaultToDate.setDate(defaultToDate.getDate() + 6);
  
  const [fromDate, setFromDate] = useState<string>(weekStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(defaultToDate.toISOString().split('T')[0]);

  // --- Date Range Generation ---
  const rangeDates = useMemo(() => {
    const dates: { dateStr: string; dayName: string; dateObj: Date }[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    // Safety: Limit to 60 days for performance
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 60) {
      dates.push({
        dateObj: new Date(current),
        dateStr: current.toISOString().split('T')[0],
        dayName: current.toLocaleDateString('en-GB', { weekday: 'short' })
      });
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [fromDate, toDate]);

  // --- Filtering Logic ---
  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);

  const getAssignmentsForCell = (locId: string, dateStr: string) => {
    return assignments
      .filter(a => a.locationId === locId && a.date === dateStr)
      .map(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        const shift = shifts.find(s => s.id === a.shiftId);
        return { emp, shift, id: a.id };
      });
  };

  // --- CSV Export Logic ---
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Hospital', 'Staff Name', 'Category', 'Role', 'Shift', 'Start', 'End', 'Hours'];
    
    const rows: string[][] = [];
    rangeDates.forEach(d => {
      // Export all locations in the selected range for a full report
      locations.forEach(loc => {
        const cellData = getAssignmentsForCell(loc.id, d.dateStr);
        cellData.forEach(item => {
          rows.push([
            d.dateStr,
            d.dayName,
            loc.name,
            item.emp?.name || 'Unknown',
            item.emp?.category || 'N/A',
            item.emp?.role || 'N/A',
            item.shift?.name || 'N/A',
            item.shift?.startTime || '',
            item.shift?.endTime || '',
            String(item.shift?.hours || 0)
          ]);
        });
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BRG_Posting_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Control Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Hospital Search */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input 
              type="text"
              className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Search by Hospital Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Range Selectors */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1.5 px-2 text-slate-500">
              <Calendar size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Select Range</span>
            </div>
            <input 
              type="date"
              className="bg-transparent text-sm font-medium text-slate-700 outline-none p-1"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-slate-300">|</span>
            <input 
              type="date"
              className="bg-transparent text-sm font-medium text-slate-700 outline-none p-1"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-[#3159a6] hover:bg-[#254685] text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
        >
            <FileSpreadsheet size={16} /> Export Detailed Report (CSV)
        </button>
      </div>

      {/* Hospital View Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-indigo-50/30 border-b border-indigo-100 flex justify-between items-center">
             <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="text-indigo-600" size={18}/>
                <span>Hospital-Wise Posting Overview</span>
             </h3>
             <div className="flex items-center gap-2">
                 <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-1 rounded border">
                   {rangeDates.length} DAYS RANGE
                 </span>
             </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold min-w-[220px] sticky left-0 z-20 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Hospital / Location
                </th>
                {rangeDates.map(d => {
                  const isSun = d.dayName === 'Sun';
                  return (
                    <th key={d.dateStr} className={`px-4 py-4 min-w-[160px] text-center border-r border-slate-100 last:border-0 ${isSun ? 'bg-red-50 text-red-600' : ''}`}>
                      <div className="text-[10px] opacity-60 font-bold">{d.dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</div>
                      <div className="text-lg font-black leading-none my-0.5">{d.dateObj.getDate()}</div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest">{d.dayName}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLocations.map(loc => (
                <tr key={loc.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-10 rounded-full ${loc.color.split(' ')[0] || 'bg-slate-300'}`}></div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{loc.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-tight">Active Posting Unit</div>
                      </div>
                    </div>
                  </td>
                  {rangeDates.map(d => {
                    const data = getAssignmentsForCell(loc.id, d.dateStr);
                    const isSun = d.dayName === 'Sun';
                    
                    return (
                      <td key={d.dateStr} className={`px-2 py-3 align-top border-r border-slate-50 last:border-0 ${isSun ? 'bg-red-50/20' : ''}`}>
                        <div className="flex flex-col gap-2">
                          {data.length > 0 ? (
                            data.map((item) => (
                               <div 
                                  key={item.id} 
                                  className="bg-white border border-slate-200 shadow-sm rounded-lg p-2 flex flex-col gap-1 hover:border-indigo-300 transition-all group"
                               >
                                  <div className="font-bold text-slate-800 text-xs leading-tight group-hover:text-indigo-700">{item.emp?.name}</div>
                                  <div className="flex flex-wrap gap-1">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      item.emp?.category === 'Audiologist' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {item.emp?.category}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                      {item.shift?.name}
                                    </span>
                                  </div>
                               </div>
                            ))
                          ) : (
                            <div className="h-10 flex items-center justify-center opacity-10">
                               <Building2 size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {filteredLocations.length === 0 && (
                <tr>
                    <td colSpan={rangeDates.length + 1} className="p-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                           <Search className="opacity-20" size={40} />
                           <p className="font-bold text-lg">No hospitals found matching "{searchTerm}"</p>
                           <button onClick={() => setSearchTerm('')} className="text-indigo-600 font-bold hover:underline">Clear search</button>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-2 text-slate-400 text-[10px] font-medium italic">
         <Info size={14} />
         <span>* Showing up to 60 days per view for performance. Use the date range filters to see other periods.</span>
      </div>
    </div>
  );
};

