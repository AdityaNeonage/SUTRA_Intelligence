// @ts-nocheck
import { useState } from 'react';
import Landing from './Landing';
import { Dashboard } from './Dashboard';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');

  if (currentView === 'dashboard') {
    return <Dashboard onLogout={() => setCurrentView('landing')} />;
  }

  return <Landing onOpenDashboard={() => setCurrentView('dashboard')} />;
}

export default App;
