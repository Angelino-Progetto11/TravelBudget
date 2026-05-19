import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Expense, Trip, ExpenseCategory } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { ChevronDown } from 'lucide-react';

interface StatsViewProps {
  trip: Trip;
  expenses: Expense[];
  trips: Trip[];
  onTripChange: (tripId: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ trip, expenses, trips, onTripChange }) => {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = trip.budget - totalSpent;

  const data = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Trip Selector */}
      <div className="bg-card p-4 rounded-2xl border border-white/5 shadow-lg">
        <label className="block text-xs text-slate-500 uppercase mb-2 ml-1">Analisi Viaggio</label>
        <div className="relative">
          <select 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-primary transition-colors cursor-pointer"
            value={trip.id}
            onChange={(e) => onTripChange(e.target.value)}
          >
            {trips.map(t => (
              <option key={t.id} value={t.id} className="bg-card text-white">{t.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={20} />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-lg border border-white/5 text-center">
        <p className="text-slate-500 text-sm uppercase tracking-wider">Budget Residuo</p>
        <h2 className={`text-4xl mt-2 font-cartoon ${remaining < 0 ? 'text-red-400' : 'text-primary'}`}>
          {remaining.toFixed(2)} <span className="text-xl text-slate-500">{trip.currencyCode}</span>
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          <div>
            <p className="text-xs text-slate-500">Budget Totale</p>
            <p className="text-slate-200">{trip.budget}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Speso</p>
            <p className="text-slate-200">{totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-lg border border-white/5">
        <h3 className="text-lg text-white mb-4 font-cartoon">Spese per Categoria</h3>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as ExpenseCategory] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1333', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value.toFixed(2)} ${trip.currencyCode}`, 'Importo']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-500">
            Nessuna spesa registrata
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-lg border border-white/5">
        <h3 className="text-lg text-white mb-2 font-cartoon">Top Spese</h3>
        <div className="space-y-3">
          {[...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5).map(expense => (
            <div key={expense.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-8 rounded-full" 
                  style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
                />
                <div>
                  <p className="text-slate-200">{expense.description}</p>
                  <p className="text-xs text-slate-500">{expense.category}</p>
                </div>
              </div>
              <span className="text-slate-300">
                {expense.amount.toFixed(2)} {trip.currencyCode}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};