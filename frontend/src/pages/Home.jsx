import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLevels } from '../api';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function Home() {
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLevels()
      .then(setLevels)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-slate-900/90 p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.75)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#FF3D57] sm:text-4xl">Список уровней</h1>
            
          </div>
          
        </div>
      </section>

      {error && (
        <div className="rounded-3xl border border-[#FF3D57] bg-[#3A121F]/90 p-4 text-[#FFB6C1]">{error}</div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {levels.map((level) => (
          <article
            key={level.id}
            className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#11151d]/95 p-6 transition hover:-translate-y-1 hover:border-[#FF3D57]/50 hover:bg-slate-900/95 hover:shadow-[0_16px_80px_-40px_rgba(255,61,87,0.4)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{level.title}</h2>
                <p className="mt-3 text-[#BFC7D2]">{level.summary}</p>
              </div>
              <div className="space-y-2 text-right">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${level.completed ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15' : 'bg-white/5 text-[#BFC7D2] border border-white/10'}`}>
                  {level.completed ? 'Пройдено' : 'Не пройдено'}
                </span>
                {level.best_time_seconds != null && (
                  <p className="text-sm text-[#94A3B8]">Лучшее время: {formatTime(level.best_time_seconds)}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link
                to={`/level/${level.id}`}
                className="rounded-full bg-[#FF3D57] px-5 py-3 text-sm font-semibold text-[#0F1115] transition hover:bg-[#ff6078]"
              >
                Открыть
              </Link>
              <p className="text-sm text-[#94A3B8]">Практическое задание</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Home;
