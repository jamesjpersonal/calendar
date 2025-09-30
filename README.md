# Emoji Calendar

A lightweight calendar application with a Node.js backend. Create custom emoji-powered categories, add events with colors, and browse everything on a modern monthly calendar view.

## Project structure

```
calendar/
├── client/      # Static front-end (vanilla JS, HTML, CSS)
└── server/      # Node.js backend with JSON persistence
```

## Getting started

1. Install dependencies (none required beyond Node.js 18+).
2. Start the backend server:

   ```bash
   cd server
   npm start
   ```

   The API and static site are served from `http://localhost:4000` by default.

3. Open a browser to `http://localhost:4000` to use the calendar UI.

## API overview

- `GET /api/categories` – list existing categories.
- `POST /api/categories` – create a category with `{ name, emoji, color }`.
- `GET /api/events` – list events (each includes its category data).
- `POST /api/events` – create an event with `{ title, startDate, endDate?, description?, categoryId }`.
- `PUT /api/events/:id` – update an event.
- `DELETE /api/events/:id` – remove an event.

Data is stored in `server/data.json`, which is created automatically on first run with a few sample categories.

## Development tips

- The client is static; changes to HTML/CSS/JS require a browser refresh.
- The server automatically seeds default categories if no data file is present.
- Adjust the port by setting the `PORT` environment variable before running `npm start`.
