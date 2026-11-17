# Правила для AI-агентов

- Перед завершением изменения запусти `mise run check`. Изменение не готово, пока команда не проходит.
- Сгенерированные файлы не редактируются руками: `packages/contract/tsp-output/openapi3/openapi.yaml`, `packages/sdk/src/*.gen.ts`, `packages/sdk/src/client/`, `packages/sdk/src/core/`, `apps/api/src/generated/`. Меняй TypeSpec или конфигурацию генератора и запускай `mise run codegen`.
- Не отключай правило линтера, чтобы пройти проверку. Исключение должно быть узким (конкретный путь и правило), с причиной, и его принимает человек.
- Безопасные автоправки: `mise run fix`. После запуска просмотри `git diff`.
- Полная локальная проверка перед push — `mise run check`. CI запускает ту же команду.
- Файл `.github/workflows/hexlet-check.yml` сгенерирован Хекслетом: не удаляй и не редактируй его.
