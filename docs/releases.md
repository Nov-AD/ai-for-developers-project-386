# Выпуск приложения

Один релиз всего «Календаря звонков» из `main`, не независимые релизы workspace.
Корневой `package.json` и `.release-please-manifest.json` начинают с `0.1.0`.
Это исходная версия, а не утверждение о существовании тега или GitHub Release.
Стратегия `node` обновляет корневую версию, `CHANGELOG.md` и manifest. Workspace
остаётся private; npm publish, workspace-плагины и отдельные теги пакетов не нужны.

## Обычный цикл

1. Сливать обычные PR только после полного зелёного CI, включая генерацию,
   `mise run check`, commitlint, secrets, contract:breaking и audit.
2. Push в `main` запускает `Release Please`: job `check` повторно использует
   **весь** существующий `ci.yml` через `workflow_call`, без передачи release secret.
   Только после его успеха job `release` создаёт или обновляет release PR. Этот job
   не исполняет код приложения и отклоняет результат CI для устаревшего main SHA.
   Обычный push-CI также сохраняется: это дополнительный запуск полного гейта,
   а не сокращённая копия. Группы concurrency CI разделены по имени caller workflow,
   чтобы два запуска не отменяли друг друга.
3. Проверить release PR: версию, changelog, неизменность private workspace-пакетов
   и настоящий CI **для последнего коммита этого PR**, не только зелёный CI на main.
   Используется существующий `pull_request` CI без исключений для release-веток.
4. Человек сливает release PR штатным способом, сохраняя Conventional Commit
   `chore(main): release X.Y.Z` (например, squash с исходным заголовком).
   После успешного повторно используемого CI на main release-please создаёт
   `vX.Y.Z` и GitHub Release.

`fix:` увеличивает patch, `feat:` — minor, `!` / `BREAKING CHANGE:` — major,
в том числе до 1.0. Оба pre-major исключения явно выключены. `chore:` / `docs:`
сами по себе обычно не требуют выпуска. Версия не форсируется через `release-as`.
Первый сбор истории ограничен `bootstrap-sha` — коммитом `c9180e3` перед
контрактной цепочкой #7. После первого выпуска release-please использует последний
релиз, а не эту начальную границу. `feat: connect guest meeting type list (#9)`
повышает базовую `0.1.0` до `0.2.0`; последующий breaking commit изменит расчёт.

Release-please использует стабильную release-ветку/PR и метки `autorelease: pending`
и `autorelease: tagged`; повторный запуск обновляет ожидающий PR, а уже выпущенную
версию не выпускает заново. Не удалять эти метки, теги или manifest ради повтора.
При временной ошибке исправить причину и повторить workflow в Actions; если main
уже изменился, дождаться CI его новой вершины. Автослияния, force-tag и обхода
branch protection нет. Новые коммиты в main во время выпуска требуют внимания:
не сливать следующий release PR до завершения предыдущего выпуска.

## Учётные данные и обязательный CI release PR

Выбран **внешний fine-grained PAT** в Actions secret `RELEASE_PLEASE_TOKEN`,
ограниченный только этим репозиторием, с доступом:

- Contents: read/write — release-ветка, version/changelog, Git-тег и Release;
- Pull requests: read/write — release PR, его метки и комментарии;
- Metadata: read (автоматически).

Для обычного выпуска текущего main не нужны Administration, Workflows, Actions
write, обход правил или approval.
API меток и комментариев PR допускают Pull requests write, поэтому отдельное
Issues write не запрашивается. Владелец создаёт PAT с ограниченным сроком жизни,
добавляет secret и при необходимости подтверждает организационный доступ.
Само значение токена не читать и не печатать. Ни этот документ, ни workflow
не создают токен и не меняют настройки репозитория.

По актуальному Release API для старого target SHA, чьи `.github/workflows/`
отличаются от текущего main, может потребоваться Workflows write. Это не повод
расширять PAT автоматически: остановить выпуск и согласовать причину. Выпускать
слитый release PR своевременно, не подменять его SHA и не форсировать тег.

Внешний PAT выбран, потому что создание PR через `GITHUB_TOKEN` **не гарантирует
автоматический запуск остальных workflows**. Актуальная документация GitHub
описывает approval-required запуски для opened/synchronize/reopened; это не
автоматически пройденный CI. PAT позволяет штатным PR-событиям запускать CI.
Нет fallback на `GITHUB_TOKEN`, искусственных success checks, пропуска проверок,
`workflow_run`, `pull_request_target` или увеличения полномочий обычного CI.
Ambient `GITHUB_TOKEN` release workflow имеет только Contents read; запись
возможна только через отдельный secret в release workflow.

**Проверено 2026-11-17:** `gh secret list` показывает только `HEXLET_ID`.
`RELEASE_PLEASE_TOKEN` отсутствует, поэтому живой выпуск **заблокирован**:
preflight явно завершится ошибкой до action. Настройки Actions —
`default_workflow_permissions: read`, `can_approve_pull_request_reviews: false`.
Выбранный внешний PAT не требует включать разрешение GITHUB_TOKEN на создание
PR; эти настройки не изменялись. Наличие нужных прав будущего PAT и реальный запуск
CI на созданном им PR ещё должны быть подтверждены, а не предполагаются.

На ту же дату API `branches/main` показывает `protected: false`, а
`rules/branches/main` — `[]`. Не считать
документированное правило зелёного PR-CI установленной branch protection:
владелец отдельно решает, как обеспечить обязательность проверок. До этого
не сливать вручную падающий release PR. Workflow дополнительно не выпускает
приложение до успешного CI текущего main. Первая функция #9 имеет код, но её
браузерная/default-port приёмка ещё заблокирована; незавершённая интеграционная
ветка не является готовым релизом.

## Проверка без публикации

```bash
pnpm lint:actions
mise run codegen
pnpm --filter @calendar/api exec vitest run
mise run check
```

Action закреплён на `16a9c90856f42705d54a6fda1823352bdc62cf38`:
официальный тег `googleapis/release-please-action` v4.4.0, GitHub commit API
подтверждает `verification.verified: true`, `reason: valid`. Его lockfile
использует release-please 17.1.3.

Локальный dry-run этой версии с HTTP-фикстурами (без сетевых записей) проверен:
официальные `Manifest.fromManifest`, `buildPullRequests`, `buildChangeSet` и
`buildReleases` разобрали конфигурацию, сформировали `chore(main): release 0.2.0`,
корневые version/changelog/manifest и `v0.2.0` для фикстуры слитого PR.
Повторный расчёт сохраняет одну release-ветку; после фикстуры tagged release
новых кандидатов нет. Это проверка настоящего planner, **не** живых API-записей
или прав токена. Реальные PR/теги/Release ради демонстрации не создавались.

После штатного попадания конфигурации в main доступен официальный CLI 17.1.3:

```bash
release-please release-pr \
  --repo-url=Nov-AD/ai-for-developers-project-386 --target-branch=main --dry-run
release-please github-release \
  --repo-url=Nov-AD/ai-for-developers-project-386 --target-branch=main --dry-run
```

CLI читает конфигурацию **с GitHub main**, не локальный файл.
Использовать только read-only credential, не выводя его значение; без `--dry-run`
эти команды могут записывать PR/релизы и не являются проверкой.

## Источники

- [Action v4.4.0](https://github.com/googleapis/release-please-action/tree/16a9c90856f42705d54a6fda1823352bdc62cf38).
- [Manifest и bootstrap](https://github.com/googleapis/release-please/blob/v17.1.3/docs/manifest-releaser.md).
- [CLI и dry-run](https://github.com/googleapis/release-please/blob/v17.1.3/docs/cli.md).
- [GitHub: workflow triggers и токены](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).
- [API: необходимые права fine-grained PAT](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens).
- [Release API: ограничение для workflow-файлов target commit](https://docs.github.com/en/rest/releases/releases#create-a-release).
