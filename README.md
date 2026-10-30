# NextRole

A job discovery portal built with React, Express, and MongoDB. Search public company job boards, filter roles, keep a browser-local shortlist, and apply directly on the employer's website.

## Run the complete app with Docker

Requires Docker Desktop (running) and Docker Compose v2. From this project folder:

```sh
cp .env.example .env
openssl rand -hex 24
```

Set `MONGO_ROOT_PASSWORD` in `.env` to the generated **hexadecimal** password. Optionally generate a second secret for `SYNC_TOKEN`. Then run:

```sh
docker compose up -d --build
```

Open **http://localhost:8088**. MongoDB, the API, and the web server each have their own Dockerfile. MongoDB uses authentication and the named `nextrole_mongo_data` volume. The API waits for a healthy database; the website waits for a healthy API. Only the website port is published, bound to localhost. The API and MongoDB communicate over the private Compose network.

For the copy configured during this task, `.env` already contains newly generated local secrets. Keep it private. The downloadable source archive excludes secrets and requires the setup above.

The first import starts automatically. Large boards may take a minute to finish. A background sync repeats every six hours while the API is running. Refreshing the website reloads the database results; it does not trigger an external import. Source errors retain existing data and appear in API container logs.

```sh
docker compose ps
docker compose logs --tail=30 api
# Run another import without exposing an admin token:
docker compose exec api npm run sync
# Stop containers while retaining jobs:
docker compose down
```

`docker compose down -v` also deletes the job database. Do not use `-v` unless you intend to remove the stored data. Changing the initial MongoDB password in `.env` does not update credentials in an existing data volume; update the database user with MongoDB administration tools first.

To use a different website port, set `WEB_PORT` in `.env` and update `CORS_ORIGIN` accordingly.

## MongoDB in Docker with local app development

Use Node.js 22.12+ (Node 24 recommended). Create the root `.env` as above, then publish MongoDB only to localhost:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait mongodb
```

The default Docker setup keeps MongoDB inside the private container network. A local `npm start` needs the command above to expose MongoDB on `127.0.0.1:27017`. The named database volume is preserved. If a later `docker compose up` recreates MongoDB without the development override, run the command above again.

Configure `server/.env` from `server/.env.example`. For the authenticated Docker database use:

```dotenv
MONGODB_URI=mongodb://nextrole:YOUR_HEX_PASSWORD@127.0.0.1:27017/job_portal?authSource=admin
PORT=7878
CORS_ORIGIN=http://localhost:5173,http://localhost:8088
SYNC_ON_START=true
```

Replace `YOUR_HEX_PASSWORD` with your root `.env` password. A standalone local MongoDB with no authentication can instead use the URI in `server/.env.example`.

Start the API and frontend in separate terminals:

```sh
cd server
npm ci
npm start
```

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to `127.0.0.1:7878`. Both development and the Docker frontend use the same relative API URLs. If hosting the API separately, configure `VITE_API_URL` before building and set `CORS_ORIGIN` to the allowed frontend origins. The old hardcoded Atlas connection has been removed; rotate its previously embedded password in Atlas.

## Job imports and data behavior

Default sources: Airbnb and Stripe on Greenhouse, plus Palantir on Lever. The retired Notion Greenhouse board was replaced after live verification. A provider can retire or move a board; configure current board tokens in `server/config/sources.js` or the `JOB_SOURCES` environment variable. Both Greenhouse and Lever adapters use their public JSON APIs, with a 20-second request timeout. No Chrome installation is required.

```dotenv
JOB_SOURCES=[{"company":"Example","provider":"Lever","board":"example"}]
```

For Docker, add `JOB_SOURCES` to the API service environment in `compose.yaml` or modify `server/config/sources.js`, then rebuild/recreate the service.

Imports update changed jobs, count actual insertions, and mark disappeared roles inactive only after a successful complete import for that board. Failed boards never expire jobs. Application URL parameters that identify a job (such as `gh_jid`) are retained; known tracking parameters are removed. Duplicate application URLs are protected by a database unique index. Legacy rows without a source key cannot be automatically expired until reimported; back up and clean old data separately if migrating an existing database.

Remote/hybrid/on-site and employment type labels are shown only when provided or explicitly indicated in source location text. Missing information is not invented. The "added" date is when this portal imported a role, not the employer's original posting date. Last imported time describes the latest stored active role, not a guarantee that every source succeeded. Applications use the employer's website; this app does not track submissions or claim to submit them.

Saved jobs are snapshots in this browser's local storage. They are not synced across devices. Opening a job's details checks availability against the current API; the application button is enabled only after that check succeeds. Offline or expired saved copies remain readable with an explicit warning. Employers can change listings between imports; confirm details on their application page.

## API

- `GET /api/health` — API/database readiness (503 when disconnected).
- `GET /api/jobs` — paginated active jobs; response `{ jobs, total, page, pages, limit }`.
- `GET /api/jobs/meta` — available companies, teams, employment types, sources, total and latest imported time.
- `GET /api/jobs/:id` — one active job; 404 if expired or missing.
- `POST /api/jobs/sync` — requires `Authorization: Bearer <SYNC_TOKEN>`. Disabled if no token is configured. Imports are serialized and throttled to once per minute in each API process.

List query parameters: `q`, `location`, `company`, `department`, `employmentType`, `workplaceType`, `source`, `sort`, `page`, `limit`. Search is literal and case insensitive; exact facet filters can be combined. Sort options: `newest`, `oldest`, `title`, `company`. Page size defaults to 12 and is bounded to 100. Out-of-range pages are clamped to the last available page.

The former state-changing `GET /api/jobs/scrape` now returns 405 with migration guidance. This MVP runs one API process; use a distributed import lock if scaling to multiple replicas. Public internet deployment also needs HTTPS and your usual deployment hardening.

## Checks

```sh
cd server
npm test
```

```sh
cd frontend
npm test
npm run lint
npm run build
```

Tests cover literal search and query validation, safe application links, source mapping and failures, deduplication counts, source-scoped expiration, saved job filtering, sorting, and invalid browser storage. Live Docker/API and desktop/mobile browser checks are documented in the accompanying verification report.

## Visual design

Warm ivory, coral, and olive; an original generated 3D career illustration; restrained floating elements and card perspective effects. Mobile filters, visible focus states, native modal keyboard handling, semantic landmarks, and reduced-motion support are included. Fonts load from Google Fonts with system fallbacks.

The hero asset is `frontend/public/images/career-ascent.jpg`. Generation method and prompt are recorded in `ASSETS.md`.
