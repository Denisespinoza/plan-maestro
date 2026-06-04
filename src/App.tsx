import { useState } from 'react';
import { ThemeProvider } from './lib/theme';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/OrdersList';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import Finance from './pages/Finance';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import MoldLibrary from './pages/MoldLibrary';
import InternalCatalog from './pages/InternalCatalog';
import Personal from './pages/Personal';
import Login from './pages/Login';

type Page = 'dashboard' | 'orders' | 'new-order' | 'finance' | 'order-detail' | 'clients' | 'inventory' | 'library' | 'catalog' | 'personal';

function AppContent() {
  const { user, isAdmin, role, permissions, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Login />;
  }

  if (role === 'pendiente') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-teal-500/30 bg-slate-900/90 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-3">Cuenta pendiente</h1>
          <p className="text-slate-200">Tu cuenta está pendiente de aprobación por el administrador de CEO Modeltex.</p>
          <button
            onClick={signOut}
            className="mt-6 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const handleNavigate = (page: string, orderId?: string, _clientId?: string, modelId?: string) => {
    const nextPage = page as Page;
    if ((nextPage === 'finance' && !permissions.canViewFinances) || (nextPage === 'personal' && !permissions.canViewEmployees)) {
      setCurrentPage('dashboard');
      return;
    }
    if (nextPage === 'new-order' && !permissions.canCreateOrders) {
      setCurrentPage('orders');
      return;
    }
    setCurrentPage(nextPage);
    if (orderId) setSelectedOrderId(orderId);
    if (modelId) setSelectedModelId(modelId);
    if (page === 'new-order') {
      setSelectedOrderId(null);
      setSelectedModelId(null);
    }
    if (page === 'library' && !modelId) {
      setSelectedModelId(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'orders':
        return <OrdersList onNavigate={handleNavigate} />;
      case 'new-order':
        return permissions.canCreateOrders ? <NewOrder onNavigate={handleNavigate} /> : <OrdersList onNavigate={handleNavigate} />;
      case 'order-detail':
        return selectedOrderId ? (
          <OrderDetail orderId={selectedOrderId} onNavigate={handleNavigate} />
        ) : (
          <OrdersList onNavigate={handleNavigate} />
        );
      case 'clients':
        return <Clients onNavigate={handleNavigate} />;
      case 'finance':
        return permissions.canViewFinances ? <Finance /> : <Dashboard onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory onNavigate={handleNavigate} />;
      case 'library':
        return <MoldLibrary modelId={selectedModelId || undefined} onNavigate={handleNavigate} />;
      case 'catalog':
        return <InternalCatalog onNavigate={handleNavigate} />;
      case 'personal':
        return permissions.canViewEmployees ? <Personal /> : <Dashboard onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      isAdmin={isAdmin}
      permissions={permissions}
      onLogout={signOut}
    >
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
