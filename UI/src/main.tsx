import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // <-- Make sure this points to your actual CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
