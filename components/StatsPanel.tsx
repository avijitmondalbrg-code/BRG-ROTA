
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppState, Employee, Shift } from '../services/types';
import { Download, Calendar, FileText, Table } from 'lucide-react';

interface StatsPanelProps {
  state: AppState;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state }) => {
  const { employees, assignments, shifts, locations } = state;
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // --- Stats Logic ---
  const data = employees.map(emp => {
    const empAssignments = assignments.filter(a => a.employeeId === emp.id);
    const totalHours = empAssignments.reduce((acc, curr) => {
      const shift = shifts.find(s => s.id === curr.shiftId);
      return acc + (shift ? shift.hours : 0);
    }, 0);

    return {
      name: emp.name,
      hours: totalHours,
      target: emp.preferredHours,
      over: totalHours > emp.preferredHours
    };
  });

  // --- Monthly Report Logic ---
  const filteredAssignments = assignments
    .filter(a => a.date.startsWith(selectedMonth))
    .sort((a, b) => {
        // Sort by Date, then by Location name, then by Shift start time
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const locA = locations.find(l => l.id === a.locationId)?.name || '';
        const locB = locations.find(l => l.id === b.locationId)?.name || '';
        if (locA !== locB) return locA.localeCompare(locB);
        const shiftA = shifts.find(s => s.id === a.shiftId)?.startTime || '';
        const shiftB = shifts.find(s => s.id === b.shiftId)?.startTime || '';
        return shiftA.localeCompare(shiftB);
    });

  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Employee Name', 'Role', 'Shift', 'Start Time', 'End Time', 'Hours', 'Location'];
    
    const rows = filteredAssignments.map(a => {
        const dateObj = new Date(a.date);
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
        const emp = employees.find(e => e.id === a.employeeId);
        const shift = shifts.find(s => s.id === a.shiftId);
        const loc = locations.find(l => l.id === a.locationId);

        return [
            a.date,
            dayName,
            emp?.name || 'Unknown',
            emp?.role || '',
            shift?.name || 'Unknown',
            shift?.startTime || '',
            shift?.endTime || '',
            shift?.hours || 0,
            loc?.name || 'Unknown'
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','); // Escape CSV
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rota_export_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-indigo-600" /> Hours Distribution
            </h3>
            <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    width={100} 
                />
                <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.over ? '#ef4444' : '#6366f1'} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Summary
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {data.map(d => (
                    <div key={d.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-700">{d.name}</span>
                            <span className="text-xs text-slate-400">Target: {d.target}h</span>
                        </div>
                        <div className="text-right">
                            <span className={`text-xl font-bold ${d.hours > d.target ? 'text-red-500' : d.hours < d.target ? 'text-yellow-500' : 'text-green-500'}`}>
                                {d.hours}h
                            </span>
                            <span className="text-xs text-slate-400 block">assigned</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Monthly Report Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Calendar size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Monthly Report</h3>
                    <p className="text-xs text-slate-500">View and export schedule history</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <input 
                    type="month" 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                />
                <button 
                    onClick={handleExportCSV}
                    disabled={filteredAssignments.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Employee</th>
                        <th className="px-6 py-3 font-medium">Shift</th>
                        <th className="px-6 py-3 font-medium">Location</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredAssignments.length > 0 ? (
                        filteredAssignments.map((assignment) => {
                            const emp = employees.find(e => e.id === assignment.employeeId);
                            const shift = shifts.find(s => s.id === assignment.shiftId);
                            const loc = locations.find(l => l.id === assignment.locationId);
                            const dateObj = new Date(assignment.date);
                            
                            return (
                                <tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                        <div className="font-medium text-slate-900">{assignment.date}</div>
                                        <div className="text-xs opacity-70">{dateObj.toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="font-medium text-slate-900">{emp?.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500">{emp?.role}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            {shift?.name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {shift?.startTime} - {shift?.endTime}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${loc?.color.split(' ')[0] || 'bg-slate-300'}`}></div>
                                            {loc?.name || 'Unknown'}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 bg-slate-50/30">
                                <div className="flex flex-col items-center gap-2">
                                    <Table size={32} className="opacity-20" />
                                    <p>No assignments found for {selectedMonth}.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex justify-between">
            <span>Showing {filteredAssignments.length} records</span>
            <span>Period: {selectedMonth}</span>
        </div>
      </div>

    </div>
  );
};
