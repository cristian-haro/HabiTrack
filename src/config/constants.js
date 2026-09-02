/**
 * Constants and Default Configurations for HabiTrack
 */

// ITP (Impuesto sobre Transmisiones Patrimoniales) por defecto por Comunidad Autónoma en España
const DEFAULT_CCAA_ITP = {
    'Andalucía': 7.0,
    'Aragón': 8.0,
    'Asturias': 8.0,
    'Baleares': 8.0,
    'Canarias': 6.5,
    'Cantabria': 9.0,
    'Castilla-La Mancha': 9.0,
    'Castilla y León': 8.0,
    'Cataluña': 10.0,
    'Comunidad Valenciana': 10.0,
    'Extremadura': 8.0,
    'Galicia': 9.0,
    'Madrid': 6.0,
    'Murcia': 8.0,
    'Navarra': 6.0,
    'País Vasco': 4.0,
    'La Rioja': 7.0,
    'Ceuta': 6.0,
    'Melilla': 6.0
};

// IVA para Obra Nueva en España (10% general, 6.5% en Canarias - IGIC)
const DEFAULT_NEW_BUILD_IVA = 10.0;

// AJD (Actos Jurídicos Documentados) general para obra nueva
const DEFAULT_NEW_BUILD_AJD = 1.0;

// Configuración por defecto de la calculadora de compraventa e hipoteca
const DEFAULT_SETTINGS = {
    downpaymentPct: 20,
    notaryRegistryPct: 1.5,
    appraisalCost: 400,
    newBuildAjd: DEFAULT_NEW_BUILD_AJD,
    ccaaRates: DEFAULT_CCAA_ITP,
    mortgageInterestRate: 3.0,
    mortgageDurationYears: 30
};

module.exports = {
    DEFAULT_CCAA_ITP,
    DEFAULT_NEW_BUILD_IVA,
    DEFAULT_NEW_BUILD_AJD,
    DEFAULT_SETTINGS,
    JWT_EXPIRES_IN: '30d',
    OTP_EXPIRATION_MINUTES: 15
};
