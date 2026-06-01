const API_URL = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:5000/api';

let authToken = localStorage.getItem('adminToken');
let currentFilter = 'all';
let chartInstance = null;

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    
    return data;
}

// Fetch and render projects
async function fetchProjects(featured = false) {
    try {
        const url = featured ? '/projects?featured=true&limit=6' : '/projects?limit=9';
        const data = await apiRequest(url);
        return data.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

async function renderProjects() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse fa-3x"></i><p>Loading projects...</p></div>';
    
    const projects = await fetchProjects(currentFilter === 'featured');
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="loading-spinner"><p>✨ No projects yet. Login as admin to add amazing work! ✨</p></div>';
        return;
    }
    
    container.innerHTML = projects.map(proj => `
        <div class="project-card" data-id="${proj._id}">
            <div class="project-img">
                <i class="fas ${proj.iconClass || 'fa-code'} fa-3x"></i>
            </div>
            <div class="project-info">
                <h3>${escapeHtml(proj.title)}</h3>
                <p>${escapeHtml(proj.description)}</p>
                <div class="project-tech">
                    ${proj.techStack.map(tech => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('')}
                </div>
                <div class="project-links">
                    ${proj.liveLink && proj.liveLink !== '#' ? `<a href="${proj.liveLink}" class="project-link" target="_blank">Live Demo <i class="fas fa-external-link-alt"></i></a>` : ''}
                    ${proj.githubLink ? `<a href="${proj.githubLink}" class="project-link" target="_blank">GitHub <i class="fab fa-github"></i></a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Admin Functions
async function adminLogin(email, password) {
    try {
        const response = await fetch(`${API_URL}/projects/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

function adminLogout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    toggleAdminUI();
}

async function addProject(projectData) {
    try {
        const data = await apiRequest('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        await renderProjects();
        await renderManageList();
        showAdminAlert('✅ Project added successfully!', 'success');
        return data;
    } catch (error) {
        showAdminAlert('❌ Failed to add project: ' + error.message, 'error');
        throw error;
    }
}

async function deleteProject(projectId) {
    try {
        await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
        await renderProjects();
        await renderManageList();
        showAdminAlert('✅ Project deleted successfully!', 'success');
    } catch (error) {
        showAdminAlert('❌ Failed to delete project: ' + error.message, 'error');
        throw error;
    }
}

async function renderManageList() {
    const manageDiv = document.getElementById('manageProjectsList');
    if (!manageDiv) return;
    
    const projects = await fetchProjects();
    
    if (projects.length === 0) {
        manageDiv.innerHTML = '<p>No projects yet. Add one above.</p>';
        return;
    }
    
    manageDiv.innerHTML = projects.map(proj => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:0.8rem; border-radius:24px; margin-bottom:0.6rem;">
            <div>
                <strong>${escapeHtml(proj.title)}</strong>
                <span style="font-size:0.8rem; margin-left:0.5rem;">${proj.techStack.slice(0,3).join(', ')}</span>
            </div>
            <button class="delete-project-btn" data-id="${proj._id}" style="background:#ef4444; border:none; padding:6px 14px; border-radius:40px; color:white; cursor:pointer;">
                Delete
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProject(btn.getAttribute('data-id')));
    });
}

function toggleAdminUI() {
    const loginDiv = document.getElementById('loginFormDiv');
    const dashboardDiv = document.getElementById('adminDashboard');
    
    if (!loginDiv || !dashboardDiv) return;
    
    if (authToken) {
        loginDiv.classList.add('hidden');
        dashboardDiv.classList.remove('hidden');
        renderManageList();
    } else {
        loginDiv.classList.remove('hidden');
        dashboardDiv.classList.add('hidden');
    }
}

function showAdminAlert(message, type = 'info') {
    const alertDiv = document.getElementById('adminAlert');
    if (alertDiv) {
        alertDiv.textContent = message;
        alertDiv.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
        alertDiv.style.color = '#0f172a';
        setTimeout(() => { alertDiv.textContent = ''; }, 3000);
    }
}

// Skills Chart
function initSkillsChart() {
    const ctx = document.getElementById('skillsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['React/Next.js', 'Node.js', 'Python', 'MongoDB', 'AWS', 'Tailwind CSS'],
            datasets: [{
                label: 'Proficiency %',
                data: [92, 88, 78, 85, 72, 95],
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: '#2563eb',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20, backdropColor: 'transparent' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw}%`
                    }
                }
            }
        }
    });
}

function populateTechList() {
    const techs = [
        { name: 'React.js', icon: 'fab fa-react' },
        { name: 'Node.js', icon: 'fab fa-node-js' },
        { name: 'Express.js', icon: 'fas fa-server' },
        { name: 'MongoDB', icon: 'fas fa-database' },
        { name: 'PostgreSQL', icon: 'fas fa-database' },
        { name: 'Docker', icon: 'fab fa-docker' },
        { name: 'Tailwind CSS', icon: 'fab fa-css3-alt' },
        { name: 'TypeScript', icon: 'fab fa-js' },
        { name: 'Python', icon: 'fab fa-python' },
        { name: 'Git/GitHub', icon: 'fab fa-github' }
    ];
    
    const container = document.getElementById('techList');
    if (container) {
        container.innerHTML = techs.map(tech => `
            <div class="skill-badge">
                <i class="${tech.icon}"></i> ${tech.name}
            </div>
        `).join('');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    document.getElementById('menuBtn')?.addEventListener('click', () => {
        document.getElementById('navLinks')?.classList.toggle('active');
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderProjects();
        });
    });
    
    // Admin login
    document.getElementById('adminLoginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        if (await adminLogin(email, password)) {
            toggleAdminUI();
            showAdminAlert('Logged in successfully!', 'success');
        } else {
            alert('Invalid credentials! Use: admin@portfolio.com / SecurePass123!');
        }
    });
    
    // Add project
    document.getElementById('addProjectBtn')?.addEventListener('click', async () => {
        if (!authToken) {
            alert('Please login first');
            return;
        }
        
        const title = document.getElementById('projTitle').value.trim();
        const description = document.getElementById('projDesc').value.trim();
        const techStack = document.getElementById('projTech').value.split(',').map(t => t.trim()).filter(t => t);
        const liveLink = document.getElementById('projLink').value.trim();
        const githubLink = document.getElementById('projGithub').value.trim();
        const iconClass = document.getElementById('projIcon').value.trim() || 'fa-code';
        
        if (!title || !description || techStack.length === 0) {
            showAdminAlert('Please fill title, description and tech stack', 'error');
            return;
        }
        
        await addProject({ title, description, techStack, liveLink, githubLink, iconClass });
        
        document.getElementById('projTitle').value = '';
        document.getElementById('projDesc').value = '';
        document.getElementById('projTech').value = '';
        document.getElementById('projLink').value = '';
        document.getElementById('projGithub').value = '';
    });
    
    // Initialize
    renderProjects();
    populateTechList();
    initSkillsChart();
    toggleAdminUI();
    
    // Inject admin dashboard HTML
    const adminRoot = document.getElementById('adminPanelRoot');
    if (adminRoot) {
        adminRoot.innerHTML = `
            <div id="loginFormDiv" class="admin-login">
                <i class="fas fa-lock" style="font-size: 2rem; color:#2563eb;"></i>
                <h3>Admin Access</h3>
                <input type="email" id="adminEmail" placeholder="Email" value="admin@portfolio.com">
                <input type="password" id="adminPassword" placeholder="Password" value="SecurePass123!">
                <button id="adminLoginBtn" class="admin-action-btn">Login →</button>
                <p style="margin-top:12px; font-size:0.8rem;">Demo: admin@portfolio.com / SecurePass123!</p>
            </div>
            <div id="adminDashboard" class="admin-panel hidden">
                <div id="adminAlert" class="alert"></div>
                <h3><i class="fas fa-plus-circle"></i> Add New Project</h3>
                <div class="project-form">
                    <div class="form-group">
                        <label>Project Title *</label>
                        <input type="text" id="projTitle" placeholder="e.g., AI Image Generator">
                    </div>
                    <div class="form-group">
                        <label>Description *</label>
                        <textarea id="projDesc" rows="2" placeholder="Short description..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Tech Stack * (comma separated)</label>
                        <input type="text" id="projTech" placeholder="React, Node, MongoDB">
                    </div>
                    <div class="form-group">
                        <label>Live Link</label>
                        <input type="text" id="projLink" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label>GitHub Link</label>
                        <input type="text" id="projGithub" placeholder="https://github.com/...">
                    </div>
                    <div class="form-group">
                        <label>Icon Class (FontAwesome)</label>
                        <input type="text" id="projIcon" value="fa-code">
                    </div>
                    <button id="addProjectBtn" class="admin-action-btn">➕ Add Project</button>
                </div>
                <hr style="margin: 1.5rem 0;">
                <h3><i class="fas fa-trash-alt"></i> Manage Projects</h3>
                <div id="manageProjectsList"></div>
                <button id="adminLogoutBtn" class="admin-action-btn" style="margin-top:1rem; background:#ef4444;">Logout</button>
            </div>
        `;
        
        document.getElementById('adminLogoutBtn')?.addEventListener('click', adminLogout);
        toggleAdminUI();
    }
});