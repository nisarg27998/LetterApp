// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, serverTimestamp, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCroQ0YiVCM1N0Rc3r0UF8Fi7sKE936rag",
    authDomain: "letterapp-6ce0e.firebaseapp.com",
    projectId: "letterapp-6ce0e",
    storageBucket: "letterapp-6ce0e.firebasestorage.app",
    messagingSenderId: "881956313058",
    appId: "1:881956313058:web:0db1d59066616119640bbb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminSection = document.getElementById('admin-section');
const letterForm = document.getElementById('letter-form');
const formTitle = document.getElementById('form-title');
const editId = document.getElementById('edit-id');
const cancelEditBtn = document.getElementById('cancel-edit');
const documentList = document.getElementById('document-list');
const searchInput = document.getElementById('search-input');

// Admin Email
const ADMIN_EMAIL = "admin@example.com";

// Authentication State Listener
onAuthStateChanged(auth, user => {
    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        loginSection.style.display = 'none';
        if (user.email === ADMIN_EMAIL) {
            adminSection.style.display = 'block';
            loadDocuments(true);
        } else {
            loadDocuments(false);
        }
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        loginSection.style.display = 'none';
        adminSection.style.display = 'none';
        loadDocuments(false);
    }
});

// Show Login Form
loginBtn.addEventListener('click', () => {
    loginSection.style.display = 'block';
    loginBtn.style.display = 'none';
});

// Login Form Submission with Validation
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    loginError.style.display = 'none';
    
    if (!email || !password) {
        loginError.textContent = "Please fill in all fields.";
        loginError.style.display = 'block';
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        loginError.textContent = "Please enter a valid email address.";
        loginError.style.display = 'block';
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => console.log("Login successful"))
        .catch(error => {
            console.error("Login error:", error);
            loginError.textContent = `Login failed: ${error.message}`;
            loginError.style.display = 'block';
        });
});

// Logout with Confirmation
logoutBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to log out?")) {
        signOut(auth)
            .then(() => console.log("Logged out successfully"))
            .catch(error => alert("Logout failed: " + error.message));
    }
});

// Add or Edit Document
letterForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const id = editId.value;

    if (!title || !content) {
        alert("Please fill in both title and content.");
        return;
    }
    if (title.length > 100) {
        alert("Title must be 100 characters or less.");
        return;
    }

    if (id) {
        updateDoc(doc(db, 'documents', id), {
            title,
            content,
            timestamp: serverTimestamp()
        }).then(() => {
            resetForm();
            loadDocuments(true);
        }).catch(error => alert(error.message));
    } else {
        addDoc(collection(db, 'documents'), {
            title,
            content,
            timestamp: serverTimestamp()
        }).then(() => {
            resetForm();
            loadDocuments(true);
        }).catch(error => alert(error.message));
    }
});

// Cancel Edit
cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

// Search Documents
searchInput.addEventListener('input', () => {
    loadDocuments(auth.currentUser && auth.currentUser.email === ADMIN_EMAIL);
});

// Load Documents with Search
function loadDocuments(isAdmin) {
    documentList.innerHTML = '';
    const searchTerm = searchInput.value.trim().toLowerCase();
    const q = query(collection(db, 'documents'), orderBy('timestamp', 'desc'));

    getDocs(q).then(querySnapshot => {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = data.title.toLowerCase();

            // Filter by search term
            if (!searchTerm || title.includes(searchTerm)) {
                const li = document.createElement('li');
                let buttons = `<button onclick="downloadDoc('${data.title}', '${data.content}')">Download</button>`;
                if (isAdmin) {
                    buttons += ` <button onclick="editDoc('${docSnap.id}', '${data.title}', '${data.content}')">Edit</button>`;
                    buttons += ` <button onclick="removeDoc('${docSnap.id}')">Delete</button>`;
                }
                li.innerHTML = `${data.title} ${buttons}`;
                documentList.appendChild(li);
            }
        });
    }).catch(error => console.error("Error loading documents:", error));
}

// Edit Document
function editDoc(id, title, content) {
    formTitle.textContent = "Edit Letter/Agenda";
    editId.value = id;
    document.getElementById('title').value = title;
    document.getElementById('content').value = content;
    cancelEditBtn.style.display = 'inline-block';
    adminSection.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form
function resetForm() {
    formTitle.textContent = "Create Letter/Agenda";
    editId.value = '';
    letterForm.reset();
    cancelEditBtn.style.display = 'none';
}

// Delete Document
function removeDoc(docId) {
    if (confirm("Are you sure you want to delete this document?")) {
        deleteDoc(doc(db, 'documents', docId))
            .then(() => loadDocuments(true))
            .catch(error => alert(error.message));
    }
}

// Generate and Download Docx
function downloadDoc(title, content) {
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    text: title,
                    heading: docx.HeadingLevel.HEADING_1
                }),
                new docx.Paragraph({
                    text: content
                })
            ]
        }]
    });

    docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${title}.docx`);
    });
}

// Expose functions to global scope
window.downloadDoc = downloadDoc;
window.removeDoc = removeDoc;
window.editDoc = editDoc;