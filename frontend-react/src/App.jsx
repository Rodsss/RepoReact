// FILE: frontend-react/src/App.jsx (Refactored for Sidebar Layout)

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import LanguagePageLayout from './components/LanguagePageLayout.jsx';
import DeskPage from './pages/DeskPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import './App.css';

// The new main layout component
function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/language" element={<LanguagePageLayout />} />
          <Route path="/desk" element={<DeskPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          {/* Redirect root to the language page by default */}
          <Route path="*" element={<Navigate to="/language" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // If authenticated, render the new app shell inside the router
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;