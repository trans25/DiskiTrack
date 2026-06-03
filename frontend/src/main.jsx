import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { AnnouncementsProvider } from './context/AnnouncementsContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AnnouncementsProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </AnnouncementsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
