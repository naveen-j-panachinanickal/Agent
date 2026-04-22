# OfflineChat Spring Boot Migration

This folder is the migration path from the current Streamlit prototype to a stronger app architecture.

```text
React frontend  ->  Spring Boot backend  ->  Ollama local API
localhost:5173      localhost:8080          localhost:11434
```

The existing Python app remains untouched in the repository root.

## Backend

```bash
cd springboot-migration/backend
mvn spring-boot:run
```

Backend APIs:

- `GET /api/health`
- `GET /api/models`
- `POST /api/models/pull`
- `DELETE /api/models?model={model}`
- `POST /api/chat/stream`

## Frontend

```bash
cd springboot-migration/frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Notes

- Start Ollama before using the migrated app.
- The first migrated version supports chat, model selection, model pull/delete, theme toggle, and local browser chat persistence.
- File uploads and multi-chat persistence still live in the Streamlit app and can be migrated next.
