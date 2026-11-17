# Issue tracker: GitHub

Задачи и спеки этого репозитория живут в GitHub Issues. Все операции — через `gh` CLI.

## Конвенции

- **Создать задачу**: `gh issue create --title "..." --body "..."`. Для многострочного тела используй heredoc.
- **Прочитать задачу**: `gh issue view <number> --json number,title,body,labels,comments`.
- **Список задач**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` с подходящими фильтрами `--label` и `--state`.
- **Сделать задачу подзадачей**: `gh issue create --parent <parent> ...` либо `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). На старом `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (нужен database id, см. **Блокировки** ниже). Без sub-issues — строка `Part of #<parent>` в начале тела подзадачи.
- **Блокировки**: используем нативные зависимости GitHub — они каноничны и видны в UI. Добавить ребро: `gh issue create --blocked-by <n>,<n> ...` или `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). На старом `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, где `<blocker-db-id>` — числовой **database id** блокера (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _не_ `#number` и не `node_id`). Где зависимости недоступны, запасной вариант — строка `Blocked by: #<n>, #<n>` в начале тела ребёнка. Задача разблокирована, когда закрыты все её блокеры.
- **Сколько открытых блокеров**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (только открытые; 0 — можно брать в работу). `gh issue view <n> --json blockedBy` тоже отдаёт закрытые блокеры, поэтому фильтруй: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Комментарий к задаче**: `gh issue comment <number> --body "..."`
- **Лейблы**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: сначала объяснение — `gh issue comment <number> --body "..."`, затем `gh issue close <number>`. На уже закрытой задаче `gh issue close --comment` теряет комментарий, но всё равно возвращает 0.

Репозиторий определяется из `git remote -v`; внутри клона `gh` делает это сам.

Файли задачи только в собственный репозиторий пользователя. Никогда не файли в `mattpocock/skills` (репозиторий, откуда эти скиллы), если пользователь им не владеет. В форке `gh` может по умолчанию выбирать upstream-родителя, поэтому перед первым `gh issue create` в сессии проверь цель через `gh repo view --json nameWithOwner` и уточни у пользователя, если это не его репозиторий.

## Pull requests как поверхность триажа

**PRs as a request surface: no.** _(Поставь `yes`, если репозиторий считает внешние PR заявками на фичи; `/triage` читает этот флаг.)_

Если флаг стоит в `yes`, PR проходят те же лейблы и состояния, что и задачи, через аналоги `gh pr`:

- **Прочитать PR**: `gh pr view <number>`, затем `gh pr view <number> --comments` (вне TTY `--comments` печатает только комментарии, без тела) и `gh pr diff <number>` для диффа.
- **Список внешних PR для триажа**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Комментарий / лейбл / закрытие**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub использует общее пространство номеров для issues и PR, поэтому голый `#42` может быть и тем и другим: проверяй через `gh pr view 42` с откатом на `gh issue view 42`.

## Когда скилл говорит «опубликуй в issue tracker»

Создай GitHub issue.

## Когда скилл говорит «получи соответствующий тикет»

Прочитай его, как в разделе **Прочитать задачу** выше.

## Операции Wayfinder

Используются скиллом `/wayfinder`. **Карта** — один issue с дочерними issue-тикетами.

- **Карта**: один issue с лейблом `wayfinder:map`, в теле — разделы Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: issue, привязанный к карте как GitHub sub-issue (см. **Сделать задачу подзадачей**). Где sub-issues недоступны — добавь ребёнка в task list в теле карты и строку `Part of #<map>` в начало тела ребёнка. Лейблы: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). После взятия в работу тикет назначается на ведущего разработчика.
- **Блокировки**: см. **Блокировки** в конвенциях.
- **Запрос фронтьера**: перечисли открытых детей карты (`gh issue list --state open` в пределах sub-issues карты / task list), отбрось тех, у кого есть открытый блокер (см. **Сколько открытых блокеров**, либо открытый issue в строке `Blocked by`) или исполнитель; первый по порядку карты побеждает.
- **Взять в работу**: `gh issue edit <n> --add-assignee @me` — первая запись в сессии.
- **Закрыть**: `gh issue comment <n> --body "<ответ>"`, затем `gh issue close <n>`, затем добавь контекст-указатель (gist + ссылка) в Decisions-so-far карты.
