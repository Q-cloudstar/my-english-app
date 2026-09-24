// ===============================
// Supabase 設定
// ===============================

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
// ===============================

const INTERNAL_AUTH_DOMAIN = "my-english-app.invalid";


// ===============================
// 帳號名稱轉成內部 Email
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
// 取得目前使用者 Profile
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

  const profile = await getProfile(user.id);

  if (profile) {

    userName.textContent =
      `👋 歡迎，${profile.username}`;

  } else {

    userName.textContent =
      "👋 歡迎回來！";

  }

  await loadWords();
}


// ===============================
// 建立新帳號
// ===============================

signupBtn.addEventListener("click", async () => {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;

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

  if (password.length < 6) {

    authMessage.textContent =
      "密碼至少需要 6 個字元";

    return;
  }

  authMessage.textContent =
    "正在建立帳號...";

  signupBtn.disabled = true;

  try {

    const internalEmail =
      usernameToInternalEmail(username);

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

    if (!data.session || !data.user) {

      authMessage.textContent =
        "帳號已建立，但目前無法自動登入。請確認 Supabase 沒有要求 Email 驗證。";

      return;
    }

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

    await showApp(data.user);

  } finally {

    signupBtn.disabled = false;

  }

});


// ===============================
// 登入
// ===============================

loginBtn.addEventListener("click", async () => {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;

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

  loginBtn.disabled = true;

  try {

    const internalEmail =
      usernameToInternalEmail(username);

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

  } finally {

    loginBtn.disabled = false;

  }

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

        <span>
          ${escapeHtml(word.word)}
        </span>

        <button
          id="speakWordBtn"
          class="detail-audio-btn"
          title="聽單字發音"
        >
          🔊
        </button>

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
            <div class="detail-section">

              <h3>🇹🇼 中文意思</h3>

              <div class="detail-text-with-audio">

                <p>
                  ${escapeHtml(word.chinese_meaning)}
                </p>

                <button
                  class="detail-audio-btn"
                  id="speakChineseMeaningBtn"
                  title="聽中文"
                >
                  🔊
                </button>

              </div>

            </div>
          `
          : ""
      }

      ${
        word.definition_en
          ? `
            <div class="detail-section">

              <h3>📖 English Definition</h3>

              <div class="detail-text-with-audio">

                <p>
                  ${escapeHtml(word.definition_en)}
                </p>

                <button
                  class="detail-audio-btn"
                  id="speakDefinitionBtn"
                  title="聽英文定義"
                >
                  🔊
                </button>

              </div>

            </div>
          `
          : ""
      }

      ${
        word.example_en
          ? `
            <div class="detail-section">

              <h3>💬 English Example</h3>

              <div class="detail-text-with-audio">

                <p>
                  ${escapeHtml(word.example_en)}
                </p>

                <button
                  class="detail-audio-btn"
                  id="speakExampleBtn"
                  title="聽英文例句"
                >
                  🔊
                </button>

              </div>

            </div>
          `
          : ""
      }

      ${
        word.example_zh
          ? `
            <div class="detail-section">

              <h3>🇹🇼 中文例句</h3>

              <div class="detail-text-with-audio">

                <p>
                  ${escapeHtml(word.example_zh)}
                </p>

                <button
                  class="detail-audio-btn"
                  id="speakExampleZhBtn"
                  title="聽中文例句"
                >
                  🔊
                </button>

              </div>

            </div>
          `
          : ""
      }

      ${
        word.audio_url
          ? `
            <button
              id="playNativeAudioBtn"
              class="speak-btn"
            >
              🔊 聽真人發音
            </button>
          `
          : ""
      }

      <button
        id="playAllBtn"
        class="speak-btn"
      >
        ▶️ 全部播放
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
  // 單字發音
  // ===============================

  document
    .getElementById("speakWordBtn")
    .addEventListener("click", () => {

      if (word.audio_url) {

        playNativeAudio(word.audio_url);

      } else {

        speakEnglish(word.word);

      }

    });


  // ===============================
  // 中文意思發音
  // ===============================

  const chineseMeaningBtn =
    document.getElementById(
      "speakChineseMeaningBtn"
    );

  if (chineseMeaningBtn) {

    chineseMeaningBtn.addEventListener(
      "click",
      () => {

        speakChinese(word.chinese_meaning);

      }
    );

  }


  // ===============================
  // 英文定義發音
  // ===============================

  const definitionBtn =
    document.getElementById(
      "speakDefinitionBtn"
    );

  if (definitionBtn) {

    definitionBtn.addEventListener(
      "click",
      () => {

        speakEnglish(word.definition_en);

      }
    );

  }


  // ===============================
  // 英文例句發音
  // ===============================

  const exampleBtn =
    document.getElementById(
      "speakExampleBtn"
    );

  if (exampleBtn) {

    exampleBtn.addEventListener(
      "click",
      () => {

        speakEnglish(word.example_en);

      }
    );

  }


  // ===============================
  // 中文例句發音
  // ===============================

  const exampleZhBtn =
    document.getElementById(
      "speakExampleZhBtn"
    );

  if (exampleZhBtn) {

    exampleZhBtn.addEventListener(
      "click",
      () => {

        speakChinese(word.example_zh);

      }
    );

  }


  // ===============================
  // 真人發音
  // ===============================

  const nativeAudioBtn =
    document.getElementById(
      "playNativeAudioBtn"
    );

  if (nativeAudioBtn) {

    nativeAudioBtn.addEventListener(
      "click",
      () => {

        playNativeAudio(word.audio_url);

      }
    );

  }


  // ===============================
  // 全部播放
  // ===============================

  document
    .getElementById("playAllBtn")
    .addEventListener(
      "click",
      async () => {

        await playAllWordContent(word);

      }
    );

}


// ===============================
// 英文語音
// ===============================

function speakEnglish(text) {

  if (!text) {
    return;
  }

  if (!("speechSynthesis" in window)) {

    alert("你的瀏覽器不支援語音播放");

    return;
  }

  window.speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(text);

  speech.lang = "en-US";
  speech.rate = 0.85;
  speech.pitch = 1;

  window.speechSynthesis.speak(speech);

}


// ===============================
// 中文語音
// ===============================

function speakChinese(text) {

  if (!text) {
    return;
  }

  if (!("speechSynthesis" in window)) {

    alert("你的瀏覽器不支援語音播放");

    return;
  }

  window.speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(text);

  speech.lang = "zh-TW";
  speech.rate = 0.85;
  speech.pitch = 1;

  window.speechSynthesis.speak(speech);

}


// ===============================
// 播放全部內容
// ===============================

async function playAllWordContent(word) {

  window.speechSynthesis.cancel();


  // 1. 單字
  if (word.audio_url) {

    await playNativeAudioAndWait(
      word.audio_url
    );

  } else {

    await speakEnglishAndWait(
      word.word
    );

  }


  // 2. 中文意思
  if (word.chinese_meaning) {

    await speakChineseAndWait(
      word.chinese_meaning
    );

  }


  // 3. 英文定義
  if (word.definition_en) {

    await speakEnglishAndWait(
      word.definition_en
    );

  }


  // 4. 英文例句
  if (word.example_en) {

    await speakEnglishAndWait(
      word.example_en
    );

  }


  // 5. 中文例句
  if (word.example_zh) {

    await speakChineseAndWait(
      word.example_zh
    );

  }

}


// ===============================
// 等待英文語音完成
// ===============================

function speakEnglishAndWait(text) {

  return new Promise(resolve => {

    if (!text) {

      resolve();
      return;

    }

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    speech.rate = 0.85;
    speech.pitch = 1;

    speech.onend = resolve;
    speech.onerror = resolve;

    window.speechSynthesis.speak(speech);

  });

}


// ===============================
// 等待中文語音完成
// ===============================

function speakChineseAndWait(text) {

  return new Promise(resolve => {

    if (!text) {

      resolve();
      return;

    }

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "zh-TW";
    speech.rate = 0.85;
    speech.pitch = 1;

    speech.onend = resolve;
    speech.onerror = resolve;

    window.speechSynthesis.speak(speech);

  });

}


// ===============================
// 等待真人發音完成
// ===============================

function playNativeAudioAndWait(audioUrl) {

  return new Promise(resolve => {

    if (!audioUrl) {

      resolve();
      return;

    }

    const audio =
      new Audio(audioUrl);

    audio.onended = resolve;
    audio.onerror = resolve;

    audio.play().catch(() => {

      resolve();

    });

  });

}


// ===============================
// 播放 Merriam-Webster 真人發音
// ===============================

function playNativeAudio(audioUrl) {

  if (!audioUrl) {
    return;
  }

  const audio =
    new Audio(audioUrl);

  audio.play().catch(error => {

    console.error(
      "真人發音播放失敗：",
      error
    );

  });

}


// ===============================
// 呼叫 lookup-word Edge Function
// ===============================

async function lookupWord(word) {

  const {
    data,
    error
  } = await supabaseClient.functions.invoke(
    "lookup-word",
    {
      body: {
        word: word
      }
    }
  );

  if (error) {

    console.error(
      "lookup-word 失敗：",
      error
    );

    throw new Error(
      "無法取得單字資料"
    );

  }

  if (!data || data.error) {

    throw new Error(
      data?.error ||
      "找不到這個單字或片語"
    );

  }

  return data;

}


// ===============================
// 呼叫 translate-word Edge Function
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
      "translate-word 失敗：",
      error
    );

    throw new Error(
      "中文翻譯失敗"
    );

  }


  if (!data || data.error) {

    throw new Error(
      data?.error ||
      "中文翻譯失敗"
    );

  }


  return data;

}


// ===============================
// 新增單字／片語
// ===============================

async function addWord() {

  const word =
    newWordInput.value.trim();

  if (!word) {

    addWordMessage.textContent =
      "請先輸入英文單字或片語";

    return;
  }


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


  addWordBtn.disabled = true;


  try {

    // ===============================
    // 第一步：查 Merriam-Webster
    // ===============================

    addWordMessage.textContent =
      "🔎 正在查詢單字資料...";

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
    // 第三步：儲存到 Supabase
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

        chinese_meaning:
          translationData.chinese_meaning || null,

        example_zh:
          translationData.example_zh || null,

        audio_url:
          dictionaryData.audio || null,

        user_id:
          user.id

      });


    if (error) {

      console.error(
        "Supabase 儲存錯誤：",
        error
      );

      throw new Error(
        "儲存失敗：" + error.message
      );

    }


    // ===============================
    // 成功
    // ===============================

    addWordMessage.textContent =
      `✅「${word}」新增成功！`;

    newWordInput.value = "";

    await loadWords();


  } catch (error) {

    console.error(error);

    addWordMessage.textContent =
      "❌ " + error.message;

  } finally {

    addWordBtn.disabled = false;

  }

}


// ===============================
// 新增單字按鈕
// ===============================

addWordBtn.addEventListener(
  "click",
  addWord
);


// ===============================
// Enter 新增單字／片語
// ===============================

newWordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

      addWord();

    }

  }
);


// ===============================
// 搜尋
// ===============================

searchBtn.addEventListener(
  "click",
  () => {

    const keyword =
      searchInput.value.trim();

    loadWords(keyword);

  }
);


// ===============================
// Enter 搜尋
// ===============================

searchInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

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