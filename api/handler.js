import app, { connectToDatabase } from '../server/src/app.js';

export default async function handler(request, response) {
  try {
    await connectToDatabase();

    // Vercel rewrites every /api/* request to this function and carries the
    // original route in `route`; restore it before passing the request to Express.
    const requestUrl = new URL(request.url, 'https://vercel.invalid');
    const route = requestUrl.searchParams.get('route');
    if (route) {
      requestUrl.searchParams.delete('route');
      request.url = `/api/${route}${requestUrl.search}`;
    }

    return app(request, response);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return response.status(503).json({ message: 'Database unavailable' });
  }
}
