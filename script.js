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
const DOM = {
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    loginSection: document.getElementById('login-section'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    adminSection: document.getElementById('admin-section'),
    letterForm: document.getElementById('letter-form'),
    formTitle: document.getElementById('form-title'),
    editId: document.getElementById('edit-id'),
    cancelEditBtn: document.getElementById('cancel-edit'),
    documentList: document.getElementById('document-list'),
    searchInput: document.getElementById('search-input'),
    typeModal: document.getElementById('type-modal'),
    formatModal: document.getElementById('format-modal'),
    pdfBtn: document.getElementById('pdf-btn'),
    docxBtn: document.getElementById('docx-btn'),
    letterBtn: document.getElementById('letter-btn'),
    agendaBtn: document.getElementById('agenda-btn'),
};

// Constants
const ADMIN_EMAIL = "admin@example.com";

// Authentication State Listener
onAuthStateChanged(auth, user => user ? handleUserLoggedIn(user) : handleUserLoggedOut());

function handleUserLoggedIn(user) {
    toggleVisibility(DOM.loginBtn, false);
    toggleVisibility(DOM.logoutBtn, true);
    toggleVisibility(DOM.loginSection, false);

    if (user.email === ADMIN_EMAIL) {
        toggleVisibility(DOM.adminSection, true);
        loadDocuments(true);
    } else {
        loadDocuments(false);
    }
}

function handleUserLoggedOut() {
    toggleVisibility(DOM.loginBtn, true);
    toggleVisibility(DOM.logoutBtn, false);
    toggleVisibility(DOM.loginSection, false);
    toggleVisibility(DOM.adminSection, false);
    loadDocuments(false);
}

// Utility Functions
function toggleVisibility(element, isVisible) {
    element.style.display = isVisible ? 'block' : 'none';
}

function displayError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Login
DOM.loginBtn.addEventListener('click', () => toggleVisibility(DOM.loginSection, true));
DOM.loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    if (!email || !password) return displayError(DOM.loginError, "Please fill in all fields.");
    if (!isValidEmail(email)) return displayError(DOM.loginError, "Please enter a valid email address.");

    signInWithEmailAndPassword(auth, email, password)
        .then(() => console.log("Login successful"))
        .catch(error => displayError(DOM.loginError, `Login failed: ${error.message}`));
});

// Logout
DOM.logoutBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to log out?")) {
        signOut(auth).then(() => console.log("Logged out successfully"))
            .catch(error => alert("Logout failed: " + error.message));
    }
});

// Form Handling
DOM.letterForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = getFormData();
    if (!isFormDataValid(formData)) return alert("Please fill the details");

    const id = DOM.editId.value;
    id ? updateDocument(id, formData) : addDocument(formData);
});

function getFormData() {
    return {
        senderName: document.getElementById('sender-name')?.value?.trim() || "",
        recipientName: document.getElementById('recipient-name')?.value?.trim() || "",
        salutation: document.getElementById('salutation')?.value?.trim() || "",
        title: document.getElementById('title')?.value?.trim() || "",
        content: document.getElementById('content')?.value?.trim() || "",
        specificRequest: document.getElementById('specific-request')?.value?.trim() || "",
        closing: document.getElementById('closing')?.value?.trim() || "",
        timestamp: serverTimestamp(),
    };
}

function isFormDataValid(data) {
    return Object.entries(data).every(([key, value]) =>
        key === 'timestamp' || (typeof value === 'string' && value.trim() !== '')
    );
}

function resetForm() {
    DOM.formTitle.textContent = "Create Letter/Agenda";
    DOM.editId.value = '';
    DOM.letterForm.reset();
    toggleVisibility(DOM.cancelEditBtn, false);
}

DOM.cancelEditBtn.addEventListener('click', resetForm);

// Document Management
function loadDocuments(isAdmin) {
    DOM.documentList.innerHTML = '';
    const searchTerm = DOM.searchInput.value.trim().toLowerCase();
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
    DOM.documentList.appendChild(li);
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

function editDoc(id, data) {
    DOM.formTitle.textContent = "Edit Letter/Agenda";
    DOM.editId.value = id;

    Object.keys(data).forEach(key => {
        const input = document.getElementById(key);
        if (input) input.value = data[key];
    });

    toggleVisibility(DOM.cancelEditBtn, true);
    DOM.adminSection.scrollIntoView({ behavior: 'smooth' });
}

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
    isLoggedIn ? showTypeModal(data) : generateAgenda(data);
}

function showTypeModal(data) {
    toggleVisibility(DOM.typeModal, true);

    DOM.typeModal.addEventListener('click', event => {
        if (event.target === DOM.typeModal) toggleVisibility(DOM.typeModal, false);
    });

    DOM.letterBtn.onclick = () => {
        toggleVisibility(DOM.typeModal, false);
        showFormatModal(data, 'letter');
    };

    DOM.agendaBtn.onclick = () => {
        toggleVisibility(DOM.typeModal, false);
        generateAgenda(data);
    };
}

function showFormatModal(data, type) {
    toggleVisibility(DOM.formatModal, true);

    DOM.formatModal.addEventListener('click', event => {
        if (event.target === DOM.formatModal) toggleVisibility(DOM.formatModal, false);
    });

    DOM.pdfBtn.onclick = () => {
        toggleVisibility(DOM.formatModal, false);
        if (type === 'letter') generatePDF(data);
    };

    DOM.docxBtn.onclick = () => {
        toggleVisibility(DOM.formatModal, false);
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
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Times", "normal");
    doc.setFontSize(12);

    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 10, 10);
    doc.text(data.recipientName, 10, 20);
    doc.text(data.salutation, 10, 30);
    doc.text(`Subject: ${data.title}`, 10, 40);
    doc.text(data.content, 10, 50);
    doc.text(`Specific Request: ${data.specificRequest}`, 10, 70);
    doc.text(`Closing: ${data.closing}`, 10, 90);
    doc.text(`Sincerely,`, 10, 110);
    doc.text(data.senderName, 10, 120);

    doc.save(`${data.title}.pdf`);
}

// Generate DOCX
function generateDOCX(data) {
    const doc = new window.docx.Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: window.docx.convertInchesToTwip(1),
                            bottom: window.docx.convertInchesToTwip(1),
                            left: window.docx.convertInchesToTwip(1),
                            right: window.docx.convertInchesToTwip(1),
                        },
                    },
                },
                children: [
                    new window.docx.Paragraph({
                        children: [
                            new window.docx.TextRun({
                                text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                                font: "Times New Roman",
                                size: 24,
                            }),
                        ],
                        spacing: { after: 400 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: [new window.docx.TextRun({ text: data.salutation, font: "Times New Roman", size: 24 })],
                        spacing: { after: 200 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: [
                            new window.docx.TextRun({
                                text: `Subject: ${data.title}`,
                                bold: true,
                                font: "Times New Roman",
                                size: 24,
                            }),
                        ],
                        spacing: { after: 200 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: data.content.split('\n').map(line =>
                            new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })
                        ),
                        spacing: { after: 400 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: [
                            new window.docx.TextRun({
                                text: `Specific Request: ${data.specificRequest}`,
                                font: "Times New Roman",
                                size: 24,
                            }),
                        ],
                        spacing: { after: 400 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: [new window.docx.TextRun({ text: data.closing, font: "Times New Roman", size: 24 })],
                        spacing: { after: 200 },
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                    new window.docx.Paragraph({
                        children: [new window.docx.TextRun({ text: data.senderName, font: "Times New Roman", size: 24 })],
                        alignment: window.docx.AlignmentType.LEFT,
                    }),
                ],
            },
        ],
    });

    window.docx.Packer.toBlob(doc).then(blob => saveAs(blob, `${data.title}.docx`));
}