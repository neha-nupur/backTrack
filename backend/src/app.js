const express = require('express');
const configureSecurity = require('./middleware/security');
const apiRouter = require('./routes/apiRouter');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and parser middleware configuration
configureSecurity(app, express);

// Mount main API router
app.use('/api', apiRouter);

// 404 Route Not Found Middleware
app.use(notFoundHandler);

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
