import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppState, Employee, Shift } from '../services/types';

interface StatsPanelProps {
  state: AppState;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state }) => {
  const { employees, assignments, shifts } = state;

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Hours Distribution</h3>
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
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
        <div className="space-y-4">
            {data.map(d => (
                <div key={d.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
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
  );
};