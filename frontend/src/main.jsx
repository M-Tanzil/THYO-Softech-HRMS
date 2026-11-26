import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function getCacheStorageKey() {
  try {
    const raw = localStorage.getItem('thyo_user_data');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.employeeId) return `thyo_rq_cache_v1_${user.employeeId}`;
    }
  } catch {
    // ignore
  }
  return null;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache validity for instantaneous module switching
      gcTime: 1000 * 60 * 30,   // 30 minutes persisted cache retention
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,     // Refresh stale data silently in background without showing blank screen
      retry: 1,
      retryDelay: (attempt) => Math.min(800 * (2 ** attempt), 2500)
    }
  }
});

// Hydrate React Query cache from localStorage for instant 0ms F5 refresh rendering
function hydrateQueryCache() {
  const key = getCacheStorageKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return;
    }
    if (Array.isArray(parsed.queries)) {
      for (const item of parsed.queries) {
        if (item?.queryKey && item.data !== undefined) {
          queryClient.setQueryData(item.queryKey, item.data, { updatedAt: item.updatedAt || Date.now() });
        }
      }
    }
  } catch {
    // Ignore corrupted cache
  }
}

hydrateQueryCache();

// Persist successful query results (throttled) so page refreshes never show white screens
let persistTimer = null;
queryClient.getQueryCache().subscribe(() => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const key = getCacheStorageKey();
    if (!key) return;
    try {
      const allQueries = queryClient.getQueryCache().getAll();
      const serializable = [];
      for (const q of allQueries) {
        if (q.state.status === 'success' && q.state.data !== undefined) {
          serializable.push({
            queryKey: q.queryKey,
            data: q.state.data,
            updatedAt: q.state.dataUpdatedAt
          });
        }
      }
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), queries: serializable }));
    } catch {
      // Ignore storage quota errors
    }
  }, 800);
});

export function clearPersistedQueryCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('thyo_rq_cache_')) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  queryClient.clear();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
