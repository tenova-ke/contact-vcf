// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config - Updated with your credentials
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
const TARGET = 800;
const VCF_THRESHOLD = 500;

// DOM Elements
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const successMsg = document.getElementById("success");
const currentElem = document.getElementById("current");
const remainingElem = document.getElementById("remaining");
const percentElem = document.getElementById("percent");
const progressFill = document.getElementById("progressFill");
const formCard = document.getElementById("formCard");
const downloadBtn = document.getElementById("downloadVCF");
const vcfStatus = document.getElementById("vcfStatus");
const countdownTimer = document.getElementById("countdownTimer");

const statCurrent = document.getElementById("stat-current");
const statTarget = document.getElementById("stat-target");
const statRemaining = document.getElementById("stat-remaining");

const whatsappWebLink = "https://whatsapp.com/channel/0029Vb7EiER6LwHh7es3vR3c";

// Countdown Timer
const countdownDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(); // 30 days from now

function updateCountdown() {
  const now = new Date().getTime();
  const distance = countdownDate - now;

  if (distance < 0) {
    countdownTimer.innerHTML = "Submission Period Ended!";
    formCard.style.display = "none";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  countdownTimer.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Check VCF download status
async function checkVCFStatus(totalContacts) {
  try {
    const vcfDoc = await getDoc(doc(db, "settings", "vcfControl"));
    const vcfData = vcfDoc.exists() ? vcfDoc.data() : { enabled: false, threshold: VCF_THRESHOLD };
    
    // Auto-enable if threshold reached and not manually disabled
    if (totalContacts >= vcfData.threshold && !vcfData.manuallyDisabled) {
      await updateDoc(doc(db, "settings", "vcfControl"), {
        enabled: true,
        threshold: vcfData.threshold,
        manuallyDisabled: false
      });
    }

    const finalVcfDoc = await getDoc(doc(db, "settings", "vcfControl"));
    const finalData = finalVcfDoc.exists() ? finalVcfDoc.data() : { enabled: false };
    
    if (finalData.enabled && totalContacts >= VCF_THRESHOLD) {
      vcfStatus.classList.remove("hidden");
      downloadBtn.style.display = "inline-block";
    } else {
      vcfStatus.classList.add("hidden");
      downloadBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error checking VCF status:", error);
  }
}

// Update stats
async function updateStats() {
  try {
    const snapshot = await getDocs(collection(db, "contacts"));
    const docs = [];
    snapshot.forEach(d => {
      const data = d.data();
      if (data) docs.push({ id: d.id, data });
    });

    const total = docs.length;

    // Update displayed numbers
    currentElem.textContent = total;
    const remaining = Math.max(TARGET - total, 0);
    remainingElem.textContent = remaining;

    const percent = Math.min(Math.floor((total / TARGET) * 100), 100);
    percentElem.textContent = percent + "%";
    progressFill.style.width = percent + "%";

    // Update circular progress
    const currentDeg = Math.round((total / Math.max(TARGET,1)) * 360);
    const remainingDeg = Math.max(0, 360 - currentDeg);

    statCurrent.style.setProperty("--pct", currentDeg);
    statTarget.style.setProperty("--pct", 360);
    statRemaining.style.setProperty("--pct", remainingDeg);

    // Check VCF download availability
    await checkVCFStatus(total);

  } catch (err) {
    console.error("Error updating stats:", err);
  }
}

// Submit contact
submitBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  
  if (!name || !phone) {
    alert("Please fill in both fields");
    return;
  }

  // Simple phone validation
  if (!phone.match(/^\+?[\d\s-()]{10,}$/)) {
    alert("Please enter a valid phone number");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Check for duplicate phone
    const q = query(collection(db, "contacts"), where("phone", "==", phone));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      successMsg.textContent = "⚠️ This number is already registered!";
      successMsg.style.color = "red";
      successMsg.classList.remove("hidden");
      setTimeout(() => successMsg.classList.add("hidden"), 3000);
      return;
    }

    // Add new contact
    await addDoc(collection(db, "contacts"), { 
      name: name, 
      phone: phone, 
      timestamp: new Date().toISOString()
    });

    successMsg.textContent = "✅ Contact submitted successfully!";
    successMsg.style.color = "#ffd700";
    successMsg.classList.remove("hidden");

    // Clear form
    nameInput.value = "";
    phoneInput.value = "";

    // Redirect to WhatsApp after delay
    setTimeout(() => {
      successMsg.classList.add("hidden");
      window.open(whatsappWebLink, "_blank");
    }, 2000);

    updateStats();
    
  } catch (error) {
    console.error("Error adding contact:", error);
    alert("Failed to submit contact. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
  }
});

// Generate VCF
async function generateVCF() {
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
    a.download = `WorldWide_Contacts_${docs.length}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Log download
    await addDoc(collection(db, "downloads"), {
      timestamp: new Date().toISOString(),
      contactCount: docs.length
    });

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    console.error("Error generating VCF:", err);
    alert("Failed to generate VCF file");
  }
}

downloadBtn.addEventListener("click", generateVCF);

// Initialize
updateCountdown();
setInterval(updateCountdown, 1000);
updateStats();
setInterval(updateStats, 10000);

// Initialize VCF settings if not exists
async function initializeSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "vcfControl"));
    if (!settingsDoc.exists()) {
      await setDoc(doc(db, "settings", "vcfControl"), {
        enabled: false,
        threshold: VCF_THRESHOLD,
        manuallyDisabled: false
      });
    }
  } catch (error) {
    console.error("Error initializing settings:", error);
  }
}

initializeSettings();
