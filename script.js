import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  startAfter,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const saveAs = window.saveAs;

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
  registrationError: document.getElementById("registration-error"),
  roleForm: document.getElementById("role-form"),
  roleManagementSection: document.getElementById("role-management-section"),
  guestSection: document.getElementById("guest-section"),
  hamburgerMenu: document.getElementById("hamburger-menu"),
  navLinks: document.getElementById("nav-links"),
};

// Authentication State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const role = await getUserRole();
    handleUserLoggedIn(user, role);
  } else {
    handleUserLoggedOut();
  }
});

async function handleUserLoggedIn(user, role) {
  toggleVisibility(DOM.loginBtn, false);
  toggleVisibility(DOM.logoutBtn, true);
  toggleVisibility(DOM.registerBtn, false);
  toggleVisibility(DOM.loginSection, false);
  DOM.welcomeMessage.textContent = `Hi, ${role === "admin" ? "Admin" : user.displayName || "User"}`;

  toggleVisibility(DOM.adminSection, role === "admin" || role === "editor");
  toggleVisibility(DOM.roleManagementSection, role === "admin");
  toggleVisibility(DOM.adminNav, role === "admin" || role === "editor");
  toggleVisibility(DOM.guestSection, true);

  if (role === "admin" || role === "editor") {
    populateUserDropdown();
    showSession("admin-section");
  } else {
    showSession("guest-section");
  }
  loadDocuments(role);
}

function handleUserLoggedOut() {
  toggleVisibility(DOM.loginBtn, true);
  toggleVisibility(DOM.logoutBtn, false);
  toggleVisibility(DOM.registerBtn, true);
  toggleVisibility(DOM.loginSection, false);
  toggleVisibility(DOM.adminSection, false);
  toggleVisibility(DOM.roleManagementSection, false);
  toggleVisibility(DOM.adminNav, false);
  toggleVisibility(DOM.guestSection, true);
  DOM.welcomeMessage.textContent = "";
  showSession("guest-section");
  loadDocuments("user");
}

// Utility Functions
function toggleVisibility(element, isVisible) {
  if (element) {
    element.classList.toggle("hidden", !isVisible);
    element.classList.toggle("visible", isVisible);
    console.log(`${element.id} visibility set to: ${isVisible}`);
  }
}

function displayError(element, message) {
  element.textContent = message;
  element.classList.remove("success");
  element.classList.remove("hidden");
}

function showLoading(button) {
  button.disabled = true;
  button.innerHTML += '<span class="spinner"></span>';
}

function hideLoading(button, originalText) {
  button.disabled = false;
  button.innerHTML = originalText;
}

function showSession(sessionId) {
  const sections = [DOM.adminSection, DOM.roleManagementSection, DOM.registrationSection, DOM.loginSection, DOM.guestSection];
  sections.forEach((section) => toggleVisibility(section, false));
  const targetSection = document.getElementById(sessionId);
  toggleVisibility(targetSection, true);
  targetSection.querySelector("h2")?.focus();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded", DOM.loginBtn, DOM.letterForm);
  showSession("guest-section");
  loadDocuments("user");
  initializeDocumentsCollection();

  DOM.loginForm.addEventListener("submit", async (e) => {
    console.log("Login form submitted");
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const button = e.target.querySelector("button");
    const originalText = button.textContent;
    showLoading(button);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      DOM.loginError.textContent = "Login successful!";
      DOM.loginError.classList.add("success");
      setTimeout(() => showSession("guest-section"), 1000);
    } catch (error) {
      displayError(DOM.loginError, "Login failed: " + error.message);
    } finally {
      hideLoading(button, originalText);
    }
  });

  DOM.registrationForm.addEventListener("submit", async (e) => {
    console.log("Registration form submitted");
    e.preventDefault();
    const username = e.target["reg-username"].value.trim();
    const email = e.target["reg-email"].value.trim();
    const password = e.target["reg-password"].value.trim();
    const button = e.target.querySelector("button");
    const originalText = button.textContent;
    showLoading(button);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await Promise.all([
        updateProfile(user, { displayName: username }),
        setDoc(doc(db, "users", user.uid), { email, role: "user" }),
      ]);
      DOM.registrationError.textContent = "Registration successful! Please log in.";
      DOM.registrationError.classList.add("success");
      setTimeout(() => showSession("login-section"), 1000);
    } catch (error) {
      displayError(DOM.registrationError, "Registration failed: " + error.message);
    } finally {
      hideLoading(button, originalText);
    }
  });

  DOM.letterForm.addEventListener("submit", (e) => {
    console.log("Letter form submitted");
    e.preventDefault();
    const formData = getFormData();
    if (!isFormDataValid(formData)) return alert("Please fill in all fields.");
    DOM.typeModal.classList.add("visible");
    DOM.letterBtn.onclick = () => saveDoc(formData, "letter");
    DOM.agendaBtn.onclick = () => saveDoc(formData, "agenda");
  });

  DOM.cancelEditBtn.addEventListener("click", resetForm);

  DOM.roleForm.addEventListener("submit", async (e) => {
    console.log("Role form submitted");
    e.preventDefault();
    const userId = e.target["user-email"].value;
    const role = e.target["user-role"].value;
    const button = e.target.querySelector("button");
    const originalText = button.textContent;
    showLoading(button);
    try {
      await updateDoc(doc(db, "users", userId), { role });
      DOM.roleError.textContent = "Role assigned successfully!";
      DOM.roleError.classList.add("success");
      DOM.roleForm.reset();
      setTimeout(() => DOM.roleError.classList.add("hidden"), 2000);
    } catch (error) {
      displayError(DOM.roleError, "Failed to assign role: " + error.message);
    } finally {
      hideLoading(button, originalText);
    }
  });

  let timeout;
  DOM.searchInput.addEventListener("input", async () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const role = await getUserRole();
      loadDocuments(role);
    }, 300);
  });

  DOM.loginBtn.addEventListener("click", () => {
    console.log("Login button clicked");
    showSession("login-section");
  });
  DOM.logoutBtn.addEventListener("click", () => {
    console.log("Logout button clicked");
    if (confirm("Are you sure you want to log out?")) signOut(auth).then(() => alert("Logged out."));
  });
  DOM.registerBtn.addEventListener("click", () => {
    console.log("Register button clicked");
    showSession("registration-section");
  });
  DOM.hamburgerMenu.addEventListener("click", () => {
    console.log("Hamburger menu clicked");
    const isExpanded = DOM.navLinks.classList.toggle("active");
    DOM.hamburgerMenu.classList.toggle("active");
    DOM.hamburgerMenu.setAttribute("aria-expanded", isExpanded);
  });

  document.querySelectorAll("#nav-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
      console.log("Nav link clicked:", link.textContent);
      e.preventDefault();
      document.querySelectorAll("#nav-links a").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const sectionId = link.getAttribute("href").substring(1);
      showSession(sectionId);
      DOM.navLinks.classList.remove("active");
      DOM.hamburgerMenu.classList.remove("active");
      DOM.hamburgerMenu.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("Modal close clicked");
      btn.closest(".modal").classList.remove("visible");
    });
  });
});

// Document Management
async function loadDocuments(role, startAfterDoc = null) {
  DOM.documentList.innerHTML = "<p>Loading...</p>";
  const searchTerm = DOM.searchInput.value.trim().toLowerCase();
  let q = query(collection(db, "documents"), orderBy("timestamp", "desc"), limit(10));
  if (startAfterDoc) q = query(q, startAfter(startAfterDoc));

  try {
    const querySnapshot = await getDocs(q);
    DOM.documentList.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!searchTerm || data.title.toLowerCase().includes(searchTerm)) {
        createDocumentListItem(docSnap.id, data, role);
      }
    });
    if (querySnapshot.size === limit) {
      const lastDoc = querySnapshot.docs[querySnapshot.size - 1];
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.textContent = "Load More";
      loadMoreBtn.addEventListener("click", () => loadDocuments(role, lastDoc));
      DOM.documentList.appendChild(loadMoreBtn);
    }
  } catch (error) {
    DOM.documentList.innerHTML = `<p style="color: red;">Error loading documents: ${error.message}</p>`;
  }
}

async function createDocumentListItem(id, data, role) {
  const li = document.createElement("li");
  li.innerHTML = `<span>${data.title}</span>`;
  const buttonContainer = await createButtonContainer(id, data, role);
  li.appendChild(buttonContainer);
  DOM.documentList.appendChild(li);
}

async function createButtonContainer(id, data, role) {
  const container = document.createElement("div");
  container.classList.add("button-container");
  container.appendChild(createButton("Download", () => showDownloadOptions(data, role)));
  if (role === "admin" || role === "editor") {
    container.appendChild(createButton("Edit", () => editDoc(id, data)));
    container.appendChild(createButton("Delete", () => removeDoc(id)));
  }
  return container;
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", () => {
    console.log(`${text} button clicked`);
    onClick();
  });
  return button;
}

function saveDoc(data, type) {
  const button = DOM.letterForm.querySelector("button[type='submit']");
  const originalText = button.textContent;
  showLoading(button);
  const id = DOM.editId.value;
  const action = id ? updateDoc(doc(db, "documents", id), { ...data, type }) : addDoc(collection(db, "documents"), { ...data, type, timestamp: serverTimestamp() });
  action
    .then(() => {
      DOM.typeModal.classList.remove("visible");
      resetForm();
      loadDocuments(auth.currentUser ? getUserRole() : "user");
    })
    .catch((error) => alert("Failed to save document: " + error.message))
    .finally(() => hideLoading(button, originalText));
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
    deleteDoc(doc(db, "documents", id)).then(() => loadDocuments(auth.currentUser ? getUserRole() : "user"));
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
  };
}

function isFormDataValid(data) {
  return Object.values(data).every((value) => value.trim() !== "");
}

function resetForm() {
  DOM.formTitle.textContent = "Create Letter/Agenda";
  DOM.editId.value = "";
  DOM.letterForm.reset();
  toggleVisibility(DOM.cancelEditBtn, false);
}

// Download Options
function showDownloadOptions(data, role) {
  toggleVisibility(DOM.typeModal, true);
  console.log("Showing download options for", data.title);
  DOM.letterBtn.onclick = () => {
    console.log("Letter download selected");
    toggleVisibility(DOM.typeModal, false);
    role === "user" ? generatePDF(data, "letter") : showFormatModal(data, "letter");
  };
  DOM.agendaBtn.onclick = () => {
    console.log("Agenda download selected");
    toggleVisibility(DOM.typeModal, false);
    role === "user" ? generatePDF(data, "agenda") : showFormatModal(data, "agenda");
  };
}

function showFormatModal(data, type) {
  toggleVisibility(DOM.formatModal, true);
  console.log("Showing format modal for", type);
  DOM.pdfBtn.onclick = () => {
    console.log("PDF download clicked");
    toggleVisibility(DOM.formatModal, false);
    generatePDF(data, type);
  };
  DOM.docxBtn.onclick = () => {
    console.log("DOCX download clicked");
    toggleVisibility(DOM.formatModal, false);
    generateDOCX(data, type);
  };
}

function generatePDF(data, type) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  let y = 10;
  const addText = (text, x) => {
    const lines = doc.splitTextToSize(text, 180);
    if (y + lines.length * 7 > 280) {
      doc.addPage();
      y = 10;
    }
    doc.text(lines, x, y);
    y += lines.length * 7;
  };
  if (type === "letter") {
    addText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 10);
    addText(data.recipientName, 10);
    addText(data.salutation, 10);
    addText(`Subject: ${data.title}`, 10);
    addText(data.content, 10);
    addText(`Specific Request: ${data.specificRequest}`, 10);
    addText(data.closing, 10);
    addText("Sincerely,", 10);
    addText(data.senderName, 10);
  } else {
    addText("Agenda", 10);
    addText("======", 10);
    addText(`Subject: ${data.title}`, 10);
    addText(`Greeting: ${data.salutation}`, 10);
    addText("Intro Paragraph:", 10);
    addText(data.content.split("\n")[0], 10);
    addText("Main Body:", 10);
    addText(data.content.split("\n").slice(1).join("\n"), 10);
    addText("Specific Request:", 10);
    addText(data.specificRequest, 10);
    addText("Closing:", 10);
    addText(data.closing, 10);
    addText("Signature:", 10);
    addText(data.senderName, 10);
  }
  doc.save(`${data.title}-${type}.pdf`);
}

function generateDOCX(data, type) {
  const doc = new window.docx.Document({
    sections: [
      {
        children:
          type === "letter"
            ? [
                new window.docx.Paragraph({
                  children: [new window.docx.TextRun({ text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), font: "Times New Roman", size: 24 })],
                  spacing: { after: 400 },
                }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.recipientName, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.salutation, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Subject: ${data.title}`, bold: true, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: data.content.split("\n").map((line) => new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })) }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Specific Request: ${data.specificRequest}`, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.closing, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Sincerely,", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.senderName, font: "Times New Roman", size: 24 })] }),
              ]
            : [
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Agenda", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "======", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Subject: ${data.title}`, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Greeting: ${data.salutation}`, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Intro Paragraph:", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.content.split("\n")[0], font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Main Body:", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: data.content.split("\n").slice(1).map((line) => new window.docx.TextRun({ text: line, font: "Times New Roman", size: 24 })) }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: `Specific Request: ${data.specificRequest}`, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Closing:", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.closing, font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: "Signature:", font: "Times New Roman", size: 24 })] }),
                new window.docx.Paragraph({ children: [new window.docx.TextRun({ text: data.senderName, font: "Times New Roman", size: 24 })] }),
              ],
      },
    ],
  });
  window.docx.Packer.toBlob(doc).then((blob) => saveAs(blob, `${data.title}-${type}.docx`));
}

async function getUserRole() {
  if (!auth.currentUser) return "user";
  try {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    return userDoc.data()?.role || "user";
  } catch (error) {
    console.error("Error fetching role:", error);
    return "user";
  }
}

async function populateUserDropdown() {
  const userEmailDropdown = DOM.roleForm["user-email"];
  userEmailDropdown.innerHTML = '<option value="" disabled selected>Select a user</option>';
  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = `${data.email} (Current: ${data.role || "user"})`;
    userEmailDropdown.appendChild(option);
  });
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
        type: "letter",
        timestamp: serverTimestamp(),
      }).then(() => loadDocuments("user"));
    }
  });
}