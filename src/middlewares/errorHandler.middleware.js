/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
    console.error(`[ERROR ${req.method} ${req.originalUrl}]:`, err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Error interno del servidor.';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
}

module.exports = {
    errorHandler
};
