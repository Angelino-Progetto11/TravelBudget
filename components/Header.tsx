import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  onAdd?: () => void;
  rightActionIcon?: React.ReactNode;
  customActions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack, onAdd, rightActionIcon, customActions }) => {
  return (
    <header className="sticky top-0 z-10 bg-gradient-to-tr from-primary to-secondary border-b border-white/10 px-4 h-16 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-200">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-xl text-white truncate max-w-[200px] font-cartoon">{title}</h1>
      </div>
      
      <div className="flex items-center gap-1">
        {customActions && customActions}
        
        {onAdd && !customActions && (
          <button 
            onClick={onAdd} 
            className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {rightActionIcon || <Plus size={28} className="text-primary" />}
          </button>
        )}
      </div>
    </header>
  );
};