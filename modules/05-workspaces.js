// ==========================================================================
// WORKSPACES (ESPACIOS COMPARTIDOS)
// ==========================================================================

async function fetchWorkspaces() {
    try {
        const response = await fetch('/api/workspaces', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            workspaces = data.workspaces || [];
            renderWorkspaceSelector();
        }
    } catch (err) {
        console.error('Error fetching workspaces:', err);
    }
}

function renderWorkspaceSelector() {
    const btnName = document.getElementById('active-workspace-name');
    const dropdownList = document.getElementById('workspace-dropdown-list');
    if (!dropdownList) return;

    let currentName = 'Todos los Pisos';
    if (activeWorkspaceId === 'personal') {
        currentName = 'Mi Espacio Personal';
    } else if (activeWorkspaceId !== 'all') {
        const ws = workspaces.find(w => w.id == activeWorkspaceId);
        if (ws) currentName = ws.name;
    }
    if (btnName) btnName.textContent = currentName;

    let html = `
        <div class="ws-dropdown-item ${activeWorkspaceId === 'all' ? 'active' : ''}" onclick="window.switchWorkspace('all')">
            <div class="ws-item-left">
                <i class="fa-solid fa-layer-group text-indigo"></i>
                <span>Todos los Pisos</span>
            </div>
            ${activeWorkspaceId === 'all' ? '<i class="fa-solid fa-check text-primary"></i>' : ''}
        </div>
        <div class="ws-dropdown-item ${activeWorkspaceId === 'personal' ? 'active' : ''}" onclick="window.switchWorkspace('personal')">
            <div class="ws-item-left">
                <i class="fa-solid fa-user text-secondary"></i>
                <span>Mi Espacio Personal</span>
            </div>
            ${activeWorkspaceId === 'personal' ? '<i class="fa-solid fa-check text-primary"></i>' : ''}
        </div>
    `;

    if (workspaces.length > 0) {
        html += `<div class="ws-dropdown-divider"></div>`;
        workspaces.forEach(ws => {
            const isAct = activeWorkspaceId == ws.id;
            html += `
                <div class="ws-dropdown-item ${isAct ? 'active' : ''}" onclick="window.switchWorkspace(${ws.id})">
                    <div class="ws-item-left">
                        <i class="fa-solid fa-users text-purple"></i>
                        <span title="${ws.name}">${ws.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span class="ws-item-badge"><i class="fa-solid fa-user"></i> ${ws.member_count}</span>
                        ${isAct ? '<i class="fa-solid fa-check text-primary"></i>' : ''}
                    </div>
                </div>
            `;
        });
    }

    dropdownList.innerHTML = html;
}

window.switchWorkspace = async function(wsId) {
    activeWorkspaceId = String(wsId);
    localStorage.setItem('habitrack_workspace_id', activeWorkspaceId);
    renderWorkspaceSelector();
    
    // Close dropdown
    const menu = document.getElementById('workspace-dropdown-menu');
    if (menu) menu.style.display = 'none';

    currentPage = 1;
    await fetchProperties();
    renderDashboard();
    renderListings();
    renderMap();

    const currentName = document.getElementById('active-workspace-name')?.textContent || 'Espacio';
    showToast(`Cambiado a "${currentName}"`, 'info');
};

async function openWorkspaceModal(targetTab = 'ws-tab-active') {
    const modal = document.getElementById('workspace-modal');
    if (!modal) return;

    switchWorkspaceModalTab(targetTab);
    await updateWorkspaceModalContent();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWorkspaceModal() {
    const modal = document.getElementById('workspace-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchWorkspaceModalTab(tabId) {
    const tabButtons = document.querySelectorAll('.ws-tab-btn');
    const tabContents = document.querySelectorAll('.ws-tab-content');

    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    tabContents.forEach(content => {
        content.style.display = content.id === tabId ? 'block' : 'none';
    });
}

async function updateWorkspaceModalContent() {
    const wsNameEl = document.getElementById('ws-current-name');
    const wsRoleEl = document.getElementById('ws-current-role-badge');
    const wsCountEl = document.getElementById('ws-current-count-badge');
    const wsInviteBox = document.getElementById('ws-invite-box');
    const wsInviteCodeDisplay = document.getElementById('ws-invite-code-display');
    const wsMembersSection = document.getElementById('ws-members-section');
    const wsMembersList = document.getElementById('ws-members-list');
    const wsMembersCount = document.getElementById('ws-members-count');
    const wsLeaveWrap = document.getElementById('ws-leave-wrap');

    if (activeWorkspaceId === 'all' || activeWorkspaceId === 'personal') {
        if (wsNameEl) wsNameEl.textContent = activeWorkspaceId === 'all' ? 'Todos los Pisos' : 'Mi Espacio Personal';
        if (wsRoleEl) wsRoleEl.textContent = 'Privado';
        if (wsCountEl) wsCountEl.textContent = `${properties.length} pisos`;
        if (wsInviteBox) wsInviteBox.style.display = 'none';
        if (wsMembersSection) wsMembersSection.style.display = 'none';
        if (wsLeaveWrap) wsLeaveWrap.style.display = 'none';
        return;
    }

    const currentWs = workspaces.find(w => w.id == activeWorkspaceId);
    if (!currentWs) return;

    if (wsNameEl) wsNameEl.textContent = currentWs.name;
    if (wsRoleEl) wsRoleEl.textContent = currentWs.role === 'owner' ? 'Propietario' : 'Miembro';
    if (wsCountEl) wsCountEl.textContent = `${currentWs.property_count || properties.length} pisos`;

    if (wsInviteBox) {
        wsInviteBox.style.display = 'block';
        if (wsInviteCodeDisplay) wsInviteCodeDisplay.textContent = currentWs.invite_code;
    }

    if (wsLeaveWrap) {
        wsLeaveWrap.style.display = currentWs.role === 'owner' ? 'none' : 'block';
    }

    // Fetch members
    try {
        const res = await fetch(`/api/workspaces/${currentWs.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const members = data.members || [];
            if (wsMembersSection) wsMembersSection.style.display = 'block';
            if (wsMembersCount) wsMembersCount.textContent = members.length;
            if (wsMembersList) {
                wsMembersList.innerHTML = members.map(m => {
                    const initial = (m.username || m.email || 'U').charAt(0).toUpperCase();
                    const isOwner = m.role === 'owner';
                    return `
                        <div class="ws-member-item">
                            <div class="ws-member-info">
                                <div class="ws-member-avatar ${isOwner ? 'bg-primary' : 'bg-emerald'}">${initial}</div>
                                <div class="ws-member-details">
                                    <span class="ws-member-name">${m.username || m.email.split('@')[0]}</span>
                                    <span class="ws-member-email">${m.email}</span>
                                </div>
                            </div>
                            <span class="badge ${isOwner ? 'badge-type' : 'badge-dark'}">${isOwner ? 'Propietario' : 'Miembro'}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (err) {
        console.error('Error fetching workspace details:', err);
    }
}

function checkUrlInviteCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite') || urlParams.get('join');
    if (inviteCode) {
        const joinInput = document.getElementById('join-ws-code');
        if (joinInput) joinInput.value = inviteCode.trim().toUpperCase();
        openWorkspaceModal('ws-tab-join');
    }
}

async function fetchProperties() {
    try {
        let url = '/api/propiedades';
        if (activeWorkspaceId && activeWorkspaceId !== 'all') {
            url += `?workspace_id=${encodeURIComponent(activeWorkspaceId)}`;
        }
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (response.ok) {
            properties = await response.json();
        } else {
            showToast('Error al cargar propiedades.', 'error');
        }
    } catch (err) {
        console.error('Error fetching properties:', err);
        showToast('Error de conexión al cargar propiedades.', 'error');
    }
}

async function addProperty(propertyData) {
    try {
        if (activeWorkspaceId && activeWorkspaceId !== 'all' && activeWorkspaceId !== 'personal') {
            propertyData.workspace_id = parseInt(activeWorkspaceId, 10);
        }

        const response = await fetch('/api/propiedades', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(propertyData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const newProp = await response.json();
            const existingIndex = properties.findIndex(p => p.id === newProp.id);
            if (existingIndex !== -1) {
                properties[existingIndex] = newProp;
                showToast('Propiedad existente actualizada correctamente.', 'success');
            } else {
                properties.unshift(newProp); // Añadir al principio
                showToast('Propiedad guardada en base de datos.', 'success');
            }
            return true;
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al guardar propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error adding property:', err);
        showToast('Error al conectar con el servidor.', 'error');
        return false;
    }
}

async function updateProperty(id, propertyData) {
    try {
        const response = await fetch(`/api/propiedades/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(propertyData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const updatedProp = await response.json();
            const index = properties.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                properties[index] = updatedProp;
            }
            showToast('Propiedad actualizada correctamente.', 'success');
            return true;
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al actualizar propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error updating property:', err);
        showToast('Error al conectar con el servidor.', 'error');
        return false;
    }
}

async function deleteProperty(id) {
    try {
        const response = await fetch(`/api/propiedades/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            properties = properties.filter(p => p.id !== parseInt(id));
            showToast('Propiedad eliminada de la base de datos.', 'success');
            return true;
        } else {
            showToast('Error al eliminar la propiedad.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error deleting property:', err);
        showToast('Error de red al eliminar.', 'error');
        return false;
    }
}
