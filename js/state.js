/**
 * Central State Store for HabiTrack
 */
export const state = {
    token: localStorage.getItem('token') || '',
    username: localStorage.getItem('username') || '',
    properties: [],
    settings: {
        downpaymentPct: 20,
        notaryRegistryPct: 1.5,
        appraisalCost: 400,
        newBuildAjd: 1.0,
        mortgageInterestRate: 3.0,
        mortgageDurationYears: 30,
        ccaaRates: {
            'Andalucía': 7.0, 'Aragón': 8.0, 'Asturias': 8.0, 'Baleares': 8.0,
            'Canarias': 6.5, 'Cantabria': 9.0, 'Castilla-La Mancha': 9.0,
            'Castilla y León': 8.0, 'Cataluña': 10.0, 'Comunidad Valenciana': 10.0,
            'Extremadura': 8.0, 'Galicia': 9.0, 'Madrid': 6.0, 'Murcia': 8.0,
            'Navarra': 6.0, 'País Vasco': 4.0, 'La Rioja': 7.0, 'Ceuta': 6.0, 'Melilla': 6.0
        }
    },
    activeSection: 'dashboard-section',
    activeView: 'grid', // 'grid' | 'table'
    currentPage: 1,
    pageSize: 9,
    filters: {
        search: '',
        ccaa: 'all',
        estateType: 'all',
        minPrice: '',
        maxPrice: '',
        minRooms: '',
        garage: 'all',
        sortBy: 'created_desc'
    },
    mapInstance: null,
    mapMarkers: []
};

export const CCAA_LIST = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
    'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Madrid',
    'Murcia', 'Navarra', 'País Vasco', 'La Rioja', 'Ceuta', 'Melilla'
];
