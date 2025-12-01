// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('App.js loaded successfully');
  
  // Get Firebase modules from window
  const { collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc } = window.firebaseModules;
  const db = window.firestoreDB;
  const { TARGET, VCF_THRESHOLD } = window.appConfig;

  // DOM Elements
  const submitBtn = document.getElementById("submitBtn");
  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const currentElem = document.getElementById("current");
  const remainingElem = document.getElementById("remaining");
  const percentElem = document.getElementById("percent");
  const progressFill = document.getElementById("progressFill");
  const downloadBtn = document.getElementById("downloadVCF");
  const vcfStatus = document.getElementById("vcfStatus");
  const countdownTimer = document.getElementById("countdownTimer");
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
  const whatsappChannelLink = "https://whatsapp.com/channel/0029Vb7EiER6LwHh7es3vR3c";
  const whatsappContactLink = "https://wa.me/254769502217";

  // Countdown Timer (30 days from now)
  const countdownDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime();

  // Typing effect
  function typeText(text, element, speed = 50) {
    element.textContent = "";
    let i = 0;
    
    function typeCharacter() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(typeCharacter, speed);
      }
    }
    
    typeCharacter();
  }

  // Show typing message
  function showTypingMessage(message) {
    typingMessage.classList.remove("hidden");
    typeText(message, typingText, 30);
    
    // Hide after 3 seconds
    setTimeout(() => {
      typingMessage.classList.add("hidden");
      typingText.textContent = "";
    }, 3000);
  }

  // Update countdown
  function updateCountdown() {
    const now = new Date().getTime();
    const distance = countdownDate - now;

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

  // Check VCF download status
  async function checkVCFStatus(totalContacts) {
    try {
      // Create settings document if it doesn't exist
      const settingsRef = doc(db, "settings", "vcfControl");
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists()) {
        await setDoc(settingsRef, {
          enabled: false,
          threshold: VCF_THRESHOLD,
          manuallyDisabled: false,
          created: new Date().toISOString()
        });
      }

      // Get current settings
      const vcfData = settingsDoc.exists() ? settingsDoc.data() : { enabled: false, threshold: VCF_THRESHOLD };
      
      // Auto-enable if threshold reached
      if (totalContacts >= vcfData.threshold && !vcfData.manuallyDisabled) {
        await updateDoc(settingsRef, {
          enabled: true,
          threshold: vcfData.threshold,
          manuallyDisabled: false,
          lastUpdated: new Date().toISOString()
        });
      }

      // Check final status
      const finalDoc = await getDoc(settingsRef);
      const finalData = finalDoc.exists() ? finalDoc.data() : { enabled: false };
      
      if (finalData.enabled && totalContacts >= VCF_THRESHOLD) {
        vcfStatus.classList.remove("hidden");
        downloadBtn.style.display = "inline-block";
      } else {
        vcfStatus.classList.add("hidden");
        downloadBtn.style.display = "none";
      }
    } catch (error) {
      console.error("Error checking VCF status:", error);
      showTypingMessage("Error checking VCF status. Please refresh.");
    }
  }

  // Update stats
  async function updateStats() {
    try {
      console.log('Updating stats...');
      const snapshot = await getDocs(collection(db, "contacts"));
      const total = snapshot.size;
      console.log('Total contacts:', total);

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

      if (statCurrent) statCurrent.style.setProperty("--pct", currentDeg);
      if (statTarget) statTarget.style.setProperty("--pct", 360);
      if (statRemaining) statRemaining.style.setProperty("--pct", remainingDeg);

      // Check VCF download availability
      await checkVCFStatus(total);

    } catch (err) {
      console.error("Error updating stats:", err);
      showTypingMessage("Error loading statistics. Please check connection.");
    }
  }

  // Submit contact
  async function submitContact() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    
    if (!name || !phone) {
      showTypingMessage("Please fill in both fields before submitting.");
      return;
    }

    // Simple phone validation
    if (!phone.match(/^\+?[\d\s-()]{10,}$/)) {
      showTypingMessage("Please enter a valid phone number");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      // Check for duplicate phone
      const q = query(collection(db, "contacts"), where("phone", "==", phone));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        showTypingMessage("This phone number is already registered!");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
        return;
      }

      // Add new contact
      await addDoc(collection(db, "contacts"), { 
        name: name, 
        phone: phone, 
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      });

      // Show success message
      showTypingMessage(`${name} saved successfully! Redirecting to WhatsApp...`);

      // Clear form
      nameInput.value = "";
      phoneInput.value = "";

      // Open WhatsApp
      setTimeout(() => {
        window.open(whatsappChannelLink, "_blank");
      }, 1500);

      // Update stats
      setTimeout(() => {
        updateStats();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
      }, 1000);
      
    } catch (error) {
      console.error("Error adding contact:", error);
      showTypingMessage("Error: " + error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit & Join WhatsApp Channel';
    }
  }

  // Generate VCF
  async function generateVCF() {
    try {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

      const snapshot = await getDocs(collection(db, "contacts"));
      const docs = [];
      snapshot.forEach(d => docs.push(d.data()));

      if (docs.length === 0) {
        showTypingMessage("No contacts available to generate VCF.");
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download VCF File';
        return;
      }

      showTypingMessage(`Generating VCF with ${docs.length} contacts...`);

      let vcf = "";
      docs.forEach((data, index) => {
        const number = String(index + 1).padStart(2, '0');
        const fn = `[${number}] ${(data.name || "").toString().replace(/\r?\n/g, " ")}`;
        const tel = (data.phone || "").toString().replace(/\r?\n/g, " ");
        
        vcf += `BEGIN:VCARD
VERSION:3.0
FN:${fn}
TEL:${tel}
END:VCARD
`;
      });

      // Create and download
      const blob = new Blob([vcf], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Global_Contacts_${docs.length}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Log download
      await addDoc(collection(db, "downloads"), {
        timestamp: new Date().toISOString(),
        contactCount: docs.length,
        source: "user"
      });

      showTypingMessage(`VCF downloaded! ${docs.length} contacts added.`);
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url);
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download VCF File';
      }, 1000);
      
    } catch (err) {
      console.error("Error generating VCF:", err);
      showTypingMessage("Failed to generate VCF.");
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
    window.open(whatsappChannelLink, "_blank");
  });

  whatsappContactBtn.addEventListener("click", () => {
    window.open(whatsappContactLink, "_blank");
  });

  // Event listeners
  submitBtn.addEventListener("click", submitContact);
  downloadBtn.addEventListener("click", generateVCF);

  // Initialize
  console.log('Initializing app...');
  updateCountdown();
  setInterval(updateCountdown, 1000);
  updateStats();
  setInterval(updateStats, 5000);

  // Initialize settings
  async function initializeSettings() {
    try {
      const settingsRef = doc(db, "settings", "vcfControl");
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists()) {
        await setDoc(settingsRef, {
          enabled: false,
          threshold: VCF_THRESHOLD,
          manuallyDisabled: false,
          created: new Date().toISOString()
        });
        console.log('Settings initialized');
      }
    } catch (error) {
      console.error("Error initializing settings:", error);
    }
  }

  initializeSettings();
});
