// ==========================================================================
// CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================

let appSettings = {};
let properties = [];
let activeSection = 'dashboard-section';
let activeView = 'grid'; // 'grid' o 'table'
let token = localStorage.getItem('token') || '';
let username = localStorage.getItem('username') || '';
let currentUserId = null;
let currentUserEmail = '';
let activeWorkspaceId = localStorage.getItem('habitrack_workspace_id') || 'all';
let workspaces = [];
let activeDetailComments = [];
let eventHandlersSetup = false;
let mapInstance = null;
let mapMarkers = [];
let currentPage = 1;
const pageSize = 9;

// Comunidades Autónomas de España y sus CCAA ITP por defecto (Segunda Mano)
const CCAA_LIST = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 
    'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Madrid', 
    'Murcia', 'Navarra', 'País Vasco', 'La Rioja', 'Ceuta', 'Melilla'
];
