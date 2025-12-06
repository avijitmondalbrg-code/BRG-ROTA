
import React, { useState, useEffect } from 'react';
import { 
  AppState, 
  Employee, 
  Shift, 
  Location,
  RotaAssignment, 
  ViewMode, 
  INITIAL_EMPLOYEES, 
  INITIAL_SHIFTS,
  INITIAL_LOCATIONS 
} from './services/types'; // Updated import path to match file structure
import { RotaGrid } from './components/RotaGrid';
import { StatsPanel } from './components/StatsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { HospitalView } from './components/HospitalView';
import { generateRotaWithAI } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { 
  CalendarDays, 
  BarChart3, 
  Settings, 
  Sparkles, 
  Loader2, 
  RotateCcw,
  CheckCircle2,
  Lock,
  LogOut,
  Database,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Building2,
  HelpCircle,
  X,
  Key,
  Filter,
  Search
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('brg_rota_is_admin') === 'true';
  });

  const [view, setView] = useState<ViewMode>(ViewMode.GRID);
  const [isLoading, setIsLoading] = useState(true);

  // Date State (Monday of the current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
  });

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<RotaAssignment[]>([]);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Setup Help Modal
  const [showSetupModal, setShowSetupModal] = useState(false);

  // --- Effects ---
  
  useEffect(() => {
    localStorage.setItem('brg_rota_is_admin', String(isAdmin));
    if (!isAdmin && view !== ViewMode.GRID && view !== ViewMode.HOSPITAL_VIEW) setView(ViewMode.GRID);
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    if (!isSupabaseConfigured) {
      console.log("Running in offline mode with demo data");
      setEmployees(INITIAL_EMPLOYEES);
      setShifts(INITIAL_SHIFTS);
      setLocations(INITIAL_LOCATIONS);
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Locations
      const { data: locData } = await supabase.from('locations').select('*');
      if (locData) setLocations(locData);

      // 2. Employees
      const { data: empData } = await supabase.from('employees').select('*');
      if (empData) {
        setEmployees(empData.map((e: any) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          category: e.category,
          defaultLocationId: e.default_location_id,
          preferredHours: e.preferred_hours
        })));
      }

      // 3. Shifts
      const { data: shiftData } = await supabase.from('shifts').select('*');
      if (shiftData) {
        setShifts(shiftData.map((s: any) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          startTime: s.start_time,
          endTime: s.end_time,
          hours: s.hours
        })));
      }

      // 4. Assignments (Fetch ALL for now, optimize to range later)
      const { data: assignData, error: assignError } = await supabase.from('assignments').select('*');
      if (assignError) throw assignError;

      if (assignData) {
        setAssignments(assignData.map((a: any) => ({
          id: a.id,
          date: a.date,
          employeeId: a.employee_id,
          shiftId: a.shift_id,
          locationId: a.location_id
        })));
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.code === '42P01') {
        // Table not found
        console.warn("Tables not found. Prompting setup.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Date Navigation ---
  const changeWeek = (weeks: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setCurrentWeekStart(newDate);
  };

  // --- Actions ---

  const handleLogin = () => {
    const pwd = prompt("Enter Admin Password:");
    if (pwd === "admin") setIsAdmin(true);
    else if (pwd !== null) alert("Incorrect password");
  };

  const handleAssign = async (dateStr: string, employeeId: string, shiftId: string, locationId?: string) => {
    if (!isAdmin) return;
    
    // Find default location for this employee to "Automatically generate hospital entry"
    const emp = employees.find(e => e.id === employeeId);
    
    // Priority: Explicitly selected location > Employee Default > First available location
    const defaultLoc = locationId || emp?.defaultLocationId || (locations.length > 0 ? locations[0].id : '');

    // Check duplicates locally
    const exists = assignments.some(a => a.date === dateStr && a.employeeId === employeeId && a.shiftId === shiftId);
    if (exists) return;

    const newAssignment = { 
      id: Math.random().toString(36).substr(2, 9), 
      date: dateStr, 
      employeeId, 
      shiftId,
      locationId: defaultLoc // Auto-assign default location
    };

    setAssignments(prev => [...prev, newAssignment]);

    if (!isSupabaseConfigured) return;

    const { error } = await supabase.from('assignments').insert([{
      id: newAssignment.id,
      date: dateStr,
      employee_id: employeeId,
      shift_id: shiftId,
      location_id: defaultLoc
    }]);

    if (error) {
      console.error('Error assigning:', error);
      setAssignments(prev => prev.filter(a => a.id !== newAssignment.id));
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!isAdmin) return;
    const prevAssignments = [...assignments];
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));

    if (!isSupabaseConfigured) return;

    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
    if (error) setAssignments(prevAssignments);
  };

  const handleUpdateAssignmentLocation = async (assignmentId: string, locationId: string) => {
    // Optimistic
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, locationId } : a));

    if (!isSupabaseConfigured) return;
    await supabase.from('assignments').update({ location_id: locationId }).eq('id', assignmentId);
  }

  const handleClearRota = async () => {
    if (!isAdmin) return;
    if (confirm('Clear schedule for THIS WEEK only?')) {
      // Calculate dates for current week to filter delete
      const weekDates = [];
      const d = new Date(currentWeekStart);
      for(let i=0; i<7; i++) {
        weekDates.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }

      setAssignments(prev => prev.filter(a => !weekDates.includes(a.date)));

      if (!isSupabaseConfigured) return;
      await supabase.from('assignments').delete().in('date', weekDates);
    }
  };

  // --- CRUD Handlers (Simplified for brevity) ---
  const handleAddEmployee = async (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    if (isSupabaseConfigured) {
      await supabase.from('employees').insert([{
        id: emp.id, name: emp.name, role: emp.role, category: emp.category, 
        default_location_id: emp.defaultLocationId, preferred_hours: emp.preferredHours
      }]);
    }
  };
  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    if (isSupabaseConfigured) {
        await supabase.from('employees').update({
            name: updatedEmp.name,
            role: updatedEmp.role,
            category: updatedEmp.category,
            default_location_id: updatedEmp.defaultLocationId,
            preferred_hours: updatedEmp.preferredHours
        }).eq('id', updatedEmp.id);
    }
  };
  const handleRemoveEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (isSupabaseConfigured) await supabase.from('employees').delete().eq('id', id);
  };

  const handleAddShift = async (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
    if (isSupabaseConfigured) await supabase.from('shifts').insert([{
       id: shift.id, name: shift.name, color: shift.color, 
       start_time: shift.startTime, end_time: shift.endTime, hours: shift.hours
    }]);
  };
  const handleRemoveShift = async (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    if (isSupabaseConfigured) await supabase.from('shifts').delete().eq('id', id);
  };

  const handleAddLocation = async (loc: Location) => {
    setLocations(prev => [...prev, loc]);
    if (isSupabaseConfigured) await supabase.from('locations').insert([loc]);
  };
  const handleUpdateLocation = async (updatedLoc: Location) => {
    setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
    if (isSupabaseConfigured) {
        await supabase.from('locations').update({
            name: updatedLoc.name
        }).eq('id', updatedLoc.id);
    }
  };
  const handleRemoveLocation = async (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    if (isSupabaseConfigured) await supabase.from('locations').delete().eq('id', id);
  };

  const handleSeedData = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      // Seed Locations First
      await supabase.from('locations').insert(INITIAL_LOCATIONS);
      setLocations(INITIAL_LOCATIONS);

      // Seed Employees
      await supabase.from('employees').insert(INITIAL_EMPLOYEES.map(e => ({
        id: e.id, name: e.name, role: e.role, category: e.category, 
        default_location_id: e.defaultLocationId, preferred_hours: e.preferredHours
      })));
      setEmployees(INITIAL_EMPLOYEES);

      // Seed Shifts
      await supabase.from('shifts').insert(INITIAL_SHIFTS.map(s => ({
        id: s.id, name: s.name, color: s.color, 
        start_time: s.startTime, end_time: s.endTime, hours: s.hours
      })));
      setShifts(INITIAL_SHIFTS);

      alert("Demo data uploaded!");
    } catch (e: any) {
      console.error(e);
      alert("Error seeding: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!isAdmin) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      // Pass the current week start to AI so it generates correct dates
      const newAssignments = await generateRotaWithAI(employees, shifts, locations, aiPrompt, currentWeekStart);
      
      setAssignments(prev => [...prev, ...newAssignments]);
      
      if (isSupabaseConfigured && newAssignments.length > 0) {
        const dbPayload = newAssignments.map(a => ({
          id: a.id,
          date: a.date,
          employee_id: a.employeeId,
          shift_id: a.shiftId,
          location_id: a.locationId
        }));
        const { error } = await supabase.from('assignments').insert(dbPayload);
        if (error) throw error;
      }
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    switch (view) {
      case ViewMode.GRID:
        return (
          <RotaGrid 
            weekStart={currentWeekStart}
            employees={employees} 
            shifts={shifts} 
            locations={locations}
            assignments={assignments}
            onAssign={handleAssign}
            onRemove={handleRemoveAssignment}
            onUpdateLocation={handleUpdateAssignmentLocation}
            readOnly={!isAdmin}
            searchTerm={searchTerm}
          />
        );
      case ViewMode.HOSPITAL_VIEW:
        return (
           <HospitalView 
              weekStart={currentWeekStart}
              locations={locations}
              assignments={assignments}
              employees={employees}
              shifts={shifts}
           />
        );
      case ViewMode.STATS:
        return isAdmin ? <StatsPanel state={{ employees, shifts, locations, assignments }} /> : null;
      case ViewMode.SETTINGS:
        return isAdmin ? (
          <SettingsPanel 
            employees={employees}
            shifts={shifts}
            locations={locations}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onAddShift={handleAddShift}
            onRemoveShift={handleRemoveShift}
            onAddLocation={handleAddLocation}
            onUpdateLocation={handleUpdateLocation}
            onRemoveLocation={handleRemoveLocation}
            onSeedData={handleSeedData}
            isDbEmpty={isSupabaseConfigured && locations.length === 0}
          />
        ) : null;
      default: return null;
    }
  };

  // Header Date String
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const dateRangeStr = `${currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-4">
          <div className="flex justify-start">
             <img src="https://bengalrehabilitationgroup.com/images/brg_logo.png" alt="BRG" className="h-16 w-auto object-contain" />
          </div>
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-xl md:text-3xl font-extrabold text-[#3159a6] tracking-tight text-center">
              BRG Smart Rota
            </h1>
             <button 
                onClick={() => setShowSetupModal(true)}
                className="flex items-center gap-2 mt-1 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
             >
               {isSupabaseConfigured ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-medium"><Database size={10}/> Database Connected</span>
               ) : (
                  <span className="text-[10px] text-orange-500 flex items-center gap-1 font-medium"><WifiOff size={10}/> Demo Mode (Click to Setup)</span>
               )}
             </button>
          </div>
          <div className="flex justify-end items-center gap-2">
            {isAdmin ? (
              <>
                <button onClick={() => setShowAiModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-indigo-700">
                  <Sparkles size={16} /> <span className="hidden lg:inline">AI Auto-Fill</span>
                </button>
                <button onClick={() => setIsAdmin(false)} className="text-slate-500 hover:text-red-600 p-2"><LogOut size={18} /></button>
              </>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-100">
                <Lock size={16} /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl">
            <button onClick={() => setView(ViewMode.GRID)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === ViewMode.GRID ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
              <CalendarDays size={18} /> Schedule
            </button>
            <button onClick={() => setView(ViewMode.HOSPITAL_VIEW)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === ViewMode.HOSPITAL_VIEW ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
              <Building2 size={18} /> Hospital
            </button>
            {isAdmin && (
              <>
                <button onClick={() => setView(ViewMode.STATS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === ViewMode.STATS ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                  <BarChart3 size={18} /> Stats
                </button>
                <button onClick={() => setView(ViewMode.SETTINGS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === ViewMode.SETTINGS ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                  <Settings size={18} /> Manage
                </button>
              </>
            )}
          </div>

          {(view === ViewMode.GRID || view === ViewMode.HOSPITAL_VIEW) && (
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               {/* Search / Filter Input - Only show for GRID */}
               {view === ViewMode.GRID && (
                  <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                      <div className="pl-3 text-slate-400 pointer-events-none"><Search size={16}/></div>
                      <input 
                          type="text"
                          className="pl-2 pr-8 py-2 text-sm bg-transparent outline-none text-slate-700 w-full md:w-48 placeholder:text-slate-400"
                          placeholder="Search staff..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100">
                              <X size={14}/>
                          </button>
                      )}
                  </div>
               )}

              <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1 justify-between sm:justify-start">
                <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600"><ChevronLeft size={20} /></button>
                <div className="px-4 font-semibold text-slate-800 w-48 text-center">{dateRangeStr}</div>
                <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600"><ChevronRight size={20} /></button>
              </div>
            </div>
          )}
        </div>

        {renderContent()}
      </main>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI Scheduler</h2>
            <p className="text-sm text-slate-500 mb-4">Generates plan for: {dateRangeStr}</p>
            <textarea 
              className="w-full h-32 p-3 border rounded-xl text-sm mb-4 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Alice needs Tuesday off..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            {errorMsg && <div className="text-red-500 text-sm mb-4">{errorMsg}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 border rounded-xl">Cancel</button>
              <button onClick={handleGenerateAI} disabled={isGenerating} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl flex justify-center items-center gap-2">
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Help Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Database className="text-indigo-600"/> Setup Guide
                    </h2>
                    <button onClick={() => setShowSetupModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="prose prose-sm text-slate-600">
                    <p className="mb-4">To enable "Access from Anywhere" and "AI Features", configure the following:</p>
                    
                    <ol className="list-decimal pl-4 space-y-4">
                        <li>
                            <strong>Database (Supabase):</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li>Create free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">supabase.com</a>.</li>
                                <li>Run the code from <code>db_schema.sql</code> in the SQL Editor.</li>
                                <li>Get URL & Anon Key from Settings &gt; API.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>AI Intelligence (Gemini):</strong>
                             <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li>Get free API Key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google AI Studio</a>.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Connect (Create .env file):</strong> 
                            <div className="bg-slate-900 text-slate-50 p-3 rounded-md mt-2 font-mono text-xs overflow-x-auto">
                                VITE_SUPABASE_URL=your_project_url<br/>
                                VITE_SUPABASE_KEY=your_anon_key<br/>
                                API_KEY=your_gemini_key
                            </div>
                        </li>
                    </ol>
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                        <strong>Deploying?</strong> If using Vercel, add these same variables in the Vercel Project Settings.
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={() => setShowSetupModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium text-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
