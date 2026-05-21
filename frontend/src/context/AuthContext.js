import React, { createContext, useState, useContext, useEffect } from 'react';
import EC from 'elliptic';
import crypto from 'crypto-browserify';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from either stored-keys login or wallet login
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const register = async (userData, files) => {
    try {
      const formData = new FormData();
      
      Object.keys(userData).forEach(key => {
        formData.append(key, userData[key]);
      });

      if (files) {
        Object.keys(files).forEach(key => {
          if (files[key]) {
            formData.append(key, files[key]);
          }
        });
      }

      const response = await api.post('/api/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Save keys locally
      const keyData = {
        userID: response.data.userID,
        pseudoID: response.data.pseudoID,
        publicKey: response.data.publicKey,
        privateKey: response.data.privateKey,
        ipfsHash: response.data.ipfsHash,
        role: userData.role
      };

      localStorage.setItem('keyData', JSON.stringify(keyData));
      localStorage.setItem('userRole', userData.role);

      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Registration failed';
    }
  };

  const verifyEmail = async (token, userId) => {
    try {
      const response = await api.post('/api/auth/verify-email', { token, userId });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Verification failed';
    }
  };

  const login = async () => {
    try {
      const keyData = localStorage.getItem('keyData');
      if (!keyData) {
        throw new Error('No keys found. Please register first.');
      }

      const { pseudoID, publicKey, privateKey, userID, role } = JSON.parse(keyData);

      // Get challenge
      const challengeResponse = await api.post('/api/auth/challenge', { pseudoID });
      const { challenge } = challengeResponse.data;

      // Sign challenge
      const ec = new EC.ec('secp256k1');
      const key = ec.keyFromPrivate(privateKey, 'hex');
      const msgHash = crypto.createHash('sha256').update(challenge).digest('hex');
      const signature = key.sign(msgHash);

      const signatureObj = {
        r: signature.r.toString('hex'),
        s: signature.s.toString('hex')
      };

      // Login - include userID and role so JWT is fully populated
      const loginResponse = await api.post('/api/auth/login', {
        pseudoID,
        publicKey,
        userID,
        role: role || localStorage.getItem('userRole'),
        signature: signatureObj
      });

      const { token, userID: serverUserID, role: serverRole } = loginResponse.data;

      // Save token
      localStorage.setItem('token', token);
      
      const resolvedUserID = serverUserID || userID;
      const resolvedRole = serverRole || role || localStorage.getItem('userRole');

      // Persist resolved userID/role back to keyData
      const updatedKeyData = JSON.parse(localStorage.getItem('keyData') || '{}');
      if (resolvedUserID) updatedKeyData.userID = resolvedUserID;
      if (resolvedRole) updatedKeyData.role = resolvedRole;
      localStorage.setItem('keyData', JSON.stringify(updatedKeyData));
      if (resolvedRole) localStorage.setItem('userRole', resolvedRole);

      const userData = {
        userID: resolvedUserID,
        pseudoID,
        publicKey,
        role: resolvedRole
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return loginResponse.data;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    // Clear wallet session if present (do NOT clear keyData — stored-keys users need it)
    localStorage.removeItem('walletData');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  const registerWithWallet = async (userData, files, walletAddress, message, signature) => {
    try {
      const formData = new FormData();
      
      Object.keys(userData).forEach(key => {
        formData.append(key, userData[key]);
      });

      formData.append('walletAddress', walletAddress);
      formData.append('message', message);
      formData.append('signature', signature);
      formData.append('authMethod', 'wallet');

      if (files) {
        Object.keys(files).forEach(key => {
          if (files[key]) {
            formData.append(key, files[key]);
          }
        });
      }

      const response = await api.post('/api/auth/register-wallet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Save role
      localStorage.setItem('userRole', userData.role);

      return response.data;
    } catch (error) {
      // Check for duplicate registration
      if (error.response?.data?.code === 'ALREADY_REGISTERED') {
        throw new Error('You are already registered. Please login instead.');
      }
      throw error.response?.data?.error || 'Wallet registration failed';
    }
  };

  const loginWithWallet = async (walletAddress, message, signature) => {
    try {
      const response = await api.post('/api/auth/login-wallet', {
        walletAddress,
        message,
        signature
      });

      const { token, user: userData } = response.data;

      // ─── IMPORTANT: Store wallet session SEPARATELY from stored-key session ───
      // Never touch 'keyData' — that belongs to stored-keys users only
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      // Store wallet-specific data under its own key
      localStorage.setItem('walletData', JSON.stringify({
        userID:        userData.userID,
        walletAddress: userData.walletAddress || walletAddress,
        role:          userData.role,
        authMethod:    'wallet',
      }));

      setUser(userData);
      setIsAuthenticated(true);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Wallet login failed';
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    register,
    registerWithWallet,
    verifyEmail,
    login,
    loginWithWallet,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
