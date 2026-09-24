// ===============================
// Supabase 設定
// ===============================

const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)


// ===============================
// HTML 元素
// ===============================

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authMessage = document.getElementById("authMessage");

const userName = document.getElementById("userName");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const wordList = document.getElementById("wordList");

const newWordInput = document.getElementById("newWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const addWordMessage = document.getElementById("addWordMessage");

// ===============================
// 內部 Auth Email
//
// 使用者不需要知道這個 Email。
// 它只是讓 Supabase Auth 可以繼續
// 使用 email + password 的登入機制。
// ===============================

const INTERNAL_AUTH_DOMAIN = "my-english-app.invalid";


// ===============================
// 帳號名稱轉成內部識別
//
// 支援中文、英文、數字、底線、連字號。
// 例如：
// 小明
// ↓
// u_...
// @my-english-app.invalid
//
// 使用者完全看不到這個內容。
// ===============================

function usernameToInternalEmail(username) {

  const bytes = new TextEncoder().encode(username);

  const encoded = Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");

  return `u_${encoded}@${INTERNAL_AUTH_DOMAIN}`;
}


// ===============================
// 檢查帳號名稱
// ===============================

function validateUsername(username) {

  if (!username) {
    return "請輸入帳號名稱";
  }

  if (username.length < 2) {
    return "帳號名稱至少需要 2 個字";
  }

  if (username.length > 30) {
    return "帳號名稱最多 30 個字";
  }

  // 允許：
  // 中文
  // 英文
  // 數字
  // 底線
  // 連字號
  //
  // 不允許空白與特殊符號。

  const usernamePattern =
    /^[\u4e00-\u9fffA-Za-z0-9_-]+$/;

  if (!usernamePattern.test(username)) {
    return "帳號只能使用中文、英文、數字、底線或連字號";
  }

  return "";
}


// ===============================
// 顯示登入畫面
// ===============================

function showAuth() {

  authSection.classList.remove("hidden");

  appSection.classList.add("hidden");

  usernameInput.focus();
}


// ===============================
// 取得目前使用者的 profile
// ===============================

async function getProfile(userId) {

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {

    console.error("讀取 profile 失敗：", error);

    return null;
  }

  return data;
}


// ===============================
// 顯示 APP
// ===============================

async function showApp(user) {

  authSection.classList.add("hidden");

  appSection.classList.remove("hidden");


  // 取得真正的帳號名稱

  const profile = await getProfile(user.id);

  if (profile) {

    userName.textContent =
      `👋 歡迎，${profile.username}`;

  } else {

    userName.textContent =
      "👋 歡迎回來！";

  }


  // 載入單字

  loadWords();
}


// ===============================
// 建立新帳號
// ===============================

signupBtn.addEventListener("click", async () => {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;


  // 檢查帳號

  const usernameError =
    validateUsername(username);

  if (usernameError) {

    authMessage.textContent =
      usernameError;

    return;
  }


  // 檢查密碼

  if (!password) {

    authMessage.textContent =
      "請輸入密碼";

    return;
  }


  if (password.length < 6) {

    authMessage.textContent =
      "密碼至少需要 6 個字元";

    return;
  }


  authMessage.textContent =
    "正在建立帳號...";


  const internalEmail =
    usernameToInternalEmail(username);


  // 建立 Supabase Auth 帳號

  const {
    data,
    error
  } = await supabaseClient.auth.signUp({

    email: internalEmail,

    password: password

  });


  if (error) {

    console.error(error);

    authMessage.textContent =
      "建立帳號失敗：" + error.message;

    return;
  }


  // 確認是否已取得登入 session

  if (!data.session || !data.user) {

    authMessage.textContent =
      "帳號已建立，但目前無法自動登入。請確認 Supabase 沒有要求 Email 驗證。";

    return;
  }


  // 建立 profiles 資料

  const {
    error: profileError
  } = await supabaseClient
    .from("profiles")
    .insert({

      id: data.user.id,

      username: username

    });


  if (profileError) {

    console.error(profileError);

    authMessage.textContent =
      "帳號建立成功，但建立使用者資料失敗：" +
      profileError.message;

    return;
  }


  authMessage.textContent =
    "帳號建立成功！";


  passwordInput.value = "";


  // 進入 APP

  await showApp(data.user);

});


// ===============================
// 登入
// ===============================

loginBtn.addEventListener("click", async () => {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;


  // 檢查帳號

  const usernameError =
    validateUsername(username);

  if (usernameError) {

    authMessage.textContent =
      usernameError;

    return;
  }


  if (!password) {

    authMessage.textContent =
      "請輸入密碼";

    return;
  }


  authMessage.textContent =
    "登入中...";


  const internalEmail =
    usernameToInternalEmail(username);


  // 使用內部識別登入 Supabase Auth

  const {
    data,
    error
  } = await supabaseClient.auth
    .signInWithPassword({

      email: internalEmail,

      password: password

    });


  if (error) {

    console.error(error);

    authMessage.textContent =
      "登入失敗：帳號名稱或密碼不正確";

    return;
  }


  authMessage.textContent = "";

  passwordInput.value = "";


  await showApp(data.user);

});


// ===============================
// 登出
// ===============================

logoutBtn.addEventListener("click", async () => {

  await supabaseClient.auth.signOut();

  showAuth();

  usernameInput.value = "";

  passwordInput.value = "";

  authMessage.textContent = "";

});


// ===============================
// 載入目前登入者
// ===============================

async function checkUser() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();


  if (session) {

    await showApp(session.user);

  } else {

    showAuth();

  }

}


// ===============================
// 監聽登入狀態
// ===============================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (session) {

      await showApp(session.user);

    } else {

      showAuth();

    }

  }
);


// ===============================
// 載入單字
// ===============================

async function loadWords(searchText = "") {

  wordList.innerHTML =
    '<div class="loading">載入中...</div>';


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


  const {
    data,
    error
  } = await query;


  if (error) {

    console.error(error);

    wordList.innerHTML =
      "載入失敗：" + error.message;

    return;
  }


  displayWords(data);

}


// ===============================
// 顯示單字
// ===============================
// ===============================
// 顯示單字列表
// ===============================

function displayWords(words) {

  if (!words || words.length === 0) {

    wordList.innerHTML =
      '<div class="empty">目前沒有單字</div>';

    return;
  }


  wordList.innerHTML = "";


  words.forEach(word => {

    const div =
      document.createElement("div");

    div.className = "word-item";


    div.innerHTML = `
      <div class="word-row">

        <div class="word-name">
          ${escapeHtml(word.word)}
        </div>

        <button
          class="learn-again-btn"
          data-word-id="${escapeHtml(word.id)}"
        >
          Learn Again
        </button>

      </div>
    `;


    wordList.appendChild(div);

  });


  // ===============================
  // Learn Again 按鈕
  // ===============================

  const learnAgainButtons =
    document.querySelectorAll(".learn-again-btn");


  learnAgainButtons.forEach(button => {

    button.addEventListener("click", () => {

      const wordId =
        button.dataset.wordId;

      const selectedWord =
        words.find(word => word.id === wordId);


      if (selectedWord) {

        showWordDetail(selectedWord);

      }

    });

  });

}
// ===============================
// 顯示單字詳細資料
// ===============================

function showWordDetail(word) {

  wordList.innerHTML = `

    <div class="word-detail">

      <button
        id="backToWordListBtn"
        class="back-btn"
      >
        ← 回到我的單字
      </button>

      <div class="detail-word">
        ${escapeHtml(word.word)}
      </div>

      ${
        word.phonetic
          ? `
            <div class="detail-phonetic">
              ${escapeHtml(word.phonetic)}
            </div>
          `
          : ""
      }

      ${
        word.part_of_speech
          ? `
            <div class="detail-part-of-speech">
              ${escapeHtml(word.part_of_speech)}
            </div>
          `
          : ""
      }

      ${
        word.chinese_meaning
          ? `
            <div class="detail-meaning">
              ${escapeHtml(word.chinese_meaning)}
            </div>
          `
          : ""
      }

      ${
        word.definition_en
          ? `
            <div class="detail-section">
              <h3>English Definition</h3>
              <p>
                ${escapeHtml(word.definition_en)}
              </p>
            </div>
          `
          : ""
      }

      ${
        word.example_en
          ? `
            <div class="detail-section">
              <h3>Example</h3>
              <p>
                ${escapeHtml(word.example_en)}
              </p>
            </div>
          `
          : ""
      }

      ${
        word.example_zh
          ? `
            <div class="detail-section">
              <h3>中文例句</h3>
              <p>
                ${escapeHtml(word.example_zh)}
              </p>
            </div>
          `
          : ""
      }

      <button
        id="speakWordBtn"
        class="speak-btn"
      >
        🔊 聽發音
      </button>

    </div>

  `;


  // ===============================
  // 回到單字列表
  // ===============================

  document
    .getElementById("backToWordListBtn")
    .addEventListener("click", () => {

      loadWords();

    });


  // ===============================
  // 發音
  // ===============================

  document
    .getElementById("speakWordBtn")
    .addEventListener("click", () => {

      speakWord(word.word);

    });

}
// ===============================
// 單字發音
// ===============================

function speakWord(word) {

  if (!("speechSynthesis" in window)) {

    alert("你的瀏覽器不支援語音播放");

    return;
  }


  window.speechSynthesis.cancel();


  const speech =
    new SpeechSynthesisUtterance(word);


  speech.lang = "en-US";

  speech.rate = 0.85;

  speech.pitch = 1;


  window.speechSynthesis.speak(speech);

}

// ===============================
// 新增單字
// ===============================

addWordBtn.addEventListener("click", async () => {

  const word =
    newWordInput.value.trim();


  // 檢查是否有輸入

  if (!word) {

    addWordMessage.textContent =
      "請先輸入英文單字";

    return;
  }


  // 確認目前有登入

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();


  if (!user) {

    addWordMessage.textContent =
      "請先登入";

    return;
  }


  addWordMessage.textContent =
    "新增中...";


  // 存入 Supabase words 表

  const {
    error
  } = await supabaseClient
    .from("words")
    .insert({

      word: word,

      user_id: user.id

    });


  // 新增失敗

  if (error) {

    console.error(error);

    addWordMessage.textContent =
      "新增失敗：" + error.message;

    return;
  }


  // 新增成功

  addWordMessage.textContent =
    `「${word}」新增成功！`;


  // 清空輸入框

  newWordInput.value = "";


  // 重新載入單字列表

  loadWords();

});
// ===============================
// Enter 新增單字
// ===============================

newWordInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {

    addWordBtn.click();

  }

});

// ===============================
// 搜尋
// ===============================

searchBtn.addEventListener("click", () => {

  const keyword =
    searchInput.value.trim();

  loadWords(keyword);

});


// ===============================
// Enter 搜尋
// ===============================

searchInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      const keyword =
        searchInput.value.trim();

      loadWords(keyword);

    }

  }
);


// ===============================
// 防止 HTML 注入
// ===============================

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text ?? "";

  return div.innerHTML;
}


// ===============================
// 啟動
// ===============================

checkUser();