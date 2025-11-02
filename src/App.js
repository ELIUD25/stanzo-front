// src/App.js - UPDATED VERSION WITH CREDIT MANAGEMENT
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import page components
import Home from './pages/Home';
import AdminLogin from './pages/Auth/AdminLogin';
import CashierLogin from './pages/Auth/CashierLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CashierDashboard from './pages/Cashier/CashierDashboard';

// Import admin components
import AdminDashboardHome from './pages/Admin/AdminDashboardHome';
import CashierManagement from './pages/Admin/CashierManagement';
import ShopManagement from './pages/Admin/ShopManagement';
import ProductManagement from './pages/Admin/ProductManagement';
import Inventory from './pages/Admin/Inventory';
import ExpenseManagement from './pages/Admin/ExpenseManagement';
import TransactionReports from './pages/Admin/TransactionReports';
import CreditManagement from './pages/Admin/CreditManagement'; // NEW: Import Credit Management

// Import cashier components
import ShopSelection from './pages/Cashier/ShopSelection';
import Cart from './pages/Cashier/Cart';
import Receipt from './pages/Cashier/Receipt';

const App = () => {
  return (
    <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/cashier-login" element={<CashierLogin />} />
          
          {/* Additional login route aliases for flexibility */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/cashier/login" element={<CashierLogin />} />

          {/* Standalone Shop Selection Route */}
          <Route path="/cashier/shops" element={<ShopSelection />} />

          {/* Admin Routes - No protection */}
          <Route path="/admin/*" element={<AdminDashboard />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardHome />} />
            <Route path="cashiers" element={<CashierManagement />} />
            <Route path="shops" element={<ShopManagement />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="transactions" element={<TransactionReports />} />
            <Route path="credits" element={<CreditManagement />} /> {/* NEW: Credit Management Route */}
            
            {/* Catch-all route for admin section */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Cashier Routes - No protection */}
          <Route path="/cashier/dashboard/*" element={<CashierDashboard />}>
            <Route index element={<Navigate to="cart" replace />} />
            <Route path="cart" element={<Cart />} />
            <Route path="receipt" element={<Receipt />} />
            
            {/* Catch-all route for cashier dashboard section */}
            <Route path="*" element={<Navigate to="cart" replace />} />
          </Route>

          {/* Smart redirect based on authentication status */}
          <Route path="/redirect" element={<SmartRedirect />} />
          
          {/* Auto-redirect root based on auth status */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
  );
};

// Smart redirect component - UPDATED
const SmartRedirect = () => {
  const cashierData = localStorage.getItem('cashierData');
  const adminInfo = localStorage.getItem('adminInfo');
  
  // Check if cashier has selected a shop
  if (cashierData) {
    try {
      const parsedCashier = JSON.parse(cashierData);
      if (parsedCashier.lastShop && parsedCashier.shopName) {
        // Cashier has selected a shop, go to dashboard
        return <Navigate to="/cashier/dashboard/cart" replace />;
      } else {
        // Cashier is logged in but hasn't selected a shop
        return <Navigate to="/cashier/shops" replace />;
      }
    } catch (e) {
      console.warn('Invalid cashier data:', e);
      localStorage.removeItem('cashierData');
      return <Navigate to="/cashier/login" replace />;
    }
  }
  
  if (adminInfo) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/" replace />;
};

// Root redirect component with enhanced logic - UPDATED
const RootRedirect = () => {
  // Check authentication status more reliably
  const isAuthenticated = () => {
    try {
      const cashierData = localStorage.getItem('cashierData');
      const adminInfo = localStorage.getItem('adminInfo');
      
      // Check cashier authentication
      if (cashierData) {
        try {
          const parsedCashier = JSON.parse(cashierData);
          // Check if cashier data has required fields
          if (parsedCashier && parsedCashier._id && parsedCashier.email) {
            // Check if cashier has selected a shop
            if (parsedCashier.lastShop && parsedCashier.shopName) {
              return { type: 'cashier', hasShop: true };
            } else {
              return { type: 'cashier', hasShop: false };
            }
          }
        } catch (e) {
          console.warn('Invalid cashier data in storage:', e);
          localStorage.removeItem('cashierData');
        }
      }
      
      // Check admin authentication
      if (adminInfo) {
        try {
          const parsedAdmin = JSON.parse(adminInfo);
          // Check if admin info has required fields
          if (parsedAdmin && parsedAdmin.email) {
            return { type: 'admin', hasShop: true }; // Admin doesn't need shop selection
          }
        } catch (e) {
          console.warn('Invalid admin data in storage:', e);
          localStorage.removeItem('adminInfo');
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
    }
    
    return null;
  };

  const authStatus = isAuthenticated();
  
  if (authStatus?.type === 'cashier') {
    if (authStatus.hasShop) {
      // Cashier is logged in and has selected a shop
      return <Navigate to="/cashier/dashboard/cart" replace />;
    } else {
      // Cashier is logged in but needs to select a shop
      return <Navigate to="/cashier/shops" replace />;
    }
  }
  
  if (authStatus?.type === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Default to home page for unauthenticated users
  return <Home />;
};

export default App;