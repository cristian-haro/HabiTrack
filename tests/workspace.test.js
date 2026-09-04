const { app, ensureDB } = require('../src/app');
const { getDB } = require('../src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middlewares/auth.middleware');

describe('Collaboration & Workspaces API (Fase 5)', () => {
    let server;
    let baseUrl;
    let db;
    let userA, tokenA;
    let userB, tokenB;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        await ensureDB();
        db = await getDB();

        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        if (server) server.close();
    });

    beforeEach(async () => {
        await db.exec('DELETE FROM property_comments');
        await db.exec('DELETE FROM property_votes');
        await db.exec('DELETE FROM properties');
        await db.exec('DELETE FROM workspace_members');
        await db.exec('DELETE FROM workspaces');
        await db.exec('DELETE FROM users');

        // Create User A
        const resA = await db.run('INSERT INTO users (email, username) VALUES (?, ?)', ['laura@test.com', 'Laura']);
        userA = { id: resA.lastID, email: 'laura@test.com', username: 'Laura' };
        tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });

        // Create User B
        const resB = await db.run('INSERT INTO users (email, username) VALUES (?, ?)', ['carlos@test.com', 'Carlos']);
        userB = { id: resB.lastID, email: 'carlos@test.com', username: 'Carlos' };
        tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: '1h' });
    });

    it('debe permitir crear un espacio compartido y unirse con el código de invitación', async () => {
        // 1. User A crea espacio
        const createRes = await fetch(`${baseUrl}/api/workspaces`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({ name: 'Piso en Pareja 🏡' })
        });
        const createData = await createRes.json();

        expect(createRes.status).toBe(201);
        expect(createData.success).toBe(true);
        expect(createData.workspace.name).toBe('Piso en Pareja 🏡');
        expect(createData.workspace.invite_code).toMatch(/^HABI-[A-F0-9]{6}$/);

        const inviteCode = createData.workspace.invite_code;
        const workspaceId = createData.workspace.id;

        // 2. User B se une con el código de invitación
        const joinRes = await fetch(`${baseUrl}/api/workspaces/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ invite_code: inviteCode })
        });
        const joinData = await joinRes.json();

        expect(joinRes.status).toBe(200);
        expect(joinData.success).toBe(true);
        expect(joinData.workspace.id).toBe(workspaceId);

        // 3. User A lista miembros del espacio
        const detailsRes = await fetch(`${baseUrl}/api/workspaces/${workspaceId}`, {
            headers: { 'Authorization': `Bearer ${tokenA}` }
        });
        const detailsData = await detailsRes.json();

        expect(detailsRes.status).toBe(200);
        expect(detailsData.workspace.members.length).toBe(2);
    });

    it('debe compartir propiedades y permitir votación cruzada (likes/dislikes) entre miembros', async () => {
        // 1. Crear espacio y unir ambos
        const wsRes = await fetch(`${baseUrl}/api/workspaces`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({ name: 'Búsqueda Madrid' })
        });
        const wsData = await wsRes.json();
        const workspaceId = wsData.workspace.id;

        await fetch(`${baseUrl}/api/workspaces/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ invite_code: wsData.workspace.invite_code })
        });

        // 2. User A crea una propiedad en el espacio
        const propRes = await fetch(`${baseUrl}/api/propiedades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                title: 'Ático en Malasaña',
                price: 320000,
                m2: 85,
                ccaa: 'Madrid',
                workspace_id: workspaceId
            })
        });
        const propData = await propRes.json();

        expect(propRes.status).toBe(201);
        const propertyId = propData.id;

        // 3. User A vota "like"
        const voteARes = await fetch(`${baseUrl}/api/propiedades/${propertyId}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({ vote: 'like', score: 5 })
        });
        const voteAData = await voteARes.json();

        expect(voteARes.status).toBe(200);
        expect(voteAData.votes.length).toBe(1);

        // 4. User B vota "like" también (coincidencia)
        const voteBRes = await fetch(`${baseUrl}/api/propiedades/${propertyId}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ vote: 'like', score: 5 })
        });
        const voteBData = await voteBRes.json();

        expect(voteBRes.status).toBe(200);
        expect(voteBData.votes.length).toBe(2);

        // 5. User B puede listar las propiedades del espacio y ver los votos
        const listRes = await fetch(`${baseUrl}/api/propiedades?workspace_id=${workspaceId}`, {
            headers: { 'Authorization': `Bearer ${tokenB}` }
        });
        const listData = await listRes.json();

        expect(listRes.status).toBe(200);
        expect(listData.length).toBe(1);
        expect(listData[0].votes.length).toBe(2);
    });

    it('debe permitir añadir notas y comentarios colaborativos en un piso', async () => {
        // 1. Crear propiedad
        const propRes = await fetch(`${baseUrl}/api/propiedades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                title: 'Piso con terraza',
                price: 250000,
                ccaa: 'Madrid'
            })
        });
        const propData = await propRes.json();
        const propertyId = propData.id;

        // 2. User A añade una nota de visita
        const comment1 = await fetch(`${baseUrl}/api/propiedades/${propertyId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({ comment: 'Visita realizada: Muy luminoso pero la cocina necesita reforma.' })
        });
        const comment1Data = await comment1.json();

        expect(comment1.status).toBe(201);
        expect(comment1Data.comment.comment).toContain('Muy luminoso');

        // 3. User B añade otra nota
        const comment2 = await fetch(`${baseUrl}/api/propiedades/${propertyId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ comment: 'Hablé con el agente, aceptan negociar hasta 240k.' })
        });

        expect(comment2.status).toBe(201);

        // 4. Listar comentarios del inmueble
        const getComments = await fetch(`${baseUrl}/api/propiedades/${propertyId}/comments`, {
            headers: { 'Authorization': `Bearer ${tokenA}` }
        });
        const commentsData = await getComments.json();

        expect(getComments.status).toBe(200);
        expect(commentsData.comments.length).toBe(2);
    });
});
