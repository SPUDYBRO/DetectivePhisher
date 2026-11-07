import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import './style.css'

// We have no router, so we read the address bar ourselves
const path = window.location.pathname

// Only the home address shows the app, anything else gets the 404 page
let page = <App />
if (path !== '/' && path !== '/index.html') {
  page = <NotFoundPage />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {page}
  </React.StrictMode>,
)