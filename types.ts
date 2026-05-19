export enum ExpenseCategory {
  FOOD = 'Cibo & Bevande',
  TRANSPORT = 'Trasporti',
  FUEL = 'Carburante',
  ACCOMMODATION = 'Alloggio',
  ACTIVITIES = 'Attività',
  SHOPPING = 'Shopping',
  PARKING = 'Parcheggio',
  RENTALS = 'Noleggi',
  SERVICES = 'Servizi',
  PHARMACY = 'Farmacia',
  OTHER = 'Altro',
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currencyCode: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  timestamp: number;
}

export type ViewState = 
  | { type: 'HOME' }
  | { type: 'TRIP_LIST' }
  | { type: 'CREATE_TRIP' }
  | { type: 'EDIT_TRIP'; tripId: string }
  | { type: 'TRIP_DETAIL'; tripId: string }
  | { type: 'ADD_EXPENSE'; tripId: string; mode?: 'manual' | 'ai' }
  | { type: 'STATS'; tripId: string }
  | { type: 'CATEGORIES'; tripId?: string };