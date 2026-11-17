import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { Book } from '@/routes/Book'
import { Home } from '@/routes/Home'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
