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
    <div className="page-stack">
      {error && (
        <div className="alert-error">{error}</div>
      )}

      <div className="levels-list">
        <div className="levels-header">
          <span>Уровень</span>
          <span>Задание</span>
          <span>Результат</span>
          <span className="levels-header-action">Действие</span>
        </div>

        {levels.map((level) => (
          <article
            key={level.id}
            className="level-row"
          >
            <div className="level-row-meta">
              <span className="code-chip">#{String(level.id).padStart(2, '0')}</span>
              <span className={`${level.completed ? 'badge-completed' : 'badge-pending'} level-status`}>
                {level.completed ? 'Пройдено' : 'В работе'}
              </span>
            </div>

            <div>
              <h2 className="heading-2">{level.title}</h2>
              <p className="level-summary">{level.summary}</p>
            </div>

            <div className="level-time">
              <p className="text-subtle">Лучшее время</p>
              <p className="level-time-value">
                {level.best_time_seconds != null ? formatTime(level.best_time_seconds) : 'Пока нет'}
              </p>
            </div>

            <div className="level-actions">
              <p className="level-mobile-note">Практическое задание</p>
              <Link to={`/level/${level.id}`} className="btn-primary">
                Открыть
              </Link>
            </div>
          </article>
        ))}

        {!error && levels.length === 0 && (
          <div className="empty-state">
            <p>Уровни пока не загрузились.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
