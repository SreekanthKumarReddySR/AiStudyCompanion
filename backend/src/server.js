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
let lastDbError = 'not connected yet';

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
  const payload = {
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disconnected'
  };
  if (!isDbConnected()) {
    payload.dbError = lastDbError;
  }
  res.json(payload);
});

app.use('/api/auth', requireDb, authRoutes);
app.use('/api/docs', requireDb, docRoutes);
app.use('/api/chat', requireDb, chatRoutes);

async function connectMongoWithRetry() {
  if (!MONGO_URI) {
    lastDbError = 'MONGO_URI is not set';
    console.error('MongoDB connection failed: MONGO_URI is not set');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    lastDbError = '';
    console.log('MongoDB connected');
  } catch (err) {
    lastDbError = err?.message || 'unknown mongo connection error';
    console.error('MongoDB connection failed:', err.message);
    setTimeout(connectMongoWithRetry, DB_RETRY_MS);
  }
}

mongoose.connection.on('error', (err) => {
  lastDbError = err?.message || 'mongoose connection error';
});

mongoose.connection.on('disconnected', () => {
  if (!lastDbError) {
    lastDbError = 'mongoose disconnected';
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMongoWithRetry();
});
