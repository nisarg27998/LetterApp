// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, serverTimestamp, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

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
        handleUserLoggedIn(user);
    } else {
        handleUserLoggedOut();
    }
});

function handleUserLoggedIn(user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    loginSection.style.display = 'none';

    if (user.email === ADMIN_EMAIL) {
        adminSection.style.display = 'block';
        loadDocuments(true);
    } else {
        loadDocuments(false);
    }
}

function handleUserLoggedOut() {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    loginSection.style.display = 'none';
    adminSection.style.display = 'none';
    loadDocuments(false);
}

// Show Login Form
loginBtn.addEventListener('click', () => {
    loginSection.style.display = 'block';
    loginBtn.style.display = 'none';
});

// Login Form Submission
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    loginError.style.display = 'none';

    if (!email || !password) {
        displayLoginError("Please fill in all fields.");
        return;
    }

    if (!isValidEmail(email)) {
        displayLoginError("Please enter a valid email address.");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => console.log("Login successful"))
        .catch(error => displayLoginError(`Login failed: ${error.message}`));
});

function displayLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Logout
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
    const documentData = getFormData();

    if (!isFormDataValid(documentData)) {
        alert("Please fill in all fields.");
        return;
    }

    const id = editId.value;

    if (id) {
        updateDocument(id, documentData);
    } else {
        addDocument(documentData);
    }
});

function getFormData() {
    return {
        senderName: document.getElementById('sender-name')?.value.trim(),
        senderAddress: document.getElementById('sender-address')?.value.trim(),
        recipientName: document.getElementById('recipient-name')?.value.trim(),
        recipientAddress: document.getElementById('recipient-address')?.value.trim(),
        salutation: document.getElementById('salutation')?.value.trim(),
        title: document.getElementById('title')?.value.trim(),
        content: document.getElementById('content')?.value.trim(),
        specificRequest: document.getElementById('specific-request')?.value.trim(),
        closing: document.getElementById('closing')?.value.trim(),
        timestamp: serverTimestamp()
    };
}

function isFormDataValid(data) {
    return Object.values(data).every(value => value && value.trim() !== '');
}

function updateDocument(id, data) {
    updateDoc(doc(db, 'documents', id), data)
        .then(() => {
            resetForm();
            loadDocuments(true);
        })
        .catch(error => alert(error.message));
}

function addDocument(data) {
    addDoc(collection(db, 'documents'), data)
        .then(() => {
            resetForm();
            loadDocuments(true);
        })
        .catch(error => alert(error.message));
}

// Cancel Edit
cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
    formTitle.textContent = "Create Letter/Agenda";
    editId.value = '';
    letterForm.reset();
    cancelEditBtn.style.display = 'none';
}

// Search Documents
searchInput.addEventListener('input', () => {
    loadDocuments(auth.currentUser && auth.currentUser.email === ADMIN_EMAIL);
});

// Load Documents
function loadDocuments(isAdmin) {
    documentList.innerHTML = '';
    const searchTerm = searchInput.value.trim().toLowerCase();
    const q = query(collection(db, 'documents'), orderBy('timestamp', 'desc'));

    getDocs(q).then(querySnapshot => {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!searchTerm || data.title.toLowerCase().includes(searchTerm)) {
                createDocumentListItem(docSnap.id, data, isAdmin);
            }
        });
    }).catch(error => console.error("Error loading documents:", error));
}

function createDocumentListItem(id, data, isAdmin) {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = data.title;
    titleSpan.style.flex = '1';

    const buttonContainer = createButtonContainer(id, data, isAdmin);

    li.appendChild(titleSpan);
    li.appendChild(buttonContainer);
    documentList.appendChild(li);
}

function createButtonContainer(id, data, isAdmin) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '10px';

    const downloadButton = createButton("Download", () => downloadDoc(data));
    container.appendChild(downloadButton);

    if (isAdmin) {
        const editButton = createButton("Edit", () => editDoc(id, data));
        const deleteButton = createButton("Delete", () => removeDoc(id));
        container.appendChild(editButton);
        container.appendChild(deleteButton);
    }

    return container;
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

// Edit Document
function editDoc(id, data) {
    formTitle.textContent = "Edit Letter/Agenda";
    editId.value = id;

    Object.keys(data).forEach(key => {
        const input = document.getElementById(key);
        if (input) input.value = data[key];
    });

    cancelEditBtn.style.display = 'inline-block';
    adminSection.scrollIntoView({ behavior: 'smooth' });
}

// Delete Document
function removeDoc(id) {
    if (confirm("Are you sure you want to delete this document?")) {
        deleteDoc(doc(db, 'documents', id))
            .then(() => loadDocuments(true))
            .catch(error => alert(error.message));
    }
}

// Download Document
function downloadDoc(data) {
    const isLoggedIn = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;

    if (isLoggedIn) {
        showTypeModal(data);
    } else {
        generateAgenda(data);
    }
}

function showTypeModal(data) {
    const typeModal = document.getElementById('type-modal');
    typeModal.style.display = 'flex';

    typeModal.addEventListener('click', event => {
        if (event.target === typeModal) typeModal.style.display = 'none';
    });

    document.getElementById('letter-btn').onclick = () => {
        typeModal.style.display = 'none';
        showFormatModal(data, 'letter');
    };

    document.getElementById('agenda-btn').onclick = () => {
        typeModal.style.display = 'none';
        generateAgenda(data);
    };
}

function showFormatModal(data, type) {
    const formatModal = document.getElementById('format-modal');
    formatModal.style.display = 'flex';

    formatModal.addEventListener('click', event => {
        if (event.target === formatModal) formatModal.style.display = 'none';
    });

    document.getElementById('pdf-btn').onclick = () => {
        formatModal.style.display = 'none';
        if (type === 'letter') generatePDF(data);
    };

    document.getElementById('docx-btn').onclick = () => {
        formatModal.style.display = 'none';
        if (type === 'letter') generateDOCX(data);
    };
}

// Generate Agenda
function generateAgenda(data) {
    const agendaContent = `
        Agenda
        ======

        Subject: ${data.title}

        Greeting: ${data.salutation}

        Intro Paragraph:
        ${data.content.split('\n')[0]}

        Main Body:
        ${data.content.split('\n').slice(1).join('\n')}

        Specific Request:
        ${data.specificRequest}

        Closing:
        ${data.closing}

        Signature:
        ${data.senderName}
    `;

    const pdfBlob = new Blob([agendaContent], { type: 'application/pdf' });
    saveAs(pdfBlob, `${data.title}-agenda.pdf`);
}

// Generate PDF
function generatePDF(data) {
    const pdfContent = `
        ${data.senderAddress}

        ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

        ${data.recipientName}
        ${data.recipientAddress}

        ${data.salutation}

        Subject: ${data.title}

        ${data.content}

        Sincerely,
        ${data.senderName}
    `;

    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    saveAs(pdfBlob, `${data.title}.pdf`);
}

// Generate DOCX
function generateDOCX(data) {
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
                new window.docx.Paragraph({
                    children: data.senderAddress.split('\n').map(line =>
                        new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })
                    ),
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({ text: data.recipientName, font: "Times New Roman", size: 24 })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: data.recipientAddress.split('\n').map(line =>
                        new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })
                    ),
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({ text: data.salutation, font: "Times New Roman", size: 24 })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({
                        text: `Subject: ${data.title}`,
                        bold: true,
                        font: "Times New Roman",
                        size: 24
                    })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: data.content.split('\n').map(line =>
                        new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })
                    ),
                    spacing: { after: 400 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({ text: "Sincerely,", font: "Times New Roman", size: 24 })],
                    spacing: { after: 200 },
                    alignment: window.docx.AlignmentType.LEFT
                }),
                new window.docx.Paragraph({
                    children: [new window.docx.TextRun({ text: data.senderName, font: "Times New Roman", size: 24 })],
                    alignment: window.docx.AlignmentType.LEFT
                })
            ]
        }]
    });

    window.docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${data.title}.docx`);
    });
}

// Expose functions to global scope
window.downloadDoc = downloadDoc;
window.removeDoc = removeDoc;
window.editDoc = editDoc;