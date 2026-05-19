import React from 'react';
import { Trip } from '../types';
import { ChevronRight, Calendar, Wallet, Trash2 } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  totalSpent: number;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, totalSpent, onClick, onDelete }) => {
  const progress = Math.min((totalSpent / trip.budget) * 100, 100);
  const isOverBudget = totalSpent > trip.budget;

  return (
    <div 
      onClick={onClick}
      className="bg-card rounded-2xl p-4 shadow-lg border border-white/5 active:scale-95 transition-transform cursor-pointer mb-4"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg text-slate-100 font-cartoon">{trip.name}</h3>
          <p className="text-sm text-slate-400 flex items-center gap-1">
            <Calendar size={14} />
            {new Date(trip.startDate).toLocaleDateString('it-IT')}
          </p>
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-2 bg-white/5 text-slate-400 rounded-full hover:bg-white/10 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <div className="bg-white/5 p-2 rounded-full">
            <ChevronRight size={20} className="text-slate-500" />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400 flex items-center gap-1">
            <Wallet size={14} /> Spesi
          </span>
          <span>
            <span className="text-[#ff6600]">{totalSpent.toFixed(2)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-[#39ff14]">{trip.budget} {trip.currencyCode}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${isOverBudget ? 'bg-red-400' : 'bg-primary'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};