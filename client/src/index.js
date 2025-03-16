// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right" 
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '10px',
          background: '#fff',
          color: '#333',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#06d6a0',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef476f',
            secondary: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>
);
