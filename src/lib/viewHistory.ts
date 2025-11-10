// Utility functions for managing recently viewed listings

const HISTORY_KEY = 'localq_view_history';
const MAX_HISTORY_ITEMS = 20;

export interface ViewHistoryItem {
  listingId: string;
  listingName?: string;
  viewedAt: number;
}

export function addToViewHistory(listingId: string, listingName?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getViewHistory();
    
    // Remove existing entry for this listing if it exists
    const filtered = history.filter(item => item.listingId !== listingId);
    
    // Add new entry at the beginning
    const newHistory: ViewHistoryItem[] = [
      { listingId, listingName, viewedAt: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save view history:', error);
  }
}

export function getViewHistory(): ViewHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    
    const history: ViewHistoryItem[] = JSON.parse(stored);
    
    // Filter out items older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(item => item.viewedAt > thirtyDaysAgo);
    
    // Update storage if we filtered anything out
    if (filtered.length !== history.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    }
    
    return filtered;
  } catch (error) {
    console.error('Failed to load view history:', error);
    return [];
  }
}

export function clearViewHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear view history:', error);
  }
}

export function removeFromHistory(listingId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getViewHistory();
    const filtered = history.filter(item => item.listingId !== listingId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from history:', error);
  }
}
