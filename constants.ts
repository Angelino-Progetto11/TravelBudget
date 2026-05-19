import { ExpenseCategory } from './types';

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: '#f59e0b', // Amber 500
  [ExpenseCategory.TRANSPORT]: '#0ea5e9', // Sky 500
  [ExpenseCategory.FUEL]: '#ef4444', // Red 500
  [ExpenseCategory.ACCOMMODATION]: '#8b5cf6', // Violet 500
  [ExpenseCategory.ACTIVITIES]: '#10b981', // Emerald 500
  [ExpenseCategory.SHOPPING]: '#ec4899', // Pink 500
  [ExpenseCategory.PARKING]: '#64748b', // Slate 500
  [ExpenseCategory.RENTALS]: '#6366f1', // Indigo 500
  [ExpenseCategory.SERVICES]: '#3b82f6', // Blue 500
  [ExpenseCategory.PHARMACY]: '#14b8a6', // Teal 500
  [ExpenseCategory.OTHER]: '#94a3b8', // Slate 400
};
