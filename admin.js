// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDpkz3T_KgRqTkRmu7dKgMWyIL4YtRPAs0",
  authDomain: "wanga-vcf.firebaseapp.com",
  projectId: "wanga-vcf",
  storageBucket: "wanga-vcf.firebasestorage.app",
  messagingSenderId: "910571948780",
  appId: "1:910571948780:web:149f188aa9cccabde633c9",
  measurementId: "G-GGLJ27H45S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Admin Password
const ADMIN_PASSWORD = "Wanga@2006";

// DOM Elements
const passwordModal = document.getElementById("passwordModal");
const adminContent = document.getElementById("adminContent");
const adminPassword = document.getElementById("adminPassword");
const submitPassword = document.getElementById("submitPassword");
const passwordError = document.getElementById("passwordError");
const logoutBtn = document.getElementById("logoutBtn");

const adminTotalContacts = document.getElementById("adminTotalContacts");
const adminVcfStatus = document.getElementById("adminVcfStatus");
const adminDownloadCount = document.getElementById("adminDownloadCount");
const enableVCF = document.getElementById("enableVCF");
const disableVCF = document.getElementById("disableVCF");
const generateVCF = document.getElementById("generateVCF");
const thresholdInput = document.getElementById("thresholdInput");
const updateThreshold = document.getElementById("updateThreshold");
const contactsContainer = document.getElementById("contactsContainer");
const downloadLogs = document.getElementById("downloadLogs");
const downloadMessage = document.getElementById("downloadMessage");

// Check if already authenticated
function checkAuth() {
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
  if (isAuthenticated) {
    showAdminPanel();
  } else {
    showPasswordModal();
  }
}

// Show password modal
function showPasswordModal() {
  passwordModal.classList.remove('hidden');
  adminContent.classList.add('hidden');
  adminPassword.value = '';
  adminPassword.focus();
}

// Show admin panel
function showAdminPanel() {
  passwordModal.classList.add('hidden');
  adminContent.classList.remove('hidden');
  loadAdminData();
}

// Password submission
submitPassword.addEventListener('click', () => {
  const password = adminPassword.value.trim();
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('adminAuthenticated', 'true');
    showAdminPanel();
  } else {
    passwordError.classList.remove('hidden');
    adminPassword.value = '';
    adminPassword.focus();
  }
});

// Enter key for password
adminPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitPassword.click();
  }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('adminAuthenticated');
  showPasswordModal();
});

// Load admin data
async function loadAdminData() {
  await updateContacts();
  await updateVCFStatus();
  await updateDownloadCount();
  await loadRecentContacts();
  await loadDownloadLogs();
}

// Update contacts count
async function updateContacts() {
  try {
    const snapshot = await getDocs(collection(db, "contacts"));
    adminTotalContacts.textContent = snapshot.size;
  } catch (error) {
    console.error("Error loading contacts:", error);
  }
}

// Update VCF status
async function updateVCFStatus() {
  try {
    const vcfDoc = await getDoc(doc(db, "settings", "vcfControl"));
    const vcfData = vcfDoc.exists() ? vcfDoc.data() : { enabled: false };
    
    if (vcfData.enabled) {
      adminVcfStatus.textContent = "Enabled";
      adminVcfStatus.style.color = "#28a745";
    } else {
      adminVcfStatus.textContent = "Disabled";
      adminVcfStatus.style.color = "#dc3545";
    }
    
    thresholdInput.value = vcfData.threshold || 500;
  } catch (error) {
    console.error("Error loading VCF status:", error);
  }
}

// Update download count
async function updateDownloadCount() {
  try {
    const snapshot = await getDocs(collection(db, "downloads"));
    adminDownloadCount.textContent = snapshot.size;
  } catch (error) {
    console.error("Error loading download count:", error);
  }
}

// Load recent contacts
async function loadRecentContacts() {
  try {
    const snapshot = await getDocs(collection(db, "contacts"));
    const contacts = [];
    snapshot.forEach(doc => {
      contacts.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by timestamp (newest first)
    contacts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Display last 20 contacts
    const recentContacts = contacts.slice(0, 20);
    
    contactsContainer.innerHTML = recentContacts.map((contact, index) => `
      <div class="contact-item">
        <div class="contact-header">
          <span class="contact-number">#${index + 1}</span>
          <span class="contact-name">${contact.name}</span>
        </div>
        <div class="contact-phone">${contact.phone}</div>
        <div class="contact-time">${new Date(contact.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error("Error loading contacts:", error);
    contactsContainer.innerHTML = '<div class="error">Error loading contacts</div>';
  }
}

// Load download logs
async function loadDownloadLogs() {
  try {
    const snapshot = await getDocs(collection(db, "downloads"));
    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    downloadLogs.innerHTML = logs.map(log => `
      <div class="log-item">
        <i class="fas fa-download"></i>
        ${new Date(log.timestamp).toLocaleString()} - 
        ${log.contactCount} contacts downloaded
        ${log.source ? `(${log.source})` : ''}
      </div>
    `).join('');
    
  } catch (error) {
    console.error("Error loading download logs:", error);
    downloadLogs.innerHTML = '<div class="error">Error loading download logs</div>';
  }
}

// Enable VCF download
enableVCF.addEventListener("click", async () => {
  try {
    await updateDoc(doc(db, "settings", "vcfControl"), {
      enabled: true,
      manuallyDisabled: false,
      lastUpdated: new Date().toISOString()
    });
    await updateVCFStatus();
    showMessage("VCF download enabled successfully!", "success");
  } catch (error) {
    console.error("Error enabling VCF:", error);
    showMessage("Failed to enable VCF download", "error");
  }
});

// Disable VCF download
disableVCF.addEventListener("click", async () => {
  try {
    await updateDoc(doc(db, "settings", "vcfControl"), {
      enabled: false,
      manuallyDisabled: true,
      lastUpdated: new Date().toISOString()
    });
    await updateVCFStatus();
    showMessage("VCF download disabled successfully!", "success");
  } catch (error) {
    console.error("Error disabling VCF:", error);
    showMessage("Failed to disable VCF download", "error");
  }
});

// Update threshold
updateThreshold.addEventListener("click", async () => {
  const threshold = parseInt(thresholdInput.value);
  if (isNaN(threshold) || threshold < 1) {
    showMessage("Please enter a valid threshold number", "error");
    return;
  }
  
  try {
    await updateDoc(doc(db, "settings", "vcfControl"), {
      threshold: threshold,
      lastUpdated: new Date().toISOString()
    });
    showMessage(`Threshold updated to ${threshold} contacts!`, "success");
  } catch (error) {
    console.error("Error updating threshold:", error);
    showMessage("Failed to update threshold", "error");
  }
});

// Show message function
function showMessage(message, type) {
  downloadMessage.textContent = message;
  downloadMessage.className = type;
  downloadMessage.classList.remove("hidden");
  
  setTimeout(() => {
    downloadMessage.classList.add("hidden");
  }, 3000);
}

// Improved VCF Generation with numbering
generateVCF.addEventListener("click", async () => {
  try {
    generateVCF.disabled = true;
    generateVCF.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating VCF...';
    
    const snapshot = await getDocs(collection(db, "contacts"));
    const docs = [];
    snapshot.forEach(d => docs.push(d.data()));

    if (docs.length === 0) {
      showMessage("No contacts available to generate VCF", "error");
      return;
    }

    showMessage(`Generating VCF with ${docs.length} contacts...`, "success");

    let vcf = "";
    docs.forEach((data, index) => {
      const number = String(index + 1).padStart(2, '0'); // 01, 02, 03, etc.
      const fn = `[${number}] ${(data.name || "").toString().replace(/\r?\n/g, " ")}`;
      const tel = (data.phone || "").toString().replace(/\r?\n/g, " ");
      
      vcf += `BEGIN:VCARD
VERSION:3.0
FN:${fn}
TEL;TYPE=CELL:${tel}
END:VCARD
`;
    });

    // Create and download the file
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `WorldWide_Contacts_${docs.length}_${new Date().toISOString().split('T')[0]}.vcf`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Log download
    await addDoc(collection(db, "downloads"), {
      timestamp: new Date().toISOString(),
      contactCount: docs.length,
      source: "admin",
      fileName: a.download
    });

    showMessage(`VCF file downloaded successfully with ${docs.length} contacts!`, "success");

    // Clean up URL after download
    setTimeout(() => {
      URL.revokeObjectURL(url);
      generateVCF.disabled = false;
      generateVCF.innerHTML = '<i class="fas fa-file-export"></i> Generate & Download VCF';
    }, 1000);

    // Refresh counts
    await updateDownloadCount();
    await loadDownloadLogs();
    
  } catch (err) {
    console.error("Error generating VCF:", err);
    showMessage("Failed to generate VCF file: " + err.message, "error");
    generateVCF.disabled = false;
    generateVCF.innerHTML = '<i class="fas fa-file-export"></i> Generate & Download VCF';
  }
});

// Real-time updates
onSnapshot(collection(db, "contacts"), () => {
  updateContacts();
  loadRecentContacts();
});

onSnapshot(collection(db, "downloads"), () => {
  updateDownloadCount();
  loadDownloadLogs();
});

onSnapshot(doc(db, "settings", "vcfControl"), () => {
  updateVCFStatus();
});

// Initialize admin panel with auth check
checkAuth();
