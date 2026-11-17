# Проверка цепочки TypeSpec → OpenAPI → SDK

Проверка выполнена 16 ноября 2026 года до фиксации стека. Окружение: Node.js 24.11, pnpm 12.21.

| Звено | Инструмент | Версия |
| --- | --- | --- |
| Контракт | TypeSpec (`@typespec/http`, `@typespec/openapi3`) | 1.18.0 |
| Спецификация | OpenAPI | 3.1.0 |
| Клиентский SDK | `@hey-api/openapi-ts` | 0.99.0 |
| Серверные типы | `openapi-typescript` | 7.13.0 |
| Сервер | Fastify + `fastify-type-provider-zod` | 5.12 / 7.x |

## Клиентский SDK (обязательное требование)

Генератор для TypeScript существует и работает. Конфигурация — `packages/sdk/openapi-ts.config.ts`.

```bash
pnpm contract:build   # TypeSpec → packages/contract/tsp-output/openapi3/openapi.yaml
pnpm sdk:build        # OpenAPI → packages/sdk/src: типы, SDK-функции, fetch-клиент
```

Проверка: `pnpm build` собирает `apps/web`, который импортирует сгенерированные `getHealth`, `client` и типы ответа. Компиляция TypeScript подтверждает, что SDK пригоден для выбранного языка фронтенда.

## Генерация для бекенда

Для Fastify проверены доступные варианты:

| Инструмент | Что генерирует | Почему не выбран |
| --- | --- | --- |
| `openapi-typescript` 7.13 | только TypeScript-типы | нет маршрутов и схем валидации — используется как источник серверных типов |
| `@hey-api/openapi-ts`, плагин `fastify` | типы `RouteHandlers` для обработчиков | статус beta; маршруты и валидация не генерируются, нужен сторонний роутер |
| `fastify-openapi-glue` 4.12 | маршруты из спецификации в рантайме + валидация Ajv | не генерирует код и схемы; спецификация нужна в рантайме; валидация на JSON Schema, а не на Zod |
| `@nahkies/openapi-code-generator` 0.26 | Fastify + Zod по шаблонам | сторонний шаблонный генератор со своим каркасом проекта, низкое распространение |
| `@walecloud/fastify-openapi-typescript-generator` 1.5 | маршруты и `schema`-блоки | низкое распространение, не покрывает Zod-провайдер |

Вывод: зрелого генератора, который одновременно даёт маршруты, Zod-схемы валидации и типы в принятом стеке, нет. Поэтому сервер реализуется по контракту вручную, а соответствие контракту проверяется тестами.

## Как проверяется соответствие

```bash
pnpm api:types   # OpenAPI → apps/api/src/generated/openapi.d.ts
pnpm test        # apps/api/test/contract.test.ts
```

`apps/api/test/contract.test.ts` сверяет реализацию с `openapi.yaml`:

- каждая операция контракта имеет маршрут в Fastify, и наоборот — лишних маршрутов нет;
- фактический код ответа объявлен в контракте;
- тело ответа валидно по JSON Schema из контракта (Ajv, draft 2020-12).

Дополнительно Zod-схема маршрута связана с типом из OpenAPI через `satisfies z.ZodType<...>` (`apps/api/src/routes/health.ts`), поэтому расхождение формы ответа ломает сборку.

На момент первоначальной проверки в контракте не было операций с `body`/`query`/`params`.
В #8 добавлены операции с телами и query-параметром, проверяемые примеры и подготовка
строгих сценариев, включая `400`: [docs/calendar-contract.md](calendar-contract.md).
Наличие реализации новых маршрутов проверяется отдельно от готовности дизайна контракта.

## Найденные проблемы

TypeSpec по умолчанию эмитит OpenAPI 3.0.0, хотя стек заявлен на 3.1. Исправлено опцией эмиттера в `packages/contract/tspconfig.yaml`:

```yaml
options:
  "@typespec/openapi3":
    openapi-versions: ["3.1.0"]
```

## Источники

- https://typespec.io/docs/ — TypeSpec
- https://heyapi.dev/openapi-ts/ — генерация клиентского SDK
- https://heyapi.dev/openapi-ts/plugins/fastify — плагин Fastify (beta)
- https://github.com/seriousme/fastify-openapi-glue — маршрутизация из OpenAPI
- https://openapi-ts.dev/ — `openapi-typescript`
