# KHO HÀNG

A full stack starter with React + Vite, Express, and MongoDB + Mongoose.

## Requirements

- Node.js 20+
- MongoDB running locally, or a MongoDB connection string

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI` if needed.
2. Install dependencies from the project root: `npm install`.
3. Start both apps: `npm run dev`.
4. Open http://localhost:5173. The API runs at http://localhost:5000.

## Authentication

- Create an account with a name, email, and password of at least 8 characters.
- User accounts are stored in MongoDB; passwords are hashed before storage.
- Set a unique `JWT_SECRET` in the server environment before deploying.
- Vercel deploys the frontend and the Express API from this repository on the same origin. Set `MONGODB_URI` and `JWT_SECRET` in Vercel; the client calls `/api` directly and needs no `VITE_API_URL`.
- If hosting the API separately, set `VITE_API_URL` in the client build and `CLIENT_ORIGIN` on the API to the frontend origin.
- Order lookup searches the active Excel snapshot stored in MongoDB. An admin uploads an `.xlsx` workbook from the order lookup page; the server reads only the `汇鑫底总进度表` sheet and replaces the active snapshot. No Google Drive credentials are required.

## API

- `GET /api/health` — service health
- `GET /api/items` — list items
- `POST /api/items` — create an item (`{ "title": "..." }`)
- `PATCH /api/items/:id` — update completion (`{ "done": true }`)
- `DELETE /api/items/:id` — delete an item
