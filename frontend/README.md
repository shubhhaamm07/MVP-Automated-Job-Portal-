# NextRole frontend

See the project root README for Docker, MongoDB, API configuration, and feature behavior.

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Vite forwards `/api` to `http://127.0.0.1:7878`. The production container uses Nginx to serve the frontend and proxy the same path to the API service.
