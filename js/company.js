// ========== COMPANY DASHBOARD JS ==========

let curUserId = null;
let companyName = '';
let myJobs = [];
let myApplications = [];
let selectedLocation = null;
let searchTimeout = null;

// Check if user is logged in as company
if (!sessionStorage.getItem('userRole') || sessionStorage.getItem('userRole') !== 'company') {
    window.location.href = 'login.html';
}

curUserId = sessionStorage.getItem('userId');
companyName = sessionStorage.getItem('userName') || 'Company';

document.getElementById('prof-name').innerText = companyName;

// Load data
loadMyJobs();
loadMyApplications();

// ========== LOCATION AUTOCOMPLETE & GEOCODING ==========
function setupLocationAutocomplete() {
    const locationInput = document.getElementById('job-location');
    const suggestionsDiv = document.getElementById('location-suggestions');
    
    if (!locationInput) return;
    
    locationInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) clearTimeout(searchTimeout);
        
        // Hide suggestions if query is too short
        if (query.length < 3) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchLocation(query);
        }, 500);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!locationInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
}

async function searchLocation(query) {
    const suggestionsDiv = document.getElementById('location-suggestions');
    
    try {
        // Using Nominatim (OpenStreetMap) free geocoding API
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
        const results = await response.json();
        
        if (results.length === 0) {
            suggestionsDiv.innerHTML = '<div class="p-4 text-sm text-slate-500">No locations found. Try a different city name.</div>';
            suggestionsDiv.classList.remove('hidden');
            return;
        }
        
        suggestionsDiv.innerHTML = results.map((place, index) => `
            <div class="p-3 hover:bg-emerald-50 cursor-pointer transition-all border-b border-slate-100 last:border-0" onclick="selectLocation(${index}, ${JSON.stringify(place).replace(/"/g, '&quot;')})">
                <p class="font-bold text-sm text-slate-800">${place.display_name}</p>
                <p class="text-xs text-slate-500 mt-1">Lat: ${parseFloat(place.lat).toFixed(4)}, Lng: ${parseFloat(place.lon).toFixed(4)}</p>
            </div>
        `).join('');
        
        suggestionsDiv.classList.remove('hidden');
        
    } catch (error) {
        console.error('Geocoding error:', error);
        suggestionsDiv.innerHTML = '<div class="p-4 text-sm text-red-500">Error loading locations. Please try again.</div>';
        suggestionsDiv.classList.remove('hidden');
    }
}

window.selectLocation = function(index, place) {
    const locationInput = document.getElementById('job-location');
    const suggestionsDiv = document.getElementById('location-suggestions');
    const latInput = document.getElementById('job-lat');
    const lngInput = document.getElementById('job-lng');
    const coordsDisplay = document.getElementById('job-coords-display');
    const statusMsg = document.getElementById('location-status');
    
    // Set location name
    locationInput.value = place.display_name;
    
    // Set coordinates
    latInput.value = parseFloat(place.lat);
    lngInput.value = parseFloat(place.lon);
    
    // Update display
    coordsDisplay.value = `${parseFloat(place.lat).toFixed(4)}, ${parseFloat(place.lon).toFixed(4)}`;
    
    // Show success message
    statusMsg.classList.remove('hidden');
    setTimeout(() => statusMsg.classList.add('hidden'), 3000);
    
    // Hide suggestions
    suggestionsDiv.classList.add('hidden');
    
    // Auto-select region based on location
    autoSelectRegion(place.address);
}

function autoSelectRegion(address) {
    const regionSelect = document.getElementById('job-region');
    if (!address || !regionSelect) return;
    
    const country = address.country || '';
    
    if (country.toLowerCase().includes('india')) {
        regionSelect.value = 'india';
    } else if (country.toLowerCase().includes('united states') || country.toLowerCase().includes('usa')) {
        regionSelect.value = 'usa';
    } else if (country.toLowerCase().includes('china') || country.toLowerCase().includes('japan') || 
               country.toLowerCase().includes('singapore') || country.toLowerCase().includes('australia')) {
        regionSelect.value = 'apac';
    } else if (country.toLowerCase().includes('saudi') || country.toLowerCase().includes('dubai') || 
               country.toLowerCase().includes('uae')) {
        regionSelect.value = 'middle-east';
    } else if (country.toLowerCase().includes('germany') || country.toLowerCase().includes('france') || 
               country.toLowerCase().includes('uk') || country.toLowerCase().includes('united kingdom')) {
        regionSelect.value = 'europe';
    }
}

window.showCoordinatesInfo = function() {
    alert('📍 How Location Works:\n\n1. Start typing your city name\n2. Select from the suggestions\n3. Coordinates are automatically detected\n4. This location will appear as a red marker on the 3D globe!\n\nStudents will see your job location on the interactive map.');
}

// ========== LOAD MY JOBS ==========
async function loadMyJobs() {
    if (!db) return;
    
    try {
        // In real scenario, you'd filter by company userId
        // For now, we'll load all companies
        const snapshot = await db.collection('companies').get();
        myJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateStats();
        updateJobsList();
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// ========== LOAD APPLICATIONS ==========
async function loadMyApplications() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('applications').get();
        myApplications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Get student details
        const studentIds = [...new Set(myApplications.map(app => app.userId))];
        const studentsPromises = studentIds.map(id => db.collection('users').doc(id).get());
        const studentsSnaps = await Promise.all(studentsPromises);
        const students = studentsSnaps.map(snap => ({ id: snap.id, ...snap.data() }));
        
        // Attach student data to applications
        myApplications = myApplications.map(app => ({
            ...app,
            studentData: students.find(s => s.id === app.userId)
        }));
        
        updateStats();
        updateRecentApplications();
        updateApplicantsList();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

// ========== UPDATE STATS ==========
function updateStats() {
    document.getElementById('stat-drives').textContent = myJobs.length;
    document.getElementById('stat-applications').textContent = myApplications.length;
    
    const pending = myApplications.filter(app => app.status === 'pending').length;
    document.getElementById('stat-pending').textContent = pending;
}

// ========== UPDATE RECENT APPLICATIONS ==========
function updateRecentApplications() {
    const container = document.getElementById('recent-applications');
    if (!container) return;
    
    const recent = myApplications.slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-6">No applications yet</p>';
        return;
    }
    
    container.innerHTML = recent.map(app => {
        const company = myJobs.find(j => j.id === app.companyId);
        
        return `
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white">
                        ${app.studentData?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <p class="font-black text-slate-900">${app.studentData?.name || 'Student'}</p>
                        <p class="text-xs text-slate-500">${company?.role || 'Position'} • CGPA: ${app.cgpa || 'N/A'}</p>
                    </div>
                </div>
                <span class="text-[10px] font-black uppercase px-4 py-2 rounded-full ${
                    app.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                }">${app.status}</span>
            </div>
        `;
    }).join('');
}

// ========== UPDATE JOBS LIST ==========
function updateJobsList() {
    const container = document.getElementById('jobs-list');
    if (!container) return;
    
    if (myJobs.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-20">
                <div class="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2">No Job Postings Yet</h3>
                <p class="text-slate-500 mb-6">Start recruiting by posting your first job opening.</p>
                <button onclick="showPostJobModal()" class="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:shadow-xl transition-all">Post Your First Job</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myJobs.map(job => {
        const applicantCount = myApplications.filter(app => app.companyId === job.id).length;
        
        return `
            <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white">
                        ${job.name?.charAt(0) || 'C'}
                    </div>
                    <button onclick="deleteJob('${job.id}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
                <h3 class="font-black text-xl text-slate-900 mb-2">${job.name}</h3>
                <p class="text-emerald-600 font-bold text-sm mb-4">${job.role}</p>
                <div class="space-y-2 mb-4">
                    <p class="text-xs text-slate-600"><strong>Package:</strong> ${job.package}</p>
                    <p class="text-xs text-slate-600"><strong>Min CGPA:</strong> ${job.minCGPA}</p>
                    <p class="text-xs text-slate-600"><strong>Location:</strong> ${job.location}</p>
                </div>
                <div class="pt-4 border-t border-slate-200">
                    <p class="text-xs text-slate-500"><strong>${applicantCount}</strong> applications</p>
                </div>
            </div>
        `;
    }).join('');
}

// ========== UPDATE APPLICANTS LIST ==========
function updateApplicantsList() {
    const container = document.getElementById('applicants-list');
    if (!container) return;
    
    if (myApplications.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-10">No applicants yet</p>';
        return;
    }
    
    container.innerHTML = myApplications.map(app => {
        const job = myJobs.find(j => j.id === app.companyId);
        
        return `
            <div class="p-6 border border-slate-100 rounded-2xl hover:shadow-lg transition-all">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white">
                                ${app.studentData?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <p class="font-black text-slate-900">${app.studentData?.name || 'Student'}</p>
                                <p class="text-xs text-slate-500">${app.studentData?.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-3">
                            <p class="text-sm text-slate-600"><strong>Position:</strong> ${job?.role || 'N/A'}</p>
                            <p class="text-sm text-slate-600"><strong>CGPA:</strong> ${app.cgpa || 'N/A'}</p>
                            <p class="text-sm text-slate-600"><strong>Branch:</strong> ${app.studentData?.branch?.toUpperCase() || 'N/A'}</p>
                            <p class="text-sm text-slate-600"><strong>Year:</strong> ${app.studentData?.year || 'N/A'}</p>
                        </div>
                        <p class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg"><strong>Why join?</strong> ${app.reason || 'N/A'}</p>
                    </div>
                    ${app.status === 'pending' ? `
                        <div class="flex flex-col gap-2 ml-4">
                            <button onclick="updateStatus('${app.id}', 'accepted')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Accept</button>
                            <button onclick="updateStatus('${app.id}', 'rejected')" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500">Reject</button>
                        </div>
                    ` : `
                        <span class="text-[10px] font-black uppercase px-4 py-2 rounded-full ${
                            app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }">${app.status}</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
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
        dashboard: ['Company Dashboard', 'Manage your recruitment drives'],
        jobs: ['Your Job Postings', 'View and manage all your job posts'],
        applicants: ['All Applicants', 'Review student applications']
    };
    if(hMap[v]) {
        document.getElementById('v-title').innerText = hMap[v][0];
        document.getElementById('v-sub').innerText = hMap[v][1];
    }
}

// ========== POST JOB ==========
window.showPostJobModal = function() {
    document.getElementById('post-job-modal').classList.remove('hidden');
    setupLocationAutocomplete();
}

window.closePostJobModal = function() {
    document.getElementById('post-job-modal').classList.add('hidden');
    // Clear form
    const form = document.querySelector('#post-job-modal form');
    if (form) form.reset();
    document.getElementById('job-lat').value = '';
    document.getElementById('job-lng').value = '';
    document.getElementById('job-coords-display').value = '';
    document.getElementById('location-status').classList.add('hidden');
}

window.postJob = async function(event) {
    event.preventDefault();
    
    // Get selected branches
    const selectedBranches = Array.from(document.querySelectorAll('.branch-checkbox:checked')).map(cb => cb.value);
    
    if (selectedBranches.length === 0) {
        alert('Please select at least one eligible branch');
        return;
    }
    
    // Validate coordinates are set
    const lat = document.getElementById('job-lat').value;
    const lng = document.getElementById('job-lng').value;
    
    if (!lat || !lng) {
        alert('⚠️ Please select a location from the suggestions to auto-fill coordinates.\n\nType your city name and choose from the dropdown.');
        document.getElementById('job-location').focus();
        return;
    }
    
    const jobData = {
        name: companyName,
        role: document.getElementById('job-role').value,
        description: document.getElementById('job-description').value,
        package: '₹' + document.getElementById('job-package').value + ' LPA',
        pkg: parseFloat(document.getElementById('job-package').value),
        minCGPA: parseFloat(document.getElementById('job-cgpa').value),
        location: document.getElementById('job-location').value,
        deadline: document.getElementById('job-deadline').value,
        branch: selectedBranches,
        region: document.getElementById('job-region').value,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        companyId: curUserId,
        createdAt: new Date().toISOString()
    };
    
    if (db) {
        try {
            await db.collection('companies').add(jobData);
            alert('✅ Job posted successfully! It will appear on student dashboard and 3D globe at your exact location!');
            closePostJobModal();
            loadMyJobs();
        } catch (error) {
            console.error('Error posting job:', error);
            alert('Error posting job: ' + error.message);
        }
    }
}

// ========== DELETE JOB ==========
window.deleteJob = async function(jobId) {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    if (db) {
        try {
            await db.collection('companies').doc(jobId).delete();
            alert('✅ Job deleted successfully!');
            loadMyJobs();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Error deleting job: ' + error.message);
        }
    }
}

// ========== UPDATE APPLICATION STATUS ==========
window.updateStatus = async function(appId, status) {
    if (db) {
        try {
            await db.collection('applications').doc(appId).update({ status });
            alert(`✅ Application ${status}!`);
            loadMyApplications();
        } catch (error) {
            console.error('Error updating application:', error);
            alert('Error updating application: ' + error.message);
        }
    }
}

// ========== LOGOUT ==========
window.logout = async function() {
    if (firebase.auth && firebase.auth().currentUser) {
        await firebase.auth().signOut();
    }
    sessionStorage.clear();
    window.location.href = 'login.html';
}
