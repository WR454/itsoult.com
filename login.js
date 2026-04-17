const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginNote = document.getElementById("loginNote");
const codeGroup = document.getElementById("codeGroup");
const codeInput = document.getElementById("verificationCode");
const resendCodeBtn = document.getElementById("resendCodeBtn");
const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const registerNote = document.getElementById("registerNote");

let isCodeStep = false;
const isLocalPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  && window.location.port
  && window.location.port !== "8000";
const API_BASE = window.location.protocol === "file:" || isLocalPreview
  ? "http://127.0.0.1:8000"
  : "";

const setNote = (message, type) => {
  if (!loginNote) {
    return;
  }

  loginNote.textContent = message;
  loginNote.className = "login-note";

  if (type) {
    loginNote.classList.add(type);
  }
};

const setLoading = (loading, text) => {
  if (!loginBtn) {
    return;
  }

  loginBtn.classList.toggle("is-loading", loading);
  loginBtn.disabled = loading;
  if (text) {
    loginBtn.textContent = text;
  }
};

const setRegisterNote = (message, type) => {
  if (!registerNote) {
    return;
  }

  registerNote.textContent = message;
  registerNote.className = "login-note";
  if (type) {
    registerNote.classList.add(type);
  }
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      return { ok: false, message: "استجابة غير صالحة من الخادم." };
    }
  }

  const text = await response.text();
  return {
    ok: false,
    message: text?.trim() || `الخادم أعاد استجابة غير متوقعة (HTTP ${response.status}).`,
  };
};

const sendCode = async (email, password) => {
  const response = await fetch(`${API_BASE}/api/auth/send-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await readApiResponse(response);
  return { ok: response.ok && result.ok, result };
};

const verifyCode = async (email, code) => {
  const response = await fetch(`${API_BASE}/api/auth/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, code }),
  });

  const result = await readApiResponse(response);
  return { ok: response.ok && result.ok, result };
};

const registerAccount = async (fullName, email, password) => {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fullName, email, password }),
  });

  const result = await readApiResponse(response);
  return { ok: response.ok && result.ok, result };
};

const activateCodeStep = () => {
  isCodeStep = true;
  if (codeGroup) {
    codeGroup.hidden = false;
  }
  if (resendCodeBtn) {
    resendCodeBtn.hidden = false;
  }
  if (loginBtn) {
    loginBtn.textContent = "تحقق وتسجيل الدخول";
  }
  if (codeInput) {
    codeInput.focus();
  }
};

const applyDevelopmentCode = (result) => {
  if (!result?.devCode || !codeInput) {
    return null;
  }

  codeInput.value = result.devCode;
  return `رمز التطوير الحالي: ${result.devCode}`;
};

if (loginForm && loginBtn) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const code = codeInput?.value.trim() || "";

    setNote("", "");

    if (!emailRegex.test(email)) {
      setNote("أدخل بريدًا إلكترونيًا صحيحًا.", "error");
      return;
    }

    if (password.length < 8) {
      setNote("كلمة المرور لازم تكون 8 أحرف أو أكثر.", "error");
      return;
    }

    if (!isCodeStep) {
      try {
        setLoading(true, "جاري إرسال الرمز...");
        const { ok, result } = await sendCode(email, password);

        if (!ok) {
          setNote(result.message || "تعذر إرسال رمز التحقق.", "error");
          return;
        }

        activateCodeStep();
        const devCodeMessage = applyDevelopmentCode(result);
        setNote(devCodeMessage || result.message || "تم إرسال رمز التحقق إلى بريدك.", "success");
      } catch (error) {
        const offlineHint = window.location.protocol === "file:" || isLocalPreview
          ? " شغّل الخادم ثم افتح http://127.0.0.1:8000/login.html بدل فتح الملف مباشرة أو عبر Live Server."
          : "";
        setNote(`فشل الاتصال بالخادم أثناء إرسال الرمز.${offlineHint}`, "error");
      } finally {
        setLoading(false, isCodeStep ? "تحقق وتسجيل الدخول" : "إرسال رمز التحقق");
      }
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setNote("أدخل رمز تحقق مكوّن من 6 أرقام.", "error");
      return;
    }

    try {
      setLoading(true, "جاري التحقق...");
      const { ok, result } = await verifyCode(email, code);

      if (!ok) {
        setNote(result.message || "الرمز غير صحيح أو منتهي.", "error");
        return;
      }

      setNote(result.message || "تم تسجيل الدخول بنجاح.", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 900);
    } catch (error) {
      setNote("فشل الاتصال بالخادم أثناء التحقق من الرمز.", "error");
    } finally {
      setLoading(false, "تحقق وتسجيل الدخول");
    }
  });
}

if (resendCodeBtn) {
  resendCodeBtn.addEventListener("click", async () => {
    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    if (!emailRegex.test(email) || password.length < 8) {
      setNote("أدخل البريد وكلمة المرور أولًا لإعادة الإرسال.", "error");
      return;
    }

    try {
      resendCodeBtn.disabled = true;
      resendCodeBtn.textContent = "جاري إعادة الإرسال...";
      const { ok, result } = await sendCode(email, password);

      if (!ok) {
        setNote(result.message || "تعذر إعادة إرسال الرمز.", "error");
        return;
      }

      const devCodeMessage = applyDevelopmentCode(result);
      setNote(devCodeMessage || "تمت إعادة إرسال الرمز إلى بريدك.", "success");
    } catch (error) {
      setNote("فشل الاتصال بالخادم أثناء إعادة الإرسال.", "error");
    } finally {
      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = "إعادة إرسال الرمز";
    }
  });
}

if (registerForm && registerBtn) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("registerFullName")?.value.trim() || "";
    const email = document.getElementById("registerEmail")?.value.trim() || "";
    const password = document.getElementById("registerPassword")?.value || "";

    setRegisterNote("", "");

    if (fullName.length < 3) {
      setRegisterNote("الاسم يجب أن يكون 3 أحرف أو أكثر.", "error");
      return;
    }

    if (!emailRegex.test(email)) {
      setRegisterNote("أدخل بريدًا إلكترونيًا صحيحًا.", "error");
      return;
    }

    if (password.length < 8) {
      setRegisterNote("كلمة المرور لازم تكون 8 أحرف أو أكثر.", "error");
      return;
    }

    try {
      registerBtn.disabled = true;
      registerBtn.textContent = "جاري إنشاء الحساب...";

      const { ok, result } = await registerAccount(fullName, email, password);
      if (!ok) {
        setRegisterNote(result.message || "تعذر إنشاء الحساب.", "error");
        return;
      }

      const loginEmail = document.getElementById("email");
      const loginPassword = document.getElementById("password");
      if (loginEmail) {
        loginEmail.value = email;
      }
      if (loginPassword) {
        loginPassword.value = password;
      }

      registerForm.reset();
      setRegisterNote(result.message || "تم إنشاء الحساب بنجاح.", "success");
      setNote("الحساب جاهز. اضغط إرسال رمز التحقق لتسجيل الدخول.", "success");
    } catch (error) {
      setRegisterNote("فشل الاتصال بالخادم أثناء إنشاء الحساب.", "error");
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "إنشاء الحساب";
    }
  });
}
