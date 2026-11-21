# Kanban Board — Plan

## Overview

Single-user, multi-project Kanban board with a React frontend, an Express backend and a CLI. No auth. Data persisted to a local JSON file.

## Stack

- **Frontend:** Vite + React + shadcn/ui + Tailwind CSS, drag-and-drop via `@dnd-kit`
- **Backend:** Express, JSON file persistence with a serialized write queue
- **CLI:** Commander.js + `chalk` + `cli-table3`
- **Monorepo:** npm workspaces (`client`, `server`, `cli`), all ES modules + strict TypeScript; client and server run together via `concurrently`

## Project Structure

```
kanban-board/
├── client/
│   ├── src/
│   │   ├── components/   # Projects, Board, Column, Card, CardDialog, ColumnDialog, ui/ (shadcn)
│   │   ├── hooks/        # useBoard (data + mutations), useHashRoute (routing)
│   │   └── lib/          # api.ts (fetch wrapper), utils.ts
│   └── vite.config.ts    # proxies /api → localhost:${PORT ?? 3001}
├── server/
│   ├── src/
│   │   ├── routes/       # projects.ts, columns.ts, cards.ts
│   │   ├── db.ts         # JSON read/write, write queue, legacy migration
│   │   ├── types.ts
│   │   └── index.ts      # app entry (PORT env, default 3001)
│   └── data/
│       └── db.json       # persisted state
├── cli/
│   └── src/
│       ├── commands/     # projects, board, columns, cards
│       ├── utils/        # display, errors
│       ├── api.ts        # targets KANBAN_API_URL (default http://localhost:3001)
│       └── index.ts
└── package.json          # workspaces + root scripts
```

Types are duplicated in `client/src`, `server/src/types.ts` and `cli/src/types.ts`. Keep them in sync.

## Features

- Projects: list, create, rename, delete (deleting a project deletes its board)
- Columns per project: create, rename, delete (deleting a column deletes its cards; remaining columns are re-ordered)
- Cards with title + description: create, edit, delete
- Drag-and-drop to move and reorder cards, with optimistic UI updates reconciled against the server response
- Hash routing: `#/projects/<id>` shows a board, anything else shows the project list
- CLI covering the same operations against the running server

## API Routes

All board routes are nested under a project.

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| PATCH | /api/projects/:id | Rename project |
| DELETE | /api/projects/:id | Delete project and its board |
| GET | /api/projects/:id/board | Get full board state |
| POST | /api/projects/:projectId/columns | Create column |
| PATCH | /api/projects/:projectId/columns/:id | Rename column (`title`) |
| DELETE | /api/projects/:projectId/columns/:id | Delete column and its cards |
| POST | /api/projects/:projectId/cards | Create card (`columnId`, `title`, `description`) |
| PATCH | /api/projects/:projectId/cards/:id | Update card (`title`, `description`, `columnId`, `order`) |
| DELETE | /api/projects/:projectId/cards/:id | Delete card |

When a card moves to another column without an explicit `order`, it is appended to the end and the source column's cards are re-numbered.

## CLI

```
kanban projects list | create <name> | rename <projectId> <name> | delete <projectId>
kanban board <projectId>
kanban columns create <projectId> <title> | rename <projectId> <columnId> <title> | delete <projectId> <columnId>
kanban cards create <projectId> <columnId> <title> [description]
kanban cards update <projectId> <cardId> [-t title] [-d description] [-c columnId] [-o order]
kanban cards move <projectId> <cardId> <columnId>
kanban cards delete <projectId> <cardId>
```

## Data Shape (db.json)

```json
{
  "projects": [
    { "id": "uuid", "name": "Default", "createdAt": "ISO-8601" }
  ],
  "boards": {
    "<projectId>": {
      "columns": [
        { "id": "uuid", "title": "To Do", "order": 0 }
      ],
      "cards": [
        { "id": "uuid", "columnId": "uuid", "title": "Task", "description": "", "order": 0 }
      ]
    }
  }
}
```

On first run, if `db.json` is missing, the server migrates a legacy single-board `board.json` into a "Default" project and renames it to `board.json.migrated`. Without a legacy file, it creates an empty "Default" project.
