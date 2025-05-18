// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// make sure you have <div id="root"></div> in your public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);