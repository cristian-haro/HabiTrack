require('dotenv').config();
const { app, ensureDB } = require('./src/app');

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Unhandled Rejection]:', reason.message || reason);
});

if (!process.env.VERCEL) {
    ensureDB()
        .then(() => {
            const server = app.listen(PORT, () => {
                console.log(`[HabiTrack] Server active at: http://localhost:${PORT}`);
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`[Error] Port ${PORT} is already in use.`);
                } else {
                    console.error('[Error] HTTP Server error:', err);
                }
            });
        })
        .catch(err => {
            console.error('[Error] Database initialization failed:', err);
        });
}

module.exports = app;
