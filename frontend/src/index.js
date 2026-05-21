import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#fff',
    },
    secondary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#fff',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    divider: 'rgba(139, 92, 246, 0.15)',
    error: { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    success: { main: '#10B981' },
    info: { main: '#06B6D4' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#F8FAFC',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#8B5CF6 #E2E8F0',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: '#E2E8F0' },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(to bottom, #06B6D4, #8B5CF6)',
            borderRadius: '3px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '50px',
          padding: '10px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.35)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #0EA5E9 0%, #A78BFA 100%)',
            boxShadow: '0 8px 30px rgba(6, 182, 212, 0.5)',
            transform: 'translateY(-2px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
            boxShadow: '0 8px 30px rgba(139, 92, 246, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px', transform: 'translateY(-2px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        outlinedPrimary: {
          borderColor: '#06B6D4',
          color: '#06B6D4',
          '&:hover': {
            background: 'rgba(6, 182, 212, 0.08)',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: '#FFFFFF',
          border: '1px solid rgba(139, 92, 246, 0.12)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: '#FFFFFF',
          border: '1px solid rgba(139, 92, 246, 0.12)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            border: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: '0 8px 30px rgba(6, 182, 212, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            background: '#FFFFFF',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#8B5CF6',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#06B6D4',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': { color: '#475569' },
          '& .MuiOutlinedInput-input': { color: '#0F172A' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: '12px',
          background: '#FFFFFF',
          color: '#0F172A',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.12)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
          color: '#0F172A',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: '12px' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          border: '1px solid rgba(139, 92, 246, 0.15)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          border: '1px solid rgba(139, 92, 246, 0.12)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: { color: '#0F172A' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { color: '#0F172A' },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <SocketProvider>
              <App />
            </SocketProvider>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
