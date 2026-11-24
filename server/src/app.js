require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Any unexpected error becomes a clean 500 instead of crashing the server.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
