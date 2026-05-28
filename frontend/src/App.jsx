import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import LevelPage from './pages/LevelPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { getToken, logout, getUserEmail } from './api';

function App() {
  const navigate = useNavigate();
  const token = getToken();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060a] text-[#EAEAEA]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(255,61,87,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(58,134,255,0.16),transparent_20%)]" />
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 px-4 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="text-xl font-semibold tracking-tight text-[#FF3D57]">Hacker.moc</Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-[#EAEAEA]">
            <Link to="/" className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-[#FF3D57]">Уровни</Link>
            {!token ? (
              <>
                <Link to="/login" className="rounded-full bg-[#FF3D57] px-4 py-2 text-[#0F1115] transition hover:bg-[#ff6078]">Войти</Link>
                <Link to="/register" className="rounded-full border border-[#FF3D57] px-4 py-2 transition hover:bg-white/5">Регистрация</Link>
              </>
            ) : (
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="rounded-full bg-[#3A86FF] px-4 py-2 text-[#0F1115] transition hover:bg-[#5fa7ff]"
              >
                Выйти
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/level/:id" element={<LevelPage />} />
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
