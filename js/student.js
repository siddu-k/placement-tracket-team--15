// ========== STUDENT DASHBOARD JS ==========

let curCGPA = 7.5;
let curBranch = 'cse';
let curUserId = null;
let userName = '';
let userApplications = [];
let notifications = [];
let scene, camera, renderer, markers, globe, clouds, stars;
let selectedFilters = { branch: 'all', location: 'all', package: 'all' };
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let COMPANIES = []; // Will be loaded from Firebase

// Check if user is logged in
if (!sessionStorage.getItem('userRole') || sessionStorage.getItem('userRole') !== 'student') {
    window.location.href = 'login.html';
}

// Load user data
curUserId = sessionStorage.getItem('userId');
userName = sessionStorage.getItem('userName') || 'Student';
curCGPA = parseFloat(sessionStorage.getItem('userCGPA')) || 7.5;
curBranch = sessionStorage.getItem('userBranch') || 'cse';
const userYear = sessionStorage.getItem('userYear') || '1';
const userRollNumber = sessionStorage.getItem('userRollNumber') || '';

document.getElementById('prof-name').innerText = userName;
document.querySelector('#sidebar .text-blue-300').innerText = `${curBranch.toUpperCase()} - Year ${userYear}`;
document.getElementById('cgpa-val').innerText = curCGPA.toFixed(1);
document.getElementById('cgpa-slider').value = curCGPA;

// Initialize - Load data from Firebase
loadCompaniesFromFirebase();
loadUserApplications();
generateNotifications();

// ========== LOAD COMPANIES FROM FIREBASE ==========
async function loadCompaniesFromFirebase() {
    if (!db) {
        console.error('❌ Firebase not configured!');
        alert('Firebase is not configured. Please check your configuration.');
        return;
    }
    
    try {
        console.log('📡 Loading companies from Firebase...');
        const snapshot = await db.collection('companies').get();
        
        COMPANIES = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`✅ Loaded ${COMPANIES.length} companies from Firebase`);
        
        if (COMPANIES.length === 0) {
            console.warn('⚠️ No companies found in database');
        }
        
        updateCoreUI();
        
    } catch (error) {
        console.error('Error loading companies:', error);
        alert('Failed to load job listings. Please check your connection and refresh the page.');
    }
}

// ========== CORE UI UPDATE ==========
function updateCoreUI() {
    const search = document.getElementById('j-search').value.toLowerCase();
    
    let eligible = COMPANIES.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search) || c.role.toLowerCase().includes(search);
        const matchCGPA = c.minCGPA <= curCGPA;
        const matchBranch = selectedFilters.branch === 'all' || c.branch.includes(selectedFilters.branch);
        const matchLocation = selectedFilters.location === 'all' || c.region === selectedFilters.location;
        const matchPackage = selectedFilters.package === 'all' || filterByPackage(c.pkg, selectedFilters.package);
        
        return matchSearch && matchCGPA && matchBranch && matchLocation && matchPackage;
    });
    
    document.getElementById('stat-t').innerText = COMPANIES.length;
    document.getElementById('stat-e').innerText = eligible.length;
    document.getElementById('stat-i').innerText = COMPANIES.length - eligible.length;
    document.getElementById('cgpa-val').innerText = curCGPA.toFixed(1);

    // Mini list (dashboard preview)
    const miniList = document.getElementById('mini-list');
    if (eligible.length === 0) {
        miniList.innerHTML = '<p class="text-center text-slate-400 py-8 text-sm">No job openings available yet. Companies will post opportunities soon!</p>';
    } else {
        miniList.innerHTML = eligible.slice(0, 3).map(c => `
            <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-900 text-white rounded-lg flex items-center justify-center font-black italic text-xs">${c.name[0]}</div>
                    <p class="font-black text-xs text-slate-800">${c.name}</p>
                </div>
                <p class="text-[10px] font-black text-blue-600">${c.package}</p>
            </div>
        `).join('');
    }

    // Full job grid
    const jobGrid = document.getElementById('grid-jobs');
    if (eligible.length === 0) {
        jobGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">No Job Openings Yet</h3>
                <p class="text-slate-500 mb-6">Companies haven't posted any opportunities matching your profile yet.</p>
                <p class="text-sm text-slate-400">✨ Check back soon or improve your CGPA to unlock more opportunities!</p>
            </div>
        `;
    } else {
        jobGrid.innerHTML = eligible.map(c => {
            const isApplied = userApplications.some(app => app.companyId === c.id);
            const daysLeft = getDaysUntilDeadline(c.deadline);
            const isUrgent = daysLeft <= 3 && daysLeft >= 0;
            
            return `
            <div class="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                ${isUrgent ? '<div class="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl uppercase deadline-urgent">Urgent</div>' : ''}
                <div class="bg-slate-50 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl italic text-slate-300 group-hover:bg-blue-900 group-hover:text-white transition-all mb-6 md:mb-8">${c.name[0]}</div>
                <h4 class="text-lg md:text-xl font-black text-slate-900 italic mb-1">${c.name}</h4>
                <p class="text-blue-600 font-bold text-sm mb-4">${c.role}</p>
                <div class="flex items-center space-x-2 mb-6">
                    <span class="text-[9px] font-black uppercase text-slate-400">Deadline:</span>
                    <span class="text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-slate-600'}">${formatDeadline(c.deadline)}</span>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[9px] font-black uppercase text-slate-300 mb-1">Package</p>
                        <p class="text-sm font-black text-slate-800">${c.package}</p>
                    </div>
                    <button onclick="openApplyModal(${c.id})" class="${isApplied ? 'bg-emerald-600' : 'bg-slate-900'} text-white px-4 md:px-5 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all" ${isApplied ? 'disabled' : ''}>
                        ${isApplied ? '✓ Applied' : 'Apply'}
                    </button>
                </div>
            </div>
        `}).join('');
    }
    
    if (markers) updateMapDots(eligible);
}

// ========== NAVIGATION ==========
window.switchView = function(v) {
    document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('sidebar-active');
        b.classList.add('text-slate-500');
    });
    const active = document.getElementById(`btn-${v}`);
    if(active) active.classList.add('sidebar-active');

    const hMap = {
        dashboard: ['Dashboard', 'Candidate eligibility profile.'],
        map: ['Global Map', 'Corporate partner locations.'],
        jobs: ['Job Board', 'Active campus drives.']
    };
    if(hMap[v]) {
        document.getElementById('v-title').innerText = hMap[v][0];
        document.getElementById('v-sub').innerText = hMap[v][1];
    }
    
    if(v === 'map' && !scene) {
        console.log('Initializing 3D globe...');
        init3D();
    }
    if(v === 'map' && renderer) {
        setTimeout(() => {
            const container = document.getElementById('canvas-container');
            if (container) {
                renderer.setSize(container.clientWidth, container.clientHeight);
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
            }
        }, 100);
    }
}

// ========== 3D GLOBE (IMPROVED) ==========
function init3D() {
    const container = document.getElementById('canvas-container');
    if(!container || scene) return;
    
    // Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 15;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 3, 5);
    scene.add(directional);
    
    // Texture Loader
    const loader = new THREE.TextureLoader();
    
    // Globe with High-Quality Textures
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        map: loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'),
        bumpMap: loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'),
        bumpScale: 0.05,
        specularMap: loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'),
        specular: new THREE.Color('grey')
    });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);
    
    // Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(5.1, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
        map: loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'),
        transparent: true,
        opacity: 0.8
    });
    clouds = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(clouds);
    
    // Background Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPos = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 1000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
    scene.add(stars);
    
    // Company Markers
    markers = new THREE.Group();
    scene.add(markers);
    
    // Mouse Interaction
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
    });
    
    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - prevMouse.x;
        const deltaY = e.clientY - prevMouse.y;
        globe.rotation.y += deltaX * 0.005;
        globe.rotation.x += deltaY * 0.005;
        clouds.rotation.y += deltaX * 0.005;
        clouds.rotation.x += deltaY * 0.005;
        markers.rotation.y += deltaX * 0.005;
        markers.rotation.x += deltaY * 0.005;
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    
    container.style.cursor = 'grab';
    
    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        
        if (!isDragging) {
            globe.rotation.y += 0.001;
            clouds.rotation.y += 0.0015; // Clouds move slightly faster
            markers.rotation.y += 0.001;
        }
        
        stars.rotation.y += 0.0001;
        renderer.render(scene, camera);
    }
    animate();
    
    updateCoreUI();
}

function updateMapDots(items) {
    if(!markers) return;
    markers.clear();
    items.forEach(c => {
        const phi = (90 - c.lat) * (Math.PI / 180);
        const theta = (c.lng + 180) * (Math.PI / 180);
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 12, 12), 
            new THREE.MeshBasicMaterial({ color: 0xff6b35 })
        );
        
        const r = 5.15;
        dot.position.set(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
        markers.add(dot);
    });
}

// ========== APPLICATIONS ==========
async function loadUserApplications() {
    if (!db) {
        console.error('❌ Firebase not configured!');
        return;
    }
    
    try {
        const snapshot = await db.collection('applications')
            .where('userId', '==', curUserId)
            .get();
        userApplications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

function generateNotifications() {
    notifications = [];
    
    COMPANIES.forEach(c => {
        const daysLeft = getDaysUntilDeadline(c.deadline);
        if (daysLeft <= 3 && daysLeft >= 0 && c.minCGPA <= curCGPA) {
            notifications.push({
                type: 'deadline',
                company: c.name,
                message: `${c.name} deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
                urgent: daysLeft <= 1
            });
        }
    });
    
    updateNotificationUI();
}

function updateNotificationUI() {
    const badge = document.getElementById('notif-badge');
    const count = notifications.length;
    
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    
    const list = document.getElementById('notif-list');
    if (notifications.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">No notifications</p>';
    } else {
        list.innerHTML = notifications.map(n => `
            <div class="p-4 ${n.urgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-blue-50 border-l-4 border-blue-500'} rounded-xl">
                <p class="font-bold text-sm text-slate-900">${n.message}</p>
                <p class="text-xs text-slate-500 mt-1">${n.company}</p>
            </div>
        `).join('');
    }
}

window.openApplyModal = function(companyId) {
    const company = COMPANIES.find(c => c.id === companyId);
    if (!company) return;
    
    document.getElementById('modal-company').textContent = company.name;
    document.getElementById('modal-role').textContent = company.role;
    document.getElementById('modal-package').textContent = company.package;
    document.getElementById('modal-cgpa').textContent = company.minCGPA;
    document.getElementById('modal-location').textContent = company.location;
    document.getElementById('modal-deadline').textContent = formatDeadline(company.deadline);
    document.getElementById('apply-modal').classList.remove('hidden');
    document.getElementById('apply-modal').dataset.companyId = companyId;
}

window.closeApplyModal = function() {
    document.getElementById('apply-modal').classList.add('hidden');
    document.getElementById('apply-reason').value = '';
}

window.submitApplication = async function() {
    const companyId = parseInt(document.getElementById('apply-modal').dataset.companyId);
    const reason = document.getElementById('apply-reason').value;
    
    if (!reason.trim()) {
        alert('Please provide a reason for applying');
        return;
    }
    
    const application = {
        userId: curUserId,
        companyId: companyId,
        reason: reason,
        status: 'pending',
        appliedAt: new Date().toISOString(),
        cgpa: curCGPA,
        branch: curBranch
    };
    
    if (db) {
        try {
            await db.collection('applications').add(application);
            console.log('✅ Application saved to Firebase');
        } catch (error) {
            console.error('Error saving application:', error);
        }
    }
    
    userApplications.push(application);
    closeApplyModal();
    updateCoreUI();
    
    const company = COMPANIES.find(c => c.id === companyId);
    alert(`✅ Application submitted to ${company.name}!\n\nYou'll receive updates via email.`);
}

// ========== EVENT LISTENERS ==========
document.getElementById('cgpa-slider').addEventListener('input', (e) => {
    curCGPA = parseFloat(e.target.value);
    updateCoreUI();
    generateNotifications();
});

document.getElementById('j-search').addEventListener('input', () => {
    updateCoreUI();
});

document.getElementById('filter-branch')?.addEventListener('change', (e) => {
    selectedFilters.branch = e.target.value;
    updateCoreUI();
});

document.getElementById('filter-location')?.addEventListener('change', (e) => {
    selectedFilters.location = e.target.value;
    updateCoreUI();
});

document.getElementById('filter-package')?.addEventListener('change', (e) => {
    selectedFilters.package = e.target.value;
    updateCoreUI();
});

document.getElementById('clear-filters')?.addEventListener('click', () => {
    selectedFilters = { branch: 'all', location: 'all', package: 'all' };
    document.getElementById('filter-branch').value = 'all';
    document.getElementById('filter-location').value = 'all';
    document.getElementById('filter-package').value = 'all';
    updateCoreUI();
});

document.getElementById('notif-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('notif-panel');
    panel.classList.toggle('hidden');
});

document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn = document.getElementById('notif-btn');
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.add('hidden');
    }
});

window.addEventListener('resize', () => {
    if (renderer && !document.getElementById('view-map').classList.contains('hidden')) {
        const container = document.getElementById('canvas-container');
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    }
});
