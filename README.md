# Календарь звонков


[![hexlet-check](https://github.com/Nov-AD/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Nov-AD/ai-for-developers-project-386/actions)
[![CI](https://github.com/Nov-AD/ai-for-developers-project-386/actions/workflows/ci.yml/badge.svg)](https://github.com/Nov-AD/ai-for-developers-project-386/actions/workflows/ci.yml)

«Запись на звонок» — упрощённый сервис бронирования времени по мотивам [Cal.com](https://cal.com). Владелец календаря публикует доступное время для встреч, а гость выбирает свободный слот и записывается на звонок. Это небольшое, но законченное приложение: весь путь от проектирования и API-контракта до запуска в облаке.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Границы проекта

Функциональность намеренно ограничена, чтобы сосредоточиться на главном. В проекте **нет**:

- авторизации и регистрации;
- личных кабинетов;
- интеграций с внешними календарями.

## Роли и сценарии

Владелец календаря один и задан заранее.

**Владелец** заводит типы встреч (у каждого — название, описание и длительность) и смотрит список предстоящих встреч всех типов.

**Гость** заходит без регистрации, выбирает тип встречи, открывает календарь на ближайшие 14 дней и записывается на свободный слот. Слот длится столько же, сколько выбранный тип встречи.

## API и контракт

Обязательная часть работы с API:

- TypeSpec-контракт;
- сгенерированная из него OpenAPI-спецификация;
- клиентский SDK для фронтенда, сгенерированный из OpenAPI.

Перед выбором инструментов нужно проверить, что для языка фронтенда существует генератор клиента из OpenAPI. Серверные типы и маршруты генерируются, если выбранный фреймворк это поддерживает; при отсутствии генератора бекенд реализуется по контракту и проверяется тестами.

## Правила бронирования

- Окно записи — 14 календарных дней; оно сдвигается с течением времени.
- Начало окна — сегодня или завтра (выбирается владельцем).
- Часы работы владельца и часовой пояс выбираются и фиксируются в спецификации.
- Длительность слота равна длительности типа встречи.
- Шаг доступных стартов фиксируется в спецификации.
- Пересечение интервалов запрещено, включая частичное наложение встреч разных типов.
- Следующая встреча может начинаться в момент окончания предыдущей.
- Правила соблюдаются и при двух одновременно пришедших запросах.

## Хранение данных

Данные можно хранить в памяти процесса. В этом случае **перезапуск приложения сбрасывает все записи** — это ограничение важно учитывать при использовании сервиса. База данных с сохранением данных тоже допустима; сохранность после перезапуска отдельным условием приёмки не является.

## Стек

Проект — TypeScript-монорепозиторий на pnpm, где TypeSpec-контракт является единственным источником правды.

- **Платформа:** TypeScript, Node.js 24 LTS, pnpm workspaces
- **Окружение:** mise (`mise.toml`, `mise.lock`) — зафиксированные версии инструментов, задачи и фоновые процессы
- **Контракт:** TypeSpec 1.x (`@typespec/http`, `@typespec/openapi3`) → OpenAPI 3.1
- **Клиентский SDK:** `@hey-api/openapi-ts` — SDK, типы, Zod-схемы и готовые TanStack Query-хуки
- **Бекенд:** Fastify 5 + Zod 4 (`fastify-type-provider-zod`), серверные типы из OpenAPI через `openapi-typescript`
- **Фронтенд:** React 19, Vite 8, TanStack Query 5, Tailwind CSS + shadcn/ui
- **Даты и время:** `date-fns` + `date-fns-tz` — хранение в UTC, границы дней считаются в таймзоне владельца
- **Хранение:** `Map` в памяти процесса за интерфейсом репозитория (см. [«Хранение данных»](#хранение-данных))
- **Тесты:** Vitest, `fastify.inject`; опционально Playwright для e2e
- **Деплой:** Docker, один инстанс — Render / Fly.io / Railway

### Структура репозитория

```text
packages/contract/   # TypeSpec-контракт и сгенерированный OpenAPI
packages/sdk/        # сгенерированный клиентский SDK
apps/api/            # Fastify-сервер
apps/web/            # React SPA
```

### Генерация

```bash
mise run codegen      # весь конвейер: TypeSpec → OpenAPI → SDK → серверные типы
mise run build        # codegen + сборка всех пакетов
```

Отдельные шаги доступны и через pnpm:

```bash
pnpm contract:build   # TypeSpec → OpenAPI
pnpm sdk:build        # OpenAPI → SDK, типы, Zod-схемы, query-хуки
pnpm api:types        # OpenAPI → серверные типы
```

Цепочка и выбор генераторов проверены: [docs/toolchain-verification.md](docs/toolchain-verification.md). Соответствие сервера контракту проверяется тестом `apps/api/test/contract.test.ts`.

### Проверки

Все герметичные проверки запускаются одной командой — локально, в Git-хуках и в CI:

```bash
mise run check
```

Задача ставит зависимости из lock-файла (`pnpm install --frozen-lockfile`), затем последовательно запускает:

- `mise run lint` — oxlint с `--deny-warnings` и jactionlint для GitHub Actions;
- `mise run fmt:check` — oxfmt в режиме проверки;
- `mise run typecheck` — TypeScript и TypeSpec (компиляция с `--warn-as-error`);
- `mise run knip` — неиспользуемые файлы, экспорты и зависимости;
- `mise run syncpack` — единые версии зависимостей в монорепо;
- `mise run arch` — границы пакетов и циклы импортов (dependency-cruiser);
- `mise run contract:lint` — vacuum для сгенерированного OpenAPI, минимальный score 90;
- `mise run test` — Vitest: контрактные тесты и дымовой тест API.

Безопасные автоправки: `mise run fix` (oxfmt и oxlint `--fix`).

Проверки, которым нужна сеть или база сравнения, вынесены в CI:

- `mise run contract:breaking` — oasdiff сравнивает OpenAPI с базовой ветвью и падает на ломающих изменениях (на pull request);
- `mise run secrets` — Betterleaks сканирует Git-историю;
- `mise run audit` — OSV-Scanner проверяет `pnpm-lock.yaml` по базе уязвимостей.

Workflow `.github/workflows/ci.yml` вызывает ту же `mise run check` через `jdx/mise-action`, дополнительно перегенерирует артефакты и падает, если `git diff` не пуст, проверяет сообщения коммитов (commitlint), секреты, ломающие изменения контракта и уязвимости. На push в любую другую ветку `.github/workflows/push-check.yml` запускает только `mise run check`. `.github/workflows/security.yml` повторяет сканирование уязвимостей и секретов по расписанию.

Хуки `hk` разделены на три уровня:

- `pre-commit` — быстрые проверки только staged-файлов: oxfmt, oxlint, Betterleaks (`--staged`), пробелы, переводы строк, конфликты слияния, большие файлы;
- `commit-msg` — commitlint проверяет Conventional Commits;
- `pre-push` — полная `mise run check`.

Хук можно обойти через `--no-verify`, поэтому настоящий гейт — CI.

Подборка инструментов, причины выбора и ограничения: [docs/quality-gates.md](docs/quality-gates.md).

Дымовой тест `apps/api/test/smoke.test.ts` поднимает приложение на случайном порту и проверяет, что `GET /health` отвечает `200 { "status": "ok" }`.

## Установка

Понадобятся только [mise](https://mise.jdx.dev/) и Git. Версии Node.js, pnpm, hk, pitchfork, jactionlint, Betterleaks, OSV-Scanner, vacuum и oasdiff зафиксированы в `mise.toml`, а контрольные суммы загрузок — в `mise.lock`.

```bash
git clone https://github.com/Nov-AD/ai-for-developers-project-386.git
cd ai-for-developers-project-386

mise install        # Node.js, pnpm, hk и pitchfork нужных версий
mise run setup      # зависимости из lock-файла + Git-хуки hk
```

`mise install` автоматически выполняет задачу `install` (`pnpm install --frozen-lockfile`). `mise run setup` дополнительно устанавливает хуки `pre-commit` и `pre-push`; задачу можно запускать повторно. Если включена активация mise в шелле, `setup` выполняется при входе в каталог проекта. При первом запуске mise может попросить подтвердить конфигурацию проекта — выполните `mise trust`.

## Использование

```bash
mise run dev            # запустить API и web, дождаться готовности и показать статус
mise daemons status     # состояние фоновых процессов
mise daemons logs api   # логи API; для фронтенда — logs web
mise daemons stop       # остановить оба процесса
```

`mise run dev` поднимает фоновые процессы через [pitchfork](https://pitchfork.jdx.dev/):

- **API** — Fastify на http://127.0.0.1:3000;
- **web** — Vite на http://127.0.0.1:5173. Перед стартом собирается `@calendar/sdk`, а Vite ждёт готовности API.

Процессы продолжают работать после выхода из задачи, поэтому их можно останавливать и запускать повторно. Порт 5173 зафиксирован: если он занят, Vite завершится с ошибкой, а не переедет на другой порт.

Фронтенд использует history-роутинг: `/` — главная страница, `/book` — страница записи. В продакшене статику `apps/web/dist` нужно отдавать с fallback на `index.html`, иначе прямой заход на `/book` вернёт 404.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
