// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// DOM Elements
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
    
    // Display last 10 contacts
    const recentContacts = contacts.slice(0, 10);
    
    contactsContainer.innerHTML = recentContacts.map(contact => `
      <div class="contact-item">
        <div class="contact-name">${contact.name}</div>
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
        ${new Date(log.timestamp).toLocaleString()} - ${log.contactCount} contacts downloaded
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
      manuallyDisabled: false
    });
    await updateVCFStatus();
    alert("VCF download enabled successfully!");
  } catch (error) {
    console.error("Error enabling VCF:", error);
    alert("Failed to enable VCF download");
  }
});

// Disable VCF download
disableVCF.addEventListener("click", async () => {
  try {
    await updateDoc(doc(db, "settings", "vcfControl"), {
      enabled: false,
      manuallyDisabled: true
    });
    await updateVCFStatus();
    alert("VCF download disabled successfully!");
  } catch (error) {
    console.error("Error disabling VCF:", error);
    alert("Failed to disable VCF download");
  }
});

// Update threshold
updateThreshold.addEventListener("click", async () => {
  const threshold = parseInt(thresholdInput.value);
  if (isNaN(threshold) || threshold < 1) {
    alert("Please enter a valid threshold number");
    return;
  }
  
  try {
    await updateDoc(doc(db, "settings", "vcfControl"), {
      threshold: threshold
    });
    alert(`Threshold updated to ${threshold} contacts!`);
  } catch (error) {
    console.error("Error updating threshold:", error);
    alert("Failed to update threshold");
  }
});

// Generate VCF from admin panel
generateVCF.addEventListener("click", async () => {
  try {
    const snapshot = await getDocs(collection(db, "contacts"));
    const docs = [];
    snapshot.forEach(d => docs.push(d.data()));

    if (docs.length === 0) {
      alert("No contacts available to generate VCF");
      return;
    }

    let vcf = "";
    docs.forEach(data => {
      const fn = (data.name || "").toString().replace(/\r?\n/g, " ");
      const tel = (data.phone || "").toString().replace(/\r?\n/g, " ");
      vcf += `BEGIN:VCARD
VERSION:3.0
FN:${fn}
TEL:${tel}
END:VCARD
`;
    });

    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `WorldWide_Contacts_Admin_${docs.length}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Log download
    await addDoc(collection(db, "downloads"), {
      timestamp: new Date().toISOString(),
      contactCount: docs.length,
      source: "admin"
    });

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    
    // Refresh counts
    await updateDownloadCount();
    await loadDownloadLogs();
    
  } catch (err) {
    console.error("Error generating VCF:", err);
    alert("Failed to generate VCF file");
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

// Initialize admin panel
loadAdminData();
