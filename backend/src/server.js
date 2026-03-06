const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const authRoutes = require('./routes/authRoutes');
const docRoutes = require('./routes/docRoutes');
const chatRoutes = require('./routes/chatRoutes');
const app = express();
const MONGO_URI = process.env.MONGO_URI;
const PORT = Number(process.env.PORT) || 5000;
const DB_RETRY_MS = 5000;

// enable CORS for all origins (adjust as needed)
app.use(cors());

app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
  }
  return next();
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', requireDb, authRoutes);
app.use('/api/docs', requireDb, docRoutes);
app.use('/api/chat', requireDb, chatRoutes);

async function connectMongoWithRetry() {
  if (!MONGO_URI) {
    console.error('MongoDB connection failed: MONGO_URI is not set');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    setTimeout(connectMongoWithRetry, DB_RETRY_MS);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMongoWithRetry();
});
