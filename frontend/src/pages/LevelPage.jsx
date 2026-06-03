import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLevel, postLevelResult } from '../api';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function injectSolveDetection(html, levelId) {
  const payload = `\n<script>
    (function () {
      if (window._xssSolveInjected) return;
      window._xssSolveInjected = true;

      function markSolved(reason) {
        if (window._xssSolvedSent) return;
        window._xssSolvedSent = true;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'xss-level-solved', levelId: ${levelId}, reason: reason || 'dialog' }, '*');
        }
      }

      window.xssLabComplete = markSolved;
      window.xssLabSolved = markSolved;

      function overrideDialog(name) {
        const original = window[name];
        window[name] = function () {
          markSolved(name);
          return original.apply(this, arguments);
        };
      }

      overrideDialog('alert');
      overrideDialog('confirm');
      overrideDialog('prompt');
    })();
  </script>`;

  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${payload}`);
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', `${payload}\n</body>`);
  }

  if (html.includes('</html>')) {
    return html.replace('</html>', `${payload}\n</html>`);
  }

  return html + payload;
}

function LevelPage() {
  const { id } = useParams();
  const [level, setLevel] = useState(null);
  const [activeTab, setActiveTab] = useState('site');
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [bestTime, setBestTime] = useState(null);
  const [solved, setSolved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const timerActiveRef = useRef(true);
  const solvedRef = useRef(false);

  useEffect(() => {
    fetchLevel(id)
      .then((loaded) => {
        setLevel(loaded);
        setBestTime(loaded.best_time_seconds ?? null);
        setSolved(Boolean(loaded.best_time_seconds));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerActiveRef.current = true;
    solvedRef.current = false;
    setTimeSeconds(0);
    setTimerActive(true);
    setSolved(false);
    setSavedResult(false);
    setSaveError('');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!event.data || event.data.type !== 'xss-level-solved') {
        return;
      }
      if (Number(event.data.levelId) !== Number(id)) {
        return;
      }
      if (!timerActiveRef.current || solvedRef.current) {
        return;
      }
      handleFinish();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id]);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timerActiveRef.current = false;
    setTimerActive(false);
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setTimeSeconds(elapsedSeconds);
    return elapsedSeconds;
  };

  const handleFinish = async () => {
    if (!timerActiveRef.current || solvedRef.current) return;
    const elapsedSeconds = stopTimer();
    setSaveError('');
    solvedRef.current = true;
    setSolved(true);
    setLevel((prev) => (prev ? { ...prev, completed: true, best_time_seconds: prev.best_time_seconds ?? elapsedSeconds } : prev));

    const token = localStorage.getItem('xss_sandbox_token');
    if (!token) {
      setSaveError('Войдите, чтобы сохранить результат.');
      return;
    }

    setSaving(true);
    try {
      const result = await postLevelResult(id, elapsedSeconds);
      setBestTime(result.best_time_seconds || null);
      setSavedResult(true);
    } catch (err) {
      setSaveError(err.message || 'Ошибка сохранения результата');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="alert-error">{error}</div>;
  }

  if (!level) {
    return <div className="text-subtle">Загрузка...</div>;
  }

  return (
    <div className="page-stack">
      <div className="card">
        <div className="level-top">
          <div className="level-main-copy">
            <p className="header-accent">Уровень {level.id}</p>
            <h1 className="level-title">{level.title}</h1>
            <p className="level-theory">{level.theory}</p>
            <div className="level-metrics">
              <div className="meta-cell">
                <p className="metric-label">Таймер</p>
                <p className="metric-value">{formatTime(timeSeconds)}</p>
              </div>
              <div className="meta-cell">
                <p className="metric-label">Лучший результат</p>
                <p className="metric-value">{bestTime != null ? formatTime(bestTime) : '–'}</p>
              </div>
            </div>
            <div className="level-info">
              <p>
                <span className="level-info-strong">Уровень {level.id}</span> — {level.summary}
              </p>
              <p>
                Статус:{' '}
                <span className={level.completed ? 'level-status-success' : 'level-status-muted'}>
                  {level.completed ? 'Пройдено' : 'Не пройдено'}
                </span>
              </p>
            </div>

            <div className="task-guide">
              <div>
                <p className="task-guide-title">Цель</p>
                <p className="task-guide-text">{level.goal}</p>
              </div>
              <div>
                <p className="task-guide-title">Подсказка</p>
                <p className="task-guide-text">{level.hint}</p>
              </div>
              <div>
                <p className="task-guide-title">Проверка</p>
                <p className="task-guide-text">{level.check}</p>
              </div>
            </div>
          </div>

          <div className="level-controls">
            <button
              type="button"
              onClick={() => setShowAnswer((prev) => !prev)}
              className="answer-button"
            >
              {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
            </button>
            <button
              type="button"
              disabled
              className="btn-primary-lg"
            >
              {saving ? 'Сохраняем...' : savedResult ? 'Результат сохранён' : solved ? 'Уровень пройден' : 'Проверка активна'}
            </button>
            {saveError && <p className="save-error">{saveError}</p>}
          </div>
        </div>

        {showAnswer && (
          <div className="answer-panel">
            <p className="answer-title">Как это сделать</p>
            <p className="answer-text">
              {level.solution || 'Смотрите поведение вставленных данных в HTML и найдите точку, где ввод пользователя передается без экранирования.'}
            </p>
          </div>
        )}
      </div>

      <div className="tabs-panel">
        <div className="tabs-bar">
          <button
            onClick={() => setActiveTab('site')}
            className={`tab-button ${activeTab === 'site' ? 'tab-button-active' : 'tab-button-idle'}`}
          >
            Сайт
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`tab-button ${activeTab === 'code' ? 'tab-button-active' : 'tab-button-idle'}`}
          >
            Код
          </button>
        </div>

        <div className="tabs-body">
          {activeTab === 'site' ? (
            <div className="iframe-shell">
              <iframe
                title="Уязвимая страница"
                srcDoc={injectSolveDetection(level.pageHtml, id)}
                className="level-frame"
              />
            </div>
          ) : (
            <pre className="code-view">
              <code>{level.pageCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default LevelPage;
