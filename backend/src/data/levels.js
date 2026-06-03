const pageStyle = `
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 28px;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1f2937;
      background: #f4f6f8;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid #d9dee7;
      border-radius: 10px;
      background: #fff;
      padding: 24px;
      box-shadow: 0 18px 55px -45px rgba(15, 23, 42, 0.8);
    }
    h1 { margin: 0 0 10px; font-size: 26px; }
    p { line-height: 1.6; }
    form, .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
    input, textarea {
      flex: 1 1 280px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      font: inherit;
    }
    textarea { min-height: 90px; resize: vertical; }
    button, a.button {
      border: 0;
      border-radius: 8px;
      background: #1f2937;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      text-decoration: none;
      font: inherit;
      font-weight: 650;
    }
    .panel {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      margin-top: 16px;
      min-height: 52px;
      padding: 14px;
    }
    .muted { color: #64748b; }
    .comment, .card, .notice {
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 0;
    }
    .comment:last-child, .card:last-child, .notice:last-child { border-bottom: 0; }
    code {
      border-radius: 6px;
      background: #eef2f7;
      padding: 2px 5px;
    }
  </style>`;

function makeHtml(title, body, script) {
  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    ${pageStyle}
  </head>
  <body>
    <main>
${body}
    </main>
    <script>
${script}
    </script>
  </body>
</html>`;
}

function makeCode(title, body, script) {
  return makeHtml(title, body, script).replace(pageStyle, '<style>/* стили страницы скрыты для краткости */</style>');
}

const levels = [
  {
    id: 1,
    title: 'Уровень 1: отраженный поиск',
    summary: 'Параметр поиска выводится через innerHTML без экранирования',
    theory: 'Reflected XSS появляется, когда приложение берет данные из запроса или формы и сразу возвращает их в HTML. Опасный признак здесь — строка пользователя склеивается с HTML-разметкой и попадает в innerHTML.',
    goal: 'Добейтесь выполнения JavaScript через поле поиска. Уровень засчитается только после вызова alert, confirm или prompt внутри уязвимой страницы.',
    hint: 'Проверьте, что обычный текст появляется в блоке результата. Затем подумайте, какой HTML-элемент может выполнить обработчик события сразу после вставки в DOM.',
    solution: 'Уязвимость в строке result.innerHTML = ... + query. Один рабочий вариант: ввести <img src=x onerror=alert(1)> и нажать «Найти». Браузер создаст картинку с ошибочным src, сработает onerror и вызовет alert.',
    body: `      <h1>Поиск по базе статей</h1>
      <p class="muted">Сервис показывает поисковую фразу рядом с результатами.</p>
      <form id="searchForm">
        <input id="query" name="q" placeholder="Например: xss" />
        <button type="submit">Найти</button>
      </form>
      <div id="result" class="panel">Введите поисковую фразу.</div>`,
    script: `      const form = document.getElementById('searchForm');
      const queryInput = document.getElementById('query');
      const result = document.getElementById('result');

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const query = queryInput.value;
        result.innerHTML = '<p>Результаты для: <strong>' + query + '</strong></p>';
      });`,
  },
  {
    id: 2,
    title: 'Уровень 2: комментарии',
    summary: 'Комментарий сохраняется в массив и повторно рендерится как HTML',
    theory: 'Stored XSS опаснее reflected XSS: payload сохраняется и выполняется при каждом просмотре страницы. В реальном продукте таким местом могут быть комментарии, отзывы, тикеты или профиль пользователя.',
    goal: 'Добавьте комментарий, который выполнит JavaScript после сохранения и повторного отображения списка.',
    hint: 'Посмотрите на render(): каждый комментарий оборачивается в div, но сам текст комментария не экранируется.',
    solution: 'Функция render собирает HTML через comments.map(... + text + ...). В комментарий можно отправить <img src=x onerror=alert(1)>. После render картинка попадет в DOM, ошибка загрузки вызовет alert, и уровень завершится.',
    body: `      <h1>Отзывы к релизу</h1>
      <p class="muted">Новые сообщения добавляются в общий список.</p>
      <form id="commentForm">
        <input id="comment" placeholder="Ваш комментарий" />
        <button type="submit">Отправить</button>
      </form>
      <div id="comments" class="panel"></div>`,
    script: `      const comments = ['Команда безопасности: проверьте пользовательский ввод.'];
      const commentInput = document.getElementById('comment');
      const container = document.getElementById('comments');

      function render() {
        container.innerHTML = comments
          .map((text) => '<div class="comment">' + text + '</div>')
          .join('');
      }

      document.getElementById('commentForm').addEventListener('submit', function (event) {
        event.preventDefault();
        comments.push(commentInput.value);
        commentInput.value = '';
        render();
      });

      render();`,
  },
  {
    id: 3,
    title: 'Уровень 3: hash-роутер',
    summary: 'Фрагмент URL используется как заголовок страницы',
    theory: 'DOM XSS возникает полностью на клиенте. Сервер может отдавать безопасную страницу, но JavaScript в браузере берет location.hash, location.search или localStorage и небезопасно вставляет данные в DOM.',
    goal: 'Измените экран через hash-фрагмент так, чтобы вставленный HTML вызвал JavaScript.',
    hint: 'Форма меняет window.location.hash. После этого функция renderRoute читает hash и пишет его в innerHTML.',
    solution: 'Слабое место — route.innerHTML = ... + pageName. Введите <img src=x onerror=alert(1)> и нажмите «Открыть раздел». Payload окажется в hash, затем в innerHTML, после чего сработает onerror.',
    body: `      <h1>Мини-роутер кабинета</h1>
      <p class="muted">Название раздела берется из hash-фрагмента URL.</p>
      <form id="routeForm">
        <input id="routeName" placeholder="Например: billing" />
        <button type="submit">Открыть раздел</button>
      </form>
      <div id="route" class="panel"></div>`,
    script: `      const route = document.getElementById('route');
      const routeName = document.getElementById('routeName');

      function renderRoute() {
        const pageName = decodeURIComponent(window.location.hash.slice(1) || 'dashboard');
        route.innerHTML = '<h2>Раздел: ' + pageName + '</h2>';
      }

      document.getElementById('routeForm').addEventListener('submit', function (event) {
        event.preventDefault();
        window.location.hash = encodeURIComponent(routeName.value);
        renderRoute();
      });

      window.addEventListener('hashchange', renderRoute);
      renderRoute();`,
  },
  {
    id: 4,
    title: 'Уровень 4: разрыв атрибута',
    summary: 'Промокод вставляется внутрь href без кодирования',
    theory: 'Если данные пользователя помещаются внутрь HTML-атрибута, недостаточно думать только о тегах. Нужно учитывать кавычки: один символ может закрыть атрибут и добавить новый обработчик события.',
    goal: 'Сформируйте ссылку с промокодом так, чтобы при клике по ней выполнился JavaScript.',
    hint: 'Промокод стоит внутри двойных кавычек href. Попробуйте закрыть кавычку и добавить обработчик клика.',
    solution: 'Поле code попадает в строку href="/coupon?code=...". Введите " onclick="alert(1) и нажмите «Создать ссылку», затем кликните по ссылке. Получится атрибут onclick, который вызовет alert.',
    body: `      <h1>Генератор промоссылки</h1>
      <p class="muted">Маркетинг просит быстро проверить промокод перед отправкой.</p>
      <form id="couponForm">
        <input id="coupon" placeholder="SUMMER-2026" />
        <button type="submit">Создать ссылку</button>
      </form>
      <div id="preview" class="panel">Ссылка появится здесь.</div>`,
    script: `      const preview = document.getElementById('preview');

      document.getElementById('couponForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const code = document.getElementById('coupon').value;
        preview.innerHTML = '<a class="button" href="/coupon?code=' + code + '">Открыть промокод</a>';
      });`,
  },
  {
    id: 5,
    title: 'Уровень 5: опасная ссылка',
    summary: 'Пользовательский URL вставляется в href без проверки протокола',
    theory: 'Даже если приложение не использует innerHTML для текста, оно может создать опасную ссылку. Для href важно разрешать только ожидаемые протоколы, например https:, и блокировать javascript:.',
    goal: 'Создайте ссылку, клик по которой выполнит JavaScript.',
    hint: 'В этом задании не нужно ломать HTML. Достаточно использовать протокол, который браузер выполнит как код при клике.',
    solution: 'Введите javascript:alert(1), нажмите «Показать предпросмотр», затем кликните «Открыть ссылку». href получит javascript URL и выполнит alert.',
    body: `      <h1>Предпросмотр внешней ссылки</h1>
      <p class="muted">Панель поддержки проверяет ссылку перед отправкой пользователю.</p>
      <form id="linkForm">
        <input id="link" placeholder="https://example.com/help" />
        <button type="submit">Показать предпросмотр</button>
      </form>
      <div id="linkPreview" class="panel"></div>`,
    script: `      const linkPreview = document.getElementById('linkPreview');

      document.getElementById('linkForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const url = document.getElementById('link').value;
        linkPreview.innerHTML = '<a class="button" href="' + url + '">Открыть ссылку</a>';
      });`,
  },
  {
    id: 6,
    title: 'Уровень 6: шаблон карточки',
    summary: 'Имя пользователя вставляется и в текст, и в aria-label',
    theory: 'Одна и та же строка может попадать сразу в несколько контекстов: текст узла и HTML-атрибут. Payload должен подходить именно к тому месту, где данные оказываются без экранирования.',
    goal: 'Сломайте атрибут aria-label и добавьте обработчик события на кнопку профиля.',
    hint: 'Имя находится внутри двойных кавычек aria-label. После генерации карточки нужно взаимодействовать с кнопкой.',
    solution: 'Введите " onmouseover="alert(1) x=" и нажмите «Создать карточку». Затем наведите курсор на кнопку профиля. Кавычка закрывает aria-label, а onmouseover становится новым атрибутом.',
    body: `      <h1>Карточка сотрудника</h1>
      <p class="muted">Имя используется в подписи кнопки и в тексте карточки.</p>
      <form id="profileForm">
        <input id="employee" placeholder="Анна" />
        <button type="submit">Создать карточку</button>
      </form>
      <div id="profile" class="panel"></div>`,
    script: `      const profile = document.getElementById('profile');

      document.getElementById('profileForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('employee').value;
        profile.innerHTML =
          '<div class="card">' +
          '<p>Сотрудник: ' + name + '</p>' +
          '<button aria-label="Открыть профиль ' + name + '">Открыть профиль</button>' +
          '</div>';
      });`,
  },
  {
    id: 7,
    title: 'Уровень 7: markdown-превью',
    summary: 'Markdown обрабатывается регулярками и выводится через innerHTML',
    theory: 'Самописный markdown-парсер часто превращается в XSS. Если после преобразования строка отдается в innerHTML, HTML внутри исходного текста тоже станет настоящей разметкой.',
    goal: 'Опубликуйте заметку, в которой после предпросмотра выполнится JavaScript.',
    hint: 'Жирный текст здесь не важен. Проверьте, пропускает ли превью обычные HTML-теги.',
    solution: 'Введите <img src=x onerror=alert(1)> и нажмите «Обновить превью». Парсер не очищает HTML, поэтому тег попадет в preview.innerHTML и выполнит обработчик onerror.',
    body: `      <h1>Черновик заметки</h1>
      <p class="muted">Поддерживается только очень простой markdown.</p>
      <textarea id="markdown" placeholder="**Важное сообщение**"></textarea>
      <div class="toolbar">
        <button id="previewButton" type="button">Обновить превью</button>
      </div>
      <div id="preview" class="panel"></div>`,
    script: `      const markdown = document.getElementById('markdown');
      const preview = document.getElementById('preview');

      function toHtml(value) {
        return value
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\n/g, '<br>');
      }

      document.getElementById('previewButton').addEventListener('click', function () {
        preview.innerHTML = toHtml(markdown.value);
      });`,
  },
  {
    id: 8,
    title: 'Уровень 8: document.write',
    summary: 'Текст объявления полностью перезаписывает документ',
    theory: 'document.write почти всегда плохой знак рядом с пользовательскими данными. Он заставляет браузер парсить строку как HTML-документ, включая опасные атрибуты и элементы.',
    goal: 'Сформируйте объявление, которое выполнит JavaScript после перерисовки документа.',
    hint: 'После отправки формы страница будет перезаписана. Payload должен сам выполнить код при появлении в новом документе.',
    solution: 'Введите <img src=x onerror=alert(1)> и нажмите «Опубликовать». document.write создаст новый HTML с этим тегом, ошибка загрузки изображения вызовет alert.',
    body: `      <h1>Срочное объявление</h1>
      <p class="muted">Администратор может быстро заменить содержимое страницы объявлением.</p>
      <form id="noticeForm">
        <input id="notice" placeholder="Плановые работы в 19:00" />
        <button type="submit">Опубликовать</button>
      </form>
      <div class="panel">Предпросмотра нет: объявление сразу пишется в документ.</div>`,
    script: `      document.getElementById('noticeForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const notice = document.getElementById('notice').value;
        document.open();
        document.write('<main><h1>Объявление</h1><div class="notice">' + notice + '</div></main>');
        document.close();
      });`,
  },
  {
    id: 9,
    title: 'Уровень 9: insertAdjacentHTML',
    summary: 'Текст уведомления добавляется в DOM как готовый HTML',
    theory: 'insertAdjacentHTML удобен, но он не отличает безопасный текст от HTML. Если строка пришла от пользователя, ее нужно экранировать или добавлять через textContent.',
    goal: 'Добавьте уведомление, которое выполнит JavaScript после вставки в список.',
    hint: 'Новое уведомление добавляется в начало списка без очистки HTML.',
    solution: 'Введите <img src=x onerror=alert(1)> и нажмите «Добавить». Метод insertAdjacentHTML распарсит строку как HTML, после чего onerror выполнит alert.',
    body: `      <h1>Лента уведомлений</h1>
      <p class="muted">Оператор может добавить быстрое системное уведомление.</p>
      <form id="noticeForm">
        <input id="notice" placeholder="Новый вход в аккаунт" />
        <button type="submit">Добавить</button>
      </form>
      <div id="feed" class="panel"></div>`,
    script: `      const feed = document.getElementById('feed');

      document.getElementById('noticeForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const notice = document.getElementById('notice').value;
        feed.insertAdjacentHTML('afterbegin', '<div class="notice">' + notice + '</div>');
      });`,
  },
  {
    id: 10,
    title: 'Уровень 10: плохой фильтр',
    summary: 'Фильтр удаляет только script-теги, но оставляет опасные атрибуты',
    theory: 'Черные списки редко закрывают XSS полностью. Удалить слово script недостаточно: JavaScript может запускаться через обработчики событий, SVG, ссылки и другие HTML-механизмы.',
    goal: 'Обойдите фильтр и выполните JavaScript без использования script-тега.',
    hint: 'Фильтр удаляет только конструкции вида <script>...</script>. Остальной HTML остается как есть.',
    solution: 'Введите <svg onload=alert(1)></svg> и нажмите «Сохранить описание». Фильтр не трогает svg и onload, поэтому браузер выполнит обработчик.',
    body: `      <h1>Описание профиля</h1>
      <p class="muted">Разработчик добавил фильтр, который должен запрещать скрипты.</p>
      <textarea id="bio" placeholder="Расскажите о себе"></textarea>
      <div class="toolbar">
        <button id="saveBio" type="button">Сохранить описание</button>
      </div>
      <div id="bioPreview" class="panel"></div>`,
    script: `      const bio = document.getElementById('bio');
      const bioPreview = document.getElementById('bioPreview');

      function naiveFilter(value) {
        return value.replace(/<script[\\s\\S]*?>[\\s\\S]*?<\\/script>/gi, '');
      }

      document.getElementById('saveBio').addEventListener('click', function () {
        bioPreview.innerHTML = naiveFilter(bio.value);
      });`,
  },
  {
    id: 11,
    title: 'Уровень 11: SQLi в форме входа',
    summary: 'Логин и пароль склеиваются в SQL-запрос без параметров',
    theory: 'SQL injection появляется, когда пользовательский ввод становится частью SQL-кода. В форме входа это может превратить проверку пароля в условие, которое всегда истинно.',
    goal: 'Обойдите вход так, чтобы приложение показало админскую сессию. Результат засчитается только при успешном обходе проверки.',
    hint: 'Посмотрите на запрос в отладочном блоке. Нужно закрыть строку и добавить условие, которое вернет true.',
    check: 'Уровень завершается, когда страница показывает вход под admin из-за SQL-инъекции.',
    solution: 'В поле логина введите admin\' OR \'1\'=\'1\' -- и любой пароль. Условие OR делает WHERE истинным, а -- комментирует остаток запроса.',
    body: `      <h1>Вход в админ-панель</h1>
      <p class="muted">Система показывает SQL-запрос, который она собирает для проверки пользователя.</p>
      <form id="loginForm">
        <input id="login" placeholder="Логин" />
        <input id="password" placeholder="Пароль" />
        <button type="submit">Войти</button>
      </form>
      <div id="queryBox" class="panel">Запрос появится после отправки формы.</div>
      <div id="session" class="panel">Сессия не создана.</div>`,
    script: `      const users = [
        { login: 'admin', password: 'correct-horse', role: 'admin' },
        { login: 'guest', password: 'guest', role: 'guest' }
      ];
      const queryBox = document.getElementById('queryBox');
      const session = document.getElementById('session');

      function complete() {
        if (window.xssLabComplete) window.xssLabComplete('sql-login-bypass');
      }

      document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        const query = "SELECT * FROM users WHERE login = '" + login + "' AND password = '" + password + "' LIMIT 1";
        const normalized = query.toLowerCase().replace(/\\s+/g, ' ');
        queryBox.innerHTML = '<code>' + query + '</code>';

        const bypassed = normalized.includes("' or '1'='1") && normalized.includes('--');
        const directMatch = users.find((user) => user.login === login && user.password === password);
        const user = bypassed ? users[0] : directMatch;

        if (!user) {
          session.textContent = 'Неверный логин или пароль.';
          return;
        }

        session.innerHTML = '<strong>Сессия:</strong> ' + user.login + ' / ' + user.role;
        if (bypassed && user.role === 'admin') {
          complete();
        }
      });`,
  },
  {
    id: 12,
    title: 'Уровень 12: UNION-инъекция',
    summary: 'Фильтр каталога позволяет присоединить чужую таблицу через UNION',
    theory: 'UNION-based SQLi используют, чтобы подмешать к ожидаемому результату строки из другой таблицы. Частый симптом — пользовательский фильтр попадает в WHERE как часть SQL.',
    goal: 'Выведите секретную строку из таблицы users через поле категории.',
    hint: 'Запрос выбирает name и price из products. Попробуйте дописать UNION SELECT с такими же двумя колонками.',
    check: 'Уровень завершается, когда в результатах появляется пароль администратора.',
    solution: 'Введите electronics\' UNION SELECT login, password FROM users --. Фильтр категории закрывается, UNION добавляет строки из users, а комментарий отсекает хвост запроса.',
    body: `      <h1>Фильтр каталога</h1>
      <p class="muted">Категория товара вставляется прямо в SQL-запрос.</p>
      <form id="catalogForm">
        <input id="category" placeholder="electronics" />
        <button type="submit">Показать товары</button>
      </form>
      <div id="catalogQuery" class="panel">Введите категорию.</div>
      <div id="products" class="panel"></div>`,
    script: `      const products = [
        { name: 'USB tester', category: 'electronics', price: '$19' },
        { name: 'Debug hoodie', category: 'clothes', price: '$42' }
      ];
      const secretRows = [{ name: 'admin', price: 'p@ssw0rd-from-users' }];
      const catalogQuery = document.getElementById('catalogQuery');
      const productsBox = document.getElementById('products');

      function renderRows(rows) {
        productsBox.innerHTML = rows.map((row) => '<div class="card"><strong>' + row.name + '</strong><br><span class="muted">' + row.price + '</span></div>').join('');
      }

      document.getElementById('catalogForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const category = document.getElementById('category').value;
        const query = "SELECT name, price FROM products WHERE category = '" + category + "'";
        const normalized = query.toLowerCase().replace(/\\s+/g, ' ');
        catalogQuery.innerHTML = '<code>' + query + '</code>';

        if (normalized.includes("' union select") && normalized.includes('from users') && normalized.includes('--')) {
          renderRows(secretRows);
          if (window.xssLabComplete) window.xssLabComplete('union-sqli');
          return;
        }

        renderRows(products.filter((item) => item.category === category));
      });`,
  },
  {
    id: 13,
    title: 'Уровень 13: IDOR в счетах',
    summary: 'Номер счета запрашивается без проверки владельца',
    theory: 'IDOR возникает, когда приложение доверяет идентификатору из запроса и не проверяет, имеет ли текущий пользователь право читать объект. Это не SQLi, а ошибка авторизации на уровне бизнес-логики.',
    goal: 'Откройте чужой счет, перебрав идентификатор.',
    hint: 'Ваш счет — INV-1001. Попробуйте соседние номера и смотрите, меняется ли владелец.',
    check: 'Уровень завершается, когда отображается счет другого пользователя.',
    solution: 'Введите INV-1003 и нажмите «Открыть счет». Приложение найдет объект по ID, но не проверит владельца, поэтому покажет чужой счет.',
    body: `      <h1>Просмотр счета</h1>
      <p class="muted">Вы вошли как marina@example.local. Форма принимает номер счета.</p>
      <form id="invoiceForm">
        <input id="invoiceId" placeholder="INV-1001" />
        <button type="submit">Открыть счет</button>
      </form>
      <div id="invoice" class="panel">Счет не выбран.</div>`,
    script: `      const currentUser = 'marina@example.local';
      const invoices = {
        'INV-1001': { owner: 'marina@example.local', amount: '4 800 ₽' },
        'INV-1002': { owner: 'marina@example.local', amount: '1 200 ₽' },
        'INV-1003': { owner: 'victor@example.local', amount: '98 000 ₽' }
      };
      const invoice = document.getElementById('invoice');

      document.getElementById('invoiceForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const id = document.getElementById('invoiceId').value.trim().toUpperCase();
        const record = invoices[id];

        if (!record) {
          invoice.textContent = 'Счет не найден.';
          return;
        }

        invoice.innerHTML = '<strong>' + id + '</strong><br>Владелец: ' + record.owner + '<br>Сумма: ' + record.amount;
        if (record.owner !== currentUser && window.xssLabComplete) {
          window.xssLabComplete('idor-invoice');
        }
      });`,
  },
  {
    id: 14,
    title: 'Уровень 14: path traversal',
    summary: 'Имя файла присоединяется к пути без нормализации и allowlist',
    theory: 'Path traversal позволяет выйти за пределы ожидаемой папки через последовательности вроде ../. Сервер должен нормализовать путь и проверять, что итоговый файл остается в разрешенной директории.',
    goal: 'Прочитайте файл с админским токеном за пределами папки public.',
    hint: 'Приложение читает из /app/public/. Нужно подняться на уровень выше и обратиться к secrets/admin-token.txt.',
    check: 'Уровень завершается, когда в панели появляется секретный токен.',
    solution: 'Введите ../secrets/admin-token.txt. Итоговый путь станет /app/public/../secrets/admin-token.txt, что ведет к секретному файлу.',
    body: `      <h1>Загрузка шаблона</h1>
      <p class="muted">Панель читает текстовые шаблоны из публичной директории.</p>
      <form id="fileForm">
        <input id="fileName" placeholder="welcome.txt" />
        <button type="submit">Открыть файл</button>
      </form>
      <div id="pathBox" class="panel">Путь появится после запроса.</div>
      <div id="fileContent" class="panel"></div>`,
    script: `      const files = {
        '/app/public/welcome.txt': 'Добро пожаловать в портал поддержки.',
        '/app/public/status.txt': 'Все сервисы работают штатно.',
        '/app/secrets/admin-token.txt': 'ADMIN_TOKEN=terehin-root-2026'
      };
      const pathBox = document.getElementById('pathBox');
      const fileContent = document.getElementById('fileContent');

      function normalize(path) {
        const parts = [];
        path.split('/').forEach((part) => {
          if (!part || part === '.') return;
          if (part === '..') parts.pop();
          else parts.push(part);
        });
        return '/' + parts.join('/');
      }

      document.getElementById('fileForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('fileName').value.trim();
        const rawPath = '/app/public/' + name;
        const resolved = normalize(rawPath);
        pathBox.innerHTML = '<code>' + rawPath + '</code>';
        fileContent.textContent = files[resolved] || 'Файл не найден.';

        if (resolved === '/app/secrets/admin-token.txt' && window.xssLabComplete) {
          window.xssLabComplete('path-traversal');
        }
      });`,
  },
  {
    id: 15,
    title: 'Уровень 15: command injection',
    summary: 'Хост подставляется в shell-команду диагностики без экранирования',
    theory: 'Command injection возникает, когда ввод пользователя попадает в командную строку. Символы ;, && и | могут добавить вторую команду, если приложение не валидирует аргументы и не использует безопасный API.',
    goal: 'Добавьте вторую команду и прочитайте тренировочный флаг.',
    hint: 'Команда выглядит как ping -c 1 <host>. Попробуйте завершить ping и выполнить чтение /flag.txt.',
    check: 'Уровень завершается, когда вывод диагностики содержит FLAG.',
    solution: 'Введите 127.0.0.1; cat /flag.txt. Символ ; добавляет вторую команду, поэтому приложение выводит содержимое флага.',
    body: `      <h1>Сетевая диагностика</h1>
      <p class="muted">Саппорт запускает ping для указанного хоста.</p>
      <form id="diagnosticsForm">
        <input id="host" placeholder="127.0.0.1" />
        <button type="submit">Запустить</button>
      </form>
      <div id="commandBox" class="panel">Команда появится после запуска.</div>
      <div id="output" class="panel"></div>`,
    script: `      const commandBox = document.getElementById('commandBox');
      const output = document.getElementById('output');

      document.getElementById('diagnosticsForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const host = document.getElementById('host').value.trim();
        const command = 'ping -c 1 ' + host;
        const normalized = command.toLowerCase().replace(/\\s+/g, ' ');
        commandBox.innerHTML = '<code>' + command + '</code>';

        if ((normalized.includes('; cat /flag.txt') || normalized.includes('&& cat /flag.txt')) && window.xssLabComplete) {
          output.innerHTML = 'PING complete<br><strong>FLAG{command_injection_lab}</strong>';
          window.xssLabComplete('command-injection');
          return;
        }

        output.textContent = host ? 'PING ' + host + ': 1 packet transmitted, 1 packet received' : 'Укажите хост.';
      });`,
  },
];

module.exports = levels.map((level) => ({
  id: level.id,
  title: level.title,
  summary: level.summary,
  theory: level.theory,
  goal: level.goal,
  hint: level.hint,
  check: level.check || 'Уровень завершается только когда payload реально вызывает alert, confirm или prompt внутри страницы задания.',
  solution: level.solution,
  pageHtml: makeHtml(level.title, level.body, level.script),
  pageCode: makeCode(level.title, level.body, level.script),
}));
