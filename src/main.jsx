import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { injectSpeedInsights } from '@vercel/speed-insights'
injectSpeedInsights() // anonymous page-speed metrics for the Vercel dashboard (Speed Insights); it does nothing on localhost
createRoot(document.getElementById('root')).render(<App />)
