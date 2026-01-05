// ========== NAVIGATION FUNCTIONS ==========
function showAdminOptions() {
    hideAllForms();
    document.getElementById('admin-options').classList.remove('hidden');
}

function backToRoles() {
    hideAllForms();
    document.getElementById('role-selector').classList.remove('hidden');
}

function showLoginForm(role) {
    hideAllForms();
    document.getElementById(`login-form-${role}`).classList.remove('hidden');
}

function showSignupForm(role) {
    hideAllForms();
    document.getElementById(`signup-form-${role}`).classList.remove('hidden');
}

function hideAllForms() {
    const forms = ['role-selector', 'admin-options', 
        'login-form-student', 'login-form-officer', 'login-form-company',
        'signup-form-student', 'signup-form-officer', 'signup-form-company'];
    forms.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ========== LOGIN FUNCTION ==========
async function loginUser(event, role) {
    event.preventDefault();
    
    const email = document.getElementById(`${role}-email`).value;
    const password = document.getElementById(`${role}-password`).value;
    
    if (db && firebase.auth) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Verify role from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== role) {
                await firebase.auth().signOut();
                alert('Invalid credentials for this role');
                return;
            }
            
            const userData = userDoc.data();
            
            // Store user data in sessionStorage
            sessionStorage.setItem('userRole', role);
            sessionStorage.setItem('userId', user.uid);
            
            if (role === 'company') {
                sessionStorage.setItem('userName', userData.companyName || userData.name);
            } else {
                sessionStorage.setItem('userName', userData.name);
            }
            
            sessionStorage.setItem('userEmail', user.email);
            
            if (role === 'student') {
                sessionStorage.setItem('userCGPA', userData.cgpa || 7.5);
                sessionStorage.setItem('userBranch', userData.branch || 'cse');
                sessionStorage.setItem('userYear', userData.year || '1');
                sessionStorage.setItem('userRollNumber', userData.rollNumber || '');
            }
            
            // Redirect to appropriate dashboard
            if (role === 'student') {
                window.location.href = 'student.html';
            } else if (role === 'officer') {
                window.location.href = 'admin.html';
            } else if (role === 'company') {
                window.location.href = 'company.html';
            }
            
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    } else {
        alert('❌ Firebase not configured. Please check your Firebase configuration.');
    }
}

// ========== REGISTRATION FUNCTION ==========
async function registerUser(event, role) {
    event.preventDefault();
    
    const emailId = `signup-${role}-email`;
    const passwordId = `signup-${role}-password`;
    const nameId = `signup-${role}-name`;
    
    const email = document.getElementById(emailId).value;
    const password = document.getElementById(passwordId).value;
    const name = document.getElementById(nameId).value;
    
    let additionalData = { name, role };
    
    if (role === 'student') {
        additionalData.rollNumber = document.getElementById('signup-student-roll').value;
        additionalData.branch = document.getElementById('signup-student-branch').value;
        additionalData.year = document.getElementById('signup-student-year').value;
        additionalData.cgpa = parseFloat(document.getElementById('signup-student-cgpa').value);
    } else if (role === 'officer') {
        additionalData.department = document.getElementById('signup-officer-dept').value;
        additionalData.approved = true; // Auto-approve for testing
    } else if (role === 'company') {
        additionalData.companyName = document.getElementById('signup-company-name').value;
        additionalData.industry = document.getElementById('signup-company-industry').value;
        additionalData.approved = true; // Auto-approve for testing
    }
    
    if (db && firebase.auth) {
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Save user data to Firestore
            await db.collection('users').doc(user.uid).set({
                ...additionalData,
                email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`✅ Account created successfully!\n\nYou can now login with your credentials.`);
            showLoginForm(role);
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: ' + error.message);
        }
    } else {
        alert('❌ Firebase not configured. Please check your Firebase configuration.');
    }
}

// ========== LOGOUT FUNCTION ==========
async function logout() {
    if (firebase.auth && firebase.auth().currentUser) {
        await firebase.auth().signOut();
    }
    
    sessionStorage.clear();
    window.location.href = 'index.html';
}
