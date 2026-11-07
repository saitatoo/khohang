# Gom

A full stack starter with React + Vite, Express, and MongoDB + Mongoose.

## Requirements

- Node.js 20+
- MongoDB running locally, or a MongoDB connection string

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI` if needed.
2. Install dependencies from the project root: `npm install`.
3. Start both apps: `npm run dev`.
4. Open http://localhost:5173. The API runs at http://localhost:5000.

## API

- `GET /api/health` — service health
- `GET /api/items` — list items
- `POST /api/items` — create an item (`{ "title": "..." }`)
- `PATCH /api/items/:id` — update completion (`{ "done": true }`)
- `DELETE /api/items/:id` — delete an item
