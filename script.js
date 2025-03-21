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
    const senderName = document.getElementById('sender-name')?.value.trim();
    const senderAddress = document.getElementById('sender-address')?.value.trim();
    const recipientName = document.getElementById('recipient-name')?.value.trim();
    const recipientAddress = document.getElementById('recipient-address')?.value.trim();
    const salutation = document.getElementById('salutation')?.value.trim();
    const title = document.getElementById('title')?.value.trim();
    const content = document.getElementById('content')?.value.trim();
    const id = editId.value;

    if (!senderName || !senderAddress || !recipientName || !recipientAddress || !salutation || !title || !content) {
        alert("Please fill in all fields.");
        return;
    }
    if (title.length > 100) {
        alert("Subject/Title must be 100 characters or less.");
        return;
    }

    const documentData = {
        senderName,
        senderAddress,
        recipientName,
        recipientAddress,
        salutation,
        title,
        content,
        timestamp: serverTimestamp()
    };

    if (id) {
        updateDoc(doc(db, 'documents', id), documentData)
            .then(() => {
                resetForm();
                loadDocuments(true);
            })
            .catch(error => alert(error.message));
    } else {
        addDoc(collection(db, 'documents'), documentData)
            .then(() => {
                resetForm();
                loadDocuments(true);
            })
            .catch(error => alert(error.message));
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

            if (!searchTerm || title.includes(searchTerm)) {
                const li = document.createElement('li');
                const safeSenderName = (data.senderName || 'Unknown').replace(/'/g, "\\'");
                const safeSenderAddress = (data.senderAddress || '').replace(/'/g, "\\'");
                const safeRecipientName = (data.recipientName || 'Unknown').replace(/'/g, "\\'");
                const safeRecipientAddress = (data.recipientAddress || '').replace(/'/g, "\\'");
                const safeSalutation = (data.salutation || 'Dear Sir/Madam').replace(/'/g, "\\'");
                const safeTitle = data.title.replace(/'/g, "\\'");
                const safeContent = data.content.replace(/'/g, "\\'");

                let buttons = `<button onclick="downloadDoc('${safeSenderName}', '${safeSenderAddress}', '${safeRecipientName}', '${safeRecipientAddress}', '${safeSalutation}', '${safeTitle}', '${safeContent}')">Download</button>`;
                if (isAdmin) {
                    buttons += ` <button onclick="editDoc('${docSnap.id}', '${safeSenderName}', '${safeSenderAddress}', '${safeRecipientName}', '${safeRecipientAddress}', '${safeSalutation}', '${safeTitle}', '${safeContent}')">Edit</button>`;
                    buttons += ` <button onclick="removeDoc('${docSnap.id}')">Delete</button>`;
                }
                li.innerHTML = `${data.title} ${buttons}`;
                documentList.appendChild(li);
            }
        });
    }).catch(error => console.error("Error loading documents:", error));
}

// Edit Document
function editDoc(id, senderName, senderAddress, recipientName, recipientAddress, salutation, title, content) {
    formTitle.textContent = "Edit Letter/Agenda";
    editId.value = id;
    document.getElementById('sender-name').value = senderName;
    document.getElementById('sender-address').value = senderAddress;
    document.getElementById('recipient-name').value = recipientName;
    document.getElementById('recipient-address').value = recipientAddress;
    document.getElementById('salutation').value = salutation;
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

// Generate and Download Docx in Letter Format
function downloadDoc(senderName, senderAddress, recipientName, recipientAddress, salutation, title, content) {
    if (!window.docx || !window.docx.Document) {
        alert("Error: docx library not loaded. Please refresh the page.");
        return;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const doc = new window.docx.Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: window.docx.convertInchesToTwip(1),
                        bottom: window.docx.convertInchesToTwip(1),
                        left: window.docx.convertInchesToTwip(1),
                        right: window.docx.convertInchesToTwip(1)
                    }
                }
            },
            children: [
                // Sender's Address
                new window.docx.Paragraph({
                    children: senderAddress.split('\n').map(line => 
                        new window.docx.TextRun({
                            text: line,
                            font: "Times New Roman",
                            size: 24
                        })
                    ),
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Date
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: currentDate,
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Recipient Name (New Addition)
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: recipientName,
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Recipient's Address
                new window.docx.Paragraph({
                    children: recipientAddress.split('\n').map(line => 
                        new window.docx.TextRun({
                            text: line,
                            font: "Times New Roman",
                            size: 24
                        })
                    ),
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Salutation
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: salutation,
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Subject/Title
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: `Subject: ${title}`,
                        bold: true,
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Body
                new window.docx.Paragraph({
                    children: content.split('\n').map(line => 
                        new window.docx.TextRun({
                            text: line,
                            font: "Times New Roman",
                            size: 24
                        })
                    ),
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Closing
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: "Sincerely,",
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                // Signature
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: senderName,
                        font: "Times New Roman",
                        size: 24
                    })],
                    alignment: window.docx.AlignmentType.LEFT
                })
            ]
        }]
    });

    window.docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${title}.docx`);
    });
}

// Expose functions to global scope
window.downloadDoc = downloadDoc;
window.removeDoc = removeDoc;
window.editDoc = editDoc;