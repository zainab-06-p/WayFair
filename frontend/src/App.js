import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import DriverDashboard from './pages/DriverDashboard';
import PassengerDashboard from './pages/PassengerDashboard';
import CreateRidePage from './pages/driver/CreateRidePage';
import MyRidesPage from './pages/driver/MyRidesPage';
import SearchRidePage from './pages/passenger/SearchRidePage';
import MyBookingsPage from './pages/passenger/MyBookingsPage';
import RideDetailsPage from './pages/RideDetailsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import BlockchainExplorer from './pages/BlockchainExplorer';
import ReferralPage from './pages/ReferralPage';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, mt: 8 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
          />
          
          {/* Driver Routes */}
          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute requiredRole="driver">
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/create-ride"
            element={
              <ProtectedRoute requiredRole="driver">
                <CreateRidePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/my-rides"
            element={
              <ProtectedRoute requiredRole="driver">
                <MyRidesPage />
              </ProtectedRoute>
            }
          />
          
          {/* Passenger Routes */}
          <Route
            path="/passenger/dashboard"
            element={
              <ProtectedRoute requiredRole="passenger">
                <PassengerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/passenger/search"
            element={
              <ProtectedRoute requiredRole="passenger">
                <SearchRidePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/passenger/bookings"
            element={
              <ProtectedRoute requiredRole="passenger">
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Common Routes */}
          <Route
            path="/ride/:rideID"
            element={
              <ProtectedRoute>
                <RideDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:rideID"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Route */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminDashboard />
            }
          />
          
          {/* Blockchain Explorer */}
          <Route
            path="/explorer"
            element={
              <BlockchainExplorer />
            }
          />

          {/* Referral */}
          <Route
            path="/referral"
            element={
              <ProtectedRoute>
                <ReferralPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
