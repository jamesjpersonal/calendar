# Emoji Calendar

A lightweight calendar application with a Node.js backend. Create custom emoji-powered categories, add events with colors, and browse everything on a modern monthly calendar view.

## Project structure

```
calendar/
├── client/      # Static front-end (vanilla JS, HTML, CSS)
└── server/      # Node.js backend with JSON persistence
```

## Features

- Emoji-powered categories with configurable colors.
- Month view calendar that renders each event directly on the grid with its category accent.
- Scrollable event list that summarizes upcoming plans with dates, categories, and notes.
- Create events with optional descriptions and date ranges from the sidebar form.

## Getting started

1. Install dependencies (none required beyond Node.js 18+, but running `npm install` in
   `server/` will create a lockfile for deployment platforms that expect one).
2. Start the backend server from the repo root:

   ```bash
   npm start
   ```

   The API and static site are served from `http://localhost:4000` by default.

3. Open a browser to `http://localhost:4000` to use the calendar UI.

To host the client separately from the backend, update the `API_BASE` constant near the
top of `client/main.js` to the deployed API origin (e.g., `https://your-domain.com`).

## API overview

- `GET /api/categories` – list existing categories.
- `POST /api/categories` – create a category with `{ name, emoji, color }`.
- `GET /api/events` – list events (each includes its category data).
- `POST /api/events` – create an event with `{ title, startDate, endDate?, description?, categoryId }`.
- `PUT /api/events/:id` – update an event.
- `DELETE /api/events/:id` – remove an event.

## Data storage

Data is stored in a JSON file that is created automatically on first run with a few sample categories. By default the file lives in `server/data.json`, but the server will write to `/data/data.json` when that directory exists (Railway mounts volumes there) or to whatever folder you set via the `CALENDAR_DATA_DIR`/`DATA_DIR` environment variables. You can also point the server at an explicit file path with `CALENDAR_DATA_FILE` (or `DATA_FILE`) if your platform mounts a specific file instead of a directory. All writes are performed atomically so data persists safely across deployments as long as the target path is on a persistent volume. The application does not use an external database by default; the JSON file acts as the persistence layer. If you need cloud storage, point the server at a managed database or mount a persistent volume that keeps the JSON file between deployments.

## Deployment guidance

### Railway

Railway can run the backend directly. Add a new service that deploys this
repository and set the **Start Command** to `npm start` (or `./start.sh` if you
prefer to call the script directly) so the platform runs the helper script
committed at the repo root. The script changes into the `server/` directory,
installs dependencies if needed, and starts the Node.js process. Expose port
`4000` (or override it with the `PORT` environment variable) and mount a
persistent volume to `/data` (or set `CALENDAR_DATA_DIR`) so event data survives restarts.

Railway (and similar hosts) inject a `PORT` environment variable such as `8080`;
the server automatically honors that value, which is why the logs read
`Server running at http://localhost:8080`. You do not need to change any other
configuration—just make sure the client points at the public URL Railway assigns
to your service.

The `start.sh` script also works for other platforms that allow a shell entrypoint
(e.g., Fly.io, Render, custom Docker images). It ensures dependencies are installed
before executing `npm start`, so you can use it for local smoke tests as well:

```bash
./start.sh
```

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
