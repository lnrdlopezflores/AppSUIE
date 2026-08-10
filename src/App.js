import React, { useContext, useState } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import DashboardDocente from './components/DashboardDocente';
import PaseLista from './components/PaseLista';

function MainAppContent() {
  const { user } = useContext(AuthContext);
  const [selectedCarga, setSelectedCarga] = useState(null);

  if (!user) {
    return <Login />;
  }

  if (selectedCarga) {
    return <PaseLista carga={selectedCarga} onBack={() => setSelectedCarga(null)} />;
  }

  return <DashboardDocente onSelectCarga={(carga) => setSelectedCarga(carga)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}