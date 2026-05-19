import React, { useState, useEffect, useRef } from 'react';
import { ExpenseCategory, Trip } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { parseExpenseWithAI } from '../services/geminiService';
import { Loader2, Sparkles, Mic, MicOff, ChevronDown, ChevronUp } from 'lucide-react';

interface ExpenseFormProps {
  trip: Trip;
  initialMode?: 'manual' | 'ai';
  onSubmit: (expense: any) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ trip, initialMode = 'manual', onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  
  // Toggle to show/hide manual form. 
  // If AI mode, start hidden so user focuses on AI input.
  const [showManualForm, setShowManualForm] = useState(initialMode === 'manual');
  
  const recognitionRef = useRef<any>(null);

  // Auto-focus or scroll to AI section if initialMode is 'ai'
  useEffect(() => {
    if (initialMode === 'ai') {
      const input = document.getElementById('ai-input');
      input?.focus();
      
      // Auto-start listening might be blocked by browser. 
      // We try once, but provide manual button as fallback.
      const timer = setTimeout(() => {
        startListening(true); // silent failure for auto-start
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialMode]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
    };
  }, []);

  const startListening = (isAutoStart = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      if (!isAutoStart) setMicError("Browser non supportato");
      return;
    }

    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      setMicError(null);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      setInterimText('');
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      
      if (isAutoStart && event.error === 'not-allowed') {
          // Normal if browser blocks auto-start. We don't set an error message
          // so it doesn't look like a failure to the user until they click.
          return;
      }
      
      if (event.error === 'not-allowed') {
        setMicError("Permesso negato. Controlla le impostazioni del browser e riprova cliccando qui.");
      } else if (event.error === 'network') {
        setMicError("Errore di rete. Verifica la connessione.");
      } else if (event.error === 'no-speech') {
        setMicError("Nessun parlato rilevato.");
      } else {
        setMicError(`Errore microfono: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setAiInput(prev => {
          const trimmedPrev = (prev || '').trim();
          return trimmedPrev ? `${trimmedPrev} ${final.trim()}` : final.trim();
        });
      }
      
      setInterimText(interim);
      // Reset error if we got results
      if (interim || final) setMicError(null);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting recognition", e);
    }
  };

  const toggleListening = () => {
    setMicError(null);
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      startListening();
    }
  };

  const handleAIAnalysis = async () => {
    if (!aiInput.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await parseExpenseWithAI(aiInput);
      
      if (result) {
        setDescription(result.description);
        if (result.amount > 0) setAmount(result.amount.toString());
        if (Object.values(ExpenseCategory).includes(result.category as ExpenseCategory)) {
          setCategory(result.category as ExpenseCategory);
        }
        // Reveal the form populated with data
        setShowManualForm(true);
      } else {
        setAnalysisError("Non sono riuscito a capire la spesa. Riprova con una frase più semplice (es. 'Cena 20 euro').");
      }
    } catch (e: any) {
      setAnalysisError(e.message || "Errore durante l'analisi. Riprova tra un istante.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onSubmit({
      description,
      amount: parseFloat(amount),
      category,
      date,
    });
  };

  return (
    <div className="fixed inset-0 bg-surface z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
      <div className="px-4 py-4 border-b border-white/5 flex justify-between items-center bg-card shadow-lg z-10">
        <button onClick={onCancel} className="text-slate-400 font-medium">Annulla</button>
        <h2 className="text-lg text-white font-cartoon">{initialMode === 'ai' && !showManualForm ? 'Assistente AI' : 'Nuova Spesa'}</h2>
        <button 
          onClick={handleSubmit}
          disabled={!description || !amount}
          className={`text-primary font-medium disabled:opacity-50 transition-all ${!showManualForm ? 'opacity-0' : 'opacity-100'}`}
        >
          Salva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface">
        
        {/* AI Quick Add Section - Prominent */}
        <div className={`p-6 transition-all duration-500 ${initialMode === 'ai' && !showManualForm ? 'min-h-[60vh] flex flex-col justify-center bg-primary/20' : 'bg-card mb-4 border-b border-white/5'}`}>
          <div className={`flex items-center gap-2 mb-4 font-semibold ${initialMode === 'ai' && !showManualForm ? 'text-white text-xl justify-center' : 'text-primary'}`}>
            <Sparkles size={initialMode === 'ai' && !showManualForm ? 24 : 20} />
            <span>{initialMode === 'ai' && !showManualForm ? 'Descrivi la tua spesa' : 'Inserimento Rapido / Vocale'}</span>
          </div>
          
          <div className="flex flex-col gap-4 relative">
            <div className="relative">
              <textarea
                id="ai-input"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={initialMode === 'ai' && !showManualForm ? "Es: 'Pranzo al mare 45 euro' o 'Benzina 30 euro'..." : "Usa il microfono o scrivi..."}
                className={`w-full border-transparent focus:border-primary/50 rounded-2xl px-4 py-4 shadow-inner outline-none ring-0 transition-all text-white pr-12 ${
                  initialMode === 'ai' && !showManualForm 
                    ? 'bg-white/10 text-lg min-h-[150px] placeholder:text-slate-500' 
                    : 'bg-white/5 text-sm min-h-[80px]'
                }`}
              />
              {/* Microphone Toggle Button inside textarea */}
              <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
                {micError && (
                  <button 
                    type="button"
                    onClick={() => { setMicError(null); startListening(); }}
                    className="text-[10px] text-red-100 bg-red-600 px-2 py-1 rounded max-w-[200px] text-right shadow-lg backdrop-blur-md animate-in fade-in"
                  >
                    {micError} <span className="underline ml-1">Riprova</span>
                  </button>
                )}
                
                {isListening && !interimText && (
                  <div className="flex gap-1 items-center mb-1 mr-1">
                    <div className="w-1 h-3 bg-green-400/50 animate-[bounce_0.6s_infinite] rounded-full"></div>
                    <div className="w-1 h-5 bg-green-400 animate-[bounce_0.8s_infinite] rounded-full"></div>
                    <div className="w-1 h-3 bg-green-400/50 animate-[bounce_0.6s_infinite_0.1s] rounded-full"></div>
                    <span className="text-[10px] text-green-400 font-medium ml-1">Parla ora...</span>
                  </div>
                )}
                
                {interimText && (
                   <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg mb-1 border border-white/10 animate-in slide-in-from-right-2">
                     <span className="text-[10px] text-white/90 italic truncate max-w-[150px] block">"{interimText}"</span>
                   </div>
                )}

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 rounded-full transition-all relative ${
                    isListening 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' 
                      : micError 
                        ? 'bg-red-500/20 text-red-100 hover:bg-red-500/40'
                        : 'bg-white/10 text-slate-400 hover:bg-primary/20 hover:text-primary'
                  }`}
                  title="Attiva/Disattiva microfono"
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25"></span>
                  )}
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>

            {isListening && !aiInput && !interimText && (
              <p className="text-xs text-white/40 text-center animate-pulse">
                Dì qualcosa come: "Cena a Trastevere 40 euro"
              </p>
            )}

            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || !aiInput}
              className={`w-full py-4 rounded-xl flex items-center justify-center font-bold gap-2 disabled:opacity-50 transition-colors shadow-lg ${
                initialMode === 'ai' && !showManualForm
                  ? 'bg-primary text-white hover:bg-primary/80 text-lg' 
                  : 'bg-primary text-white hover:bg-primary/80'
              }`}
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
              {isAnalyzing ? 'Analisi in corso...' : 'Analizza Testo'}
            </button>

            {analysisError && (
              <p className="text-red-400 text-center text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {analysisError}
              </p>
            )}
          </div>
          
          {initialMode === 'ai' && !showManualForm && (
             <button 
               onClick={() => setShowManualForm(true)}
               className="mt-8 text-white/70 text-sm underline decoration-white/50 underline-offset-4 hover:text-white w-full text-center"
             >
               Compila manualmente
             </button>
          )}
        </div>

        {/* Manual Form */}
        {showManualForm && (
          <form id="expense-form" onSubmit={handleSubmit} className="p-6 space-y-6 bg-card rounded-t-3xl -mt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] relative animate-in slide-in-from-bottom-4 border-t border-white/5">
            <div className="flex justify-center mb-2">
                <div className="w-12 h-1.5 bg-white/10 rounded-full"></div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Importo ({trip.currencyCode})</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-4xl text-white border-b-2 border-white/5 focus:border-primary outline-none py-2 bg-transparent placeholder-white/10 transition-colors"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Descrizione</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-white"
                placeholder="Es: Biglietti museo"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(ExpenseCategory).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                      category === cat
                        ? 'text-white border-transparent shadow-md scale-[1.02]'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                    style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat], boxShadow: `0 4px 12px ${CATEGORY_COLORS[cat]}4d` } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white"
              />
            </div>
            
            <div className="h-8"></div> {/* Spacer */}
          </form>
        )}
      </div>
    </div>
  );
};