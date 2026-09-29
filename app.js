/* =========================================================
   Supabase 設定
========================================================= */

const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   使用者介面元素
========================================================= */

const authSection =
  document.getElementById("authSection");

const appSection =
  document.getElementById("appSection");

const usernameInput =
  document.getElementById("username");

const passwordInput =
  document.getElementById("password");

const loginBtn =
  document.getElementById("loginBtn");

const signupBtn =
  document.getElementById("signupBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const authMessage =
  document.getElementById("authMessage");

const userName =
  document.getElementById("userName");

const newWordInput =
  document.getElementById("newWordInput");

const addWordBtn =
  document.getElementById("addWordBtn");

const addWordMessage =
  document.getElementById("addWordMessage");

const searchInput =
  document.getElementById("searchInput");

const searchBtn =
  document.getElementById("searchBtn");

const wordList =
  document.getElementById("wordList");

const wordDetail =
  document.getElementById("wordDetail");


/* =========================================================
   Username → Supabase Internal Email
========================================================= */

const INTERNAL_AUTH_DOMAIN =
  "my-english-app.invalid";

function usernameToInternalEmail(username) {

  const bytes =
    new TextEncoder().encode(username);

  const encoded =
    Array.from(bytes)
      .map(byte =>
        byte
          .toString(16)
          .padStart(2, "0")
      )
      .join("");

  return `u_${encoded}@${INTERNAL_AUTH_DOMAIN}`;
}


/* =========================================================
   Username 驗證
========================================================= */

function validateUsername(username) {

  if (!username) {
    return "請輸入帳號名稱";
  }

  if (username.length < 2) {
    return "帳號名稱至少需要 2 個字元";
  }

  if (username.length > 30) {
    return "帳號名稱最多 30 個字元";
  }

  if (
    !/^[A-Za-z0-9_\-\u4e00-\u9fff]+$/.test(
      username
    )
  ) {
    return "帳號只能使用中文、英文、數字、底線或連字號";
  }

  return "";
}


/* =========================================================
   UI
========================================================= */

function showAuth() {

  authSection.classList.remove(
    "hidden"
  );

  appSection.classList.add(
    "hidden"
  );

  wordDetail.classList.add(
    "hidden"
  );
}


function showApp() {

  authSection.classList.add(
    "hidden"
  );

  appSection.classList.remove(
    "hidden"
  );

  loadWords();
}


/* =========================================================
   訊息
========================================================= */

function setMessage(
  element,
  message,
  type = ""
) {

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.remove(
    "error",
    "success"
  );

  if (type) {
    element.classList.add(type);
  }
}


/* =========================================================
   HTML 安全處理
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   取得 Profile
========================================================= */

async function getProfile(userId) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

  if (error) {

    console.error(
      "取得 profile 失敗：",
      error
    );

    return null;
  }

  return data;
}


/* =========================================================
   登入
========================================================= */

loginBtn.addEventListener(
  "click",
  async () => {

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    const validation =
      validateUsername(username);

    if (validation) {

      setMessage(
        authMessage,
        validation,
        "error"
      );

      return;
    }

    if (!password) {

      setMessage(
        authMessage,
        "請輸入密碼",
        "error"
      );

      return;
    }

    loginBtn.disabled = true;

    setMessage(
      authMessage,
      "登入中..."
    );

    try {

      const email =
        usernameToInternalEmail(
          username
        );

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {

        console.error(error);

        setMessage(
          authMessage,
          "登入失敗：帳號名稱或密碼不正確",
          "error"
        );

        return;
      }

      if (data?.user) {

        await showCurrentUser(
          data.user
        );
      }

    } finally {

      loginBtn.disabled = false;
    }
  }
);


/* =========================================================
   註冊
========================================================= */

signupBtn.addEventListener(
  "click",
  async () => {

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    const validation =
      validateUsername(username);

    if (validation) {

      setMessage(
        authMessage,
        validation,
        "error"
      );

      return;
    }

    if (!password) {

      setMessage(
        authMessage,
        "請輸入密碼",
        "error"
      );

      return;
    }

    if (password.length < 6) {

      setMessage(
        authMessage,
        "密碼至少需要 6 個字元",
        "error"
      );

      return;
    }

    signupBtn.disabled = true;

    setMessage(
      authMessage,
      "註冊中..."
    );

    try {

      const email =
        usernameToInternalEmail(
          username
        );

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signUp({
            email,
            password
          });

      if (error) {

        console.error(error);

        setMessage(
          authMessage,
          `註冊失敗：${error.message}`,
          "error"
        );

        return;
      }

      if (!data?.user) {

        setMessage(
          authMessage,
          "註冊完成，但尚未取得使用者資料。",
          "error"
        );

        return;
      }

      const {
        error: profileError
      } =
        await supabaseClient
          .from("profiles")
          .insert({
            id: data.user.id,
            username
          });

      if (profileError) {

        console.error(
          "建立 profile 失敗：",
          profileError
        );

        setMessage(
          authMessage,
          "帳號已建立，但使用者資料建立失敗。",
          "error"
        );

        return;
      }

      setMessage(
        authMessage,
        "註冊成功，正在進入...",
        "success"
      );

      await showCurrentUser(
        data.user
      );

    } finally {

      signupBtn.disabled = false;
    }
  }
);


/* =========================================================
   登出
========================================================= */

logoutBtn.addEventListener(
  "click",
  async () => {

    stopAllAudio();

    await supabaseClient.auth.signOut();

    usernameInput.value = "";
    passwordInput.value = "";

    showAuth();
  }
);


/* =========================================================
   顯示目前使用者
========================================================= */

async function showCurrentUser(user) {

  const profile =
    await getProfile(user.id);

  if (profile?.username) {

    userName.textContent =
      profile.username;

  } else {

    userName.textContent = "";
  }

  showApp();
}


/* =========================================================
   檢查登入狀態
========================================================= */

async function checkUser() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();

  if (session?.user) {

    await showCurrentUser(
      session.user
    );

  } else {

    showAuth();
  }
}


/* =========================================================
   Auth 狀態監聽
========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (session?.user) {

      await showCurrentUser(
        session.user
      );

    } else {

      showAuth();

    }

  }
);


/* =========================================================
   啟動 App
========================================================= */

checkUser();
