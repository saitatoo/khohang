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
- When hosting the frontend and API separately, set `VITE_API_URL` to the API origin when building the client, and set `CLIENT_ORIGIN` to the frontend origin on the API.
- The Vercel project in `vercel.json` builds only the static client. Deploy the Express API separately and configure `VITE_API_URL` in Vercel before redeploying.
- Order lookup searches the active Excel snapshot stored in MongoDB. An admin uploads an `.xlsx` workbook from the order lookup page; the server reads only the `汇鑫底总进度表` sheet and replaces the active snapshot. No Google Drive credentials are required.

## API

- `GET /api/health` — service health
- `GET /api/items` — list items
- `POST /api/items` — create an item (`{ "title": "..." }`)
- `PATCH /api/items/:id` — update completion (`{ "done": true }`)
- `DELETE /api/items/:id` — delete an item
