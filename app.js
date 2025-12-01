// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const releaseDate = document.getElementById("releaseDateText");
const typingMessage = document.getElementById("typingMessage");
const typingText = document.getElementById("typingText");
const viewBenefitsBtn = document.getElementById("viewBenefitsBtn");
const benefitsSection = document.getElementById("benefitsSection");
const closeBenefits = document.getElementById("closeBenefits");
const whatsappAppBtn = document.getElementById("whatsappAppBtn");
const whatsappContactBtn = document.getElementById("whatsappContactBtn");

const statCurrent = document.getElementById("stat-current");
const statTarget = document.getElementById("stat-target");
const statRemaining = document.getElementById("stat-remaining");

// WhatsApp links
const whatsappChannelLink = "whatsapp://channel?address=0029Vb7EiER6LwHh7es3vR3c";
const whatsappWebLink = "https://whatsapp.com/channel/0029Vb7EiER6LwHh7es3vR3c";
const whatsappContactLink = "https://wa.me/254769502217";

// Release date - 2nd December 2025
const RELEASE_DATE = new Date("December 2, 2025 00:00:00").getTime();

// Website launch time (stored in localStorage)
const LAUNCH_KEY = "wanga_vcf_launch_time";

// Get or set launch time
function getLaunchTime() {
  const stored = localStorage.getItem(LAUNCH_KEY);
  if (stored) {
    return parseInt(stored);
  } else {
    const now = Date.now();
    localStorage.setItem(LAUNCH_KEY, now.toString());
    return now;
  }
}

const LAUNCH_TIME = getLaunchTime();
const COUNTDOWN_DAYS = 45; // Countdown from launch for 45 days

// Typing effect
function typeText(text, element, speed = 50, callback = null) {
  element.textContent = "";
  let i = 0;
  
  function typeCharacter() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(typeCharacter, speed);
    } else if (callback) {
      setTimeout(callback, 1000);
    }
  }
  
  typeCharacter();
}

// Show typing message
function showTypingMessage(message) {
  typingMessage.classList.remove("hidden");
  typeText(message, typingText, 30, () => {
    setTimeout(() => {
      typingMessage.classList.add("hidden");
      typingText.textContent = "";
    }, 3000);
  });
}

// Countdown Timer (from launch)
function updateCountdown() {
  const now = new Date().getTime();
  const endTime = LAUNCH_TIME + (COUNTDOWN_DAYS * 24 * 60 * 60 * 1000);
  const distance = endTime - now;

  if (distance < 0) {
    countdownTimer.innerHTML = "Countdown Ended!";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  countdownTimer.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Set release date display
releaseDate.textContent = "2nd December 2025";

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
        manuallyDisabled: false,
        lastUpdated: new Date().toISOString()
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
    showTypingMessage("Please fill in both fields before submitting.");
    return;
  }

  // Enhanced phone validation
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!phoneRegex.test(cleanedPhone)) {
    showTypingMessage("Please enter a valid phone number (e.g., +254700000000)");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Check for duplicate phone
    const q = query(collection(db, "contacts"), where("phone", "==", cleanedPhone));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      showTypingMessage("This phone number is already registered in our database.");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
      return;
    }

    // Add new contact
    await addDoc(collection(db, "contacts"), { 
      name: name, 
      phone: cleanedPhone, 
      timestamp: new Date().toISOString(),
      dateAdded: new Date().toLocaleDateString()
    });

    // Show personalized success message with typing effect
    const successMessage = `${name} saved successfully! Thank you for joining our global network.`;
    showTypingMessage(successMessage);

    // Clear form
    nameInput.value = "";
    phoneInput.value = "";

    // Open WhatsApp in app after delay
    setTimeout(() => {
      // Try to open in WhatsApp app first
      window.location.href = whatsappChannelLink;
      
      // Fallback to web if app doesn't open
      setTimeout(() => {
        window.open(whatsappWebLink, "_blank");
      }, 500);
    }, 2000);

    updateStats();
    
  } catch (error) {
    console.error("Error adding contact:", error);
    showTypingMessage("Failed to submit contact. Please check your connection and try again.");
  } finally {
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
    }, 2000);
  }
});

// Generate VCF with numbering
async function generateVCF() {
  try {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    const snapshot = await getDocs(collection(db, "contacts"));
    const docs = [];
    snapshot.forEach(d => docs.push(d.data()));

    if (docs.length === 0) {
      showTypingMessage("No contacts available to generate VCF.");
      return;
    }

    showTypingMessage(`Generating VCF file with ${docs.length} contacts...`);

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
    a.download = `Global_Contacts_${docs.length}_${new Date().toISOString().split('T')[0]}.vcf`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Log download
    await addDoc(collection(db, "downloads"), {
      timestamp: new Date().toISOString(),
      contactCount: docs.length,
      source: "user",
      fileName: a.download
    });

    showTypingMessage(`VCF file downloaded! ${docs.length} contacts added to your phonebook.`);

    // Clean up URL after download
    setTimeout(() => {
      URL.revokeObjectURL(url);
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download VCF File';
    }, 1000);
    
  } catch (err) {
    console.error("Error generating VCF:", err);
    showTypingMessage("Failed to generate VCF file. Please try again.");
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download VCF File';
  }
}

// Toggle benefits section
viewBenefitsBtn.addEventListener("click", () => {
  benefitsSection.classList.remove("hidden");
  viewBenefitsBtn.style.display = "none";
});

closeBenefits.addEventListener("click", () => {
  benefitsSection.classList.add("hidden");
  viewBenefitsBtn.style.display = "block";
});

// WhatsApp buttons
whatsappAppBtn.addEventListener("click", () => {
  // Try to open in WhatsApp app first
  window.location.href = whatsappChannelLink;
  
  // Fallback to web if app doesn't open
  setTimeout(() => {
    window.open(whatsappWebLink, "_blank");
  }, 500);
});

whatsappContactBtn.addEventListener("click", () => {
  window.open(whatsappContactLink, "_blank");
});

// Download button event
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
        manuallyDisabled: false,
        created: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error initializing settings:", error);
  }
}

initializeSettings();
