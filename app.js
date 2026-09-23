// ===============================
// Supabase 設定
// ===============================

// 
const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ===============================
// HTML 元素
// ===============================

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authMessage = document.getElementById("authMessage");

const userEmail = document.getElementById("userEmail");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const wordList = document.getElementById("wordList");


// ===============================
// 顯示登入 / APP
// ===============================

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}

function showApp(user) {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  userEmail.textContent = user.email;

  loadWords();
}


// ===============================
// 註冊
// ===============================

signupBtn.addEventListener("click", async () => {

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = "請輸入 Email 和密碼";
    return;
  }

  if (password.length < 6) {
    authMessage.textContent = "密碼至少需要 6 個字元";
    return;
  }

  authMessage.textContent = "註冊中...";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    authMessage.textContent = "註冊失敗：" + error.message;
    return;
  }

  authMessage.textContent =
    "註冊成功！如果系統要求驗證 Email，請先完成驗證。";
});


// ===============================
// 登入
// ===============================

loginBtn.addEventListener("click", async () => {

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = "請輸入 Email 和密碼";
    return;
  }

  authMessage.textContent = "登入中...";

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    authMessage.textContent = "登入失敗：" + error.message;
    return;
  }

  authMessage.textContent = "";

  showApp(data.user);
});


// ===============================
// 登出
// ===============================

logoutBtn.addEventListener("click", async () => {

  await supabaseClient.auth.signOut();

  showAuth();

  emailInput.value = "";
  passwordInput.value = "";
  authMessage.textContent = "";
});


// ===============================
// 載入目前登入者
// ===============================

async function checkUser() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    showApp(session.user);
  } else {
    showAuth();
  }
}


// ===============================
// 監聽登入狀態
// ===============================

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    if (session) {
      showApp(session.user);
    } else {
      showAuth();
    }

  }
);


// ===============================
// 載入單字
// ===============================

async function loadWords(searchText = "") {

  wordList.innerHTML = "載入中...";

  let query = supabaseClient
    .from("words")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (searchText) {
    query = query.ilike(
      "word",
      `%${searchText}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    wordList.innerHTML =
      "載入失敗：" + error.message;
    return;
  }

  displayWords(data);
}


// ===============================
// 顯示單字
// ===============================

function displayWords(words) {

  if (!words || words.length === 0) {
    wordList.innerHTML =
      '<div class="empty">目前沒有單字</div>';

    return;
  }

  wordList.innerHTML = "";

  words.forEach(word => {

    const div = document.createElement("div");

    div.className = "word-item";

    div.innerHTML = `
      <div class="word">
        ${escapeHtml(word.word)}
      </div>

      ${
        word.phonetic
          ? `<div class="phonetic">
              ${escapeHtml(word.phonetic)}
             </div>`
          : ""
      }

      ${
        word.part_of_speech
          ? `<div>
              ${escapeHtml(word.part_of_speech)}
             </div>`
          : ""
      }

      ${
        word.chinese_meaning
          ? `<div class="meaning">
              ${escapeHtml(word.chinese_meaning)}
             </div>`
          : ""
      }

      ${
        word.example_en
          ? `<p>
              ${escapeHtml(word.example_en)}
             </p>`
          : ""
      }
    `;

    wordList.appendChild(div);

  });
}


// ===============================
// 搜尋
// ===============================

searchBtn.addEventListener("click", () => {

  const keyword =
    searchInput.value.trim();

  loadWords(keyword);
});


// Enter 搜尋
searchInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {

    const keyword =
      searchInput.value.trim();

    loadWords(keyword);
  }

});


// ===============================
// 防止 HTML 注入
// ===============================

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


// ===============================
// 啟動
// ===============================

checkUser();