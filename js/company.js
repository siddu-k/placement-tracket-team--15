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
    const statusMsg = document.getElementById('location-status');
    
    if (!locationInput || !latInput || !lngInput) {
        console.error('Location form elements not found');
        return;
    }
    
    // Set location name
    locationInput.value = place.display_name;
    
    // Set coordinates
    latInput.value = parseFloat(place.lat);
    lngInput.value = parseFloat(place.lon);
    
    // Show success message
    if (statusMsg) {
        statusMsg.classList.remove('hidden');
        setTimeout(() => statusMsg.classList.add('hidden'), 3000);
    }
    
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
                            <button onclick="showRejectModal('${app.id}', '${app.userId}')" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500">Reject</button>
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
        applicants: ['All Applicants', 'Review student applications'],
        'ai-ats': ['AI ATS Assistant', 'Get intelligent candidate recommendations']
    };
    if(hMap[v]) {
        document.getElementById('v-title').innerText = hMap[v][0];
        document.getElementById('v-sub').innerText = hMap[v][1];
    }
    
    // Initialize AI ATS when switching to that view
    if (v === 'ai-ats') {
        initATSAssistant();
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
    
    const latInput = document.getElementById('job-lat');
    const lngInput = document.getElementById('job-lng');
    const statusMsg = document.getElementById('location-status');
    
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    if (statusMsg) statusMsg.classList.add('hidden');
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
// ========== REJECTION WITH MESSAGE ==========
let currentRejectAppId = null;
let currentRejectUserId = null;

window.showRejectModal = function(appId, userId) {
    currentRejectAppId = appId;
    currentRejectUserId = userId;
    document.getElementById('reject-message').value = '';
    document.getElementById('reject-modal').classList.remove('hidden');
};

window.closeRejectModal = function() {
    currentRejectAppId = null;
    currentRejectUserId = null;
    document.getElementById('reject-modal').classList.add('hidden');
};

window.confirmReject = async function() {
    const message = document.getElementById('reject-message').value.trim();
    
    if (!message) {
        alert('Please provide a rejection message for the student.');
        return;
    }
    
    if (!currentRejectAppId) return;
    
    if (db) {
        try {
            // Update application status with rejection message
            await db.collection('applications').doc(currentRejectAppId).update({
                status: 'rejected',
                rejectionMessage: message,
                rejectedAt: new Date().toISOString(),
                rejectedBy: companyName
            });
            
            // Optional: Create a notification for the student
            try {
                await db.collection('notifications').add({
                    userId: currentRejectUserId,
                    type: 'rejection',
                    title: `Application Rejected - ${companyName}`,
                    message: message,
                    from: companyName,
                    createdAt: new Date().toISOString(),
                    read: false
                });
            } catch (notifError) {
                console.log('Notification creation failed (non-critical):', notifError);
            }
            
            alert('✅ Application rejected with feedback sent to student!');
            closeRejectModal();
            loadMyApplications();
        } catch (error) {
            console.error('Error rejecting application:', error);
            alert('Error rejecting application: ' + error.message);
        }
    }
};

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

// ========== AI ATS ASSISTANT ==========
const MIMO_API_KEY = 'sk-sbeq1xsfr6li9541g23fdb7q384t9cfs1atmft2utrtjjjf3';
const PROXY_URL = 'http://localhost:3001/proxy/xiaomi';

let atsInitialized = false;

function initATSAssistant() {
    if (atsInitialized) return;
    atsInitialized = true;
    console.log('AI ATS Assistant initialized');
    console.log('Jobs loaded:', myJobs.length);
    console.log('Applications loaded:', myApplications.length);
    
    // Welcome message is now in HTML, no need to add dynamically
}

window.askATS = function(question) {
    const input = document.getElementById('ats-input');
    if (input) {
        input.value = question;
        window.sendATSMessage();
    }
};

window.sendATSMessage = async function() {
    const input = document.getElementById('ats-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatContainer = document.getElementById('ats-chat-messages');
    const sendBtn = document.getElementById('ats-send-btn');
    
    if (!chatContainer || !sendBtn) {
        console.error('Chat elements not found');
        return;
    }
    
    // Add user message
    addATSChatMessage(message, 'user');
    input.value = '';
    
    // Disable send button
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    
    try {
        // Reload applications with full student data
        console.log('Loading applications with student data...');
        const appsWithStudents = await Promise.all(
            myApplications.map(async (app) => {
                if (!app.studentData && app.userId && db) {
                    try {
                        const userDoc = await db.collection('users').doc(app.userId).get();
                        if (userDoc.exists) {
                            app.studentData = userDoc.data();
                        }
                    } catch (err) {
                        console.error('Error loading student data:', err);
                    }
                }
                return app;
            })
        );
        
        // Prepare context about applications and jobs
        const applicationsContext = appsWithStudents.map(app => {
            const job = myJobs.find(j => j.id === app.companyId);
            const studentName = app.studentData?.name || 'Unknown';
            const studentEmail = app.studentData?.email || 'N/A';
            return `Applicant: ${studentName} (${studentEmail}) | CGPA: ${app.cgpa || app.studentData?.cgpa || 'N/A'} | Branch: ${(app.branch || app.studentData?.branch || 'N/A').toUpperCase()} | Year: ${app.studentData?.year || 'N/A'} | Status: ${app.status} | Position: ${job?.role || 'Unknown'} | Applied: ${new Date(app.appliedAt).toLocaleDateString()} | Reason: ${app.reason?.substring(0, 100) || 'Not provided'}`;
        }).join('\n');
        
        const jobsContext = myJobs.map(j => 
            `${j.role} - Min CGPA: ${j.minCGPA} | Package: ${j.pkg} LPA | Branches: ${j.branch?.join(', ') || 'All'} | Location: ${j.location}`
        ).join('\n');
        
        const systemPrompt = `You are an expert ATS (Applicant Tracking System) AI assistant for ${companyName}. 
        
Your company's open positions:
${jobsContext || 'No active job postings'}

Applications received (${appsWithStudents.length} total):
${applicationsContext || 'No applications yet'}

Provide intelligent insights about:
- Candidate rankings and recommendations
- Qualification analysis and comparisons
- Best-fit applicants for specific roles
- CGPA and branch-based filtering
- Application status summaries

Be professional, data-driven, and provide actionable recommendations. Format lists clearly with bullet points.`;

        console.log('Sending request to AI...');
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
            console.error('API Error Response:', errorData);
            throw new Error(`AI service error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('AI Response received:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response format from AI service');
        }
        
        const aiResponse = data.choices[0].message.content;
        
        if (!aiResponse) {
            console.error('Empty AI response');
            throw new Error('Empty response from AI service');
        }
        
        addATSChatMessage(aiResponse, 'ai');
    } catch (error) {
        console.error('AI Error Details:', error);
        let errorMsg = 'Sorry, I couldn\'t process your request. ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMsg += 'Please make sure the local proxy server is running (node local-proxy.js).';
        } else if (error.message.includes('AI service error')) {
            errorMsg += 'AI service is unavailable. ' + error.message;
        } else {
            errorMsg += error.message;
        }
        
        addATSChatMessage(errorMsg, 'ai');
    } finally {
        // Re-enable send button
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>';
    }
};

function addATSChatMessage(text, sender) {
    const chatContainer = document.getElementById('ats-chat-messages');
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
            <div class="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
            </div>
            <div class="bg-emerald-50 rounded-2xl p-4 max-w-[80%]">
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
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-black">$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em class="italic">$1</em>');
    formatted = formatted.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-4">• $1</li>');
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4">$1</li>');
    formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
    
    return formatted;
}

// ========== LOGOUT ==========
window.logout = async function() {
    if (firebase.auth && firebase.auth().currentUser) {
        await firebase.auth().signOut();
    }
    sessionStorage.clear();
    window.location.href = 'login.html';
}
