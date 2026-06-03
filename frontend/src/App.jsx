import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import LevelPage from './pages/LevelPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminResults from './pages/AdminResults';
import { fetchCurrentUser, getIsAdmin, getToken, logout, saveUser } from './api';

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getToken());
  const [isAdmin, setIsAdmin] = useState(() => getIsAdmin());

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return;
    }

    fetchCurrentUser()
      .then((data) => {
        saveUser(data.user.email, data.user.is_admin);
        setIsAdmin(Boolean(data.user.is_admin));
      })
      .catch(() => {
        logout();
        setToken(null);
        setIsAdmin(false);
      });
  }, [token]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand-mark" aria-label="Hacker.moc">
            <span className="brand-dot" />
            <span>Hacker.moc</span>
          </Link>

          <nav className="app-nav">
            <Link to="/" className="btn-ghost">Уровни</Link>
            {!token ? (
              <>
                <Link to="/login" className="btn-primary">Войти</Link>
                <Link to="/register" className="btn-outline">Регистрация</Link>
              </>
            ) : (
              <>
                {isAdmin && <Link to="/admin/results" className="btn-primary">Результаты</Link>}
                <button
                  onClick={() => {
                    logout();
                    setToken(null);
                    setIsAdmin(false);
                    navigate('/');
                  }}
                  className="btn-outline"
                >
                  Выйти
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/level/:id" element={<LevelPage />} />
          <Route path="/admin/results" element={token && isAdmin ? <AdminResults /> : <Navigate to="/" />} />
          <Route path="/login" element={!token ? <Login onAuth={() => setToken(getToken())} /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register onAuth={() => setToken(getToken())} /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
