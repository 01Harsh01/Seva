// backend/src/middleware/errorHandler.js
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong on our end." : err.message,
  });
}

module.exports = { errorHandler };
