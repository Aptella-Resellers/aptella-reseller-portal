import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Leaflet CSS (needed once globally)
import 'leaflet/dist/leaflet.css';

import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
