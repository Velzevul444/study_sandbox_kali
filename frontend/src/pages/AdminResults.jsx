import { useEffect, useState } from 'react';
import { fetchAdminResults } from '../api';

function formatTime(seconds) {
  if (seconds == null) return '–';
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatDate(value) {
  if (!value) return '–';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function AdminResults() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminResults()
      .then(setResults)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page-stack">
      <div className="admin-header">
        <div>
          <p className="header-accent">Админ-панель</p>
          <h1 className="heading-1">Результаты пользователей</h1>
        </div>
        <span className="code-chip">{results.length} записей</span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Уровень</th>
              <th>Лучшее время</th>
              <th>Попытки</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={`${result.user_id}-${result.level_id}`}>
                <td>{result.email}</td>
                <td>
                  <span className="code-chip">#{String(result.level_id).padStart(2, '0')}</span>
                  <span className="admin-level-title">{result.level_title}</span>
                </td>
                <td>{formatTime(result.best_time_seconds)}</td>
                <td>{result.attempts}</td>
                <td>{formatDate(result.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!error && results.length === 0 && (
          <div className="empty-state">
            <p>Пока нет сохраненных результатов.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminResults;
