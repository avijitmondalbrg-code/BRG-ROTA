
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
  RefreshCw,
  Wifi,
  ExternalLink,
  Key,
  CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('brg_rota_is_admin') === 'true');
  const [view, setView] = useState<ViewMode>(ViewMode.GRID);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'none'>('none');
  const [dbError, setDbError] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<RotaAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    localStorage.setItem('brg_rota_is_admin', String(isAdmin));
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    
    if (!isSupabaseConfigured) {
      setEmployees(INITIAL_EMPLOYEES);
      setShifts(INITIAL_SHIFTS);
      setLocations(INITIAL_LOCATIONS);
      setDbStatus('none');
      setIsLoading(false);
      setShowSetupModal(true);
      return;
    }

    try {
      // Test actual connectivity
      const { error: testError } = await supabase.from('locations').select('id').limit(1);
      if (testError) throw testError;
      
      setDbStatus('connected');
      setShowSetupModal(false);

      const [locRes, empRes, shiftRes, assignRes] = await Promise.all([
        supabase.from('locations').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('shifts').select('*'),
        supabase.from('assignments').select('*')
      ]);

      if (locRes.data && locRes.data.length > 0) {
          setLocations(locRes.data);
          setEmployees((empRes.data || []).map((e: any) => ({
            id: e.id, name: e.name, role: e.role, category: e.category,
            defaultLocationId: e.default_location_id, preferred_hours: Number(e.preferred_hours) || 40,
            availableDays: e.available_days || DAYS_OF_WEEK
          })));
          setShifts((shiftRes.data || []).map((s: any) => ({
            id: s.id, name: s.name, color: s.color, startTime: s.start_time, endTime: s.end_time, hours: s.hours
          })));
          setAssignments((assignRes.data || []).map((a: any) => ({
            id: a.id, date: a.date, employeeId: a.employee_id, shiftId: a.shift_id, locationId: a.location_id
          })));
      } else {
          // If DB is connected but empty, show defaults only locally until saved
          setLocations(INITIAL_LOCATIONS);
          setEmployees(INITIAL_EMPLOYEES);
          setShifts(INITIAL_SHIFTS);
      }

    } catch (error: any) {
      console.error("Supabase Fetch Error:", error);
      setDbStatus('error');
      setDbError(`Connection Error: ${error.message}`);
      // Fallback
      setEmployees(INITIAL_EMPLOYEES);
      setShifts(INITIAL_SHIFTS);
      setLocations(INITIAL_LOCATIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (dateStr: string, employeeId: string, shiftId: string, locationId?: string) => {
    if (!isAdmin) return;
    const emp = employees.find(e => e.id === employeeId);
    const selectedLoc = locationId || emp?.defaultLocationId || (locations.length > 0 ? locations[0].id : '');
    
    const newAssignmentId = Math.random().toString(36).substr(2, 9);
    const newAssignment: RotaAssignment = { id: newAssignmentId, date: dateStr, employeeId, shiftId, locationId: selectedLoc };

    setAssignments(prev => [...prev, newAssignment]);
    if (dbStatus !== 'connected') return;

    setIsSyncing(true);
    try {
      const { error } = await supabase.from('assignments').insert([{
        id: newAssignmentId, date: dateStr, employee_id: employeeId, shift_id: shiftId, location_id: selectedLoc
      }]);
      if (error) throw error;
    } catch (error: any) {
      setDbError(`Save failed: ${error.message}`);
    } finally { setIsSyncing(false); }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!isAdmin) return;
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
      await supabase.from('assignments').delete().eq('id', assignmentId);
    } catch (error: any) { setDbError(`Delete failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  };

  const handleUpdateAssignmentLocation = async (assignmentId: string, locationId: string) => {
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, locationId } : a));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
      await supabase.from('assignments').update({ location_id: locationId }).eq('id', assignmentId);
    } catch (error: any) { setDbError(`Update failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  };

  const handleAddEmployee = async (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        const { error } = await supabase.from('employees').insert([{
            id: emp.id, name: emp.name, role: emp.role, category: emp.category,
            default_location_id: emp.defaultLocationId, preferred_hours: emp.preferredHours, available_days: emp.availableDays
        }]);
        if (error) throw error;
    } catch (error: any) { setDbError(`Add staff failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleUpdateEmployee = async (emp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('employees').update({
            name: emp.name, role: emp.role, category: emp.category,
            default_location_id: emp.defaultLocationId, preferred_hours: emp.preferredHours, available_days: emp.availableDays
        }).eq('id', emp.id);
    } catch (error: any) { setDbError(`Update failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleRemoveEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('employees').delete().eq('id', id);
    } catch (error: any) { setDbError(`Delete failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleAddShift = async (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('shifts').insert([{
            id: shift.id, name: shift.name, color: shift.color, start_time: shift.startTime, end_time: shift.endTime, hours: shift.hours
        }]);
    } catch (error: any) { setDbError(`Shift failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleRemoveShift = async (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('shifts').delete().eq('id', id);
    } catch (error: any) { setDbError(`Delete failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleAddLocation = async (loc: Location) => {
    setLocations(prev => [...prev, loc]);
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('locations').insert([loc]);
    } catch (error: any) { setDbError(`Location failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleUpdateLocation = async (loc: Location) => {
    setLocations(prev => prev.map(l => l.id === loc.id ? loc : l));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('locations').update({ name: loc.name }).eq('id', loc.id);
    } catch (error: any) { setDbError(`Update failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleRemoveLocation = async (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    if (dbStatus !== 'connected') return;
    setIsSyncing(true);
    try {
        await supabase.from('locations').delete().eq('id', id);
    } catch (error: any) { setDbError(`Delete failed: ${error.message}`); }
    finally { setIsSyncing(false); }
  }

  const handleSeedData = async () => {
    if (dbStatus !== 'connected') return;
    setIsLoading(true);
    try {
      await supabase.from('locations').insert(INITIAL_LOCATIONS);
      await supabase.from('employees').insert(INITIAL_EMPLOYEES.map(e => ({
        id: e.id, name: e.name, role: e.role, category: e.category, 
        default_location_id: e.defaultLocationId, preferred_hours: e.preferredHours, available_days: e.availableDays
      })));
      await supabase.from('shifts').insert(INITIAL_SHIFTS.map(s => ({
        id: s.id, name: s.name, color: s.color, start_time: s.startTime, end_time: s.endTime, hours: s.hours
      })));
      await fetchData();
      alert("Initial data uploaded to Cloud!");
    } catch (e: any) { setDbError("Error seeding: " + e.message); }
    finally { setIsLoading(false); }
  };

  const handleGenerateAI = async () => {
    if (!isAdmin) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newAssignments = await generateRotaWithAI(employees, shifts, locations, aiPrompt, currentWeekStart);
      setAssignments(prev => [...prev, ...newAssignments]);
      if (dbStatus === 'connected' && newAssignments.length > 0) {
        setIsSyncing(true);
        const { error } = await supabase.from('assignments').insert(newAssignments.map(a => ({
          id: a.id, date: a.date, employee_id: a.employeeId, shift_id: a.shiftId, location_id: a.locationId
        })));
        if (error) throw error;
      }
      setShowAiModal(false); setAiPrompt('');
    } catch (err: any) { setErrorMsg('Generation failed: ' + err.message); }
    finally { setIsGenerating(false); setIsSyncing(false); }
  };

  const changeWeek = (offset: number) => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (offset * 7));
      return next;
    });
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-[#3159a6]" size={40} />
        <p className="text-slate-500 font-medium">Connecting to Database...</p>
      </div>
    );
    switch (view) {
      case ViewMode.GRID:
        return (
          <RotaGrid 
            weekStart={currentWeekStart} employees={employees} shifts={shifts} locations={locations}
            assignments={assignments} onAssign={handleAssign} onRemove={handleRemoveAssignment}
            onUpdateLocation={handleUpdateAssignmentLocation} onClear={() => setShowClearModal(true)}
            readOnly={!isAdmin} searchTerm={searchTerm}
          />
        );
      case ViewMode.HOSPITAL_VIEW:
        return <HospitalView weekStart={currentWeekStart} locations={locations} assignments={assignments} employees={employees} shifts={shifts} />;
      case ViewMode.STATS:
        return isAdmin ? <StatsPanel state={{ employees, shifts, locations, assignments }} /> : null;
      case ViewMode.SETTINGS:
        return isAdmin ? (
          <SettingsPanel 
            employees={employees} shifts={shifts} locations={locations}
            onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onRemoveEmployee={handleRemoveEmployee}
            onAddShift={handleAddShift} onRemoveShift={handleRemoveShift}
            onAddLocation={handleAddLocation} onUpdateLocation={handleUpdateLocation} onRemoveLocation={handleRemoveLocation}
            onSeedData={handleSeedData} isDbEmpty={dbStatus === 'connected' && locations.length === 0}
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
      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-[60] bg-[#3159a6] text-white shadow-xl px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-xs font-bold">Cloud Syncing...</span>
        </div>
      )}

      {dbError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
           <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border-b-4 border-red-800 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                 <AlertTriangle size={20} className="shrink-0" />
                 <div className="flex flex-col">
                   <span className="text-sm font-bold uppercase tracking-wide">Sync Error</span>
                   <span className="text-xs opacity-90">{dbError}</span>
                 </div>
              </div>
              <button onClick={() => setDbError(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={18} /></button>
           </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-24 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <img src="https://bengalrehabilitationgroup.com/images/brg_logo.png" alt="BRG" className="h-14 w-auto object-contain" />
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-extrabold text-[#3159a6]">BRG Smart Rota</h1>
            <div className="flex items-center gap-2 mt-1">
               {dbStatus === 'connected' ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100"><CheckCircle2 size={10}/> Cloud Storage Active</span>
               ) : (
                  <button onClick={() => setShowSetupModal(true)} className="text-[10px] text-red-500 flex items-center gap-1 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse underline"><AlertTriangle size={10}/> Connection Issue - Help Needed</button>
               )}
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
               <>
                 <button onClick={() => setShowAiModal(true)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 transition-transform active:scale-95"><Sparkles size={16} /> AI Auto-Fill</button>
                 <button onClick={() => setIsAdmin(false)} className="text-slate-400 hover:text-red-500 p-2"><LogOut size={18} /></button>
               </>
            ) : (
              <button onClick={() => { const p = prompt("Admin Password:"); if(p==="admin") setIsAdmin(true); }} className="text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 flex items-center gap-2"><Lock size={16} /> Admin Login</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            <button onClick={() => setView(ViewMode.GRID)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${view === ViewMode.GRID ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-50'}`}><CalendarDays size={18} /> Schedule</button>
            <button onClick={() => setView(ViewMode.HOSPITAL_VIEW)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${view === ViewMode.HOSPITAL_VIEW ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Building2 size={18} /> Hospital View</button>
            {isAdmin && (
              <>
                <button onClick={() => setView(ViewMode.STATS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${view === ViewMode.STATS ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><BarChart3 size={18} /> Stats</button>
                <button onClick={() => setView(ViewMode.SETTINGS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${view === ViewMode.SETTINGS ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Settings size={18} /> Settings</button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex-1 md:w-48 relative">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="text" className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none" placeholder="Filter staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-slate-50 rounded text-slate-500"><ChevronLeft size={18} /></button>
                <span className="px-3 text-xs font-bold text-slate-700 min-w-[150px] text-center uppercase tracking-wider">{dateRangeStr}</span>
                <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-slate-50 rounded text-slate-500"><ChevronRight size={18} /></button>
              </div>
          </div>
        </div>
        {renderContent()}
      </main>

      {/* MODALS */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI Smart Schedule</h2>
            <textarea className="w-full h-32 p-3 border rounded-xl text-sm mb-4 bg-slate-50 outline-none" placeholder="Example: Bob is off on Wed. Ensure Charlie works at HO..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            {errorMsg && <p className="text-red-500 text-xs mb-4 font-bold">{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowAiModal(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button onClick={handleGenerateAI} disabled={isGenerating} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95">{isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative">
            <button onClick={() => setShowSetupModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
            
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
                    <AlertTriangle size={32} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">সঠিক Key ব্যবহার করুন!</h2>
                <p className="text-slate-500 font-medium">আপনার ডাটাবেস বা এপিআই কী-তে সমস্যা রয়েছে।</p>
            </div>

            <div className="space-y-6">
               <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-100">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3"><Key size={18}/> ১. সুপাবেস কী (Supabase Key):</h3>
                  <p className="text-sm text-slate-700">আপনি যে Key ব্যবহার করছেন তা সঠিক হতে হবে। সুপাবেস ড্যাশবোর্ডের <strong>API</strong> সেকশন থেকে <strong>anon public key</strong> টি কপি করে আপনার <code className="bg-amber-100 px-1 rounded">.env</code> ফাইলে দিন।</p>
               </div>

               <div className="p-5 bg-blue-50 rounded-2xl border-2 border-blue-100">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-3"><Sparkles size={18}/> ২. জেমিনি এপিআই কী (Gemini Key):</h3>
                  <p className="text-sm text-slate-700">জেমিনি এপিআই কী অবশ্যই <strong>AIza...</strong> দিয়ে শুরু হবে। এটি না থাকলে AI শিডিউল জেনারেট করতে পারবে না।</p>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
               <button onClick={() => fetchData()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <RefreshCw size={20}/> ডাটাবেস রিকানেক্ট করুন
               </button>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-600" size={24} /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Clear This Week?</h3>
                <input type="password" autoFocus className="w-full px-4 py-3 rounded-xl border border-slate-300 mb-4 outline-none" placeholder="Password (brrpl1234)" value={clearPassword} onChange={e => { setClearPassword(e.target.value); setClearError(''); }} />
                {clearError && <p className="text-red-500 text-xs mb-4 font-bold">{clearError}</p>}
                <div className="flex gap-3">
                    <button onClick={() => setShowClearModal(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Cancel</button>
                    <button onClick={async () => {
                        if (clearPassword !== 'brrpl1234') { setClearError('Incorrect password'); return; }
                        const weekDates = []; const d = new Date(currentWeekStart);
                        for(let i=0; i<7; i++) { weekDates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); }
                        setAssignments(prev => prev.filter(a => !weekDates.includes(a.date)));
                        if (dbStatus === 'connected') {
                          setIsSyncing(true);
                          await supabase.from('assignments').delete().in('date', weekDates);
                          setIsSyncing(false);
                        }
                        setShowClearModal(false); setClearPassword('');
                    }} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold">Clear All</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
