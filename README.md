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

## Deployment guidance

### Railway

Railway can run the backend directly. Add a new service that deploys this
repository and set the **Start Command** to `./start.sh` so the platform runs the
helper script committed at the repo root. The script changes into the
`server/` directory, installs dependencies if needed, and starts the Node.js
process. Expose port `4000` (or override it with the `PORT` environment
variable) and mount a persistent volume to `server/data.json` so event data
survives restarts.

Deploy the static client separately (e.g., via Netlify/Vercel) and point the
`API_BASE` constant in `client/main.js` at the Railway service URL.

### Netlify (static front-end only)

Netlify can host the `client/` folder, but it cannot run the Node.js server that powers
the API. Deploy the backend to a platform that supports long-lived Node processes
(Render, Railway, Fly.io, etc.) and update the front-end to call that URL.

- **Runtime**: Node 18.
- **Base / Package directory**: leave blank (Netlify will use the repo root).
- **Build command**: leave blank; the client assets are already built.
- **Publish directory**: `client`.
- **Functions directory**: leave blank unless you rewrite the backend into
  Netlify Functions.

Once the backend is deployed, set the `API_BASE` constant in `client/main.js` to the
backend’s public URL and redeploy the static site.

### Vercel

Vercel’s default hosting model is also serverless/static and cannot run the existing
`server/index.js` process as-is. You have two options:

1. **Host the backend elsewhere** (Render, Railway, Fly.io, etc.) and deploy only the
   static `client/` directory to Vercel. Use the “Other” framework preset with:

   - **Build command**: leave blank.
   - **Output directory**: `client`.

   Update `API_BASE` in `client/main.js` to point at the external backend URL.

2. **Refactor the backend into Vercel Functions** by moving each REST endpoint into a
   serverless function and replacing the Node server. This requires significant code
   changes and persistent storage that Vercel alone does not provide; you would need an
   external database instead of the local `data.json` file.

## Development tips

- The client is static; changes to HTML/CSS/JS require a browser refresh.
- The server automatically seeds default categories if no data file is present.
- Adjust the port by setting the `PORT` environment variable before running `npm start`.
