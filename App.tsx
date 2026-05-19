import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TripCard } from './components/TripCard';
import { ExpenseForm } from './components/ExpenseForm';
import { StatsView } from './components/StatsView';
import { Trip, Expense, ViewState, ExpenseCategory } from './types';
import { CATEGORY_COLORS } from './constants';
import { Plus, Trash2, PieChart, List, MapPin, Home, LayoutGrid, Mic, Plane, Pencil, Save, FileDown, Share2, ChevronDown } from 'lucide-react';
import { getTripAdvice } from './services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Image constants for easier management - Verified URLs
const IMAGES = {
  // Aereo alto nel cielo con scia bianca ben definita
  HOME_PLANE: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2000&auto=format&fit=crop",
  // Grande Muraglia Cinese
  GREAT_WALL: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2070&auto=format&fit=crop",
  // Piramidi di Giza
  PYRAMIDS: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=2070&auto=format&fit=crop",
  // Torre Eiffel
  EIFFEL: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?q=80&w=2001&auto=format&fit=crop",
  // Taj Mahal
  TAJ_MAHAL: "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=2070&auto=format&fit=crop"
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>({ type: 'HOME' });
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  // New Trip Form State
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripBudget, setNewTripBudget] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('€');
  const [newTripStartDate, setNewTripStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Trip Form State
  const [editTripName, setEditTripName] = useState('');
  const [editTripDestination, setEditTripDestination] = useState('');
  const [editTripBudget, setEditTripBudget] = useState('');
  const [editTripCurrency, setEditTripCurrency] = useState('€');
  const [editTripStartDate, setEditTripStartDate] = useState('');
  
  // AI Advice State
  const [advice, setAdvice] = useState<string | null>(null);

  // Confirmation Modal State
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('trips', JSON.stringify(trips));
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [trips, expenses]);

  // Get most recent or active trip
  const activeTrip = trips.length > 0 ? trips[0] : undefined;

  const createTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const trip: Trip = {
      id: crypto.randomUUID(),
      name: newTripName,
      destination: newTripDestination,
      budget: parseFloat(newTripBudget),
      currencyCode: newTripCurrency,
      startDate: newTripStartDate,
      endDate: '',
    };
    setTrips([trip, ...trips]);
    setNewTripName('');
    setNewTripDestination('');
    setNewTripBudget('');
    setNewTripCurrency('€');
    setNewTripStartDate(new Date().toISOString().split('T')[0]);
    setView({ type: 'HOME' });
  };

  const startEditTrip = (trip: Trip) => {
    setEditTripName(trip.name);
    setEditTripDestination(trip.destination);
    setEditTripBudget(trip.budget.toString());
    setEditTripCurrency(trip.currencyCode);
    setEditTripStartDate(trip.startDate);
    setView({ type: 'EDIT_TRIP', tripId: trip.id });
  };

  const updateTrip = (e: React.FormEvent, tripId: string) => {
    e.preventDefault();
    setTrips(trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          name: editTripName,
          destination: editTripDestination,
          budget: parseFloat(editTripBudget),
          currencyCode: editTripCurrency,
          startDate: editTripStartDate
        };
      }
      return t;
    }));
    setView({ type: 'TRIP_DETAIL', tripId });
  };

  const addExpense = (tripId: string, data: Omit<Expense, 'id' | 'tripId' | 'timestamp'>) => {
    const expense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      tripId,
      timestamp: Date.now(),
    };
    setExpenses([expense, ...expenses]);
    setView({ type: 'TRIP_DETAIL', tripId });
  };

  const deleteExpense = (id: string) => {
    setExpenseToDelete(id);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    setExpenses(expenses.filter(e => e.id !== expenseToDelete));
    setExpenseToDelete(null);
  };

  const deleteTrip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setTripToDelete(id);
  }

  const confirmDeleteTrip = () => {
    if (!tripToDelete) return;
    
    const updatedTrips = trips.filter(t => t.id !== tripToDelete);
    setTrips(updatedTrips);
    setExpenses(prev => prev.filter(e => e.tripId === tripToDelete ? false : true));
    
    setTripToDelete(null);
    setView({ type: 'HOME' });
  };

  const getTripTotal = (tripId: string) => {
    return expenses.filter(e => e.tripId === tripId).reduce((sum, e) => sum + e.amount, 0);
  };

  const loadAdvice = async (trip: Trip) => {
    const spent = getTripTotal(trip.id);
    setAdvice("Sto chiedendo all'AI...");
    const tip = await getTripAdvice(trip.destination, trip.budget, spent);
    setAdvice(tip);
  };

  // --- PDF EXPORT FUNCTION ---
  const handleExportPDF = (trip: Trip, tripExpenses: Expense[]) => {
    try {
      const doc = new jsPDF();
      const totalSpent = getTripTotal(trip.id);
      const remaining = trip.budget - totalSpent;

      // Header
      doc.setFontSize(22);
      doc.text("TravelBudget AI - Report", 14, 20);
      
      doc.setFontSize(16);
      doc.setTextColor(100);
      doc.text(`${trip.name}`, 14, 30);
      doc.setFontSize(10);
      doc.text(`${trip.destination} • Dal ${new Date(trip.startDate).toLocaleDateString()}`, 14, 36);

      // Financial Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(245, 247, 250);
      doc.rect(14, 45, 182, 25, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("BUDGET TOTALE", 20, 52);
      doc.text("SPESO", 90, 52);
      doc.text("RIMANENTE", 160, 52);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`${trip.budget} ${trip.currencyCode}`, 20, 60);
      doc.text(`${totalSpent.toFixed(2)} ${trip.currencyCode}`, 90, 60);
      
      doc.setTextColor(remaining < 0 ? 200 : 0, remaining < 0 ? 0 : 150, 0); // Green or Red
      doc.text(`${remaining.toFixed(2)} ${trip.currencyCode}`, 160, 60);

      // Reset Text Color
      doc.setTextColor(0);

      // Table
      const tableColumn = ["Data", "Categoria", "Descrizione", "Importo"];
      const tableRows: any[] = [];

      tripExpenses.forEach(expense => {
        const expenseData = [
          new Date(expense.date).toLocaleDateString('it-IT'),
          expense.category,
          expense.description,
          `${expense.amount.toFixed(2)} ${trip.currencyCode}`,
        ];
        tableRows.push(expenseData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] }, // primary color
        styles: { fontSize: 10 },
      });

      doc.save(`${trip.name.replace(/\s+/g, '_')}_Report.pdf`);
    } catch (error) {
      console.error("PDF Export Error", error);
      alert("Si è verificato un errore durante la generazione del PDF.");
    }
  };

  // --- SHARE FUNCTION ---
  const handleShare = async (trip: Trip, tripExpenses: Expense[]) => {
    const totalSpent = getTripTotal(trip.id);
    const text = `✈️ TravelBudget AI: Report Viaggio\n\n` +
      `📍 ${trip.name} (${trip.destination})\n` +
      `💰 Budget: ${trip.budget} ${trip.currencyCode}\n` +
      `💸 Speso: ${totalSpent.toFixed(2)} ${trip.currencyCode}\n` +
      `🔢 Movimenti: ${tripExpenses.length}\n\n` +
      `Gestito con TravelBudget AI`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Report Viaggio: ${trip.name}`,
          text: text,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(text);
      alert("Dettagli copiati negli appunti!");
    }
  };


  // Logic to handle Mic Click intelligently
  const handleMicClick = () => {
    let targetTripId: string | undefined = undefined;

    if ((view.type === 'TRIP_DETAIL' || view.type === 'STATS') && view.tripId) {
      targetTripId = view.tripId;
    } else if (activeTrip) {
      targetTripId = activeTrip.id;
    }

    if (targetTripId) {
      setView({ type: 'ADD_EXPENSE', tripId: targetTripId, mode: 'ai' });
    } else {
      alert("Devi prima creare un viaggio per aggiungere delle spese!");
      setView({ type: 'CREATE_TRIP' });
    }
  };

  // Determine background image based on view type
  const getBackgroundImage = () => {
    switch (view.type) {
      case 'HOME':
        return IMAGES.HOME_PLANE;
      case 'TRIP_LIST':
        return IMAGES.GREAT_WALL; // List -> Great Wall
      case 'CREATE_TRIP':
      case 'EDIT_TRIP':
        return IMAGES.PYRAMIDS; // New/Edit -> Pyramids
      case 'CATEGORIES':
        return IMAGES.TAJ_MAHAL; // Categories -> Taj Mahal
      case 'TRIP_DETAIL':
      case 'STATS':
      case 'ADD_EXPENSE':
        return IMAGES.EIFFEL; // Detail/Action -> Eiffel Tower
      default:
        return IMAGES.HOME_PLANE;
    }
  };

  return (
    <>
      {/* Global Background Container */}
      <div className="fixed inset-0 z-[-1] overflow-hidden bg-surface">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black/40" />
      </div>

      {/* Main Content Layer */}
      <div className="relative z-0 min-h-screen text-slate-100">
        
        {/* 1. HOME DASHBOARD */}
        {view.type === 'HOME' && (() => {
          const totalBudget = trips.reduce((sum, t) => sum + t.budget, 0);
          const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
          const totalRemaining = totalBudget - totalSpent;
          const activeTripsCount = trips.length;

          return (
            <div className="min-h-screen bg-transparent pb-20">
              {/* Header - Styled like the image */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#d946ef] px-6 pt-12 pb-8 shadow-2xl">
                {/* Decorative background elements */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
                
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-[10px] tracking-[0.2em] uppercase mb-1">TravelBudget AI</p>
                    <h1 className="text-3xl text-white tracking-tight font-cartoon">I tuoi Viaggi</h1>
                    <p className="text-white/70 text-sm mt-1 font-medium">{activeTripsCount} viaggi attivi</p>
                  </div>

                  {/* Airplane Image */}
                  <div className="relative w-24 h-24 -mr-4 -mt-4">
                    <img 
                      src="https://img.icons8.com/3d-fluency/188/airplane-front-view.png" 
                      alt="Airplane" 
                      className="w-full h-full object-contain drop-shadow-2xl animate-fly-slow"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Summary Box */}
                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-xl flex justify-between items-center text-center">
                  <div className="flex-1 border-r border-white/10">
                    <p className="text-[#39ff14] text-sm">€{totalBudget.toLocaleString()}</p>
                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-1">Budget totale</p>
                  </div>
                  <div className="flex-1 border-r border-white/10">
                    <p className="text-[#ff6600] text-sm">€{totalSpent.toLocaleString()}</p>
                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-1">Speso</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#39ff14] text-sm">€{totalRemaining.toLocaleString()}</p>
                    <p className="text-white/60 text-[10px] uppercase tracking-wider mt-1">Rimanente</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8">
              {/* Quick Voice Add */}
              <div className="text-center">
                 <p className="text-purple-200 mb-4 text-sm drop-shadow-sm bg-white/5 inline-block px-3 py-1 rounded-full backdrop-blur-sm">Tocca il microfono per aggiungere una spesa</p>
                 <button 
                   onClick={handleMicClick}
                   className="w-20 h-20 bg-gradient-to-tr from-primary to-secondary rounded-full shadow-xl shadow-purple-500/20 flex items-center justify-center mx-auto active:scale-90 transition-transform ring-4 ring-white/10"
                 >
                   <Mic size={32} className="text-white" />
                 </button>
              </div>

              {/* Current Trip Summary */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg text-white drop-shadow-sm font-cartoon">Viaggio Attuale</h2>
                  <button onClick={() => setView({ type: 'TRIP_LIST' })} className="text-primary text-sm bg-white/5 px-2 py-1 rounded-lg">Vedi tutti</button>
                </div>
                
                {activeTrip ? (
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-[0_4px_12px_rgba(168,85,247,0.1)]">
                    <TripCard 
                      trip={activeTrip} 
                      totalSpent={getTripTotal(activeTrip.id)}
                      onClick={() => setView({ type: 'TRIP_DETAIL', tripId: activeTrip.id })}
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => setView({ type: 'CREATE_TRIP' })}
                    className="w-full bg-gradient-to-tr from-primary to-secondary rounded-2xl p-6 text-white shadow-xl shadow-purple-500/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-white/10"
                  >
                    <Plus size={32} className="text-white" />
                    <span className="text-lg">Crea il tuo primo viaggio</span>
                  </button>
                )}
              </div>

              {/* Navigation Grid */}
              <div>
                <h2 className="text-lg text-white mb-3 drop-shadow-sm font-cartoon">Esplora</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                     onClick={() => setView({ type: 'CREATE_TRIP' })}
                     className="bg-card/60 backdrop-blur-md p-4 rounded-2xl shadow-[0_4px_0_0_rgba(255,255,255,0.1)] active:shadow-none active:translate-y-[4px] border border-white/10 flex flex-col items-center gap-2 transition-all"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                      <Plus size={24} />
                    </div>
                    <span className="text-slate-200">Nuovo Viaggio</span>
                  </button>

                  <button 
                    onClick={() => setView({ type: 'TRIP_LIST' })}
                    className="bg-card/60 backdrop-blur-md p-4 rounded-2xl shadow-[0_4px_0_0_rgba(255,255,255,0.1)] active:shadow-none active:translate-y-[4px] border border-white/10 flex flex-col items-center gap-2 transition-all"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                      <List size={24} />
                    </div>
                    <span className="text-slate-200">Lista Viaggi</span>
                  </button>

                  <button 
                    onClick={() => setView({ type: 'CATEGORIES', tripId: activeTrip?.id })}
                    className="bg-card/60 backdrop-blur-md p-4 rounded-2xl shadow-[0_4px_0_0_rgba(255,255,255,0.1)] active:shadow-none active:translate-y-[4px] border border-white/10 flex flex-col items-center gap-2 transition-all"
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                      <LayoutGrid size={24} />
                    </div>
                    <span className="text-slate-200">Categorie</span>
                  </button>

                  <button 
                    onClick={() => activeTrip && setView({ type: 'STATS', tripId: activeTrip.id })}
                    className={`bg-card/60 backdrop-blur-md p-4 rounded-2xl shadow-[0_4px_0_0_rgba(255,255,255,0.1)] active:shadow-none active:translate-y-[4px] border border-white/10 flex flex-col items-center gap-2 transition-all ${!activeTrip ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                      <PieChart size={24} />
                    </div>
                    <span className="text-slate-200">Statistiche</span>
                  </button>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

        {/* 2. TRIP LIST */}
        {view.type === 'TRIP_LIST' && (
          <div className="min-h-screen bg-transparent pb-20">
            <Header title="I miei Viaggi" onBack={() => setView({ type: 'HOME' })} onAdd={() => setView({ type: 'CREATE_TRIP' })} />
            <div className="p-4">
              {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 bg-card/40 rounded-3xl backdrop-blur-sm m-4 border border-white/5">
                  <MapPin size={48} className="mb-4 opacity-50" />
                  <p className="font-medium">Nessun viaggio ancora.</p>
                </div>
              ) : (
                trips.map(trip => (
                  <div key={trip.id} className="bg-card/80 backdrop-blur-sm rounded-2xl mb-4 border border-white/5 shadow-lg">
                    <TripCard 
                      trip={trip} 
                      totalSpent={getTripTotal(trip.id)}
                      onClick={() => setView({ type: 'TRIP_DETAIL', tripId: trip.id })}
                      onDelete={(e) => deleteTrip(e, trip.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. CATEGORIES VIEW */}
        {view.type === 'CATEGORIES' && (
          <div className="min-h-screen bg-transparent pb-20">
            {/* Render logic helper */}
            {(() => {
              const targetTrip = trips.find(t => t.id === view.tripId) || trips[0];
              const tripSpecificExpenses = targetTrip ? expenses.filter(e => e.tripId === targetTrip.id) : [];

              // Calculate category totals
              const categoryTotals: Record<string, number> = {};
              tripSpecificExpenses.forEach(e => {
                categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
              });
              
              const maxVal = Math.max(...Object.values(categoryTotals), 1);

              return (
                <>
                  <Header title="Categorie Spesa" onBack={() => setView({ type: 'HOME' })} />
                  
                  {!targetTrip ? (
                     <div className="p-10 text-center text-slate-400 font-medium bg-card/60 m-4 rounded-2xl border border-white/5">Crea prima un viaggio.</div>
                  ) : (
                    <div className="p-4 space-y-4">
                      <div className="bg-card/80 backdrop-blur-md p-4 rounded-xl border border-white/10 mb-4 shadow-sm">
                        <label className="block text-xs text-purple-300 uppercase mb-2">Seleziona Viaggio</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-primary transition-colors"
                            value={targetTrip.id}
                            onChange={(e) => setView({ type: 'CATEGORIES', tripId: e.target.value })}
                          >
                            {trips.map(t => (
                              <option key={t.id} value={t.id} className="bg-surface">{t.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-300">
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Object.values(ExpenseCategory).map(cat => {
                          const amount = categoryTotals[cat] || 0;
                          const percent = (amount / maxVal) * 100;
                          return (
                            <div key={cat} className="bg-card/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/10 flex items-center gap-4">
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-xl border border-white/5"
                                style={{ backgroundColor: `${CATEGORY_COLORS[cat]}22`, color: CATEGORY_COLORS[cat] }}
                              >
                                {cat.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className="text-slate-200">{cat}</span>
                                  <span style={{ color: CATEGORY_COLORS[cat] }}>{amount.toFixed(2)} {targetTrip.currencyCode}</span>
                                </div>
                                <div className="h-2 bg-surface rounded-full overflow-hidden">
                                   <div 
                                     className="h-full rounded-full transition-all duration-500" 
                                     style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                                   ></div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* 4. CREATE TRIP */}
        {view.type === 'CREATE_TRIP' && (
          <div className="min-h-screen bg-transparent">
            <Header title="Nuovo Viaggio" onBack={() => setView({ type: 'HOME' })} />
            <form onSubmit={createTrip} className="p-6 space-y-6 bg-card/70 backdrop-blur-md min-h-[calc(100vh-64px)]">
              <div>
                <label className="block text-sm text-purple-300 mb-1">Nome Viaggio</label>
                <input 
                  className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 text-lg outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                  placeholder="Es: Estate in Puglia"
                  value={newTripName}
                  onChange={e => setNewTripName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-purple-300 mb-1">Destinazione</label>
                <input 
                  className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                  placeholder="Città o Paese"
                  value={newTripDestination}
                  onChange={e => setNewTripDestination(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-purple-300 mb-1">Budget Totale</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    className="flex-1 bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                    placeholder="1000"
                    value={newTripBudget}
                    onChange={e => setNewTripBudget(e.target.value)}
                    required
                  />
                  <select 
                    className="w-24 bg-surface/90 border border-white/10 rounded-xl px-2 py-3 outline-none focus:border-primary shadow-sm font-bold text-white"
                    value={newTripCurrency}
                    onChange={e => setNewTripCurrency(e.target.value)}
                  >
                    <option value="€" className="bg-surface">€ (EUR)</option>
                    <option value="$" className="bg-surface">$ (USD)</option>
                    <option value="£" className="bg-surface">£ (GBP)</option>
                    <option value="¥" className="bg-surface">¥ (JPY)</option>
                    <option value="CHF" className="bg-surface">CHF</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-purple-300 mb-1">Data di Inizio</label>
                <input 
                  type="date"
                  className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white"
                  value={newTripStartDate}
                  onChange={e => setNewTripStartDate(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-green-500 text-white py-4 rounded-xl shadow-lg shadow-green-900/20 active:scale-95 transition-transform hover:bg-green-600 mt-8 border border-white/10"
              >
                Crea Viaggio
              </button>
            </form>
          </div>
        )}

        {/* 5. EDIT TRIP */}
        {view.type === 'EDIT_TRIP' && (() => {
           const tripId = view.tripId;
           return (
            <div className="min-h-screen bg-transparent">
              <Header title="Modifica Viaggio" onBack={() => setView({ type: 'TRIP_DETAIL', tripId })} />
              <form onSubmit={(e) => updateTrip(e, tripId)} className="p-6 space-y-6 bg-card/70 backdrop-blur-md min-h-[calc(100vh-64px)]">
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Nome Viaggio</label>
                  <input 
                    className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 text-lg outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                    value={editTripName}
                    onChange={e => setEditTripName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Destinazione</label>
                  <input 
                    className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                    value={editTripDestination}
                    onChange={e => setEditTripDestination(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Budget Totale</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      className="flex-1 bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white placeholder-slate-500"
                      value={editTripBudget}
                      onChange={e => setEditTripBudget(e.target.value)}
                      required
                    />
                    <select 
                      className="w-24 bg-surface/90 border border-white/10 rounded-xl px-2 py-3 outline-none focus:border-primary shadow-sm font-bold text-white"
                      value={editTripCurrency}
                      onChange={e => setEditTripCurrency(e.target.value)}
                    >
                      <option value="€" className="bg-surface">€ (EUR)</option>
                      <option value="$" className="bg-surface">$ (USD)</option>
                      <option value="£" className="bg-surface">£ (GBP)</option>
                      <option value="¥" className="bg-surface">¥ (JPY)</option>
                      <option value="CHF" className="bg-surface">CHF</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Data di Inizio</label>
                  <input 
                    type="date"
                    className="w-full bg-surface/90 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm font-medium text-white"
                    value={editTripStartDate}
                    onChange={e => setEditTripStartDate(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-500 text-white py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform hover:bg-blue-600 mt-8 flex items-center justify-center gap-2 border border-white/10"
                >
                  <Save size={20} /> Salva Modifiche
                </button>
              </form>
            </div>
           );
        })()}

        {/* 6. ADD EXPENSE */}
        {view.type === 'ADD_EXPENSE' && (() => {
          const trip = trips.find(t => t.id === view.tripId);
          if (!trip) return null;
          return (
            <ExpenseForm 
              trip={trip} 
              initialMode={view.mode}
              onSubmit={(data) => addExpense(trip.id, data)}
              onCancel={() => setView({ type: 'TRIP_DETAIL', tripId: trip.id })}
            />
          );
        })()}

        {/* 7. DETAIL & STATS */}
        {(view.type === 'TRIP_DETAIL' || view.type === 'STATS') && (() => {
          const currentTripDetail = trips.find(t => t.id === view.tripId);
          // Safe handling if trip is deleted or not found
          if (!currentTripDetail) {
              return (
                  <div className="min-h-screen flex items-center justify-center bg-white/80 backdrop-blur-md">
                      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
                          <p className="text-gray-500 mb-4">Viaggio non trovato.</p>
                          <button 
                              onClick={() => setView({type: 'HOME'})}
                              className="bg-primary text-white px-6 py-2 rounded-full"
                          >
                              Torna alla Home
                          </button>
                      </div>
                  </div>
              );
          }
          
          // Use a different variable name to avoid shadowing confusion
          const tripDetail = currentTripDetail;
          const tripExpenses = expenses.filter(e => e.tripId === tripDetail.id).sort((a, b) => b.timestamp - a.timestamp);

          return (
            <div className="min-h-screen bg-transparent pb-24">
              <Header 
                title={tripDetail.name} 
                onBack={() => setView({ type: 'HOME' })}
                customActions={
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleShare(tripDetail, tripExpenses)}
                      className="p-2 rounded-full hover:bg-white/10 bg-white/5 text-slate-200 active:scale-95 transition-transform"
                      title="Condividi"
                    >
                       <Share2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleExportPDF(tripDetail, tripExpenses)}
                      className="p-2 rounded-full hover:bg-white/10 bg-white/5 text-slate-200 active:scale-95 transition-transform"
                      title="Esporta PDF"
                    >
                       <FileDown size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button 
                      onClick={() => startEditTrip(tripDetail)} 
                      className="p-2 rounded-full hover:bg-white/10 bg-white/5 text-slate-200 active:scale-95 transition-transform"
                      title="Modifica"
                    >
                       <Pencil size={20} />
                    </button>
                    <button 
                      onClick={(e) => deleteTrip(e, tripDetail.id)} 
                      className="p-2 rounded-full hover:bg-white/10 bg-white/5 text-slate-400 active:scale-95 transition-transform"
                      title="Elimina"
                    >
                       <Trash2 size={20} />
                    </button>
                  </div>
                }
              />

              {view.type === 'STATS' ? (
                <div className="bg-card/60 backdrop-blur-sm min-h-full">
                  <StatsView 
                    trip={tripDetail} 
                    expenses={tripExpenses} 
                    trips={trips}
                    onTripChange={(id) => setView({ type: 'STATS', tripId: id })}
                  />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Advice Banner */}
                  <div className="bg-gradient-to-r from-primary/80 to-secondary/80 backdrop-blur-sm rounded-2xl p-4 text-white shadow-lg relative overflow-hidden border border-white/20">
                     <div className="relative z-10">
                       <h3 className="text-sm opacity-90 flex items-center gap-2">
                         <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/> AI Assistant
                       </h3>
                       <p className="mt-1 text-sm font-medium leading-snug">
                         {advice || `Tocca qui per un consiglio sul budget per ${tripDetail.destination}.`}
                       </p>
                       {!advice && (
                         <button 
                          onClick={() => loadAdvice(tripDetail)}
                          className="mt-2 bg-white/20 text-xs py-1 px-3 rounded-full hover:bg-white/30 transition-colors font-semibold"
                         >
                           Chiedi consiglio
                         </button>
                       )}
                     </div>
                  </div>

                  {/* Summary Header */}
                  <div className="flex justify-between items-end px-2">
                    <h2 className="text-lg text-white bg-white/5 px-2 rounded-lg backdrop-blur-sm">Spese Recenti</h2>
                    <span className="text-sm text-slate-400 bg-white/5 px-2 rounded-lg backdrop-blur-sm font-medium">{tripExpenses.length} movimenti</span>
                  </div>

                  {/* Expense List */}
                  <div className="space-y-3">
                    {tripExpenses.map(expense => (
                      <div key={expense.id} className="bg-card/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/10 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg border border-white/5"
                            style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}22`, color: CATEGORY_COLORS[expense.category] }}
                          >
                             {expense.category.charAt(0)}
                          </div>
                          <div>
                            <p className="text-slate-100">{expense.description}</p>
                            <p className="text-xs text-slate-400 flex gap-2 font-medium">
                              <span>{new Date(expense.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short'})}</span>
                              <span>•</span>
                              <span style={{ color: CATEGORY_COLORS[expense.category] }}>{expense.category}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-slate-100">-{expense.amount} {tripDetail.currencyCode}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Importo</p>
                          </div>
                          <button 
                            onClick={() => deleteExpense(expense.id)}
                            className="p-2 bg-white/5 text-slate-400 rounded-full active:scale-90 transition-transform hover:bg-white/10"
                            title="Elimina spesa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {tripExpenses.length === 0 && (
                      <div className="text-center py-10 text-slate-400 bg-card/60 backdrop-blur-md rounded-xl border border-dashed border-white/10 font-medium">
                        Nessuna spesa. <br/> Inizia a spendere!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Action Button for Add */}
              <button 
                onClick={() => setView({ type: 'ADD_EXPENSE', tripId: tripDetail.id })}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/20 flex items-center justify-center active:scale-90 transition-transform z-20 border-4 border-white/10"
              >
                <Plus size={32} />
              </button>

              {/* Bottom Nav */}
              <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-white/5 h-20 pb-4 flex justify-around items-center z-10">
                <button 
                  onClick={() => setView({ type: 'HOME' })}
                  className={`flex flex-col items-center p-2 text-slate-500 hover:text-slate-300`}
                >
                  <Home size={24} />
                  <span className="text-[10px] mt-1">Home</span>
                </button>
                <button 
                  onClick={() => setView({ type: 'TRIP_DETAIL', tripId: tripDetail.id })}
                  className={`flex flex-col items-center p-2 ${view.type === 'TRIP_DETAIL' ? 'text-primary' : 'text-slate-500'}`}
                >
                  <List size={24} />
                  <span className="text-[10px] mt-1">Lista</span>
                </button>
                <button 
                  onClick={() => setView({ type: 'STATS', tripId: tripDetail.id })}
                  className={`flex flex-col items-center p-2 ${view.type === 'STATS' ? 'text-primary' : 'text-gray-400'}`}
                >
                  <PieChart size={24} />
                  <span className="text-[10px] mt-1">Statistiche</span>
                </button>
              </div>
            </div>
          );
        })()}
        {/* Custom Confirmation Modal */}
        {tripToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/10">
              <h3 className="text-xl text-white mb-2 font-cartoon">Elimina Viaggio?</h3>
              <p className="text-slate-400 mb-6">Sei sicuro di voler eliminare definitivamente questo viaggio e tutte le sue spese? L'azione non è reversibile.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTripToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-slate-300 active:scale-95 transition-transform"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmDeleteTrip}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white active:scale-95 transition-transform shadow-lg shadow-red-900/20"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expense Confirmation Modal */}
        {expenseToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/10">
              <h3 className="text-xl text-white mb-2 font-cartoon">Elimina Spesa?</h3>
              <p className="text-slate-400 mb-6">Sei sicuro di voler eliminare questa spesa? L'azione non è reversibile.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setExpenseToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-slate-300 active:scale-95 transition-transform"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmDeleteExpense}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white active:scale-95 transition-transform shadow-lg shadow-red-900/20"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;