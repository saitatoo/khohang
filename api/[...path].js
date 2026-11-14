import app, { connectToDatabase } from '../server/src/app.js';

export default async function handler(request, response) {
  try {
    await connectToDatabase();
    return app(request, response);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return response.status(503).json({ message: 'Database unavailable' });
  }
}
