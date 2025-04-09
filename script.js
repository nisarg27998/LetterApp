// Firebase Imports
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
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

// Constants
const ADMIN_EMAIL = "admin@example.com";

// Authentication State Listener
onAuthStateChanged(auth, (user) =>
  user ? handleUserLoggedIn(user) : handleUserLoggedOut()
);

function handleUserLoggedIn(user) {
  toggleVisibility(DOM.loginBtn, false); // Hide the login button
  toggleVisibility(DOM.logoutBtn, true); // Show the logout button
  toggleVisibility(DOM.registerBtn, false); // Hide the register button
  toggleVisibility(DOM.loginSection, false); // Hide the login section

  // Check if the user is an admin
  getDoc(doc(db, "users", user.uid))
    .then((userDoc) => {
      const userData = userDoc.data();
      if (userData.role === "admin") {
        // Display "Hi, Admin" in the header
        DOM.welcomeMessage.textContent = "Hi, Admin";

        // Show admin-specific sections
        toggleVisibility(DOM.adminSection, true);
        toggleVisibility(DOM.roleManagementSection, true);
        toggleVisibility(DOM.adminNav, true); // Show admin navigation bar
        populateUserDropdown(); // Populate the dropdown with user emails
        loadDocuments(true); // Load documents with admin privileges
      } else {
        // Display the user's display name in the header
        DOM.welcomeMessage.textContent = `Hi, ${user.displayName || "User"}`;

        // Show sections for regular users
        toggleVisibility(DOM.adminSection, true); // Allow document creation
        toggleVisibility(DOM.roleManagementSection, false); // Hide role management
        toggleVisibility(DOM.adminNav, false); // Hide admin navigation bar
        loadDocuments(false); // Load documents with user privileges
      }
    })
    .catch((error) => {
      console.error("Error fetching user role:", error);
    });
}

function handleUserLoggedOut() {
  toggleVisibility(DOM.loginBtn, true); // Show the login button
  toggleVisibility(DOM.logoutBtn, false); // Hide the logout button
  toggleVisibility(DOM.registerBtn, true); // Show the register button
  toggleVisibility(DOM.loginSection, false); // Hide the login section
  toggleVisibility(DOM.adminSection, false); // Hide the admin section
  toggleVisibility(DOM.roleManagementSection, false); // Hide the role management section
  toggleVisibility(DOM.adminNav, false); // Hide the admin navigation bar
  DOM.welcomeMessage.textContent = ""; // Clear the welcome message
  loadDocuments(false); // Load documents for non-logged-in users
}

// Utility Functions
function toggleVisibility(element, isVisible) {
  if (!element) return; // Skip if the element is undefined
  element.style.display = isVisible ? "block" : "none";
}

function displayError(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Login
DOM.loginBtn.addEventListener("click", () => {
  toggleVisibility(DOM.loginSection, true); // Show the login section
  toggleVisibility(DOM.registrationSection, false); // Hide the registration section
  toggleVisibility(DOM.adminSection, false); // Hide the admin section
  toggleVisibility(DOM.roleManagementSection, false); // Hide the role management section
  toggleVisibility(DOM.adminNav, false); // Hide the admin navigation bar
});

DOM.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();

  if (!email || !password)
    return displayError(DOM.loginError, "Please fill in all fields.");
  if (!isValidEmail(email))
    return displayError(DOM.loginError, "Please enter a valid email address.");

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return getDoc(doc(db, "users", user.uid));
    })
    .then((userDoc) => {
      const userData = userDoc.data();
      if (userData.role === "admin") {
        // Show admin-specific sections
        toggleVisibility(DOM.adminSection, true);
        toggleVisibility(DOM.roleManagementSection, true);
        toggleVisibility(DOM.adminNav, true); // Show admin navigation bar
        populateUserDropdown(); // Populate the dropdown with user emails
        loadDocuments(true); // Load documents with admin privileges
      } else {
        // Show sections for regular users
        toggleVisibility(DOM.adminSection, true); // Allow document creation
        toggleVisibility(DOM.roleManagementSection, false); // Hide role management
        toggleVisibility(DOM.adminNav, false); // Hide admin navigation bar
        loadDocuments(false); // Load documents with user privileges
      }
    })
    .catch((error) => {
      displayError(DOM.loginError, `Login failed: ${error.message}`);
    });
});

// Logout
DOM.logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to log out?")) {
    signOut(auth)
      .then(() => {
        console.log("Logged out successfully");
        handleUserLoggedOut(); // Reset the UI after logout
        alert("You have been logged out.");
      })
      .catch((error) => {
        console.error("Logout failed:", error.message);
        alert("Logout failed: " + error.message);
      });
  }
});

// Add Registration Functionality
DOM.registrationForm = document.getElementById("registration-form");
DOM.registrationSection = document.getElementById("registration-section");
DOM.welcomeMessage = document.getElementById("welcome-message");

// Show Registration Section
function showRegistration() {
  toggleVisibility(DOM.registrationSection, true);
  toggleVisibility(DOM.loginSection, false);
}

// Handle Registration
DOM.registrationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = e.target["reg-username"].value.trim();
  const email = e.target["reg-email"].value.trim();
  const password = e.target["reg-password"].value.trim();

  if (!username || !email || !password) {
    displayError(DOM.registrationError, "Please fill in all fields.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return updateProfile(user, { displayName: username });
    })
    .then(() => {
      alert("Registration successful! Please log in.");
      toggleVisibility(DOM.registrationSection, false);
      toggleVisibility(DOM.loginSection, true);
    })
    .catch((error) => {
      displayError(DOM.registrationError, `Registration failed: ${error.message}`);
    });
});

// Show Registration Section
DOM.registerBtn = document.getElementById("register-btn");

DOM.registerBtn.addEventListener("click", () => {
  toggleVisibility(DOM.registrationSection, true); // Show the registration section
  toggleVisibility(DOM.loginSection, false); // Hide the login section
});

// Form Handling
DOM.letterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = getFormData();
  if (!isFormDataValid(formData)) return alert("Please fill the details");

  const id = DOM.editId.value;
  id ? updateDocument(id, formData) : addDocument(formData);
});

function getFormData() {
  return {
    senderName: document.getElementById("sender-name")?.value?.trim() || "",
    recipientName:
      document.getElementById("recipient-name")?.value?.trim() || "",
    salutation: document.getElementById("salutation")?.value?.trim() || "",
    title: document.getElementById("title")?.value?.trim() || "",
    content: document.getElementById("content")?.value?.trim() || "",
    specificRequest:
      document.getElementById("specific-request")?.value?.trim() || "",
    closing: document.getElementById("closing")?.value?.trim() || "",
    timestamp: serverTimestamp(),
  };
}

function isFormDataValid(data) {
  return Object.entries(data).every(
    ([key, value]) =>
      key === "timestamp" || (typeof value === "string" && value.trim() !== "")
  );
}

function resetForm() {
  DOM.formTitle.textContent = "Create Letter/Agenda";
  DOM.editId.value = "";
  DOM.letterForm.reset();
  toggleVisibility(DOM.cancelEditBtn, false);
}

DOM.cancelEditBtn.addEventListener("click", resetForm);

// Document Management
function loadDocuments(isAdmin) {
  DOM.documentList.innerHTML = ""; // Clear the document list
  const searchTerm = DOM.searchInput?.value?.trim().toLowerCase() || ""; // Handle search input
  const q = query(collection(db, "documents"), orderBy("timestamp", "desc"));

  getDocs(q)
    .then((querySnapshot) => {
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!searchTerm || data.title.toLowerCase().includes(searchTerm)) {
          createDocumentListItem(docSnap.id, data, isAdmin);
        }
      });
    })
    .catch((error) => console.error("Error loading documents:", error));
}

function createDocumentListItem(id, data, isAdmin) {
  const li = document.createElement("li");
  li.style.display = "flex";
  li.style.justifyContent = "space-between";
  li.style.alignItems = "center";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = data.title;
  titleSpan.style.flex = "1";

  const buttonContainer = createButtonContainer(id, data, isAdmin);

  li.appendChild(titleSpan);
  li.appendChild(buttonContainer);
  DOM.documentList.appendChild(li);
}

function createButtonContainer(id, data, isAdmin) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "10px";

  const downloadButton = createButton("Download", () => downloadDoc(data));
  container.appendChild(downloadButton);

  // Check user role for edit/delete permissions
  getDoc(doc(db, "users", auth.currentUser.uid)).then((userDoc) => {
    const userRole = userDoc.data().role;

    if (userRole === "admin" || userRole === "editor") {
      const editButton = createButton("Edit", () => editDoc(id, data));
      container.appendChild(editButton);
    }

    if (userRole === "admin") {
      const deleteButton = createButton("Delete", () => removeDoc(id));
      container.appendChild(deleteButton);
    }
  });

  return container;
}

// Download Document
function downloadDoc(data) {
  const isLoggedIn = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
  isLoggedIn ? showTypeModal(data) : generateAgenda(data);
}

function showTypeModal(data) {
  toggleVisibility(DOM.typeModal, true);

  DOM.typeModal.addEventListener("click", (event) => {
    if (event.target === DOM.typeModal) toggleVisibility(DOM.typeModal, false);
  });

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

  DOM.formatModal.addEventListener("click", (event) => {
    if (event.target === DOM.formatModal)
      toggleVisibility(DOM.formatModal, false);
  });

  DOM.pdfBtn.onclick = () => {
    toggleVisibility(DOM.formatModal, false);
    if (type === "letter") generatePDF(data);
  };

  DOM.docxBtn.onclick = () => {
    toggleVisibility(DOM.formatModal, false);
    if (type === "letter") generateDOCX(data);
  };
}

// Generate Agenda
function generateAgenda(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set font and size
  doc.setFont("Times", "normal");
  doc.setFontSize(12);

  // Add content to the PDF
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

  // Save the PDF
  doc.save(`${data.title}-agenda.pdf`);
}

// Generate PDF
function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("Times", "normal");
  doc.setFontSize(12);

  doc.text(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    10,
    10
  );
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
            alignment: window.docx.AlignmentType.LEFT,
          }),
          new window.docx.Paragraph({
            children: [
              new window.docx.TextRun({
                text: data.salutation,
                font: "Times New Roman",
                size: 24,
              }),
            ],
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
            children: data.content
              .split("\n")
              .map(
                (line) =>
                  new window.docx.TextRun({
                    text: line,
                    font: "Times New Roman",
                    size: 24,
                  })
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
            children: [
              new window.docx.TextRun({
                text: data.closing,
                font: "Times New Roman",
                size: 24,
              }),
            ],
            spacing: { after: 200 },
            alignment: window.docx.AlignmentType.LEFT,
          }),
          new window.docx.Paragraph({
            children: [
              new window.docx.TextRun({
                text: data.senderName,
                font: "Times New Roman",
                size: 24,
              }),
            ],
            alignment: window.docx.AlignmentType.LEFT,
          }),
        ],
      },
    ],
  });

  window.docx.Packer.toBlob(doc).then((blob) =>
    saveAs(blob, `${data.title}.docx`)
  );
}

// Role Management
DOM.roleForm = document.getElementById("role-form");
DOM.roleManagementSection = document.getElementById("role-management-section");

function showRoleManagement() {
  toggleVisibility(DOM.roleManagementSection, true);
}

DOM.roleForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userId = e.target["user-email"].value; // Get the selected user ID
  const role = e.target["user-role"].value;

  if (!userId || !role) {
    displayError(DOM.roleError, "Please select a user and a role.");
    return;
  }

  updateDoc(doc(db, "users", userId), { role })
    .then(() => {
      alert("Role assigned successfully!");
      DOM.roleForm.reset();
    })
    .catch((error) => {
      displayError(DOM.roleError, `Failed to assign role: ${error.message}`);
    });
});

function populateUserDropdown() {
  const userEmailDropdown = document.getElementById("user-email");
  userEmailDropdown.innerHTML = '<option value="" disabled selected>Select a user</option>'; // Reset dropdown

  const usersRef = collection(db, "users");
  getDocs(usersRef)
    .then((querySnapshot) => {
      querySnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const option = document.createElement("option");
        option.value = docSnap.id; // Use the document ID as the value
        option.textContent = userData.email; // Display the email
        userEmailDropdown.appendChild(option);
      });
    })
    .catch((error) => {
      console.error("Error fetching users:", error);
    });
}

// Hamburger Menu Toggle
const hamburgerMenu = document.getElementById("hamburger-menu");
const navLinks = document.getElementById("nav-links");

hamburgerMenu.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

// Function to show only one session at a time
function showSession(sessionId) {
  // Hide all sections
  const sections = [
    DOM.adminSection,
    DOM.roleManagementSection,
    DOM.registrationSection,
    DOM.loginSection,
    DOM.guestSection,
  ];
  sections.forEach((section) => toggleVisibility(section, false));

  // Show the selected section
  const session = document.getElementById(sessionId);
  toggleVisibility(session, true);
}

// Set default session to "Create Letter/Agenda"
document.addEventListener("DOMContentLoaded", () => {
  showSession("admin-section"); // Default session
});

// Set default session to "View Documents"
document.addEventListener("DOMContentLoaded", () => {
  showSession("guest-section"); // Default session
  loadDocuments(false); // Load documents for non-logged-in users
});

// Add event listeners for navigation links
document.querySelectorAll("#nav-links a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = e.target.getAttribute("href").substring(1); // Get the target section ID
    showSession(targetId);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners here
  DOM.loginBtn.addEventListener("click", () => {
    toggleVisibility(DOM.loginSection, true); // Show the login section
    toggleVisibility(DOM.registrationSection, false); // Hide the registration section
  });

  DOM.logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      signOut(auth)
        .then(() => {
          console.log("Logged out successfully");
          handleUserLoggedOut(); // Reset the UI after logout
        })
        .catch((error) => alert("Logout failed: " + error.message));
    }
  });

  DOM.registerBtn.addEventListener("click", () => {
    toggleVisibility(DOM.registrationSection, true);
    toggleVisibility(DOM.loginSection, false);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  DOM.registerBtn.addEventListener("click", () => {
    toggleVisibility(DOM.registrationSection, true); // Show the registration section
    toggleVisibility(DOM.loginSection, false); // Hide the login section
  });
});

console.log("Login Button:", DOM.loginBtn);
console.log("Logout Button:", DOM.logoutBtn);
console.log("Register Button:", DOM.registerBtn);
console.log("Registration Section:", DOM.registrationSection);
