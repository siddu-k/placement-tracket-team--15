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
let studentTests = []; // CRT Tests
let currentTest = null; // Currently taking test
let testAnswers = {}; // User's answers
let testTimer = null; // Timer interval

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
loadStudentTests();

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
    document.getElementById('cgpa-val').innerText = curCGPA.toFixed(1);

    // Mini list (dashboard preview)
    const miniList = document.getElementById('mini-list');
    if (eligible.length === 0) {
        miniList.innerHTML = '<p class="text-center text-slate-400 py-8 text-sm">No job openings available yet. Companies will post opportunities soon!</p>';
    } else {
        miniList.innerHTML = eligible.slice(0, 3).map(c => {
            const daysLeft = getDaysUntilDeadline(c.deadline);
            const isUrgent = daysLeft <= 3 && daysLeft >= 0;
            const isApplied = userApplications.some(app => app.companyId === c.id);
            
            return `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer" onclick="showJobDetail('${c.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black italic text-sm">${c.name[0]}</div>
                        <div>
                            <p class="font-black text-sm text-slate-800">${c.name}</p>
                            <p class="text-xs text-blue-600 font-bold">${c.role}</p>
                        </div>
                    </div>
                    ${isApplied ? '<span class="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-black">APPLIED</span>' : ''}
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px] mb-3">
                    <div>
                        <span class="text-slate-400 font-bold uppercase">Package:</span>
                        <p class="text-slate-800 font-black">${c.package}</p>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold uppercase">Min CGPA:</span>
                        <p class="text-slate-800 font-black">${c.minCGPA}</p>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold uppercase">Location:</span>
                        <p class="text-slate-800 font-bold truncate">${c.location}</p>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold uppercase">Deadline:</span>
                        <p class="font-black ${isUrgent ? 'text-red-500' : 'text-slate-800'}">${formatDeadline(c.deadline)}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div class="flex flex-wrap gap-1">
                        ${c.branch && c.branch.length > 0 ? c.branch.slice(0, 2).map(b => `<span class="text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">${b}</span>`).join('') : ''}
                    </div>
                    <span class="text-[9px] text-slate-400 font-bold">${c.region || 'Global'}</span>
                </div>
            </div>
            `;
        }).join('');
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
            const description = c.description || 'No description provided';
            
            return `
            <div class="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden cursor-pointer" onclick="showJobDetail('${c.id}')" onmouseenter="showJobTooltip(event, ${c.id})" onmouseleave="hideJobTooltip()">
                ${isUrgent ? '<div class="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl uppercase deadline-urgent">Urgent</div>' : ''}
                <div class="bg-slate-50 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl italic text-slate-300 group-hover:bg-blue-900 group-hover:text-white transition-all mb-6 md:mb-8">${c.name[0]}</div>
                <h4 class="text-lg md:text-xl font-black text-slate-900 italic mb-1">${c.name}</h4>
                <p class="text-blue-600 font-bold text-sm mb-4">${c.role}</p>
                <div class="flex items-center space-x-2 mb-2">
                    <span class="text-[9px] font-black uppercase text-slate-400">Location:</span>
                    <span class="text-xs font-bold text-slate-600 truncate">${c.location}</span>
                </div>
                <div class="flex items-center space-x-2 mb-6">
                    <span class="text-[9px] font-black uppercase text-slate-400">Deadline:</span>
                    <span class="text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-slate-600'}">${formatDeadline(c.deadline)}</span>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[9px] font-black uppercase text-slate-300 mb-1">Package</p>
                        <p class="text-sm font-black text-slate-800">${c.package}</p>
                    </div>
                    <button onclick="event.stopPropagation(); openApplyModal('${c.id}')" class="${isApplied ? 'bg-emerald-600' : 'bg-slate-900'} text-white px-4 md:px-5 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all" ${isApplied ? 'disabled' : ''}>
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
        map: ['Job Locations', 'View job opportunities on 3D globe.'],
        jobs: ['Job Board', 'Active campus drives.'],
        applications: ['My Applications', 'Track your application status.'],
        'online-tests': ['Online Tests', 'Take CRT and aptitude tests.'],
        profile: ['My Profile', 'Update your information.'],
        'ai-helper': ['AI Job Assistant', 'Get personalized job recommendations.']
    };
    if(hMap[v]) {
        document.getElementById('v-title').innerText = hMap[v][0];
        document.getElementById('v-sub').innerText = hMap[v][1];
    }
    
    // Load applications when viewing that section
    if(v === 'applications') {
        updateApplicationsList();
    }
    
    // Load online tests when viewing
    if(v === 'online-tests') {
        updateStudentTestsList();
    }
    
    // Load profile data when viewing profile
    if(v === 'profile') {
        loadProfileData();
    }
    
    // Initialize AI helper
    if(v === 'ai-helper') {
        initAIHelper();
    }
    
    // Ensure map dots are updated when switching to map view
    if(v === 'map') {
        updateMapDots(COMPANIES.filter(c => c.minCGPA <= curCGPA));
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
        
        // Removed auto-rotation - user controls globe movement
        
        stars.rotation.y += 0.0001;
        renderer.render(scene, camera);
    }
    animate();
    
    // Setup globe hover tooltip
    createGlobeTooltip();
    setupGlobeHover();
    
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
        
        // Store company data for hover tooltip
        dot.userData = {
            companyName: c.name,
            role: c.role,
            location: c.location
        };
        
        markers.add(dot);
    });
}

// Globe hover tooltip
let globeTooltip = null;
function createGlobeTooltip() {
    if (!globeTooltip) {
        globeTooltip = document.createElement('div');
        globeTooltip.id = 'globe-tooltip';
        globeTooltip.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(globeTooltip);
    }
}

function setupGlobeHover() {
    if (!renderer || !camera || !markers) return;
    
    const canvas = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(markers.children);
        
        if (intersects.length > 0 && intersects[0].object.userData.companyName) {
            const data = intersects[0].object.userData;
            globeTooltip.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px;">${data.companyName}</div>
                <div style="font-size: 12px; color: #fbbf24;">${data.role}</div>
                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${data.location}</div>
            `;
            globeTooltip.style.display = 'block';
            globeTooltip.style.left = event.clientX + 15 + 'px';
            globeTooltip.style.top = event.clientY + 15 + 'px';
            canvas.style.cursor = 'pointer';
        } else {
            globeTooltip.style.display = 'none';
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        globeTooltip.style.display = 'none';
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
        console.log(`✅ Loaded ${userApplications.length} applications`);
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

async function generateNotifications() {
    notifications = [];
    
    // Job deadline notifications
    COMPANIES.forEach(c => {
        const daysLeft = getDaysUntilDeadline(c.deadline);
        if (daysLeft <= 3 && daysLeft >= 0 && c.minCGPA <= curCGPA) {
            notifications.push({
                type: 'deadline',
                company: c.name,
                message: `${c.name} deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
                urgent: daysLeft <= 1,
                time: c.deadline
            });
        }
    });
    
    // Load updates from placement officer
    if (db) {
        try {
            const snapshot = await db.collection('updates').orderBy('createdAt', 'desc').limit(5).get();
            snapshot.docs.forEach(doc => {
                const update = doc.data();
                notifications.push({
                    type: 'update',
                    message: update.title,
                    company: update.message,
                    urgent: update.priority === 'urgent',
                    time: update.createdAt
                });
            });
        } catch (error) {
            console.error('Error loading updates:', error);
        }
    }
    
    // Sort by time (most recent first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    
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
        list.innerHTML = notifications.map(n => {
            const icon = n.type === 'update' ? '📢' : '⏰';
            return `
                <div class="p-4 ${n.urgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-blue-50 border-l-4 border-blue-500'} rounded-xl">
                    <p class="font-bold text-sm text-slate-900">${icon} ${n.message}</p>
                    <p class="text-xs text-slate-500 mt-1">${n.company}</p>
                </div>
            `;
        }).join('');
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
    
    // Add description if element exists
    const descElement = document.getElementById('modal-description');
    if (descElement) {
        descElement.textContent = company.description || 'No description provided';
    }
    
    document.getElementById('apply-modal').classList.remove('hidden');
    document.getElementById('apply-modal').dataset.companyId = companyId;
}

// ========== JOB TOOLTIP ==========
window.showJobTooltip = function(event, companyId) {
    const company = COMPANIES.find(c => c.id === companyId);
    if (!company || !company.description) return;
    
    // Remove existing tooltip
    hideJobTooltip();
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'job-tooltip';
    tooltip.className = 'fixed bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-50 max-w-md';
    tooltip.innerHTML = `
        <p class="font-bold text-sm mb-2 text-emerald-400">📋 Job Description</p>
        <p class="text-xs leading-relaxed">${company.description}</p>
        <p class="text-[10px] text-slate-400 mt-3 italic">Click "Apply" to submit your application</p>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip near cursor
    const updatePosition = (e) => {
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY - 50) + 'px';
    };
    
    updatePosition(event);
    event.currentTarget.addEventListener('mousemove', updatePosition);
}

window.hideJobTooltip = function() {
    const tooltip = document.getElementById('job-tooltip');
    if (tooltip) tooltip.remove();
}

window.closeApplyModal = function() {
    document.getElementById('apply-modal').classList.add('hidden');
    document.getElementById('apply-reason').value = '';
}

window.submitApplication = async function() {
    const companyId = document.getElementById('apply-modal').dataset.companyId;
    const reason = document.getElementById('apply-reason').value;
    
    if (!reason.trim()) {
        alert('⚠️ Please provide a reason for applying');
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
            
            userApplications.push(application);
            closeApplyModal();
            updateCoreUI();
            
            // Update My Applications if on that view
            if (!document.getElementById('view-applications').classList.contains('hidden')) {
                updateApplicationsList();
            }
            
            const company = COMPANIES.find(c => c.id === companyId);
            alert(`✅ Application submitted to ${company.name}!\n\nYou'll receive updates via the placement officer.`);
        } catch (error) {
            console.error('Error saving application:', error);
            alert('❌ Failed to submit application. Please try again.');
        }
    } else {
        alert('❌ Firebase not configured. Please check your connection.');
    }
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

// My Applications Functions
function updateApplicationsList() {
    const listContainer = document.getElementById('applications-list');
    if (!listContainer) return;

    // Get current filter
    const activeFilter = document.querySelector('.app-filter-btn.active')?.dataset.status || 'all';
    
    // Filter applications
    let filteredApps = userApplications;
    if (activeFilter !== 'all') {
        filteredApps = userApplications.filter(app => app.status === activeFilter);
    }

    // Sort by date (most recent first)
    filteredApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    // Clear and render
    listContainer.innerHTML = '';

    if (filteredApps.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="mt-2 text-sm text-gray-500">No applications found</p>
            </div>
        `;
        return;
    }

    filteredApps.forEach(app => {
        const company = COMPANIES.find(c => c.id === app.companyId);
        if (!company) return;

        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        const appCard = document.createElement('div');
        appCard.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow';
        appCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${company.name}</h3>
                    <p class="text-sm text-gray-600">${company.role}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColors[app.status] || statusColors.pending}">
                    ${app.status.toUpperCase()}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-600">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Package: ₹${company.pkg} LPA</span>
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>Applied: ${new Date(app.appliedAt).toLocaleDateString()}</span>
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>${company.location}</span>
                </div>
                ${app.reason ? `
                <div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Why you're interested:</p>
                    <p class="text-sm text-gray-700 mt-1">${app.reason}</p>
                </div>
                ` : ''}
                ${app.status === 'rejected' && app.rejectionMessage ? `
                <div class="mt-3 pt-3 border-t border-red-200 bg-red-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                    <p class="text-xs font-bold text-red-700 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                        Rejection Feedback:
                    </p>
                    <p class="text-sm text-red-800 mt-2">${app.rejectionMessage}</p>
                </div>
                ` : ''}
            </div>
        `;
        listContainer.appendChild(appCard);
    });
}

window.filterApplications = function(status) {
    // Update active button
    document.querySelectorAll('.app-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    const activeBtn = document.querySelector(`[data-status="${status}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    }

    updateApplicationsList();
};

// Profile Management Functions
window.loadProfileData = async function() {
    if (!db || !curUserId) {
        console.error('❌ Firebase not configured or user not logged in');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(curUserId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('profile-name').value = userData.name || '';
            document.getElementById('profile-email').value = userData.email || '';
            document.getElementById('profile-roll').value = userData.rollNumber || '';
            document.getElementById('profile-branch').value = userData.branch || 'CSE';
            document.getElementById('profile-year').value = userData.year || '1';
            document.getElementById('profile-cgpa').value = userData.cgpa || '0';
            document.getElementById('profile-skills').value = userData.skills || '';
            document.getElementById('profile-about').value = userData.about || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('❌ Failed to load profile data');
    }
}

window.saveProfile = async function(event) {
    event.preventDefault();
    
    if (!db || !curUserId) {
        alert('❌ Not connected to database');
        return;
    }
    
    const name = document.getElementById('profile-name').value;
    const rollNumber = document.getElementById('profile-roll').value;
    const branch = document.getElementById('profile-branch').value;
    const year = parseInt(document.getElementById('profile-year').value);
    const cgpa = parseFloat(document.getElementById('profile-cgpa').value);
    const skills = document.getElementById('profile-skills').value;
    const about = document.getElementById('profile-about').value;
    
    try {
        await db.collection('users').doc(curUserId).update({
            name: name,
            rollNumber: rollNumber,
            branch: branch,
            year: year,
            cgpa: cgpa,
            skills: skills,
            about: about,
            updatedAt: new Date().toISOString()
        });
        
        // Update session storage
        sessionStorage.setItem('userName', name);
        
        // Update global variables
        curCGPA = cgpa;
        curBranch = branch;
        
        // Update UI
        document.getElementById('prof-name').innerText = name;
        document.getElementById('cgpa-slider').value = cgpa;
        
        alert('✅ Profile updated successfully!');
        
        // Refresh data
        await loadCompaniesFromFirebase();
        updateCoreUI();
        generateNotifications();
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('❌ Failed to save profile: ' + error.message);
    }
};

// Job Detail View Functions
let previousView = 'dashboard';
let currentJobId = null;

window.showJobDetail = function(jobId) {
    const company = COMPANIES.find(c => c.id === jobId);
    if (!company) {
        alert('❌ Job not found');
        return;
    }
    
    // Store previous view and current job
    const currentView = document.querySelector('.content-view:not(.hidden)');
    if (currentView) {
        previousView = currentView.id.replace('view-', '');
    }
    currentJobId = jobId;
    
    // Check if applied
    const isApplied = userApplications.some(app => app.companyId === jobId);
    
    // Populate detail view
    document.getElementById('detail-logo').textContent = company.name[0];
    document.getElementById('detail-company').textContent = company.name;
    document.getElementById('detail-role').textContent = company.role;
    document.getElementById('detail-package').textContent = company.package;
    document.getElementById('detail-cgpa').textContent = company.minCGPA;
    document.getElementById('detail-location').textContent = company.location;
    document.getElementById('detail-deadline').textContent = formatDeadline(company.deadline);
    document.getElementById('detail-description').textContent = company.description || 'No description provided for this position.';
    document.getElementById('detail-region').textContent = company.region || 'Global';
    
    // Show/hide applied badge
    const appliedBadge = document.getElementById('detail-applied-badge');
    if (isApplied) {
        appliedBadge.classList.remove('hidden');
    } else {
        appliedBadge.classList.add('hidden');
    }
    
    // Update apply button
    const applyBtn = document.getElementById('detail-apply-btn');
    if (isApplied) {
        applyBtn.textContent = '✓ Applied';
        applyBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        applyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        applyBtn.disabled = true;
    } else {
        applyBtn.textContent = 'Apply Now';
        applyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        applyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        applyBtn.disabled = false;
    }
    
    // Populate branches
    const branchesContainer = document.getElementById('detail-branches');
    if (company.branch && company.branch.length > 0) {
        branchesContainer.innerHTML = company.branch.map(b => 
            `<span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">${b}</span>`
        ).join('');
    } else {
        branchesContainer.innerHTML = '<p class="text-slate-500 text-sm">All branches eligible</p>';
    }
    
    // Switch to detail view
    document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-job-detail').classList.remove('hidden');
    
    // Update header
    document.getElementById('v-title').textContent = company.name;
    document.getElementById('v-sub').textContent = 'Job Details';
};

window.goBackFromJobDetail = function() {
    // Return to previous view
    document.querySelectorAll('.content-view').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${previousView}`).classList.remove('hidden');
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('sidebar-active');
        b.classList.add('text-slate-500');
    });
    const activeBtn = document.getElementById(`btn-${previousView}`);
    if (activeBtn) activeBtn.classList.add('sidebar-active');
    
    // Update header
    const hMap = {
        dashboard: ['Dashboard', 'Candidate eligibility profile.'],
        map: ['Job Locations', 'View job opportunities on 3D globe.'],
        jobs: ['Job Board', 'Active campus drives.'],
        applications: ['My Applications', 'Track your application status.'],
        profile: ['My Profile', 'Update your information.']
    };
    if (hMap[previousView]) {
        document.getElementById('v-title').textContent = hMap[previousView][0];
        document.getElementById('v-sub').textContent = hMap[previousView][1];
    }
};

window.openApplyModalFromDetail = function() {
    if (currentJobId) {
        openApplyModal(currentJobId);
    }
};

// ========== AI HELPER FUNCTIONS ==========
const MIMO_API_KEY = 'sk-sbeq1xsfr6li9541g23fdb7q384t9cfs1atmft2utrtjjjf3';
const PROXY_URL = 'http://localhost:3001/proxy/xiaomi';

let aiInitialized = false;

function initAIHelper() {
    if (aiInitialized) return;
    aiInitialized = true;
    
    // Update welcome message with current CGPA
    const welcomeMsg = document.querySelector('#ai-chat-messages .bg-blue-50 p');
    if (welcomeMsg && welcomeMsg.textContent.includes('${curCGPA}')) {
        welcomeMsg.textContent = welcomeMsg.textContent.replace('${curCGPA}', curCGPA.toFixed(1));
    }
}

window.askAI = function(question) {
    document.getElementById('ai-input').value = question;
    sendAIMessage();
};

window.sendAIMessage = async function() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatContainer = document.getElementById('ai-chat-messages');
    const sendBtn = document.getElementById('ai-send-btn');
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Disable send button
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    
    try {
        // Prepare context about available jobs
        const eligibleJobs = COMPANIES.filter(c => c.minCGPA <= curCGPA);
        const jobContext = eligibleJobs.map(c => 
            `${c.name} - ${c.role} | Package: ${c.package} | Min CGPA: ${c.minCGPA} | Location: ${c.location} | Deadline: ${c.deadline} | Branches: ${c.branch?.join(', ') || 'All'}`
        ).join('\n');
        
        const systemPrompt = `You are a helpful placement assistant for a student with CGPA ${curCGPA} in ${curBranch} branch. 
Available job opportunities:
${jobContext}

Student has already applied to: ${userApplications.map(app => {
    const company = COMPANIES.find(c => c.id === app.companyId);
    return company ? company.name : 'Unknown';
}).join(', ') || 'None'}

Provide helpful, concise answers about job eligibility, recommendations, and details. Be friendly and encouraging.`;

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': MIMO_API_KEY
            },
            body: JSON.stringify({
                model: 'mimo-v2-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_completion_tokens: 1024,
                temperature: 0.3,
                top_p: 0.95,
                stream: false,
                stop: null,
                frequency_penalty: 0,
                presence_penalty: 0,
                thinking: {
                    type: 'disabled'
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', errorData);
            throw new Error(`AI service error: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        addChatMessage(aiResponse, 'ai');
    } catch (error) {
        console.error('AI Error:', error);
        addChatMessage('Sorry, I couldn\'t process your request. Please make sure the local proxy server is running (node local-proxy.js).', 'ai');
    } finally {
        // Re-enable send button
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>';
    }
};

function addChatMessage(text, sender) {
    const chatContainer = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3';
    
    // Format markdown for AI messages
    let formattedText = sender === 'ai' ? formatMarkdown(text) : escapeHtml(text);
    
    if (sender === 'user') {
        messageDiv.classList.add('flex-row-reverse', 'space-x-reverse');
        messageDiv.innerHTML = `
            <div class="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            </div>
            <div class="bg-slate-700 text-white rounded-2xl p-4 max-w-[80%]">
                <p class="text-sm">${formattedText}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
            </div>
            <div class="bg-blue-50 rounded-2xl p-4 max-w-[80%]">
                <div class="text-sm text-slate-700 whitespace-pre-line markdown-content">${formattedText}</div>
            </div>
        `;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Convert markdown to HTML
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-black">$1</strong>');
    
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em class="italic">$1</em>');
    
    // Bullet points: - item or * item
    formatted = formatted.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-4">• $1</li>');
    
    // Numbers: 1. item
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4">$1</li>');
    
    // Code: `code`
    formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
    
    return formatted;
}

// ========== ONLINE TESTS FUNCTIONS ==========

// Load all CRT tests
async function loadStudentTests() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('crt-tests').orderBy('createdAt', 'desc').get();
        studentTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📚 Loaded tests:', studentTests.length);
    } catch (error) {
        console.error('Error loading tests:', error);
    }
}

// Update student tests list
function updateStudentTestsList() {
    const container = document.getElementById('student-tests-list');
    if (!container) return;
    
    const activeFilter = document.querySelector('.student-test-filter-btn.active')?.dataset.filter || 'all';
    const now = new Date();
    
    let filteredTests = studentTests;
    if (activeFilter === 'live') {
        filteredTests = studentTests.filter(t => {
            const start = new Date(t.startTime);
            const end = new Date(t.endTime);
            return start <= now && now <= end;
        });
    } else if (activeFilter === 'upcoming') {
        filteredTests = studentTests.filter(t => new Date(t.startTime) > now);
    } else if (activeFilter === 'completed') {
        filteredTests = studentTests.filter(t => new Date(t.endTime) < now);
    }
    
    if (filteredTests.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16">
                <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <p class="mt-4 text-lg font-bold text-gray-500">No tests available</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTests.map(test => {
        const start = new Date(test.startTime);
        const end = new Date(test.endTime);
        const isLive = start <= now && now <= end;
        const isUpcoming = start > now;
        const isCompleted = end < now;
        
        let statusBadge = '';
        let buttonHTML = '';
        let cardClass = 'bg-white';
        
        if (isLive) {
            statusBadge = '<div class="absolute top-4 right-4"><span class="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center"><span class="w-2 h-2 bg-white rounded-full mr-2"></span>Live</span></div>';
            buttonHTML = `<button onclick="startTest('${test.id}')" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg">Start Exam</button>`;
            cardClass = 'bg-gradient-to-br from-green-50 to-white border-2 border-green-200';
        } else if (isUpcoming) {
            statusBadge = '<div class="absolute top-4 right-4"><span class="bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold">Upcoming</span></div>';
            buttonHTML = `<button class="w-full bg-gray-300 text-gray-600 px-4 py-3 rounded-xl font-bold cursor-not-allowed" disabled>Not Started</button>`;
            cardClass = 'bg-white border border-blue-100';
        } else {
            statusBadge = '<div class="absolute top-4 right-4"><span class="bg-gray-400 text-white px-3 py-1.5 rounded-full text-xs font-bold">Ended</span></div>';
            buttonHTML = `<button class="w-full bg-gray-200 text-gray-500 px-4 py-3 rounded-xl font-bold cursor-not-allowed" disabled>Completed</button>`;
            cardClass = 'bg-gray-50 border border-gray-200 opacity-75';
        }
        
        return `
            <div class="relative ${cardClass} rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
                ${statusBadge}
                <div class="mb-4">
                    <h3 class="text-xl font-black text-slate-900 mb-2 pr-20">${test.name}</h3>
                    <p class="text-sm font-bold text-blue-600">${test.module}</p>
                </div>
                
                <div class="space-y-3 mb-6">
                    <div class="flex items-center text-sm text-slate-600">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
                        </svg>
                        <span class="font-bold">${test.questions?.length || 0} Questions</span>
                    </div>
                    <div class="flex items-center text-sm text-slate-600">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                        </svg>
                        <span class="font-bold">${test.duration} minutes</span>
                    </div>
                    <div class="flex items-center text-sm text-slate-600">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                        <span>${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="text-xs text-slate-500 italic">
                        Ends: ${end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                
                ${buttonHTML}
            </div>
        `;
    }).join('');
}

// Filter student tests
window.filterStudentTests = function(filter) {
    document.querySelectorAll('.student-test-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    }
    
    updateStudentTestsList();
};

// Start a test
window.startTest = function(testId) {
    const test = studentTests.find(t => t.id === testId);
    if (!test) return;
    
    const now = new Date();
    const start = new Date(test.startTime);
    const end = new Date(test.endTime);
    
    if (start > now) {
        alert('⚠️ This test has not started yet!');
        return;
    }
    
    if (end < now) {
        alert('⚠️ This test has ended!');
        return;
    }
    
    // Show confirmation modal
    const confirmStart = confirm(`📋 ${test.name}\\n\\nModule: ${test.module}\\nQuestions: ${test.questions.length}\\nDuration: ${test.duration} minutes\\n\\nOnce you start, the timer cannot be paused.\\n\\nReady to begin?`);
    
    if (!confirmStart) return;
    
    // Initialize test
    currentTest = test;
    testAnswers = {};
    
    // Show modal
    document.getElementById('take-test-modal').classList.remove('hidden');
    
    // Populate test info
    document.getElementById('test-modal-name').textContent = test.name;
    document.getElementById('test-modal-module').textContent = test.module;
    document.getElementById('test-modal-questions').textContent = `${test.questions.length} Questions`;
    document.getElementById('test-modal-duration').textContent = `${test.duration} minutes`;
    document.getElementById('total-questions').textContent = test.questions.length;
    document.getElementById('answered-count').textContent = '0';
    
    // Render questions
    renderTestQuestions(test.questions);
    
    // Start timer
    startTestTimer(test.duration);
};

// Render test questions
function renderTestQuestions(questions) {
    const container = document.getElementById('test-questions-container');
    container.innerHTML = questions.map((q, index) => `
        <div class="mb-8 pb-8 border-b border-slate-200 last:border-0">
            <div class="flex items-start mb-4">
                <span class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">${index + 1}</span>
                <p class="text-lg font-bold text-slate-900">${q.question}</p>
            </div>
            
            <div class="ml-11 space-y-3">
                ${['A', 'B', 'C', 'D'].map(option => `
                    <label class="flex items-center p-4 bg-slate-50 hover:bg-blue-50 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:border-blue-200">
                        <input type="radio" name="question-${index}" value="${option}" onchange="updateAnswer(${index}, '${option}')" class="w-5 h-5 text-blue-600 mr-3">
                        <span class="font-bold text-slate-700 mr-2">${option})</span>
                        <span class="text-slate-700">${q.options[option]}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Update answer
window.updateAnswer = function(questionIndex, answer) {
    testAnswers[questionIndex] = answer;
    
    // Update answered count
    const answeredCount = Object.keys(testAnswers).length;
    document.getElementById('answered-count').textContent = answeredCount;
};

// Start test timer
function startTestTimer(duration) {
    let timeRemaining = duration * 60; // Convert to seconds
    
    function updateTimer() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        document.getElementById('test-timer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(testTimer);
            alert('⏰ Time is up! Submitting your test...');
            submitTest();
        }
        
        timeRemaining--;
    }
    
    updateTimer(); // Initial call
    testTimer = setInterval(updateTimer, 1000);
}

// Submit test
window.submitTest = async function() {
    if (!currentTest) return;
    
    const totalQuestions = currentTest.questions.length;
    const answeredCount = Object.keys(testAnswers).length;
    
    if (answeredCount < totalQuestions) {
        const confirmSubmit = confirm(`⚠️ You have answered ${answeredCount} out of ${totalQuestions} questions.\\n\\nAre you sure you want to submit?`);
        if (!confirmSubmit) return;
    }
    
    // Calculate score
    let correctAnswers = 0;
    currentTest.questions.forEach((q, index) => {
        if (testAnswers[index] === q.correctAnswer) {
            correctAnswers++;
        }
    });
    
    const score = ((correctAnswers / totalQuestions) * 100).toFixed(2);
    
    // Save result to Firebase
    if (db) {
        try {
            await db.collection('test-results').add({
                userId: curUserId,
                userName: userName,
                testId: currentTest.id,
                testName: currentTest.name,
                module: currentTest.module,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                score: parseFloat(score),
                answers: testAnswers,
                submittedAt: new Date().toISOString()
            });
            console.log('✅ Test result saved');
        } catch (error) {
            console.error('Error saving result:', error);
        }
    }
    
    // Clear timer
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    
    // Close modal
    closeTestModal();
    
    // Show result
    alert(`🎉 Test Submitted!\\n\\n📊 Your Score: ${score}%\\n✅ Correct Answers: ${correctAnswers}/${totalQuestions}\\n\\nYour result has been saved. Good luck!`);
};

// Close test modal
window.closeTestModal = function() {
    if (testTimer && currentTest) {
        const confirmExit = confirm('⚠️ Are you sure you want to exit?\\n\\nYour progress will be lost!');
        if (!confirmExit) return;
        
        clearInterval(testTimer);
        testTimer = null;
    }
    
    document.getElementById('take-test-modal').classList.add('hidden');
    currentTest = null;
    testAnswers = {};
};

window.addEventListener('resize', () => {
    if (renderer && !document.getElementById('view-map').classList.contains('hidden')) {
        const container = document.getElementById('canvas-container');
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    }
});
