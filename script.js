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
const { saveAs } = window.saveAs;

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
  guestSection: document.getElementById("guest-section"),
  hamburgerMenu: document.getElementById("hamburger-menu"),
  navLinks: document.getElementById("nav-links"),
};

// Toast Function
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Authentication State
onAuthStateChanged(auth, (user) =>
  user ? handleUserLoggedIn(user) : handleUserLoggedOut()
);

async function handleUserLoggedIn(user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data() || { role: "user" };
  const role = userData.role;

  toggleVisibility(DOM.loginBtn, false);
  toggleVisibility(DOM.logoutBtn, true);
  toggleVisibility(DOM.registerBtn, false);
  toggleVisibility(DOM.loginSection, false);
  DOM.welcomeMessage.textContent = `Hi, ${
    role === "admin" ? "Admin" : user.displayName || "User"
  }`;

  toggleVisibility(DOM.adminSection, role === "admin");
  toggleVisibility(DOM.roleManagementSection, role === "admin");
  toggleVisibility(DOM.adminNav, role === "admin");
  toggleVisibility(DOM.guestSection, true);

  if (role === "admin") {
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
  if (element) element.style.display = isVisible ? "block" : "none";
}

function displayError(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function showSession(sessionId) {
  const sections = [
    DOM.adminSection,
    DOM.roleManagementSection,
    DOM.registrationSection,
    DOM.loginSection,
    DOM.guestSection,
  ];
  sections.forEach((section) => toggleVisibility(section, false));
  toggleVisibility(document.getElementById(sessionId), true);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  showSession("guest-section");
  loadDocuments("user");
  initializeDocumentsCollection();

  DOM.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        toggleVisibility(DOM.loginSection, false);
        showToast("Login successful!", "success");
      })
      .catch((error) => {
        displayError(DOM.loginError, "Login failed: " + error.message);
        showToast("Login failed!", "error");
      });
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
          setDoc(doc(db, "users", user.uid), { email, role: "user" }),
        ]);
      })
      .then(() => {
        showToast("Registration successful! Please log in.", "success");
        showSession("login-section");
      })
      .catch((error) => {
        displayError(DOM.registrationError, "Registration failed: " + error.message);
        showToast("Registration failed!", "error");
      });
  });

  DOM.letterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = getFormData();
    if (!isFormDataValid(formData)) {
      showToast("Please fill in all fields!", "error");
      return;
    }
    toggleVisibility(DOM.typeModal, true);
    DOM.letterBtn.onclick = () => saveDoc(formData, "letter");
    DOM.agendaBtn.onclick = () => saveDoc(formData, "agenda");
  });

  DOM.cancelEditBtn.addEventListener("click", resetForm);

  DOM.roleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userId = e.target["user-email"].value;
    const role = e.target["user-role"].value;
    updateDoc(doc(db, "users", userId), { role })
      .then(() => {
        showToast("Role assigned successfully!", "success");
        DOM.roleForm.reset();
      })
      .catch((error) => {
        showToast("Failed to assign role!", "error");
      });
  });

  let timeout;
  DOM.searchInput.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(
      () => loadDocuments(auth.currentUser ? getUserRole() : "user"),
      300
    );
  });

  DOM.loginBtn.addEventListener("click", () => showSession("login-section"));
  DOM.logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      signOut(auth).then(() => showToast("Logged out!", "info"));
    }
  });
  DOM.registerBtn.addEventListener("click", () =>
    showSession("registration-section")
  );
  DOM.hamburgerMenu.addEventListener("click", () =>
    DOM.navLinks.classList.toggle("active")
  );

  document.querySelectorAll("#nav-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const sectionId = e.target.getAttribute("href").substring(1);
      showSession(sectionId);
      DOM.navLinks.classList.remove("active");
    });
  });
});

// Document Management
async function loadDocuments(role, startAfterDoc = null) {
  DOM.documentList.innerHTML = "<p>Loading...</p>";
  const searchTerm = DOM.searchInput.value.trim().toLowerCase();
  let q = query(
    collection(db, "documents"),
    orderBy("timestamp", "desc"),
    limit(10)
  );
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
  li.style.display = "flex";
  li.style.justifyContent = "space-between";
  li.style.alignItems = "center";
  li.innerHTML = `<span style="flex: 1">${data.title}</span>`;
  const buttonContainer = await createButtonContainer(id, data, role);
  li.appendChild(buttonContainer);
  DOM.documentList.appendChild(li);
}

async function createButtonContainer(id, data, role) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "10px";

  container.appendChild(
    createButton("Download", () => showDownloadOptions(data, role))
  );

  if (role === "admin" || role === "editor") {
    container.appendChild(createButton("Edit", () => editDoc(id, data)));
    container.appendChild(createButton("Delete", () => removeDoc(id)));
  }

  return container;
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function saveDoc(data, type) {
  const id = DOM.editId.value;
  const action = id
    ? updateDoc(doc(db, "documents", id), { ...data, type })
    : addDoc(collection(db, "documents"), { ...data, type, timestamp: serverTimestamp() });
  action
    .then(() => {
      toggleVisibility(DOM.typeModal, false);
      resetForm();
      loadDocuments(auth.currentUser ? getUserRole() : "user");
      showToast(
        id ? "Document updated successfully!" : "Document saved successfully!",
        "success"
      );
    })
    .catch((error) => {
      showToast("Failed to save document!", "error");
    });
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
        showToast("Document deleted successfully!", "info");
        loadDocuments(auth.currentUser ? getUserRole() : "user");
      })
      .catch((error) => {
        showToast("Failed to delete document!", "error");
      });
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

  // Add close button to type modal
  let typeCloseBtn = DOM.typeModal.querySelector(".modal-close");
  if (!typeCloseBtn) {
    typeCloseBtn = document.createElement("span");
    typeCloseBtn.className = "modal-close";
    typeCloseBtn.innerHTML = "×";
    typeCloseBtn.onclick = () => toggleVisibility(DOM.typeModal, false);
    DOM.typeModal.querySelector(".modal-content").appendChild(typeCloseBtn);
  }

  // Click outside to close type modal
  DOM.typeModal.onclick = (event) => {
    if (event.target === DOM.typeModal) {
      toggleVisibility(DOM.typeModal, false);
    }
  };

  DOM.letterBtn.onclick = () => {
    toggleVisibility(DOM.typeModal, false);
    if (role === "user") {
      generatePDF(data, "letter"); // Users get PDF only
    } else {
      showFormatModal(data, "letter"); // Admins/editors choose format
    }
  };
  DOM.agendaBtn.onclick = () => {
    toggleVisibility(DOM.typeModal, false);
    if (role === "user") {
      generatePDF(data, "agenda"); // Users get PDF only
    } else {
      showFormatModal(data, "agenda"); // Admins/editors choose format
    }
  };
}

function showFormatModal(data, type) {
  toggleVisibility(DOM.formatModal, true);

  // Add close button to format modal
  let formatCloseBtn = DOM.formatModal.querySelector(".modal-close");
  if (!formatCloseBtn) {
    formatCloseBtn = document.createElement("span");
    formatCloseBtn.className = "modal-close";
    formatCloseBtn.innerHTML = "×";
    formatCloseBtn.onclick = () => toggleVisibility(DOM.formatModal, false);
    DOM.formatModal.querySelector(".modal-content").appendChild(formatCloseBtn);
  }

  // Click outside to close format modal
  DOM.formatModal.onclick = (event) => {
    if (event.target === DOM.formatModal) {
      toggleVisibility(DOM.formatModal, false);
    }
  };

  DOM.pdfBtn.onclick = () => {
    toggleVisibility(DOM.formatModal, false);
    generatePDF(data, type);
  };
  DOM.docxBtn.onclick = () => {
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

  if (type === "letter") {
    const addText = (text, x) => {
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, x, y);
      y += lines.length * 7;
    };
    addText(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      10
    );
    addText(data.recipientName, 10);
    addText(data.salutation, 10);
    addText(`Subject: ${data.title}`, 10);
    addText(data.content, 10);
    addText(`Specific Request: ${data.specificRequest}`, 10);
    addText(`Closing: ${data.closing}`, 10);
    addText("Sincerely,", 10);
    addText(data.senderName, 10);
  } else {
    doc.text("Agenda", 10, y);
    y += 10;
    doc.text("======", 10, y);
    y += 10;
    doc.text(`Subject: ${data.title}`, 10, y);
    y += 10;
    doc.text(`Greeting: ${data.salutation}`, 10, y);
    y += 10;
    doc.text("Intro Paragraph:", 10, y);
    y += 10;
    doc.text(data.content.split("\n")[0], 10, y);
    y += 10;
    doc.text("Main Body:", 10, y);
    y += 10;
    doc.text(data.content.split("\n").slice(1).join("\n"), 10, y);
    y += 20;
    doc.text("Specific Request:", 10, y);
    y += 10;
    doc.text(data.specificRequest, 10, y);
    y += 10;
    doc.text("Closing:", 10, y);
    y += 10;
    doc.text(data.closing, 10, y);
    y += 10;
    doc.text("Signature:", 10, y);
    y += 10;
    doc.text(data.senderName, 10, y);
  }
  doc.save(`${data.title}-${type}.pdf`);
  showToast(`Downloaded ${type} as PDF!`, "info");
}

function generateDOCX(data, type) {
  const doc = new window.docx.Document({
    sections: [
      {
        children:
          type === "letter"
            ? [
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                  spacing: { after: 400 },
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.recipientName,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.salutation,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
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
                }),
                new window.docx.Paragraph({
                  children: data.content.split("\n").map(
                    (line) =>
                      new window.docx.TextRun({
                        text: line,
                        font: "Times New Roman",
                        size: 24,
                      })
                  ),
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: `Specific Request: ${data.specificRequest}`,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.closing,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Sincerely,",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.senderName,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
              ]
            : [
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Agenda",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "======",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: `Subject: ${data.title}`,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: `Greeting: ${data.salutation}`,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Intro Paragraph:",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.content.split("\n")[0],
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Main Body:",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: data.content
                    .split("\n")
                    .slice(1)
                    .map(
                      (line) =>
                        new window.docx.TextRun({
                          text: line,
                          font: "Times New Roman",
                          size: 24,
                        })
                    ),
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: `Specific Request: ${data.specificRequest}`,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Closing:",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.closing,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: "Signature:",
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
                new window.docx.Paragraph({
                  children: [
                    new window.docx.TextRun({
                      text: data.senderName,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
              ],
      },
    ],
  });
  window.docx.Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${data.title}-${type}.docx`);
    showToast(`Downloaded ${type} as DOCX!`, "info");
  });
}

async function getUserRole() {
  if (!auth.currentUser) return "user";
  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  return userDoc.data()?.role || "user";
}

function populateUserDropdown() {
  const userEmailDropdown = document.getElementById("user-email");
  userEmailDropdown.innerHTML =
    '<option value="" disabled selected>Select a user</option>';
  getDocs(collection(db, "users"))
    .then((querySnapshot) => {
      querySnapshot.forEach((docSnap) => {
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = docSnap.data().email;
        userEmailDropdown.appendChild(option);
      });
    })
    .catch((error) => showToast("Error fetching users!", "error"));
}

function initializeDocumentsCollection() {
  getDocs(collection(db, "documents"))
    .then((querySnapshot) => {
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
        }).then(() => loadDocuments("user"));
      }
    })
    .catch((error) => showToast("Error initializing documents!", "error"));
}