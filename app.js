```javascript
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
// 使用者名稱 → Supabase 內部 Email
// ===============================

const INTERNAL_AUTH_DOMAIN =
  "my-english-app.invalid";

function usernameToInternalEmail(username) {

  const bytes =
    new TextEncoder().encode(username);

  const encoded =
    Array.from(bytes)
      .map(byte =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");

return `u_${encoded}@${INTERNAL_AUTH_DOMAIN}`; 


// ===============================
// DOM
// ===============================

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


// ===============================
// 顯示登入頁
// ===============================

function showLogin() {

  authSection.classList.remove("hidden");

  appSection.classList.add("hidden");

}


// ===============================
// 顯示 APP
// ===============================

async function showApp(user) {

  authSection.classList.add("hidden");

  appSection.classList.remove("hidden");

  let username = "";

  const {
    data: profile
  } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {

    username =
      profile.username || "";

  }

  userName.textContent =
    username
      ? `👋 ${username}`
      : "👋 歡迎！";

  loadWords();

}


// ===============================
// 註冊
// ===============================

signupBtn.addEventListener(
  "click",
  async () => {

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    authMessage.textContent = "";

    if (!username || !password) {

      authMessage.textContent =
        "請輸入帳號名稱和密碼。";

      return;
    }

    if (password.length < 6) {

      authMessage.textContent =
        "密碼至少需要 6 個字元。";

      return;
    }

    signupBtn.disabled = true;

    authMessage.textContent =
      "正在建立帳號...";

    try {

      const email =
        usernameToInternalEmail(username);

      const {
        data,
        error
      } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {

        throw new Error(
          "帳號建立失敗。"
        );

      }

      const {
        error: profileError
      } = await supabaseClient
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

        authMessage.textContent =
          "帳號建立成功，但使用者資料建立失敗。";

        return;
      }

      authMessage.textContent =
        "帳號建立成功！正在登入...";

    } catch (error) {

      console.error(error);

      authMessage.textContent =
        error.message ||
        "建立帳號失敗。";

    } finally {

      signupBtn.disabled = false;

    }

  }
);


// ===============================
// 登入
// ===============================

loginBtn.addEventListener(
  "click",
  async () => {

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    authMessage.textContent = "";

    if (!username || !password) {

      authMessage.textContent =
        "請輸入帳號名稱和密碼。";

      return;
    }

    loginBtn.disabled = true;

    authMessage.textContent =
      "登入中...";

    try {

      const email =
        usernameToInternalEmail(username);

      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (data.user) {

        await showApp(data.user);

      }

    } catch (error) {

      console.error(error);

      authMessage.textContent =
        "帳號名稱或密碼錯誤。";

    } finally {

      loginBtn.disabled = false;

    }

  }
);


// ===============================
// Enter 登入
// ===============================

passwordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      loginBtn.click();

    }

  }
);


// ===============================
// 登出
// ===============================

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

    showLogin();

  }
);


// ===============================
// 檢查目前登入狀態
// ===============================

async function checkUser() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {

    await showApp(session.user);

  } else {

    showLogin();

  }

}


// ===============================
// 登入狀態變化
// ===============================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (
      session?.user &&
      event !== "INITIAL_SESSION"
    ) {

      await showApp(session.user);

    }

    if (
      !session?.user &&
      event === "SIGNED_OUT"
    ) {

      showLogin();

    }

  }
);


// ===============================
// 載入單字
// ===============================

async function loadWords() {

  wordList.innerHTML =
    '<div class="loading">載入中...</div>';

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) {

    showLogin();

    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("words")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "載入單字失敗：",
      error
    );

    wordList.innerHTML =
      '<div class="empty">單字載入失敗</div>';

    return;
  }

  displayWords(data || []);

}


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

    div.className =
      "word-item";

    div.innerHTML = `
      <div class="word-row">

        <div class="word-name">
          ${escapeHtml(word.word)}
        </div>

        <div class="word-actions">

          <button
            class="learn-again-btn"
            data-word-id="${escapeHtml(word.id)}"
          >
            Learn Again
          </button>

          <button
            class="delete-word-btn"
            data-word-id="${escapeHtml(word.id)}"
          >
            🗑 刪除
          </button>

        </div>

      </div>
    `;

    wordList.appendChild(div);

  });


  // ===============================
  // Learn Again
  // ===============================

  document
    .querySelectorAll(".learn-again-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const wordId =
            button.dataset.wordId;

          const selectedWord =
            words.find(
              word =>
                word.id === wordId
            );

          if (selectedWord) {

            showWordDetail(
              selectedWord
            );

          }

        }
      );

    });


  // ===============================
  // 刪除單字
  // ===============================

  document
    .querySelectorAll(".delete-word-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const wordId =
            button.dataset.wordId;

          const selectedWord =
            words.find(
              word =>
                word.id === wordId
            );

          if (!selectedWord) {
            return;
          }

          const confirmed =
            confirm(
              `確定要刪除「${selectedWord.word}」嗎？`
            );

          if (!confirmed) {
            return;
          }

          button.disabled = true;

          button.textContent =
            "刪除中...";

          const {
            error
          } = await supabaseClient
            .from("words")
            .delete()
            .eq("id", wordId)
            .eq(
              "user_id",
              (
                await supabaseClient.auth.getUser()
              ).data.user.id
            );

          if (error) {

            console.error(
              "刪除失敗：",
              error
            );

            alert(
              "刪除失敗，請稍後再試。"
            );

            button.disabled = false;

            button.textContent =
              "🗑 刪除";

            return;
          }

          await loadWords();

        }
      );

    });

}


// ===============================
// MyMemory 中文翻譯
// ===============================

async function translateWord(
  definitionEn,
  exampleEn
) {

  const {
    data,
    error
  } = await supabaseClient.functions.invoke(
    "translate-word",
    {
      body: {

        definition_en:
          definitionEn || "",

        example_en:
          exampleEn || ""

      }
    }
  );

  if (error) {

    console.error(
      "翻譯失敗：",
      error
    );

    return {

      chinese_meaning: "",

      example_zh: ""

    };

  }

  return {

    chinese_meaning:
      data?.chinese_meaning || "",

    example_zh:
      data?.example_zh || ""

  };

}


// ===============================
// Merriam-Webster 查詢
// ===============================

async function lookupWord(word) {

  const {
    data,
    error
  } = await supabaseClient.functions.invoke(
    "lookup-word",
    {
      body: {
        word
      }
    }
  );

  if (error) {

    console.error(
      "單字查詢失敗：",
      error
    );

    throw new Error(
      "單字資料查詢失敗。"
    );

  }

  if (
    !data ||
    data.error
  ) {

    throw new Error(
      data?.error ||
      "找不到這個單字。"
    );

  }

  return data;

}


// ===============================
// 新增單字
// ===============================

async function addWord() {

  const word =
    newWordInput.value.trim();

  if (!word) {

    addWordMessage.textContent =
      "請先輸入單字。";

    return;
  }

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) {

    showLogin();

    return;
  }

  addWordBtn.disabled = true;

  addWordMessage.textContent =
    "🔎 正在查詢單字...";

  try {

    // ===============================
    // 第一步：Merriam-Webster
    // ===============================

    const dictionaryData =
      await lookupWord(word);


    // ===============================
    // 第二步：MyMemory 中文翻譯
    // ===============================

    addWordMessage.textContent =
      "🌏 正在翻譯中文...";

    const translationData =
      await translateWord(
        dictionaryData.definition_en || "",
        dictionaryData.example_en || ""
      );


    // ===============================
    // 第三步：寫入資料庫
    // ===============================

    addWordMessage.textContent =
      "💾 正在儲存單字...";

    const {
      error
    } = await supabaseClient
      .from("words")
      .insert({

        word:
          dictionaryData.word || word,

        phonetic:
          dictionaryData.phonetic || null,

        part_of_speech:
          dictionaryData.part_of_speech || null,

        definition_en:
          dictionaryData.definition_en || null,

        example_en:
          dictionaryData.example_en || null,

        c
```
