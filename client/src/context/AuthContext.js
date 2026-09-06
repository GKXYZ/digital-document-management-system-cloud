import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cloudvault_token');
      if (token) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('cloudvault_token');
          localStorage.removeItem('cloudvault_user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('cloudvault_token', token);
    localStorage.setItem('cloudvault_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    return res.data;
  };

  const verifyOTP = async (email, otp) => {
    const res = await authAPI.verifyOTP({ email, otp });
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('cloudvault_token');
    localStorage.removeItem('cloudvault_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        verifyOTP,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
