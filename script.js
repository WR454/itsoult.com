const mobileToggle = document.getElementById("mobileToggle");
const mainNav = document.getElementById("mainNav");
const navLinks = document.querySelectorAll("#mainNav a");

if (mobileToggle && mainNav) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      mobileToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const contactForm = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");
const projectActionLinks = document.querySelectorAll("[data-project-template]");

projectActionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const template = link.getAttribute("data-project-template");
    const messageField = document.getElementById("message");
    const nameField = document.getElementById("name");

    if (template && messageField) {
      messageField.value = template;
    }

    if (nameField) {
      setTimeout(() => nameField.focus(), 150);
    }
  });
});

if (contactForm && formNote) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    formNote.className = "form-note";

    if (name.length < 3) {
      formNote.textContent = "يرجى إدخال اسم صحيح (3 أحرف على الأقل).";
      formNote.classList.add("error");
      return;
    }

    if (!emailRegex.test(email)) {
      formNote.textContent = "البريد الإلكتروني غير صحيح.";
      formNote.classList.add("error");
      return;
    }

    if (message.length < 10) {
      formNote.textContent = "اكتب تفاصيل أكثر عن طلبك (10 أحرف على الأقل).";
      formNote.classList.add("error");
      return;
    }

    try {
      const endpoints = ["/api/contact", "http://127.0.0.1:8000/api/contact"];
      let saved = false;
      let lastErrorMessage = "";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email, message }),
          });

          const result = await response.json();
          if (!response.ok || !result.ok) {
            lastErrorMessage = result.message || "تعذر حفظ الرسالة، حاول مرة أخرى.";
            continue;
          }

          saved = true;
          break;
        } catch (endpointError) {
          lastErrorMessage = "لا يمكن الاتصال بالخادم. شغّل السيرفر ثم أعد المحاولة.";
        }
      }

      if (!saved) {
        formNote.textContent = lastErrorMessage || "تعذر حفظ الرسالة، حاول مرة أخرى.";
        formNote.classList.add("error");
        return;
      }

      formNote.textContent = "تم حفظ رسالتك في قاعدة البيانات بنجاح.";
      formNote.classList.add("success");
      contactForm.reset();
    } catch (error) {
      formNote.textContent = "لا يمكن الاتصال بالخادم. شغّل السيرفر ثم أعد المحاولة.";
      formNote.classList.add("error");
    }
  });
}
