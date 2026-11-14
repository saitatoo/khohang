import app, { connectToDatabase } from './app.js';

try {
  await connectToDatabase();
  console.log('MongoDB connected');
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
}

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Gom API listening on http://localhost:${port}`));
