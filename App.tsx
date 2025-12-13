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
  INITIAL_LOCATIONS,
  DAYS_OF_WEEK
} from './services/types'; 
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
  Lock,
  LogOut,
  Database,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Building2,
  X,
  Search,
  AlertTriangle,
  Info,
  Terminal
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('brg_rota_is_admin') === 'true';
  });

  const [view, setView] = useState<ViewMode>(ViewMode.GRID);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Date State (Monday of the current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
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

  // Clear Confirmation Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearError, setClearError] = useState('');

  // --- Effects ---
  
  useEffect(() => {
    localStorage.setItem('brg_rota_is_admin', String(isAdmin));
    if (!isAdmin && view !== ViewMode.GRID && view !== ViewMode.HOSPITAL_VIEW) setView(ViewMode.GRID);
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (dbError) {
      const timer = setTimeout(() => setDbError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [dbError]);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    
    if (!isSupabaseConfigured) {
      setEmployees(INITIAL_EMPLOYEES);
      setShifts(INITIAL_SHIFTS);
      setLocations(INITIAL_LOCATIONS);
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: locData, error: locErr } = await supabase.from('locations').select('*');
      if (locErr) throw locErr;
      if (locData) setLocations(locData);

      const { data: empData, error: empErr } = await supabase.from('employees').select('*');
      if (empErr) throw empErr;
      if (empData) {
        const mappedEmployees: Employee[] = empData.map((e: any) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          category: e.category,
          defaultLocationId: e.default_location_id,
          preferredHours: Number(e.preferred_hours) || 40,
          availableDays: e.available_days || DAYS_OF_WEEK
        }));
        setEmployees(mappedEmployees);
      }

      const { data: shiftData, error: shiftErr } = await supabase.from('shifts').select('*');
      if (shiftErr) throw shiftErr;
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

      const { data: assignData, error: assignError } = await supabase.from('assignments').select('*');
      if (assignError) throw assignError;

      if (assignData) {
        const mappedAssignments: RotaAssignment[] = assignData.map((a: any) => ({
          id: a.id,
          date: a.date,
          employeeId: a.employee_id,
          shiftId: a.shift_id,
          locationId: a.location_id
        }));
        setAssignments(mappedAssignments);
      }
    } catch (error: any) {
      setDbError(`Database Fetch Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const changeWeek = (offset: number) => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (offset * 7));
      return next;
    });
  };

  const handleLogin = () => {
    const pwd = prompt("Enter Admin Password:");
    if (pwd === "admin") setIsAdmin(true);
    else if (pwd !== null) alert("Incorrect password");
  };

  const handleAssign = async (dateStr: string, employeeId: string, shiftId: string, locationId?: string) => {
    if (!isAdmin) return;
    const emp = employees.find(e => e.id === employeeId);
    const defaultLoc = locationId || emp?.defaultLocationId || (locations.length > 0 ? locations[0].id : '');
    const exists = assignments.some(a => a.date === dateStr && a.employeeId === employeeId && a.shiftId === shiftId);
    if (exists) return;

    const newAssignment = { 
      id: Math.random().toString(36).substr(2, 9), 
      date: dateStr, 
      employeeId, 
      shiftId,
      locationId: defaultLoc
    };

    setAssignments(prev => [...prev, newAssignment]);
    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase.from('assignments').insert([{
        id: newAssignment.id,
        date: dateStr,
        employee_id: employeeId,
        shift_id: shiftId,
        location_id: defaultLoc
      }]);
      if (error) throw error;
    } catch (error: any) {
      setDbError(`Failed to save: ${error.message}`);
      setAssignments(prev => prev.filter(a => a.id !== newAssignment.id));
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!isAdmin) return;
    const prevAssignments = [...assignments];
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
      if (error) throw error;
    } catch (error: any) {
      setDbError(`Delete failed: ${error.message}`);
      setAssignments(prevAssignments);
    }
  };

  const handleUpdateAssignmentLocation = async (assignmentId: string, locationId: string) => {
    const prevAssignments = [...assignments];
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, locationId } : a));
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('assignments').update({ location_id: locationId }).eq('id', assignmentId);
      if (error) throw error;
    } catch (error: any) {
      setDbError(`Update failed: ${error.message}`);
      setAssignments(prevAssignments);
    }
  }

  const handleClearRotaRequest = () => {
    if (!isAdmin) return;
    setShowClearModal(true);
    setClearPassword('');
    setClearError('');
  };

  const handleClearRotaConfirm = async () => {
    if (clearPassword !== 'brrpl1234') {
        setClearError('Incorrect password. Please try again.');
        return;
    }
    const weekDates = [];
    const d = new Date(currentWeekStart);
    for(let i=0; i<7; i++) {
        weekDates.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
    }
    const prevAssignments = [...assignments];
    setAssignments(prev => prev.filter(a => !weekDates.includes(a.date)));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('assignments').delete().in('date', weekDates);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Clear failed: ${error.message}`);
            setAssignments(prevAssignments);
        }
    }
    setShowClearModal(false);
  };

  const handleAddEmployee = async (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('employees').insert([{
          id: emp.id, 
          name: emp.name, 
          role: emp.role, 
          category: emp.category, 
          default_location_id: emp.defaultLocationId, 
          preferred_hours: emp.preferredHours,
          available_days: emp.availableDays 
        }]);
        if (error) throw error;
      } catch (error: any) {
        setDbError(`Staff Add Failed: ${error.message}`);
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
      }
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    const prev = [...employees];
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('employees').update({
                name: updatedEmp.name,
                role: updatedEmp.role,
                category: updatedEmp.category,
                default_location_id: updatedEmp.defaultLocationId,
                preferred_hours: updatedEmp.preferredHours,
                available_days: updatedEmp.availableDays 
            }).eq('id', updatedEmp.id);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Update failed: ${error.message}`);
            setEmployees(prev);
        }
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    const prev = [...employees];
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Delete failed: ${error.message}`);
            setEmployees(prev);
        }
    }
  };

  const handleAddShift = async (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('shifts').insert([{
                id: shift.id, name: shift.name, color: shift.color, 
                start_time: shift.startTime, end_time: shift.endTime, hours: shift.hours
            }]);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Shift Add Failed: ${error.message}`);
            setShifts(prev => prev.filter(s => s.id !== shift.id));
        }
    }
  };

  const handleRemoveShift = async (id: string) => {
    const prev = [...shifts];
    setShifts(prev => prev.filter(s => s.id !== id));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('shifts').delete().eq('id', id);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Delete failed: ${error.message}`);
            setShifts(prev);
        }
    }
  };

  const handleAddLocation = async (loc: Location) => {
    setLocations(prev => [...prev, loc]);
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('locations').insert([loc]);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Location Add Failed: ${error.message}`);
            setLocations(prev => prev.filter(l => l.id !== loc.id));
        }
    }
  };

  const handleUpdateLocation = async (updatedLoc: Location) => {
    const prev = [...locations];
    setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('locations').update({ name: updatedLoc.name }).eq('id', updatedLoc.id);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Update failed: ${error.message}`);
            setLocations(prev);
        }
    }
  };

  const handleRemoveLocation = async (id: string) => {
    const prev = [...locations];
    setLocations(prev => prev.filter(l => l.id !== id));
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('locations').delete().eq('id', id);
            if (error) throw error;
        } catch (error: any) {
            setDbError(`Delete failed: ${error.message}`);
            setLocations(prev);
        }
    }
  };

  const handleSeedData = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      await supabase.from('locations').insert(INITIAL_LOCATIONS);
      setLocations(INITIAL_LOCATIONS);
      await supabase.from('employees').insert(INITIAL_EMPLOYEES.map(e => ({
        id: e.id, 
        name: e.name, 
        role: e.role, 
        category: e.category, 
        default_location_id: e.defaultLocationId, 
        preferred_hours: e.preferredHours,
        available_days: e.availableDays
      })));
      setEmployees(INITIAL_EMPLOYEES);
      await supabase.from('shifts').insert(INITIAL_SHIFTS.map(s => ({
        id: s.id, name: s.name, color: s.color, 
        start_time: s.startTime, end_time: s.endTime, hours: s.hours
      })));
      setShifts(INITIAL_SHIFTS);
      alert("Demo data uploaded!");
    } catch (e: any) {
      setDbError("Error seeding: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!isAdmin) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
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
            onClear={handleClearRotaRequest}
            readOnly={!isAdmin}
            searchTerm={searchTerm}
          />
        );
      case ViewMode.HOSPITAL_VIEW:
        return <HospitalView weekStart={currentWeekStart} locations={locations} assignments={assignments} employees={employees} shifts={shifts} />;
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

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const dateRangeStr = `${currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {dbError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
           <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border-b-4 border-red-800">
              <div className="flex items-center gap-3">
                 <AlertTriangle size={20} className="shrink-0" />
                 <span className="text-sm font-medium">{dbError}</span>
              </div>
              <button onClick={() => setDbError(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={18} /></button>
           </div>
        </div>
      )}

      {!isSupabaseConfigured && !isLoading && (
        <div className="bg-amber-600 text-white text-[11px] py-1.5 px-4 text-center font-bold tracking-wider uppercase animate-pulse flex items-center justify-center gap-2">
            <WifiOff size={14}/> Demo Mode: Data will not be saved. Configure Supabase for persistence.
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-4">
          <div className="flex justify-start">
             <img src="https://bengalrehabilitationgroup.com/images/brg_logo.png" alt="BRG" className="h-16 w-auto object-contain" />
          </div>
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-xl md:text-3xl font-extrabold text-[#3159a6] tracking-tight text-center">BRG Smart Rota</h1>
             <button onClick={() => setShowSetupModal(true)} className="flex items-center gap-2 mt-1 hover:bg-slate-50 px-2 py-1 rounded transition-colors">
               {isSupabaseConfigured ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-medium"><Database size={10}/> Database Connected</span>
               ) : (
                  <span className="text-[10px] text-orange-500 flex items-center gap-1 font-medium"><WifiOff size={10}/> Connection Issue / Demo</span>
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
               {view === ViewMode.GRID && (
                  <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                      <div className="pl-3 text-slate-400 pointer-events-none"><Search size={16}/></div>
                      <input type="text" className="pl-2 pr-8 py-2 text-sm bg-transparent outline-none text-slate-700 w-full md:w-48 placeholder:text-slate-400" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"><X size={14}/></button>}
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

      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI Scheduler</h2>
            <p className="text-sm text-slate-500 mb-4">Generates plan for: {dateRangeStr}</p>
            <textarea className="w-full h-32 p-3 border rounded-xl text-sm mb-4 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Alice needs Tuesday off..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            {errorMsg && <div className="text-red-500 text-sm mb-4">{errorMsg}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 border rounded-xl">Cancel</button>
              <button onClick={handleGenerateAI} disabled={isGenerating} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl flex justify-center items-center gap-2">{isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-2 border-red-100">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="text-red-600" size={24} /></div>
                    <h3 className="text-lg font-bold text-slate-900">Clear Weekly Schedule?</h3>
                    <p className="text-sm text-slate-500 mt-2">This will remove all assignments for the current week. This action cannot be undone.</p>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Enter Password to Confirm</label>
                    <input type="password" autoFocus className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900" placeholder="••••••••" value={clearPassword} onChange={(e) => { setClearPassword(e.target.value); setClearError(''); }} />
                    {clearError && <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1"><X size={12}/> {clearError}</p>}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowClearModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleClearRotaConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95">Confirm Clear</button>
                </div>
            </div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Database className="text-indigo-600"/> Database Setup Guide</h2>
                    <button onClick={() => setShowSetupModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-6">
                    <section>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 flex items-center gap-2 text-indigo-600">
                            <Terminal size={16}/> 1. Fix Missing Database Column
                        </h3>
                        <p className="text-xs text-slate-600 mb-3">If you get an error "Could not find the available_days column", run this in your Supabase SQL Editor:</p>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded-xl font-mono text-[11px] leading-relaxed border-l-4 border-indigo-500 relative">
                            <pre className="whitespace-pre-wrap">ALTER TABLE employees ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{"{Mon,Tue,Wed,Thu,Fri,Sat,Sun}"}';</pre>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 flex items-center gap-2 text-indigo-600">
                            <Info size={16}/> 2. Environment Variables
                        </h3>
                        <p className="text-xs text-slate-600 mb-2">Ensure your server/Vercel settings have these exact keys:</p>
                        <div className="bg-slate-900 text-slate-50 p-4 rounded-xl font-mono text-[11px] leading-relaxed border-l-4 border-emerald-500">
                            VITE_SUPABASE_URL=your_project_url<br/>
                            VITE_SUPABASE_KEY=your_anon_key<br/>
                            VITE_GEMINI_API_KEY=your_gemini_key
                        </div>
                    </section>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        <div className="text-xs text-amber-800">
                            <strong>Supabase RLS Policy:</strong> If data still doesn't save, ensure you have enabled a policy for "Enable access to all users" on the employees and assignments tables.
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={() => setShowSetupModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-all">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;

