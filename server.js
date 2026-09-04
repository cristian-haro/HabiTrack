require('dotenv').config();
const { app, ensureDB } = require('./src/app');

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
    console.error('⚠️ [Uncaught Exception]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [Unhandled Rejection]:', reason.message || reason);
});

if (!process.env.VERCEL) {
    ensureDB()
        .then(() => {
            const server = app.listen(PORT, () => {
                console.log(`🚀 Servidor HabiTrack activo en: http://localhost:${PORT}`);
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`❌ El puerto ${PORT} ya está en uso.`);
                } else {
                    console.error('❌ Error en el servidor HTTP:', err);
                }
            });
        })
        .catch(err => {
            console.error('❌ Error al inicializar la base de datos:', err);
        });
}

module.exports = app;
