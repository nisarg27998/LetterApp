import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, serverTimestamp, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DOM = {
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  registerBtn: document.getElementById("register-btn"),
  loginSection: document.getElementById("login-section"),
  welcomeMessage: document.getElementById("welcome-message"),
  adminSection: document.getElementById("admin-section"),
  adminNav: document.getElementById("admin-nav"),
  loginForm: document.getElementById("login-form"),
  loginError: document.getElementById("login-error"),
  letterForm: document.getElementById("letter-form"),
  formTitle: document.getElementById("form-title"),
  editId: document.getElementById("edit-id"),
  cancelEditBtn: document.getElementById("cancel-edit"),
  documentList: document.getElementById("document-list"),
  searchInput: document.getElementById("search-input"),
  typeModal: document.getElementById("type-modal"),
  formatModal: document.getElementById("format-modal"),
  pdfBtn: document.getElementById("pdf-btn"),
  docxBtn: document.getElementById("docx-btn"),
  letterBtn: document.getElementById("letter-btn"),
  agendaBtn: document.getElementById("agenda-btn"),
  registrationForm: document.getElementById("registration-form"),
  registrationSection: document.getElementById("registration-section"),
  roleForm: document.getElementById("role-form"),
  roleManagementSection: document.getElementById("role-management-section"),
};

// Authentication State
onAuthStateChanged(auth, (user) => user ? handleUserLoggedIn(user) : handleUserLoggedOut());

function handleUserLoggedIn(user) {
  toggleVisibility(DOM.loginBtn, false);
  toggleVisibility(DOM.logoutBtn, true);
  toggleVisibility(DOM.registerBtn, false);
  toggleVisibility(DOM.loginSection, false);

  getDoc(doc(db, "users", user.uid)).then((userDoc) => {
    const userData = userDoc.data() || { role: "viewer" };
    DOM.welcomeMessage.textContent = `Hi, ${userData.role === "admin" ? "Admin" : user.displayName || "User"}`;
    const isAdmin = userData.role === "admin";
    toggleVisibility(DOM.adminSection, true);
    toggleVisibility(DOM.roleManagementSection, isAdmin);
    toggleVisibility(DOM.adminNav, isAdmin);
    toggleVisibility(DOM.guestSection, !isAdmin);
    if (isAdmin) {
      populateUserDropdown();
      showSession("admin-section");
    } else {
      showSession("guest-section");
    }
    loadDocuments(isAdmin);
  }).catch((error) => alert("Failed to load user data: " + error.message));
}

function handleUserLoggedOut() {
  toggleVisibility(DOM.loginBtn, true);
  toggleVisibility(DOM.logoutBtn, false);
  toggleVisibility(DOM.registerBtn, true);
  toggleVisibility(DOM.loginSection, false);
  toggleVisibility(DOM.adminSection, false);
  toggleVisibility(DOM.roleManagementSection, false);
  toggleVisibility(DOM.adminNav, false);
  DOM.welcomeMessage.textContent = "";
  showSession("guest-section");
  loadDocuments(false);
}

// Utility Functions
function toggleVisibility(element, isVisible) {
  if (element) element.style.display = isVisible ? "block" : "none";
}

function displayError(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function showSession(sessionId) {
  const sections = [DOM.adminSection, DOM.roleManagementSection, DOM.registrationSection, DOM.loginSection, DOM.guestSection];
  sections.forEach((section) => toggleVisibility(section, false));
  toggleVisibility(document.getElementById(sessionId), true);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  showSession("guest-section");
  loadDocuments(false);
  initializeDocumentsCollection();

  DOM.typeModal.addEventListener("click", (e) => {
    if (e.target === DOM.typeModal) toggleVisibility(DOM.typeModal, false);
  });
  DOM.formatModal.addEventListener("click", (e) => {
    if (e.target === DOM.formatModal) toggleVisibility(DOM.formatModal, false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleVisibility(DOM.typeModal, false);
      toggleVisibility(DOM.formatModal, false);
    }
  });

  DOM.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    signInWithEmailAndPassword(auth, email, password)
      .then(() => toggleVisibility(DOM.loginSection, false))
      .catch((error) => displayError(DOM.loginError, "Login failed: " + error.message));
  });

  DOM.registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = e.target["reg-username"].value.trim();
    const email = e.target["reg-email"].value.trim();
    const password = e.target["reg-password"].value.trim();
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        return Promise.all([
          updateProfile(user, { displayName: username }),
          setDoc(doc(db, "users", user.uid), { email, role: "viewer" }),
        ]);
      })
      .then(() => {
        alert("Registration successful! Please log in.");
        showSession("login-section");
      })
      .catch((error) => displayError(DOM.registrationError, "Registration failed: " + error.message));
  });

  DOM.letterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = getFormData();
    if (!isFormDataValid(formData)) return alert("Please fill in all fields.");
    const id = DOM.editId.value;
    id ? updateDocument(id, formData) : addDocument(formData);
  });

  DOM.cancelEditBtn.addEventListener("click", resetForm);

  DOM.roleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userId = e.target["user-email"].value;
    const role = e.target["user-role"].value;
    updateDoc(doc(db, "users", userId), { role })
      .then(() => {
        alert("Role assigned successfully!");
        DOM.roleForm.reset();
      })
      .catch((error) => displayError(DOM.roleError, "Failed to assign role: " + error.message));
  });

  DOM.searchInput.addEventListener("input", () => loadDocuments(auth.currentUser && auth.currentUser.uid));

  DOM.loginBtn.addEventListener("click", () => showSession("login-section"));
  DOM.logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      signOut(auth)
        .then(() => alert("You have been logged out."))
        .catch((error) => alert("Logout failed: " + error.message));
    }
  });
  DOM.registerBtn.addEventListener("click", () => showSession("registration-section"));

  document.querySelectorAll("#nav-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSession(e.target.getAttribute("href").substring(1));
    });
  });

  DOM.hamburgerMenu.addEventListener("click", () => DOM.navLinks.classList.toggle("active"));

  DOM.typeModal.addEventListener("click", (e) => { if (e.target === DOM.typeModal) toggleVisibility(DOM.typeModal, false); });
  DOM.formatModal.addEventListener("click", (e) => { if (e.target === DOM.formatModal) toggleVisibility(DOM.formatModal, false); });
});

// Document Management

function loadDocuments(isAdmin) {
  DOM.documentList.innerHTML = "<p>Loading...</p>";
  const searchTerm = DOM.searchInput.value.trim().toLowerCase();
  const q = query(collection(db, "documents"), orderBy("timestamp", "desc"));
  getDocs(q).then((querySnapshot) => {
    DOM.documentList.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!searchTerm || data.title.toLowerCase().includes(searchTerm)) {
        createDocumentListItem(docSnap.id, data, isAdmin);
      }
    });
  }).catch((error) => {
    DOM.documentList.innerHTML = `<p style="color: red;">Error loading documents: ${error.message}</p>`;
  });
}

function loadDocuments(isAdmin, startAfter = null, limit = 10) {
  DOM.documentList.innerHTML = "";
  const searchTerm = DOM.searchInput.value.trim().toLowerCase();
  let q = query(
    collection(db, "documents"),
    orderBy("timestamp", "desc"),
    limit(limit)
  );
  if (startAfter) q = query(q, startAfter(startAfter));
  
  getDocs(q).then((querySnapshot) => {
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!searchTerm || data.title.toLowerCase().includes(searchTerm)) {
        createDocumentListItem(docSnap.id, data, isAdmin);
      }
    });
    // Add "Load More" button if there are more documents
    if (querySnapshot.size === limit) {
      const lastDoc = querySnapshot.docs[querySnapshot.size - 1];
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.textContent = "Load More";
      loadMoreBtn.addEventListener("click", () => loadDocuments(isAdmin, lastDoc));
      DOM.documentList.appendChild(loadMoreBtn);
    }
  }).catch((error) => alert("Error loading documents: " + error.message));
}

function createDocumentListItem(id, data, isAdmin) {
  const li = document.createElement("li");
  li.style.display = "flex";
  li.style.justifyContent = "space-between";
  li.style.alignItems = "center";
  li.innerHTML = `<span style="flex: 1">${data.title}</span>`;
  li.appendChild(createButtonContainer(id, data, isAdmin));
  DOM.documentList.appendChild(li);
}

function createButtonContainer(id, data, isAdmin) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "10px";
  container.appendChild(createButton("Download", () => downloadDoc(data)));

  if (auth.currentUser) {
    getDoc(doc(db, "users", auth.currentUser.uid)).then((userDoc) => {
      const userRole = userDoc.data()?.role || "viewer";
      if (userRole === "admin" || userRole === "editor") {
        container.appendChild(createButton("Edit", () => editDoc(id, data)));
      }
      if (userRole === "admin") {
        container.appendChild(createButton("Delete", () => removeDoc(id)));
      }
    });
  }
  return container;
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function addDocument(data) {
  addDoc(collection(db, "documents"), { ...data, timestamp: serverTimestamp() })
    .then(() => {
      alert("Document added successfully!");
      resetForm();
      loadDocuments(true);
    })
    .catch((error) => alert("Failed to add document: " + error.message));
}

function updateDocument(id, data) {
  updateDoc(doc(db, "documents", id), data)
    .then(() => {
      alert("Document updated successfully!");
      resetForm();
      loadDocuments(true);
    })
    .catch((error) => alert("Failed to update document: " + error.message));
}

function editDoc(id, data) {
  DOM.formTitle.textContent = "Edit Document";
  DOM.editId.value = id;
  document.getElementById("sender-name").value = data.senderName;
  document.getElementById("recipient-name").value = data.recipientName;
  document.getElementById("salutation").value = data.salutation;
  document.getElementById("title").value = data.title;
  document.getElementById("content").value = data.content;
  document.getElementById("specific-request").value = data.specificRequest;
  document.getElementById("closing").value = data.closing;
  toggleVisibility(DOM.cancelEditBtn, true);
  showSession("admin-section");
}

function removeDoc(id) {
  if (confirm("Are you sure you want to delete this document?")) {
    deleteDoc(doc(db, "documents", id))
      .then(() => {
        alert("Document deleted successfully!");
        loadDocuments(auth.currentUser && auth.currentUser.uid);
      })
      .catch((error) => alert("Failed to delete document: " + error.message));
  }
}

function getFormData() {
  return {
    senderName: document.getElementById("sender-name").value.trim(),
    recipientName: document.getElementById("recipient-name").value.trim(),
    salutation: document.getElementById("salutation").value.trim(),
    title: document.getElementById("title").value.trim(),
    content: document.getElementById("content").value.trim(),
    specificRequest: document.getElementById("specific-request").value.trim(),
    closing: document.getElementById("closing").value.trim(),
    timestamp: serverTimestamp(),
  };
}

function isFormDataValid(data) {
  return Object.entries(data).every(([key, value]) => key === "timestamp" || value.trim() !== "");
}

function resetForm() {
  DOM.formTitle.textContent = "Create Letter/Agenda";
  DOM.editId.value = "";
  DOM.letterForm.reset();
  toggleVisibility(DOM.cancelEditBtn, false);
}

function downloadDoc(data) {
  getDoc(doc(db, "users", auth.currentUser?.uid || "")).then((userDoc) => {
    const isAdmin = userDoc.exists() && userDoc.data().role === "admin";
    isAdmin ? showTypeModal(data) : generateAgenda(data);
  }).catch(() => generateAgenda(data)); // Default to agenda for unauthenticated users
}

function showTypeModal(data) {
  toggleVisibility(DOM.typeModal, true);
  DOM.letterBtn.onclick = () => {
    toggleVisibility(DOM.typeModal, false);
    showFormatModal(data, "letter");
  };
  DOM.agendaBtn.onclick = () => {
    toggleVisibility(DOM.typeModal, false);
    generateAgenda(data);
  };
}

function showFormatModal(data, type) {
  toggleVisibility(DOM.formatModal, true);
  DOM.pdfBtn.onclick = () => {
    toggleVisibility(DOM.formatModal, false);
    if (type === "letter") generatePDF(data);
  };
  DOM.docxBtn.onclick = () => {
    toggleVisibility(DOM.formatModal, false);
    if (type === "letter") generateDOCX(data);
  };
}

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  let y = 10;
  const addText = (text, x) => {
    const lines = doc.splitTextToSize(text, 180); // Wrap at 180 units
    doc.text(lines, x, y);
    y += lines.length * 7; // Adjust Y position
  };
  addText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 10);
  addText(data.recipientName, 10);
  addText(data.salutation, 10);
  addText(`Subject: ${data.title}`, 10);
  addText(data.content, 10);
  addText(`Specific Request: ${data.specificRequest}`, 10);
  addText(`Closing: ${data.closing}`, 10);
  addText("Sincerely,", 10);
  addText(data.senderName, 10);
  doc.save(`${data.title}.pdf`);
}

function generateDOCX(data) {
  const doc = new window.docx.Document({
    sections: [{
      children: [
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), font: "Times New Roman", size: 24 })], spacing: { after: 400 } }),
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.salutation, font: "Times New Roman", size: 24 })], spacing: { after: 200 } }),
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Subject: ${data.title}`, bold: true, font: "Times New Roman", size: 24 })], spacing: { after: 200 } }),
        new window.docx.Paragraph({ children: data.content.split("\n").map(line => new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })), spacing: { after: 400 } }),
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Specific Request: ${data.specificRequest}`, font: "Times New Roman", size: 24 })], spacing: { after: 400 } }),
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.closing, font: "Times New Roman", size: 24 })], spacing: { after: 200 } }),
        new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.senderName, font: "Times New Roman", size: 24 })] }),
      ],
    }],
  });
  window.docx.Packer.toBlob(doc).then((blob) => saveAs(blob, `${data.title}.docx`));
}

function generateAgenda(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  doc.text("Agenda", 10, 10);
  doc.text("======", 10, 20);
  doc.text(`Subject: ${data.title}`, 10, 30);
  doc.text(`Greeting: ${data.salutation}`, 10, 40);
  doc.text("Intro Paragraph:", 10, 50);
  doc.text(data.content.split("\n")[0], 10, 60);
  doc.text("Main Body:", 10, 70);
  doc.text(data.content.split("\n").slice(1).join("\n"), 10, 80);
  doc.text("Specific Request:", 10, 100);
  doc.text(data.specificRequest, 10, 110);
  doc.text("Closing:", 10, 120);
  doc.text(data.closing, 10, 130);
  doc.text("Signature:", 10, 140);
  doc.text(data.senderName, 10, 150);
  doc.save(`${data.title}-agenda.pdf`);
}

function populateUserDropdown() {
  const userEmailDropdown = document.getElementById("user-email");
  userEmailDropdown.innerHTML = '<option value="" disabled selected>Select a user</option>';
  getDocs(collection(db, "users")).then((querySnapshot) => {
    querySnapshot.forEach((docSnap) => {
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = docSnap.data().email;
      userEmailDropdown.appendChild(option);
    });
  }).catch((error) => alert("Error fetching users: " + error.message));
}

function initializeDocumentsCollection() {
  getDocs(collection(db, "documents")).then((querySnapshot) => {
    if (querySnapshot.empty) {
      addDoc(collection(db, "documents"), {
        senderName: "Admin",
        recipientName: "Test User",
        salutation: "Dear",
        title: "Welcome Letter",
        content: "This is a test letter.",
        specificRequest: "Please review.",
        closing: "Best regards",
        timestamp: serverTimestamp(),
      }).then(() => loadDocuments(false));
    }
  }).catch((error) => alert("Error initializing documents: " + error.message));
}