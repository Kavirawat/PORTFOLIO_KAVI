const navLinks = document.querySelectorAll("header nav a");
const logoLink = document.querySelector(".logo");
const sections = document.querySelectorAll("section");
const menuIcon = document.querySelector("#menu-icon");
const navbar = document.querySelector("header nav");

menuIcon.addEventListener("click", () => {
  menuIcon.classList.toggle("fa-xmark");
  navbar.classList.toggle("active");
});

const scrollProgressBar = document.getElementById("scroll-progress-bar");
const scrollTopBtn = document.getElementById("scroll-top-btn");

function updateScrollUI(sec) {
  if (!sec) return;
  const maxScroll = sec.scrollHeight - sec.clientHeight;
  const pct = maxScroll > 0 ? (sec.scrollTop / maxScroll) * 100 : 0;
  if (scrollProgressBar) {
    scrollProgressBar.style.width = `${pct}%`;
    if (sec.scrollTop > 10) {
      scrollProgressBar.classList.add("visible");
    } else {
      scrollProgressBar.classList.remove("visible");
    }
  }
  if (scrollTopBtn) {
    if (sec.scrollTop > 180) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }
  }
}

// Bind scroll UI tracking to all sections
sections.forEach((sec) => {
  sec.addEventListener("scroll", () => {
    if (sec.classList.contains("active")) {
      updateScrollUI(sec);
    }
  }, { passive: true });
});

if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => {
    const activeSec = document.querySelector("section.active");
    if (activeSec) {
      activeSec.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

let currentSectionIndex = 0;
let isTransitioning = false;

const activePage = (targetIdx) => {
  if (targetIdx === currentSectionIndex && sections[targetIdx] && sections[targetIdx].classList.contains("active")) {
    return;
  }
  if (isTransitioning) return;
  isTransitioning = true;

  const isForward = targetIdx > currentSectionIndex;
  const oldIdx = currentSectionIndex;
  currentSectionIndex = targetIdx;

  navLinks.forEach((link) => link.classList.remove("active"));
  if (navLinks[targetIdx]) {
    navLinks[targetIdx].classList.add("active");
  }

  const currentActiveSec = sections[oldIdx];
  const targetSec = sections[targetIdx];

  sections.forEach((sec, idx) => {
    if (idx !== oldIdx && idx !== targetIdx) {
      sec.classList.remove("active", "enter-3d-next", "exit-3d-next", "enter-3d-prev", "exit-3d-prev");
    }
  });

  const exitClass = isForward ? "exit-3d-next" : "exit-3d-prev";
  const enterClass = isForward ? "enter-3d-next" : "enter-3d-prev";

  if (currentActiveSec) {
    currentActiveSec.classList.remove("active", "enter-3d-next", "exit-3d-next", "enter-3d-prev", "exit-3d-prev");
    currentActiveSec.classList.add(exitClass);
  }

  if (targetSec) {
    targetSec.scrollTop = 0;
    updateScrollUI(targetSec);
    targetSec.classList.remove("active", "enter-3d-next", "exit-3d-next", "enter-3d-prev", "exit-3d-prev");
    targetSec.classList.add(enterClass, "active");
  }

  setTimeout(() => {
    if (currentActiveSec) {
      currentActiveSec.classList.remove(exitClass);
    }
    if (targetSec) {
      targetSec.classList.remove(enterClass);
      updateScrollUI(targetSec);
    }
    isTransitioning = false;
  }, 700);

  menuIcon.classList.remove("fa-xmark");
  navbar.classList.remove("active");
};

navLinks.forEach((link, idx) => {
  link.addEventListener("click", () => {
    if (!link.classList.contains("active")) {
      activePage(idx);
    }
  });
});

logoLink.addEventListener("click", () => {
  if (!navLinks[0].classList.contains("active")) {
    activePage(0);
  }
});

const resumeBtn = document.querySelectorAll(".resume-btn");

resumeBtn.forEach((btn, idx) => {
  btn.addEventListener("click", () => {
    const resumeDetails = document.querySelectorAll(".resume-detail");
    resumeBtn.forEach((b) => {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    resumeDetails.forEach((detail) => {
      detail.classList.remove("active");
    });
    const targetDetail = resumeDetails[idx];
    if (targetDetail) {
      targetDetail.classList.add("active");
      // On mobile/tablets, smoothly scroll to detail content so it's instantly visible
      if (window.innerWidth <= 992) {
        setTimeout(() => {
          targetDetail.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      }
    }
  });
});

const arrowRight = document.querySelector(
  ".portfolio-box .navigation .arrow-right"
);
const arrowLeft = document.querySelector(
  ".portfolio-box .navigation .arrow-left"
);

let index = 0;

const activePortfolio = () => {
  const imgSlide = document.querySelector(".portfolio-carousel .img-slide");
  const portfolioDetails = document.querySelectorAll(".portfolio-detail");
  imgSlide.style.transform = `translateX(calc(${index * -100}% - ${
    index * 2
  }rem)) `;

  portfolioDetails.forEach((detail) => {
    detail.classList.remove("active");
  });
  portfolioDetails[index].classList.add("active");
};

arrowRight.addEventListener("click", () => {
  if (index < 6) {
    index++;
    arrowLeft.classList.remove("disabled");
  } else {
    index = 7;
    arrowRight.classList.add("disabled");
  }
  activePortfolio();
});

arrowLeft.addEventListener("click", () => {
  if (index > 1) {
    index--;
    arrowRight.classList.remove("disabled");
  } else {
    index = 0;
    arrowLeft.classList.add("disabled");
  }
  activePortfolio();
});

const contactForm = document.getElementById("contact-form");
const emailSubmitBtn = document.getElementById("email-submit-btn");
const contactStatusMsg = document.getElementById("contact-status-msg");

function getContactFormData() {
  const name = document.getElementById("contact-name").value.trim();
  const email = document.getElementById("contact-email").value.trim();
  const phone = document.getElementById("contact-phone").value.trim();
  const subject = document.getElementById("contact-subject").value.trim();
  const message = document.getElementById("contact-message").value.trim();

  return { name, email, phone, subject, message };
}

function sendViaWhatsApp() {
  const data = getContactFormData();
  if (!contactForm.reportValidity()) return;

  const waText = 
    `*New Contact Message from Portfolio*\n\n` +
    `👤 *Name:* ${data.name}\n` +
    `📧 *Email:* ${data.email}\n` +
    `📞 *Phone:* ${data.phone}\n` +
    `📌 *Subject:* ${data.subject}\n\n` +
    `💬 *Message:*\n${data.message}`;

  const waUrl = `https://api.whatsapp.com/send?phone=918966856380&text=${encodeURIComponent(waText)}`;
  
  if (contactStatusMsg) {
    contactStatusMsg.style.display = "block";
    contactStatusMsg.textContent = "✓ Opening WhatsApp to send your message to (+91) 8966856380...";
  }

  window.open(waUrl, "_blank");
}

function sendViaEmail() {
  const data = getContactFormData();
  if (!contactForm.reportValidity()) return;

  const mailSubject = encodeURIComponent(data.subject || `Portfolio Message from ${data.name}`);
  const mailBody = encodeURIComponent(
    `Name: ${data.name}\n` +
    `Email: ${data.email}\n` +
    `Phone: ${data.phone}\n` +
    `Subject: ${data.subject}\n\n` +
    `Message:\n${data.message}`
  );

  const mailUrl = `mailto:kavirrawat896@gmail.com?subject=${mailSubject}&body=${mailBody}`;

  if (contactStatusMsg) {
    contactStatusMsg.style.display = "block";
    contactStatusMsg.textContent = "✓ Opening Email client to send your message to kavirrawat896@gmail.com...";
  }

  window.location.href = mailUrl;
}

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendViaWhatsApp();
  });
}

if (emailSubmitBtn) {
  emailSubmitBtn.addEventListener("click", () => {
    sendViaEmail();
  });
}
