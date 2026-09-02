require('dotenv').config();
const { app, ensureDB } = require('./src/app');

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
    ensureDB()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`🚀 Servidor HabiTrack activo en: http://localhost:${PORT}`);
            });
        })
        .catch(err => {
            console.error('❌ Error al inicializar la base de datos:', err);
        });
}

module.exports = app;
