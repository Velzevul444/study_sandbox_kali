module.exports = [
  {
    id: 1,
    title: 'Уровень 1: reflected XSS',
    summary: 'Незашифрованный параметр запроса вставляется в страницу',
    theory: 'В reflected XSS пользовательский ввод попадает напрямую на страницу без экранирования. В этой задаче мы проверяем значение параметра `q` и видим результат в интерфейсе.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Поиск новостей</title>
  </head>
  <body>
    <h1>Внутренняя поисковая система</h1>
    <form id="searchForm">
      <label>Поиск: <input id="query" name="q" /></label>
      <button type="submit">Найти</button>
    </form>
    <div id="result"></div>
    <script>
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q') || '';
      document.getElementById('result').innerHTML = '<p>Результаты для: ' + query + '</p>';
      function markSolved() {
        if (window._xssSolvedSent) return;
        window._xssSolvedSent = true;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'xss-level-solved', levelId: 1 }, '*');
        }
      }
      function solveIfNeeded(value) {
        const text = String(value || '').toLowerCase();
        if (/<[^>]+>|javascript:|onerror=|onload=|onmouseover=|onfocus=/.test(text)) {
          markSolved();
        }
      }
      solveIfNeeded(query);
      document.getElementById('searchForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const value = document.getElementById('query').value;
        window.location.search = '?q=' + encodeURIComponent(value);
      });
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Поиск новостей</title>
  </head>
  <body>
    <h1>Внутренняя поисковая система</h1>
    <form id="searchForm">
      <label>Поиск: <input id="query" name="q" /></label>
      <button type="submit">Найти</button>
    </form>
    <div id="result"></div>
    <script>
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q') || '';
      document.getElementById('result').innerHTML = '<p>Результаты для: ' + query + '</p>';
      document.getElementById('searchForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const value = document.getElementById('query').value;
        window.location.search = '?q=' + encodeURIComponent(value);
      });
    </script>
  </body>
</html>`,
  },
  {
    id: 2,
    title: 'Уровень 2: stored XSS',
    summary: 'Комментарий сохраняется и отображается без фильтрации',
    theory: 'В stored XSS вредоносный ввод сохраняется на сервере и отображается другим пользователям. Здесь мы видим форму комментариев и вывод прямо в элементе HTML.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Гостевая книга</title>
  </head>
  <body>
    <h1>Гостевая книга</h1>
    <form id="commentForm">
      <label>Комментарий: <input id="comment" /></label>
      <button type="submit">Отправить</button>
    </form>
    <div id="comments"></div>
    <script>
      const comments = ['Привет! Оставь свой комментарий.'];
      const container = document.getElementById('comments');
      function markSolved() {
        if (window._xssSolvedSent) return;
        window._xssSolvedSent = true;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'xss-level-solved', levelId: 2 }, '*');
        }
      }
      function solveIfNeeded(value) {
        const text = String(value || '').toLowerCase();
        if (/<[^>]+>|javascript:|onerror=|onload=|onmouseover=|onfocus=/.test(text)) {
          markSolved();
        }
      }
      function render() {
        container.innerHTML = comments.map((text) => '<div class="comment">' + text + '</div>').join('');
        solveIfNeeded(comments[comments.length - 1]);
      }
      render();
      document.getElementById('commentForm').addEventListener('submit', function (event) {
        event.preventDefault();
        comments.push(document.getElementById('comment').value);
        render();
      });
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Гостевая книга</title>
  </head>
  <body>
    <h1>Гостевая книга</h1>
    <form id="commentForm">
      <label>Комментарий: <input id="comment" /></label>
      <button type="submit">Отправить</button>
    </form>
    <div id="comments"></div>
    <script>
      const comments = ['Привет! Оставь свой комментарий.'];
      const container = document.getElementById('comments');
      function render() {
        container.innerHTML = comments.map((text) => '<div class="comment">' + text + '</div>').join('');
      }
      render();
      document.getElementById('commentForm').addEventListener('submit', function (event) {
        event.preventDefault();
        comments.push(document.getElementById('comment').value);
        render();
      });
    </script>
  </body>
</html>`,
  },
  {
    id: 3,
    title: 'Уровень 3: DOM XSS',
    summary: 'Значение фрагмента URL вставляется с помощью innerHTML',
    theory: 'DOM XSS возникает, когда скрипт на стороне клиента обрабатывает данные из URL или hash и вставляет их в DOM без экранирования.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Динамическая страница</title>
  </head>
  <body>
    <h1>Добро пожаловать на страницу</h1>
    <div id="message"></div>
    <script>
      const hash = decodeURIComponent(window.location.hash.slice(1) || 'привет');
      document.getElementById('message').innerHTML = '<p>' + hash + '</p>';
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Динамическая страница</title>
  </head>
  <body>
    <h1>Добро пожаловать на страницу</h1>
    <div id="message"></div>
    <script>
      const hash = decodeURIComponent(window.location.hash.slice(1) || 'привет');
      document.getElementById('message').innerHTML = '<p>' + hash + '</p>';
    </script>
  </body>
</html>`,
  },
  {
    id: 4,
    title: 'Уровень 4: инъекция в атрибут',
    summary: 'Параметр `item` используется внутри HTML-атрибута',
    theory: 'Атрибутная XSS возникает, когда пользовательский ввод помещается внутрь атрибутов без надёжного экранирования.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Каталог товаров</title>
  </head>
  <body>
    <h1>Каталог</h1>
    <script>
      const params = new URLSearchParams(window.location.search);
      const item = params.get('item') || 'default';
      document.write('<a href="product.html?item=' + item + '">Перейти к товару</a>');
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Каталог товаров</title>
  </head>
  <body>
    <h1>Каталог</h1>
    <script>
      const params = new URLSearchParams(window.location.search);
      const item = params.get('item') || 'default';
      document.write('<a href="product.html?item=' + item + '">Перейти к товару</a>');
    </script>
  </body>
</html>`,
  },
  {
    id: 5,
    title: 'Уровень 5: событие в строке',
    summary: 'Пользовательский текст вставляется в HTML с обработчиком события',
    theory: 'Если пользовательский ввод попадает в HTML-аннотации или атрибуты событий, это может привести к исполнению JS.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Приветствие друга</title>
  </head>
  <body>
    <h1>Поздороваться</h1>
    <form id="greetForm">
      <input id="name" placeholder="Имя друга" />
      <button type="submit">Поздороваться</button>
    </form>
    <div id="greeting"></div>
    <script>
      document.getElementById('greetForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('name').value;
        document.getElementById('greeting').innerHTML = '<button onmouseover="alert(\'Привет, ' + name + '\')">Наведи на меня</button>';
      });
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Приветствие друга</title>
  </head>
  <body>
    <h1>Поздороваться</h1>
    <form id="greetForm">
      <input id="name" placeholder="Имя друга" />
      <button type="submit">Поздороваться</button>
    </form>
    <div id="greeting"></div>
    <script>
      document.getElementById('greetForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('name').value;
        document.getElementById('greeting').innerHTML = '<button onmouseover="alert(\'Привет, ' + name + '\')">Наведи на меня</button>';
      });
    </script>
  </body>
</html>`,
  },
  {
    id: 6,
    title: 'Уровень 6: XSS в `src` атрибуте',
    summary: 'Недоверенный URL используется внутри `src` тега',
    theory: 'Если ссылка формируется из пользовательского ввода, можно подставить вредоносную `javascript:` строку или другой опасный URL.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Видеоплеер</title>
  </head>
  <body>
    <h1>Видеоплеер</h1>
    <div id="frame"></div>
    <script>
      const params = new URLSearchParams(window.location.search);
      const url = params.get('video') || 'https://example.com/video.mp4';
      document.getElementById('frame').innerHTML = '<iframe src="' + url + '" width="600" height="340"></iframe>';
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Видеоплеер</title>
  </head>
  <body>
    <h1>Видеоплеер</h1>
    <div id="frame"></div>
    <script>
      const params = new URLSearchParams(window.location.search);
      const url = params.get('video') || 'https://example.com/video.mp4';
      document.getElementById('frame').innerHTML = '<iframe src="' + url + '" width="600" height="340"></iframe>';
    </script>
  </body>
</html>`,
  },
  {
    id: 7,
    title: 'Уровень 7: document.write из внешних данных',
    summary: 'Значение из URL вставляется с помощью document.write',
    theory: 'document.write опасен, если данные пользователя не фильтруются. В этой задаче мы используем параметр `message` в шаблоне.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Объявление</title>
  </head>
  <body>
    <script>
      const params = new URLSearchParams(window.location.search);
      const message = params.get('message') || 'Добро пожаловать!';
      document.write('<h2>' + message + '</h2>');
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Объявление</title>
  </head>
  <body>
    <script>
      const params = new URLSearchParams(window.location.search);
      const message = params.get('message') || 'Добро пожаловать!';
      document.write('<h2>' + message + '</h2>');
    </script>
  </body>
</html>`,
  },
  {
    id: 8,
    title: 'Уровень 8: небезопасный innerHTML с формой',
    summary: 'Текст из поля формы вставляется в innerHTML без защиты',
    theory: 'Проще всего XSS встречается там, где форму пользователя выводят обратно на экран напрямую в HTML.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Обратная связь</title>
  </head>
  <body>
    <h1>Напишите сообщение</h1>
    <textarea id="message"></textarea>
    <button id="send">Отправить</button>
    <div id="output"></div>
    <script>
      document.getElementById('send').addEventListener('click', function () {
        const text = document.getElementById('message').value;
        document.getElementById('output').innerHTML = '<div>' + text + '</div>';
      });
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Обратная связь</title>
  </head>
  <body>
    <h1>Напишите сообщение</h1>
    <textarea id="message"></textarea>
    <button id="send">Отправить</button>
    <div id="output"></div>
    <script>
      document.getElementById('send').addEventListener('click', function () {
        const text = document.getElementById('message').value;
        document.getElementById('output').innerHTML = '<div>' + text + '</div>';
      });
    </script>
  </body>
</html>`,
  },
  {
    id: 9,
    title: 'Уровень 9: инъекция в шаблонное сообщение',
    summary: 'Серверная строка вставляется в HTML как текст',
    theory: 'Любая строка, которая формируется из пользовательских данных и отдается в HTML, должна быть безопасно экранирована.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Шаблон сообщений</title>
  </head>
  <body>
    <h1>Приветственное сообщение</h1>
    <script>
      const param = new URLSearchParams(window.location.search).get('text') || 'Добро пожаловать';
      const html = '<section><p>' + param + '</p></section>';
      document.body.insertAdjacentHTML('beforeend', html);
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Шаблон сообщений</title>
  </head>
  <body>
    <h1>Приветственное сообщение</h1>
    <script>
      const param = new URLSearchParams(window.location.search).get('text') || 'Добро пожаловать';
      const html = '<section><p>' + param + '</p></section>';
      document.body.insertAdjacentHTML('beforeend', html);
    </script>
  </body>
</html>`,
  },
  {
    id: 10,
    title: 'Уровень 10: сложная DOM-строка',
    summary: 'Комбинация атрибутов и `innerHTML` из URL',
    theory: 'Понимание того, как браузер парсит HTML, помогает находить XSS в сложных конструкциях.',
    pageHtml: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Список контактов</title>
  </head>
  <body>
    <h1>Контакты</h1>
    <div id="contacts"></div>
    <script>
      const user = new URLSearchParams(window.location.search).get('user') || 'Гость';
      document.getElementById('contacts').innerHTML = '<div class="contact"><span>' + user + '</span></div>';
    </script>
  </body>
</html>`,
    pageCode: `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Список контактов</title>
  </head>
  <body>
    <h1>Контакты</h1>
    <div id="contacts"></div>
    <script>
      const user = new URLSearchParams(window.location.search).get('user') || 'Гость';
      document.getElementById('contacts').innerHTML = '<div class="contact"><span>' + user + '</span></div>';
    </script>
  </body>
</html>`,
  },
];
