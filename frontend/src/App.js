import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import SignUpPage from './components/SignUpPage';
import LoginPage from './components/LoginPage';
import ConsolePage from './components/ConsolePage';
import ProductsPage from './components/ProductsPage';
import OrderPage from './components/OrderPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload.user);
      } catch (error) {
        console.error('Invalid token');
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [token]);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <Header user={user} onLogout={handleLogout} />
      <Container className="mt-4">
        <Routes>
          <Route 
            path="/" 
            element={
              token ? 
                (user?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/console" />) 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/signup" 
            element={!token ? <SignUpPage onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/login" 
            element={!token ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin-login" 
            element={!token ? <AdminLogin onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/console" 
            element={token && user?.role === 'user' ? <ConsolePage user={user} token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={token && user?.role === 'admin' ? <AdminDashboard token={token} /> : <Navigate to="/admin-login" />} 
          />
          <Route 
            path="/products" 
            element={token && user?.role === 'user' ? <ProductsPage token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/order/:productId" 
            element={token && user?.role === 'user' ? <OrderPage user={user} token={token} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;