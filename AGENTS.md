# Правила для AI-агентов

Источник правды — `mise.toml`, скрипты в `package.json` и конфиги проверок. README описывает продукт, а не порядок работы.

## Перед завершением изменения

- Запусти `mise run check`. Изменение не готово, пока команда не проходит. Это та же проверка, что в CI и в `pre-push`; не собирай свой список команд.
- `mise run check` ставит зависимости из lock-файла; после установки остальные шаги сети не требуют. Проверки с сетью или базой сравнения запускаются отдельно: `mise run secrets`, `mise run audit`, `mise run contract:breaking`.
- Безопасные автоправки: `mise run fix` (oxfmt и oxlint `--fix`). После запуска просмотри `git diff`.
- Не отключай правило линтера, чтобы пройти проверку. Исключение должно быть узким (конкретный путь и правило), с причиной, и его принимает человек.

## Контракт и кодогенерация

- Единственный источник правды для API — TypeSpec `packages/contract/main.tsp`. OpenAPI, SDK и серверные типы только генерируются.
- Не редактируй руками: `packages/contract/tsp-output/`, весь `packages/sdk/src/` (включая `index.ts`), `apps/api/src/generated/`. Меняй TypeSpec или `packages/sdk/openapi-ts.config.ts` и запускай `mise run codegen`.
- `mise run codegen` важен порядком: TypeSpec → OpenAPI → SDK → серверные типы. Отдельные шаги — `pnpm contract:build`, `pnpm sdk:build`, `pnpm api:types`.
- Локальный `check` не перегенерирует артефакты, а CI выполняет `mise run codegen` и затем `git diff --exit-code`. Забытая генерация или ручная правка артефакта упадут только в CI.
- Fastify автоматически подхватывает `apps/api/src/routes/*.ts` и `apps/api/src/plugins/*.ts`. Новый эндпоинт требует операции в TypeSpec и отдельного файла маршрута.
- `apps/api/test/contract.test.ts` проверяет контракт в обе стороны: все операции реализованы, лишних маршрутов нет, ответы соответствуют схемам. Перед тестами после правки TypeSpec нужен `mise run codegen`.
- `mise run contract:breaking` сравнивает OpenAPI с `origin/main`; перед запуском убедись, что базовая ветвь fetch-нута. В CI шаг идёт только на pull request.

## Инструменты и границы

- oxlint настроен централизованно в корневом `.oxlintrc.json` и запускается по `apps packages scripts` с `--deny-warnings`. Не добавляй пакетные `.oxlintrc.json`.
- oxfmt закреплён точно на `0.79.0`. Не обновляй его без причины: форматирование должно совпадать у всех и в CI.
- TypeScript во всех пакетах — `~6.0.2`. Не поднимай до 7.x: dependency-cruiser не поддерживает TypeScript 7.
- dependency-cruiser запрещает импорты между `apps/*`, импорты `apps/*` из `packages/*` и циклы. Общий код выноси в `packages/`.
- Knip настроен в корневом `knip.json`, syncpack работает на правилах по умолчанию. Не «чини» их широкими ignore: сначала проверь, действительно ли файл или зависимость не нужны. Версии общих зависимостей должны совпадать во всех workspace.
- vacuum должен проходить с `--min-score 90`. Не снижай порог, чтобы пройти; исправляй спецификацию.
- Сгенерированные файлы исключены из oxfmt, oxlint, Knip и dependency-cruiser. Не добавляй их в проверки вручную.

## Тесты

- Тесты есть только в `apps/api` (Vitest). `mise run test` запускает весь workspace.
- Один файл: `pnpm --filter @calendar/api exec vitest run test/routes/health.test.ts`. Watch-режим: `pnpm --filter @calendar/api test:watch`.
- Дымовой тест: `mise run smoke`.
- e2e-тестов и тестов фронтенда пока нет; не считай их покрытыми.

## Git и CI

- Новые коммиты — только Conventional Commits. Формат проверяет commitlint в `commit-msg` и в CI; старая история до внедрения правила не проверяется.
- Хуки `hk` ставятся командой `mise run setup` и живут в `git config`, а не в `.git/hooks/`. `pre-commit` проверяет staged-файлы, `pre-push` запускает полный `check`. Обход через `--no-verify` возможен, поэтому настоящий гейт — CI.
- `.github/workflows/hexlet-check.yml` сгенерирован Хекслетом: не удаляй, не редактируй и не добавляй в jactionlint. Линтуются только `ci.yml` и `security.yml`.
- GitHub Actions запинены на commit SHA. Сохраняй пины при правке workflow.
- `mise run dev` запускает фоновые процессы через pitchfork и возвращает управление. Смотри `mise daemons status`, `mise daemons logs api|web`, останавливай `mise daemons stop`. API — порт 3000, web — фиксированный 5173.

## Ориентиры

- `docs/quality-gates.md` — выбранные проверки, причины, ограничения и доказательства падений.
- `docs/toolchain-verification.md` — проверка цепочки TypeSpec → OpenAPI → SDK → серверные типы.
