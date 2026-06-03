Инструкция по запуску проекта XSS

1. Настроить backend .env

Файл должен быть здесь:

backend/.env

Пример содержимого:

PORT=4000
DATABASE_URL=postgres://xss_user:xss_password@localhost:5432/xss_sandbox
AUTH_SECRET=replace_with_a_secure_key

Важно: backend подключается именно к базе xss_sandbox. Если в DataGrip открыта база postgres,
то пользователи и прогресс сайта там могут не отображаться.


2. Запустить PostgreSQL

Если база уже запущена в Docker-контейнере, просто проверь, что порт 5432 доступен.

Проверка подключения:

psql postgres://xss_user:xss_password@localhost:5432/xss_sandbox

Если подключение прошло, можно выйти командой:

\q


3. Установить зависимости

Backend:

cd backend
npm install

Frontend:

cd ../frontend
npm install


4. Запустить backend

В отдельном терминале:

cd backend
npm run dev

Backend должен запуститься на:

http//:localhost:4000
Если ошибка:

Error: listen EADDRINUSE: address already in use :::4000

значит порт 4000 уже занят. Найти процесс:

lsof -nP -iTCP:4000 -sTCP:LISTEN

Остановить процесс по PID:

kill PID

После этого в терминале nodemon можно нажать:

rs


5. Запустить frontend

Во втором терминале:

cd frontend
npm run dev

Обычно frontend открывается на:

http//:localhost:5173
Если порт занят, Vite покажет другой порт, например:



6. Зарегистрироваться и войти

Открой frontend в браузере и зарегистрируй пользователя.

Без входа доступен только первый уровень. После входа доступны все уровни.


7. Сделать пользователя админом

Выполняй SQL именно в базе xss_sandbox:

SELECT current_database(), current_schema(), current_user;

Посмотреть пользователей:

SELECT id, email, is_admin
FROM users
ORDER BY id;

Выдать админку по email:

UPDATE users
SET is_admin = TRUE
WHERE email = 'qwe@gmail.com';

Проверить:

SELECT id, email, is_admin
FROM users
WHERE email = 'qwe@gmail.com';

После выдачи админки обнови страницу. Если кнопка "Результаты" не появилась, выйди и войди заново.


8. Админская страница

У админа в верхнем меню появляется кнопка:

Результаты

Она открывает страницу:


Там видны лучшие времена, попытки и даты обновления результатов всех пользователей.


9. Проверка сборки

Frontend:

cd frontend
npm run build

Backend syntax check для отдельных файлов:

cd backend
node --check src/app.js
node --check src/routes/auth.js
node --check src/routes/admin.js
node --check src/routes/levels.js


10. Частые проблемы

Кнопка "Результаты" не появляется:
- проверь, что пользователь есть в xss_sandbox.public.users;
- проверь, что is_admin = true;
- обнови страницу или выйди и войди заново;
- убедись, что backend перезапустился после изменений.

DataGrip показывает пустую таблицу users:
- проверь, что подключен к базе xss_sandbox, а не postgres;
- выполни SELECT current_database();

Backend не стартует:
- проверь backend/.env;
- проверь, что PostgreSQL запущен;
- проверь, что порт 4000 свободен.

Frontend не получает данные:
- backend должен работать на 
- frontend должен быть открыт через localhost, например.
(*_*)
