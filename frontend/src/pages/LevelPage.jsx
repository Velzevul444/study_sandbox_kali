import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLevel, postLevelResult } from '../api';

const levelSolutions = {
  1: 'Параметр q вставляется в result через innerHTML. Введите в URL payload вроде ?q=<script>alert(1)</script>, чтобы увидеть выполнение скрипта.',
  2: 'Комментарий сохраняется в массиве и выводится через innerHTML без экранирования. Отправьте вредоносный HTML, например <img src=x onerror=alert(1)>, чтобы увидеть XSS.',
  3: 'Hash-фрагмент вставляется напрямую в innerHTML. Добавьте к URL строку вида #<script>alert(1)</script>, чтобы проверить уязвимость.',
  4: 'Параметр item подставляется в href ссылки напрямую. Попробуйте использовать javascript:alert(1) или другую опасную конструкцию в URL.',
  5: 'Имя вставляется в HTML кнопки с onmouseover. Введите payload вроде <img src=x onerror=alert(1)> или <button onmouseover=alert(1)> и отправьте форму.',
  6: 'Значение video используется внутри src iframe. В URL передайте видео с опасным адресом, чтобы проверить, как браузер обрабатывает этот параметр.',
  7: 'document.write выводит message напрямую в HTML. Введите payload вроде <img src=x onerror=alert(1)>, чтобы вызвать выполнение вредоносного кода.',
  8: 'Текст из textarea вставляется в output через innerHTML. Введите HTML/JS-код прямо в поле, чтобы увидеть, как он выполняется.',
  9: 'Параметр text добавляется в DOM через insertAdjacentHTML. Отправьте вредоносный HTML, например <img src=x onerror=alert(1)>, чтобы вызвать XSS.',
  10: 'Значение user попадает в innerHTML внутри div. Используйте URL с user=<img src=x onerror=alert(1)> или похожей конструкцией, чтобы проверить уязвимость.',
};

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

      const injectedScript = document.currentScript;

      function markSolved() {
        if (window._xssSolvedSent) return;
        window._xssSolvedSent = true;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'xss-level-solved', levelId: ${levelId} }, '*');
        }
      }

      function overrideDialog(name) {
        const original = window[name];
        window[name] = function () {
          markSolved();
          return original.apply(this, arguments);
        };
      }

      overrideDialog('alert');
      overrideDialog('confirm');
      overrideDialog('prompt');

      window.addEventListener('error', function () {
        markSolved();
      }, true);

      const suspiciousRegex = /javascript:|on\w+=|data:text|vbscript:/i;

      function scanNode(node, options = {}) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node === injectedScript) return;
        if (options.ignoreScriptTags && node.tagName === 'SCRIPT') return;

        for (const attr of node.attributes || []) {
          const name = attr.name.toLowerCase();
          const value = attr.value;
          if (name.startsWith('on') || suspiciousRegex.test(value)) {
            markSolved();
          }
        }

        if (!options.ignoreScriptTags && node.tagName === 'SCRIPT') {
          markSolved();
        }

        node.childNodes.forEach((child) => scanNode(child, options));
      }

      const observer = new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => scanNode(node, { ignoreScriptTags: false }));
          }
          if (mutation.type === 'attributes') {
            scanNode(mutation.target, { ignoreScriptTags: false });
          }
        }
      });

      observer.observe(document, { childList: true, subtree: true, attributes: true });
      document.addEventListener('DOMContentLoaded', function () {
        scanNode(document.documentElement, { ignoreScriptTags: true });
      });
    })();
  </script>`;

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
      if (!timerActive || solved) {
        return;
      }
      handleFinish();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, timerActive, solved]);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerActive(false);
    setTimeSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
  };

  const handleFinish = async () => {
    if (!timerActive) return;
    stopTimer();
    setSaveError('');
    setSolved(true);
    setLevel((prev) => (prev ? { ...prev, completed: true, best_time_seconds: prev.best_time_seconds ?? timeSeconds } : prev));

    const token = localStorage.getItem('xss_sandbox_token');
    if (!token) {
      setSaveError('Войдите, чтобы сохранить результат.');
      return;
    }

    setSaving(true);
    try {
      const result = await postLevelResult(id, timeSeconds || 1);
      setBestTime(result.best_time_seconds || null);
      setSavedResult(true);
    } catch (err) {
      setSaveError(err.message || 'Ошибка сохранения результата');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="rounded-3xl border border-rose-500 bg-rose-950/50 p-6 text-rose-200">{error}</div>;
  }

  if (!level) {
    return <div className="text-slate-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-900/90 p-7 shadow-[0_24px_100px_-50px_rgba(0,0,0,0.75)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-[#FF3D57]">{level.title}</h1>
            <p className="mt-4 text-[#EAEAEA] leading-7">{level.theory}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr] text-sm text-[#BFC7D2]">
              <div className="rounded-3xl border border-white/10 bg-[#11151d]/90 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">Таймер</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatTime(timeSeconds)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#11151d]/90 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">Лучший результат</p>
                <p className="mt-2 text-lg font-semibold text-white">{bestTime != null ? formatTime(bestTime) : '–'}</p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-[#BFC7D2]">
              <p>
                <span className="font-semibold text-white">Уровень {level.id}</span> — {level.summary}
              </p>
              <p>
                Статус: <span className={`font-semibold ${level.completed ? 'text-emerald-300' : 'text-slate-400'}`}> {level.completed ? 'Пройдено' : 'Не пройдено'}</span>
              </p>
              <p>Используйте браузерную панель или URL для проверки поведения страницы.</p>
              <p>
                <span className="font-semibold text-white">Совет:</span> Сфокусируйтесь на реальных входных данных и сравнивайте результат в коде и в визуализации.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => setShowAnswer((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-[#FFDF6A] transition hover:bg-slate-800"
            >
              <span className="text-lg leading-none">★</span>
              {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={!timerActive || saving}
              className="rounded-full bg-[#FF3D57] px-4 py-3 text-sm font-semibold text-[#0F1115] transition hover:bg-[#ff6078] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Сохраняем...' : savedResult ? 'Результат сохранён' : 'Завершить уровень'}
            </button>
            {saveError && <p className="text-sm text-rose-300">{saveError}</p>}
          </div>
        </div>

        {showAnswer && (
          <div className="mt-6 rounded-3xl border border-[#FFDF6A]/20 bg-[#11151d]/95 p-5 text-sm text-[#EAEAEA] shadow-[0_0_0_1px_rgba(255,223,106,0.04)]">
            <p className="font-semibold text-[#FFDF6A]">Как это сделать</p>
            <p className="mt-3 leading-7 text-[#D1D5DB]">
              {levelSolutions[level.id] || 'Смотрите поведение вставленных данных в HTML и найдите точку, где ввод пользователя передается без экранирования.'}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-900/90 shadow-[0_24px_100px_-50px_rgba(0,0,0,0.75)]">
        <div className="flex flex-wrap gap-3 border-b border-white/10 bg-slate-950/80 p-4">
          <button
            onClick={() => setActiveTab('site')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'site' ? 'bg-[#FF3D57] text-[#0F1115]' : 'bg-slate-900 text-[#EAEAEA]/90 hover:bg-slate-800'
            }`}
          >
            Сайт
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'code' ? 'bg-[#FF3D57] text-[#0F1115]' : 'bg-slate-900 text-[#EAEAEA]/90 hover:bg-slate-800'
            }`}
          >
            Код
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'site' ? (
            <div className="rounded-[28px] border border-white/10 bg-[#080a0f] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <iframe
                title="Уязвимая страница"
                srcDoc={injectSolveDetection(level.pageHtml, id)}
                className="h-[540px] w-full rounded-[24px] border border-white/10 bg-[#0b111a]"
              />
            </div>
          ) : (
            <pre className="max-h-[540px] overflow-auto rounded-[28px] border border-white/10 bg-[#080a0f] p-4 text-sm text-[#EAEAEA] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <code>{level.pageCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default LevelPage;
