// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminSection = document.getElementById('admin-section');
const letterForm = document.getElementById('letter-form');
const documentList = document.getElementById('document-list');

// Admin Email
const ADMIN_EMAIL = "admin@example.com";

// Authentication State Listener
onAuthStateChanged(auth, user => {
    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        if (user.email === ADMIN_EMAIL) {
            adminSection.style.display = 'block';
            loadDocuments(true); // Show delete buttons for admin
        } else {
            loadDocuments(false); // No delete buttons for guests
        }
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        adminSection.style.display = 'none';
        loadDocuments(false);
    }
});

// Login
loginBtn.addEventListener('click', () => {
    const email = prompt("Enter email:");
    const password = prompt("Enter password:");
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(error.message));
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Add Document
letterForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;

    addDoc(collection(db, 'documents'), {
        title,
        content,
        timestamp: serverTimestamp()
    }).then(() => {
        letterForm.reset();
        loadDocuments(true);
    }).catch(error => alert(error.message));
});

// Load Documents
function loadDocuments(isAdmin) {
    documentList.innerHTML = '';
    const q = query(collection(db, 'documents'), orderBy('timestamp', 'desc'));
    getDocs(q).then(querySnapshot => {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            let buttons = `<button onclick="downloadDoc('${data.title}', '${data.content}')">Download</button>`;
            if (isAdmin) {
                buttons += ` <button onclick="deleteDoc('${docSnap.id}')">Delete</button>`;
            }
            li.innerHTML = `${data.title} ${buttons}`;
            documentList.appendChild(li);
        });
    }).catch(error => console.error("Error loading documents:", error));
}

// Delete Document
function deleteDoc(docId) {
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
window.deleteDoc = deleteDoc;