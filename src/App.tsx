import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { audio } from './lib/audio/AudioEngine'
import { Home } from './pages/Home'
import { LessonRunner } from './pages/LessonRunner'
import { ModulePage } from './pages/ModulePage'
import { ParentDashboard } from './pages/ParentDashboard'
import { useSettings } from './store/settingsStore'

export default function App() {
  const volumen = useSettings((s) => s.volumen)
  useEffect(() => audio.setVolumen(volumen), [volumen])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/modulo/:id" element={<ModulePage />} />
        <Route path="/leccion/:id" element={<LessonRunner />} />
        <Route path="/adultos" element={<ParentDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
