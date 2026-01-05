// ========== ADMIN DASHBOARD JS ==========

let curUserId = null;
let userName = '';
let students = [];
let drives = [];
let applications = [];

// Check if user is logged in as officer
if (!sessionStorage.getItem('userRole') || sessionStorage.getItem('userRole') !== 'officer') {
    window.location.href = 'login.html';
}

curUserId = sessionStorage.getItem('userId');
userName = sessionStorage.getItem('userName') || 'Officer';

document.getElementById('prof-name').innerText = userName;

// Load data
loadStudents();
loadDrives();
loadApplications();

// ========== LOAD STUDENTS ==========
async function loadStudents() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .get();
        
        students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateStats();
        updateStudentsTable();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// ========== LOAD DRIVES ==========
async function loadDrives() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('companies').get();
        drives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateStats();
        updateDrivesList();
    } catch (error) {
        console.error('Error loading drives:', error);
    }
}

// ========== LOAD APPLICATIONS ==========
async function loadApplications() {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('applications').get();
        applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateStats();
        updateActivityList();
        updateApplicationsList();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

// ========== UPDATE STATS ==========
function updateStats() {
    document.getElementById('stat-students').textContent = students.length;
    document.getElementById('stat-drives').textContent = drives.length;
    document.getElementById('stat-applications').textContent = applications.length;
    
    const avgCGPA = students.length > 0 
        ? (students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / students.length).toFixed(2)
        : '0.0';
    document.getElementById('stat-cgpa').textContent = avgCGPA;
}

// ========== UPDATE STUDENTS TABLE ==========
function updateStudentsTable() {
    const table = document.getElementById('students-table');
    if (!table) return;
    
    table.innerHTML = students.map(s => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all">
            <td class="py-6">
                <p class="font-black text-slate-900">${s.name || 'N/A'}</p>
            </td>
            <td class="py-6 font-bold text-xs text-slate-600">${s.rollNumber || 'N/A'}</td>
            <td class="py-6 font-bold text-xs text-slate-600 uppercase">${s.branch || 'N/A'}</td>
            <td class="py-6 font-bold text-xs text-slate-600">${s.year || 'N/A'}</td>
            <td class="py-6 font-bold text-xs text-slate-600">${s.cgpa || 'N/A'}</td>
            <td class="py-6 font-bold text-xs text-slate-400">${s.email || 'N/A'}</td>
        </tr>
    `).join('');
}

// ========== UPDATE DRIVES LIST ==========
function updateDrivesList() {
    const list = document.getElementById('drives-list');
    if (!list) return;
    
    if (drives.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-10">No drives posted yet</p>';
        return;
    }
    
    list.innerHTML = drives.map(d => `
        <div class="p-6 border border-slate-100 rounded-2xl hover:shadow-lg transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-black text-xl text-slate-900">${d.name}</h3>
                    <p class="text-blue-600 font-bold text-sm mt-1">${d.role}</p>
                    <div class="flex gap-4 mt-4 text-xs">
                        <span class="text-slate-500"><strong>Package:</strong> ${d.package}</span>
                        <span class="text-slate-500"><strong>Min CGPA:</strong> ${d.minCGPA}</span>
                        <span class="text-slate-500"><strong>Deadline:</strong> ${formatDate(d.deadline)}</span>
                    </div>
                </div>
                <button onclick="deleteDrive('${d.id}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ========== UPDATE ACTIVITY LIST ==========
function updateActivityList() {
    const list = document.getElementById('activity-list');
    if (!list) return;
    
    const recentApps = applications.slice(0, 10);
    
    if (recentApps.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-6">No recent activity</p>';
        return;
    }
    
    list.innerHTML = recentApps.map(app => {
        const student = students.find(s => s.id === app.userId);
        const drive = drives.find(d => d.id === app.companyId);
        
        return `
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center font-black text-white">
                        ${student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <p class="font-black text-slate-900">${student?.name || 'Student'}</p>
                        <p class="text-xs text-slate-500">Applied to ${drive?.name || 'Company'}</p>
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

// ========== UPDATE APPLICATIONS LIST ==========
function updateApplicationsList() {
    const list = document.getElementById('applications-list');
    if (!list) return;
    
    if (applications.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-10">No applications yet</p>';
        return;
    }
    
    list.innerHTML = applications.map(app => {
        const student = students.find(s => s.id === app.userId);
        const drive = drives.find(d => d.id === app.companyId);
        
        return `
            <div class="p-6 border border-slate-100 rounded-2xl">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center font-black text-white text-sm">
                                ${student?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <p class="font-black text-slate-900">${student?.name || 'Student'}</p>
                                <p class="text-xs text-slate-500">${student?.email || 'N/A'}</p>
                            </div>
                        </div>
                        <p class="text-sm text-slate-600 mb-2"><strong>Company:</strong> ${drive?.name || 'N/A'}</p>
                        <p class="text-sm text-slate-600 mb-2"><strong>CGPA:</strong> ${app.cgpa || 'N/A'}</p>
                        <p class="text-sm text-slate-600"><strong>Reason:</strong> ${app.reason || 'N/A'}</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="updateApplicationStatus('${app.id}', 'accepted')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Accept</button>
                        <button onclick="updateApplicationStatus('${app.id}', 'rejected')" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500">Reject</button>
                    </div>
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
        dashboard: ['Dashboard', 'Overview and recent activity'],
        analytics: ['Analytics', 'Visual insights and statistics'],
        updates: ['Updates & Announcements', 'Post updates for students'],
        students: ['Registered Students', 'View all student profiles'],
        drives: ['Placement Drives', 'Manage campus recruitment drives'],
        applications: ['Student Applications', 'Review and manage applications']
    };
    if(hMap[v]) {
        document.getElementById('v-title').innerText = hMap[v][0];
        document.getElementById('v-sub').innerText = hMap[v][1];
    }
    
    // Load analytics charts when viewing analytics
    if(v === 'analytics') {
        loadAnalytics();
    }
    
    // Load updates when viewing updates
    if(v === 'updates') {
        loadUpdates();
    }
}

// ========== ADD DRIVE ==========
window.showAddDriveModal = function() {
    document.getElementById('add-drive-modal').classList.remove('hidden');
}

window.closeAddDriveModal = function() {
    document.getElementById('add-drive-modal').classList.add('hidden');
}

window.addDrive = async function(event) {
    event.preventDefault();
    
    const driveData = {
        name: document.getElementById('drive-company').value,
        role: document.getElementById('drive-role').value,
        package: '₹' + document.getElementById('drive-package').value + ' LPA',
        pkg: parseFloat(document.getElementById('drive-package').value),
        minCGPA: parseFloat(document.getElementById('drive-cgpa').value),
        location: document.getElementById('drive-location').value,
        deadline: document.getElementById('drive-deadline').value,
        branch: ['cse', 'ece', 'eee', 'mech', 'civil'],
        region: 'india',
        lat: 12.971,
        lng: 77.594,
        createdAt: new Date().toISOString()
    };
    
    if (db) {
        try {
            await db.collection('companies').add(driveData);
            alert('✅ Drive added successfully!');
            closeAddDriveModal();
            loadDrives();
        } catch (error) {
            console.error('Error adding drive:', error);
            alert('Error adding drive: ' + error.message);
        }
    }
}

// ========== DELETE DRIVE ==========
window.deleteDrive = async function(driveId) {
    if (!confirm('Are you sure you want to delete this drive?')) return;
    
    if (db) {
        try {
            await db.collection('companies').doc(driveId).delete();
            alert('✅ Drive deleted successfully!');
            loadDrives();
        } catch (error) {
            console.error('Error deleting drive:', error);
            alert('Error deleting drive: ' + error.message);
        }
    }
}

// ========== UPDATE APPLICATION STATUS ==========
window.updateApplicationStatus = async function(appId, status) {
    if (db) {
        try {
            await db.collection('applications').doc(appId).update({ status });
            alert(`✅ Application ${status}!`);
            loadApplications();
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

// ========== HELPER FUNCTIONS ==========
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
