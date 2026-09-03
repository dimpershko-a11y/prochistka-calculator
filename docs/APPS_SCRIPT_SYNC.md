# Синхронизация config.js через Google Apps Script

Эта интеграция позволяет публиковать настройки из веб-калькулятора одной кнопкой. GitHub-токен хранится только в Script Properties Google Apps Script и не передаётся в браузер.

## 1. Создайте fine-grained GitHub token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.

Настройки:
- Repository access: **Only select repositories** → `dimpershko-a11y/prochistka-calculator`.
- Repository permissions → **Contents: Read and write**.
- Остальные write-разрешения не нужны. Workflows не нужен, так как интеграция меняет только `config.js`.
- Задайте срок действия и сохраните токен сразу после создания.

## 2. Создайте Apps Script

Откройте https://script.google.com → **New project**.

Замените содержимое `Code.gs` кодом из файла:
`integrations/google-apps-script/Code.gs`.

## 3. Добавьте Script Properties

Apps Script → Project Settings → Script Properties → Add script property.

Добавьте:

- `GITHUB_TOKEN` — fine-grained token GitHub.
- `GITHUB_OWNER` — `dimpershko-a11y`.
- `GITHUB_REPO` — `prochistka-calculator`.
- `GITHUB_BRANCH` — ветка, из которой работает веб-калькулятор. Для этого релиза: `v4.11.15`.
- `GITHUB_PATH` — `config.js` (необязательно, это значение используется по умолчанию).
- `SYNC_SECRET` — отдельный длинный случайный ключ публикации. Не используйте здесь GitHub-токен.

## 4. Проверьте доступ к GitHub

В редакторе Apps Script выберите функцию `testGitHubConnection` и нажмите **Run**.

При первом запуске Google попросит разрешить внешние HTTP-запросы. После успешного выполнения в Execution log должна появиться текущая ревизия `config.js`.

## 5. Опубликуйте Apps Script как Web app

Deploy → New deployment → тип **Web app**.

- Execute as: **Me**.
- Who has access: **Anyone**.

Нажмите Deploy и скопируйте URL, который заканчивается на `/exec`.

Доступ «Anyone» нужен, чтобы веб-калькулятор мог отправить POST-запрос без отдельной Google-авторизации. Запись защищена `SYNC_SECRET`, а Apps Script жёстко ограничен одним репозиторием, одной веткой и файлом `config.js`.

## 6. Подключите калькулятор

В калькуляторе:

**Меню → Данные → Синхронизация настроек**

1. Вставьте URL Apps Script.
2. Нажмите **Сохранить URL**.
3. Введите значение `SYNC_SECRET` в поле «Ключ публикации».
4. Нажмите **Опубликовать настройки**.

Ключ публикации хранится только в текущей сессии браузера. GitHub-токен браузеру недоступен.

После первой успешной публикации URL Apps Script попадёт в новый `config.js`, поэтому другие устройства получат URL автоматически.

## 7. Как работает синхронизация

- Публикация увеличивает `CONFIG_REVISION`.
- Apps Script проверяет текущую ревизию на GitHub и не разрешает затереть более новую версию старой.
- Другие устройства проверяют `config.js` при запуске и при возврате на вкладку.
- Если локальных изменений нет, новая ревизия применяется автоматически.
- Если локальные настройки изменены, калькулятор показывает конфликт и не перезаписывает их без подтверждения.

## Безопасность

- Не помещайте `GITHUB_TOKEN` в `config.js`, Google Drive, JavaScript калькулятора или резервные копии.
- При утечке токена отзовите его в GitHub и создайте новый, затем замените только Script Property `GITHUB_TOKEN`.
- При утечке `SYNC_SECRET` замените его в Script Properties. GitHub-токен при этом менять не требуется.
- При переходе на другую production-ветку обновите `GITHUB_BRANCH` в Script Properties.
