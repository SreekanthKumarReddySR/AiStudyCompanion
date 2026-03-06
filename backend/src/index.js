const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const { connectDB } = require('./config/db');

const app = express();
app.use(bodyParser.json());

// connect to MongoDB
connectDB();

// register routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
