import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, saveToken } from '../api';

function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const data = await loginRequest({ email, password });
      saveToken(data.token, data.user.email, data.user.is_admin);
      if (onAuth) onAuth();
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[32px] border border-white/10 bg-slate-900/95 p-10 shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)]">
      <div className="mb-6 space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-[#FF3D57]/80">Авторизация</p>
        <h1 className="text-3xl font-semibold text-white">Войти в Hacker.moc</h1>
        <p className="text-[#BFC7D2]">Получите полный доступ ко всем заданиям и практикуйтесь с реальными уязвимостями.</p>
      </div>
      {error && <div className="mb-4 rounded-3xl border border-[#FF3D57] bg-[#3A121F]/90 p-3 text-[#FFB6C1]">{error}</div>}
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm text-[#EAEAEA]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-3 w-full rounded-3xl border border-white/10 bg-[#0F1115] px-4 py-3 text-[#EAEAEA] outline-none transition focus:border-[#FF3D57] focus:ring-2 focus:ring-[#FF3D57]/20"
            required
          />
        </label>
        <label className="block text-sm text-[#EAEAEA]">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-3 w-full rounded-3xl border border-white/10 bg-[#0F1115] px-4 py-3 text-[#EAEAEA] outline-none transition focus:border-[#FF3D57] focus:ring-2 focus:ring-[#FF3D57]/20"
            required
          />
        </label>
        <button type="submit" className="w-full rounded-3xl bg-[#FF3D57] px-4 py-3 text-base font-semibold text-[#0F1115] transition hover:bg-[#ff6078]">
          Войти
        </button>
      </form>
    </div>
  );
}

export default Login;
