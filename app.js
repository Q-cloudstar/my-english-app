/* =========================================================
   Supabase 設定
========================================================= */

//
const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   使用者介面元素
========================================================= */

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authMessage = document.getElementById("authMessage");

const userName = document.getElementById("userName");

const newWordInput = document.getElementById("newWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const addWordMessage = document.getElementById("addWordMessage");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const wordList = document.getElementById("wordList");
const wordDetail = document.getElementById("wordDetail");


/* =========================================================
   Username → Supabase Internal Email
========================================================= */

const INTERNAL_AUTH_DOMAIN = "my-english-app.invalid";

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

  if (!/^[A-Za-z0-9_\-\u4e00-\u9fff]+$/.test(username)) {
    return "帳號只能使用中文、英文、數字、底線或連字號";
  }

  return "";
}


/* =========================================================
   UI
========================================================= */

function showAuth() {

  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");

  wordDetail.classList.add("hidden");
}

function showApp() {

  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  loadWords();
}


/* =========================================================
   訊息
========================================================= */

function setMessage(element, message, type = "") {

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

  const { data, error } =
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
        usernameToInternalEmail(username);

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
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
        await showCurrentUser(data.user);
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
        usernameToInternalEmail(username);

      const {
        data,
        error
      } =
        await supabaseClient.auth.signUp({
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

      await showCurrentUser(data.user);

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
    await supabaseClient.auth.getSession();

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

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {

      await showCurrentUser(
        session.user
      );
    }

    if (event === "SIGNED_OUT") {

      stopAllAudio();

      showAuth();
    }
  }
);


/* =========================================================
   載入我的單字
========================================================= */

async function loadWords(
  searchTerm = ""
) {

  const {
    data: {
      user
    }
  } =
    await supabaseClient.auth.getUser();

  if (!user) {
    return;
  }

  let query =
    supabaseClient
      .from("words")
      .select(`
        id,
        word,
        phonetic,
        part_of_speech,
        chinese_meaning,
        definition_en,
        example_en,
        example_zh,
        audio_url,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (searchTerm) {

    query =
      query.ilike(
        "word",
        `%${searchTerm}%`
      );
  }

  const {
    data,
    error
  } = await query;

  if (error) {

    console.error(
      "載入單字失敗：",
      error
    );

    wordList.innerHTML = `
      <div class="empty-state">
        載入單字失敗，請稍後再試。
      </div>
    `;

    return;
  }

  displayWords(data || []);
}


/* =========================================================
   顯示單字列表
========================================================= */

function displayWords(words) {

  if (!words.length) {

    wordList.innerHTML = `
      <div class="empty-state">
        目前還沒有找到單字。
      </div>
    `;

    return;
  }

  wordList.innerHTML =
    words.map(word => {

      const meaning =
        word.chinese_meaning ||
        "";

      return `
        <div class="word-item">

          <div class="word-main">

            <div class="word-title">
              ${escapeHtml(word.word)}
            </div>

            <div class="word-preview">
              ${escapeHtml(meaning)}
            </div>

          </div>

          <button
            class="learn-btn"
            data-word-id="${escapeHtml(word.id)}"
          >
            再學一次
          </button>

        </div>
      `;

    }).join("");

  document
    .querySelectorAll(".learn-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.wordId;

          openWordDetail(id);
        }
      );
    });
}


/* =========================================================
   搜尋
========================================================= */

searchBtn.addEventListener(
  "click",
  async () => {

    const keyword =
      searchInput.value.trim();

    stopAllAudio();

    await loadWords(keyword);
  }
);

searchInput.addEventListener(
  "keydown",
  async event => {

    if (event.key === "Enter") {

      const keyword =
        searchInput.value.trim();

      stopAllAudio();

      await loadWords(keyword);
    }
  }
);


/* =========================================================
   目前唯一的音訊控制
========================================================= */

let currentAudio = null;

let speechGeneration = 0;

let playAllGeneration = 0;


/* =========================================================
   停止所有聲音
========================================================= */

function stopAllAudio() {

  // 讓所有正在進行的播放流程失效
  playAllGeneration++;

  // 停止瀏覽器語音
  if (
    "speechSynthesis" in window
  ) {

    window.speechSynthesis.cancel();
  }

  // 停止目前 MP3
  if (currentAudio) {

    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (error) {
      console.error(error);
    }

    currentAudio = null;
  }

  speechGeneration++;
}


/* =========================================================
   瀏覽器語音
========================================================= */

function speakText(
  text,
  lang = "en-US"
) {

  if (!text) {
    return;
  }

  // 新語音開始前，先停止所有舊聲音
  stopAllAudio();

  const generation =
    speechGeneration;

  if (
    !("speechSynthesis" in window)
  ) {

    console.warn(
      "瀏覽器不支援語音播放"
    );

    return;
  }

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.lang = lang;

  utterance.rate = 0.9;
  utterance.pitch = 1;

  utterance.onend = () => {

    if (
      generation !== speechGeneration
    ) {
      return;
    }
  };

  utterance.onerror = () => {

    if (
      generation !== speechGeneration
    ) {
      return;
    }
  };

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   Merriam-Webster MP3
========================================================= */

function playAudioUrl(
  url,
  fallbackText = "",
  fallbackLang = "en-US"
) {

  if (!url) {

    speakText(
      fallbackText,
      fallbackLang
    );

    return;
  }

  // 新音檔開始前，停止所有舊聲音
  stopAllAudio();

  const audio =
    new Audio(url);

  currentAudio = audio;

  audio.addEventListener(
    "ended",
    () => {

      if (
        currentAudio === audio
      ) {
        currentAudio = null;
      }
    }
  );

  audio.addEventListener(
    "error",
    () => {

      if (
        currentAudio === audio
      ) {
        currentAudio = null;
      }

      if (fallbackText) {

        speakText(
          fallbackText,
          fallbackLang
        );
      }
    }
  );

  audio.play().catch(error => {

    console.error(
      "音檔播放失敗：",
      error
    );

    if (
      currentAudio === audio
    ) {
      currentAudio = null;
    }

    if (fallbackText) {

      speakText(
        fallbackText,
        fallbackLang
      );
    }
  });
}


/* =========================================================
   播放單字
========================================================= */

function playWord(word) {

  playAudioUrl(
    word.audio_url,
    word.word,
    "en-US"
  );
}


/* =========================================================
   播放中文
========================================================= */

function playChinese(text) {

  speakText(
    text,
    "zh-TW"
  );
}


/* =========================================================
   播放英文
========================================================= */

function playEnglish(text) {

  speakText(
    text,
    "en-US"
  );
}


/* =========================================================
   播放全部
========================================================= */

async function playAll(word) {

  // 開始新的播放全部流程
  stopAllAudio();

  const generation =
    playAllGeneration;

  /*
   * 每個步驟都使用獨立的 Promise。
   * 任何其他喇叭被按下後，
   * stopAllAudio() 會讓這個流程失效。
   */

  if (
    word.audio_url
  ) {

    const audio =
      new Audio(word.audio_url);

    currentAudio = audio;

    await new Promise(resolve => {

      let finished = false;

      const finish = () => {

        if (finished) {
          return;
        }

        finished = true;

        if (
          currentAudio === audio
        ) {
          currentAudio = null;
        }

        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish;

      audio.play().catch(finish);
    });

  } else {

    await speakAndWait(
      word.word,
      "en-US",
      generation
    );
  }

  if (
    generation !== playAllGeneration
  ) {
    return;
  }

  if (word.chinese_meaning) {

    await speakAndWait(
      word.chinese_meaning,
      "zh-TW",
      generation
    );
  }

  if (
    generation !== playAllGeneration
  ) {
    return;
  }

  if (word.definition_en) {

    await speakAndWait(
      word.definition_en,
      "en-US",
      generation
    );
  }

  if (
    generation !== playAllGeneration
  ) {
    return;
  }

  if (word.example_en) {

    await speakAndWait(
      word.example_en,
      "en-US",
      generation
    );
  }

  if (
    generation !== playAllGeneration
  ) {
    return;
  }

  if (word.example_zh) {

    await speakAndWait(
      word.example_zh,
      "zh-TW",
      generation
    );
  }
}


/* =========================================================
   播放並等待語音結束
========================================================= */

function speakAndWait(
  text,
  lang,
  generation
) {

  return new Promise(resolve => {

    if (
      generation !== playAllGeneration
    ) {
      resolve();
      return;
    }

    if (
      !("speechSynthesis" in window)
    ) {
      resolve();
      return;
    }

    // 這裡不能使用 stopAllAudio()
    // 因為它會讓 playAll 自己失效。
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = () => {
      resolve();
    };

    window.speechSynthesis.speak(
      utterance
    );
  });
}


/* =========================================================
   查詢字典
========================================================= */

async function lookupWord(
  word
) {

  const {
    data,
    error
  } =
    await supabaseClient.functions.invoke(
      "lookup-word",
      {
        body: {
          word
        }
      }
    );

  if (error) {

    console.error(
      "字典查詢失敗：",
      error
    );

    throw error;
  }

  if (
    data?.error
  ) {

    throw new Error(
      data.error
    );
  }

  return data;
}


/* =========================================================
   新增單字
========================================================= */

addWordBtn.addEventListener(
  "click",
  addWord
);

newWordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      addWord();
    }
  }
);


async function addWord() {

  const word =
    newWordInput.value.trim();

  if (!word) {

    setMessage(
      addWordMessage,
      "請輸入英文單字或片語。",
      "error"
    );

    return;
  }

  addWordBtn.disabled = true;

  setMessage(
    addWordMessage,
    "正在查詢英漢字典..."
  );

  try {

    const {
      data: {
        user
      }
    } =
      await supabaseClient.auth.getUser();

    if (!user) {

      setMessage(
        addWordMessage,
        "請先登入。",
        "error"
      );

      return;
    }


    /* =========================
       查詢 TOEIC + M-W
    ========================== */

    const dictionary =
      await lookupWord(word);


    /* =========================
       避免重複
    ========================== */

    const {
      data: existing,
      error: existingError
    } =
      await supabaseClient
        .from("words")
        .select("id")
        .eq("user_id", user.id)
        .ilike("word", word)
        .limit(1)
        .maybeSingle();

    if (existingError) {

      console.error(
        existingError
      );
    }

    if (existing) {

      setMessage(
        addWordMessage,
        "這個單字已經在你的字庫裡了。",
        "error"
      );

      return;
    }


    /* =========================
       寫入自己的 words
    ========================== */

    const {
      error: insertError
    } =
      await supabaseClient
        .from("words")
        .insert({

          user_id: user.id,

          word:
            dictionary.word ||
            word,

          phonetic:
            dictionary.phonetic ||
            "",

          part_of_speech:
            dictionary.part_of_speech ||
            "",

          chinese_meaning:
            dictionary.chinese_meaning ||
            "",

          definition_en:
            dictionary.definition_en ||
            "",

          example_en:
            dictionary.example_en ||
            "",

          example_zh:
            dictionary.example_zh ||
            "",

          audio_url:
            dictionary.audio ||
            ""
        });

    if (insertError) {

      console.error(
        "新增單字失敗：",
        insertError
      );

      throw insertError;
    }


    newWordInput.value = "";

    setMessage(
      addWordMessage,
      "加入成功！",
      "success"
    );

    await loadWords();

  } catch (error) {

    console.error(error);

    setMessage(
      addWordMessage,
      `加入失敗：${error.message || "無法取得字典資料"}`,
      "error"
    );

  } finally {

    addWordBtn.disabled = false;
  }
}


/* =========================================================
   開啟單字詳細頁
========================================================= */

async function openWordDetail(
  wordId
) {

  stopAllAudio();

  const {
    data: {
      user
    }
  } =
    await supabaseClient.auth.getUser();

  if (!user) {
    return;
  }

  const {
    data: word,
    error
  } =
    await supabaseClient
      .from("words")
      .select(`
        id,
        word,
        phonetic,
        part_of_speech,
        chinese_meaning,
        definition_en,
        example_en,
        example_zh,
        audio_url
      `)
      .eq("id", wordId)
      .eq("user_id", user.id)
      .single();

  if (error) {

    console.error(
      "取得單字詳細資料失敗：",
      error
    );

    return;
  }

  renderWordDetail(word);
}


/* =========================================================
   顯示單字詳細頁
========================================================= */

function renderWordDetail(word) {

  wordList.parentElement.classList.add(
    "hidden"
  );

  wordDetail.classList.remove(
    "hidden"
  );

  wordDetail.innerHTML = `

    <div class="detail-header">

      <div>

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
              <div class="detail-pos">
                ${escapeHtml(word.part_of_speech)}
              </div>
            `
            : ""
        }

      </div>

      <button
        id="backToWordsBtn"
        class="back-btn"
      >
        ← 回到我的單字
      </button>

    </div>


    <div class="detail-block">

      <div class="detail-label">
        英文單字
      </div>

      <div class="detail-text">

        ${escapeHtml(word.word)}

        <button
          id="wordAudioBtn"
          class="audio-btn"
          title="播放單字發音"
        >
          🔊 聽發音
        </button>

      </div>

    </div>


    ${
      word.chinese_meaning
        ? `
          <div class="detail-block">

            <div class="detail-label">
              中文詞義
            </div>

            <div class="detail-text">

              ${escapeHtml(
                word.chinese_meaning
              )}

              <button
                id="meaningAudioBtn"
                class="audio-btn"
                title="播放中文詞義"
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
          <div class="detail-block">

            <div class="detail-label">
              English Definition
            </div>

            <div class="detail-text">

              ${escapeHtml(
                word.definition_en
              )}

              <button
                id="definitionAudioBtn"
                class="audio-btn"
                title="播放英文定義"
              >
                🔊
              </button>

            </div>

          </div>
        `
        : ""
    }


    <div class="detail-block notes-block">

      <div class="detail-label">
        📝 我的英文筆記
      </div>

      <textarea
        id="englishNotesInput"
        class="notes-input"
        placeholder="可以輸入自己的英文例句、單字用法或學習筆記..."
      >${escapeHtml(word.notes || "")}</textarea>

      <div class="notes-actions">

        <button
          id="englishNotesAudioBtn"
          class="audio-btn"
          type="button"
        >
          🔊 聽英文
        </button>

      </div>

    </div>


    <div class="detail-block notes-block">

      <div class="detail-label">
        📝 我的繁體中文筆記
      </div>

      <textarea
        id="chineseNotesInput"
        class="notes-input"
        placeholder="可以輸入中文解釋、聯想、學習心得..."
      ></textarea>

      <div class="notes-actions">

        <button
          id="chineseNotesAudioBtn"
          class="audio-btn"
          type="button"
        >
          🔊 聽中文
        </button>

      </div>

    </div>


    <button
      id="saveNotesBtn"
      class="play-all-btn"
      type="button"
    >
      💾 儲存我的筆記
    </button>

    <div
      id="notesMessage"
      class="notes-message"
    ></div>


    <button
      id="playAllBtn"
      class="play-all-btn"
      type="button"
    >
      ▶️ 播放全部
    </button>

    <br>

    <button
      id="deleteWordBtn"
      class="delete-btn"
      type="button"
    >
      🗑 刪除這個單字
    </button>

  `;


  const englishNotesInput =
    document.getElementById(
      "englishNotesInput"
    );

  const chineseNotesInput =
    document.getElementById(
      "chineseNotesInput"
    );

  const saveNotesBtn =
    document.getElementById(
      "saveNotesBtn"
    );

  const notesMessage =
    document.getElementById(
      "notesMessage"
    );


  const existingNotes =
    word.notes || "";

  const noteSeparator =
    "\n\n--- 中文筆記 ---\n\n";

  if (existingNotes.includes(noteSeparator)) {

    const parts =
      existingNotes.split(
        noteSeparator
      );

    englishNotesInput.value =
      parts[0] || "";

    chineseNotesInput.value =
      parts.slice(1).join(
        noteSeparator
      ) || "";

  } else {

    englishNotesInput.value =
      existingNotes;

    chineseNotesInput.value =
      "";

  }


  document
    .getElementById("backToWordsBtn")
    .addEventListener(
      "click",
      () => {

        stopAllAudio();

        wordDetail.classList.add(
          "hidden"
        );

        wordList.parentElement.classList.remove(
          "hidden"
        );

      }
    );


  const wordAudioBtn =
    document.getElementById(
      "wordAudioBtn"
    );

  if (wordAudioBtn) {

    wordAudioBtn.addEventListener(
      "click",
      () => {

        playWord(word);

      }
    );

  }


  const meaningAudioBtn =
    document.getElementById(
      "meaningAudioBtn"
    );

  if (meaningAudioBtn) {

    meaningAudioBtn.addEventListener(
      "click",
      () => {

        playChinese(
          word.chinese_meaning
        );

      }
    );

  }


  const definitionAudioBtn =
    document.getElementById(
      "definitionAudioBtn"
    );

  if (definitionAudioBtn) {

    definitionAudioBtn.addEventListener(
      "click",
      () => {

        playEnglish(
          word.definition_en
        );

      }
    );

  }


  const englishNotesAudioBtn =
    document.getElementById(
      "englishNotesAudioBtn"
    );

  englishNotesAudioBtn.addEventListener(
    "click",
    () => {

      const text =
        englishNotesInput.value.trim();

      if (!text) {
        return;
      }

      playEnglish(text);

    }
  );


  const chineseNotesAudioBtn =
    document.getElementById(
      "chineseNotesAudioBtn"
    );

  chineseNotesAudioBtn.addEventListener(
    "click",
    () => {

      const text =
        chineseNotesInput.value.trim();

      if (!text) {
        return;
      }

      playChinese(text);

    }
  );


  saveNotesBtn.addEventListener(
    "click",
    async () => {

      stopAllAudio();

      const englishNotes =
        englishNotesInput.value.trim();

      const chineseNotes =
        chineseNotesInput.value.trim();

      let notes = "";

      if (englishNotes) {

        notes =
          englishNotes;

      }

      if (chineseNotes) {

        if (notes) {

          notes +=
            noteSeparator;

        }

        notes +=
          chineseNotes;

      }

      saveNotesBtn.disabled =
        true;

      setMessage(
        notesMessage,
        "儲存中..."
      );

      try {

        const {
          data: {
            user
          }
        } =
          await supabaseClient.auth.getUser();

        if (!user) {

          setMessage(
            notesMessage,
            "請先登入。",
            "error"
          );

          return;
        }


        const {
          error
        } =
          await supabaseClient
            .from("words")
            .update({
              notes: notes
            })
            .eq("id", word.id)
            .eq("user_id", user.id);


        if (error) {

          console.error(
            "儲存筆記失敗：",
            error
          );

          setMessage(
            notesMessage,
            "儲存失敗，請稍後再試。",
            "error"
          );

          return;
        }


        word.notes =
          notes;

        setMessage(
          notesMessage,
          "筆記已儲存！",
          "success"
        );

      } catch (error) {

        console.error(error);

        setMessage(
          notesMessage,
          "儲存失敗，請稍後再試。",
          "error"
        );

      } finally {

        saveNotesBtn.disabled =
          false;

      }

    }
  );


  const playAllBtn =
    document.getElementById(
      "playAllBtn"
    );

  playAllBtn.addEventListener(
    "click",
    () => {

      const updatedWord = {
        ...word,
        notes:
          englishNotesInput.value.trim()
      };

      playAll(updatedWord);

    }
  );


  const deleteWordBtn =
    document.getElementById(
      "deleteWordBtn"
    );

  deleteWordBtn.addEventListener(
    "click",
    async () => {

      const confirmed =
        window.confirm(
          `確定要刪除「${word.word}」嗎？`
        );

      if (!confirmed) {
        return;
      }

      stopAllAudio();

      const {
        error
      } =
        await supabaseClient
          .from("words")
          .delete()
          .eq("id", word.id)
          .eq("user_id", word.user_id);

      if (error) {

        console.error(error);

        alert(
          "刪除失敗，請稍後再試。"
        );

        return;
      }

      wordDetail.classList.add(
        "hidden"
      );

      wordList.parentElement.classList.remove(
        "hidden"
      );

      await loadWords();

    }
  );

}
/* =========================================================
   複習測驗 V1
========================================================= */

let quizWords = [];
let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizWrongAnswers = [];
let quizRecognition = null;
let quizListening = false;


/* =========================================================
   建立複習測驗按鈕與區域
========================================================= */

function createQuizUI() {

  if (document.getElementById("quizEntryBtn")) {
    return;
  }

  const quizEntry = document.createElement("div");

  quizEntry.id = "quizEntryArea";

  quizEntry.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    margin: 24px 0;
    text-align: center;
  `;

  quizEntry.innerHTML = `
    <button
      id="quizEntryBtn"
      type="button"
      style="
        width: 100%;
        max-width: 520px;
        min-height: 64px;
        padding: 14px 20px;
        border: none;
        border-radius: 14px;
        background: #6b8afd;
        color: white;
        font-size: 20px;
        font-weight: 700;
        cursor: pointer;
        box-sizing: border-box;
      "
    >
      📚 開始複習測驗
    </button>
  `;

  appSection.insertBefore(
    quizEntry,
    appSection.firstChild
  );

  document
    .getElementById("quizEntryBtn")
    .addEventListener(
      "click",
      startQuiz
    );
}


/* =========================================================
   建立測驗區域
========================================================= */

function createQuizSection() {

  let section =
    document.getElementById("quizSection");

  if (section) {
    return section;
  }

  section = document.createElement("div");

  section.id = "quizSection";

  section.style.cssText = `
    width: 100%;
    max-width: 760px;
    margin: 20px auto;
    box-sizing: border-box;
  `;

  appSection.appendChild(section);

  return section;
}


/* =========================================================
   隱藏 / 顯示單字區域
========================================================= */

function hideNormalAppForQuiz() {

  const wordContainer =
    wordList?.parentElement;

  if (wordContainer) {
    wordContainer.classList.add("hidden");
  }

  wordDetail.classList.add("hidden");

  const quizEntry =
    document.getElementById("quizEntryArea");

  if (quizEntry) {
    quizEntry.classList.add("hidden");
  }
}


function showNormalAppAfterQuiz() {

  const wordContainer =
    wordList?.parentElement;

  if (wordContainer) {
    wordContainer.classList.remove("hidden");
  }

  wordDetail.classList.add("hidden");

  const quizEntry =
    document.getElementById("quizEntryArea");

  if (quizEntry) {
    quizEntry.classList.remove("hidden");
  }

  const quizSection =
    document.getElementById("quizSection");

  if (quizSection) {
    quizSection.classList.add("hidden");
  }
}


/* =========================================================
   取得目前使用者的單字
========================================================= */

async function getQuizWords() {

  const {
    data: {
      user
    }
  } =
    await supabaseClient.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("words")
      .select(`
        id,
        word,
        chinese_meaning,
        definition_en,
        audio_url
      `)
      .eq(
        "user_id",
        user.id
      );

  if (error) {

    console.error(
      "取得複習單字失敗：",
      error
    );

    return [];
  }

  return data || [];
}


/* =========================================================
   隨機排序
========================================================= */

function shuffleArray(array) {

  const result =
    [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      result[i],
      result[j]
    ] =
    [
      result[j],
      result[i]
    ];
  }

  return result;
}


/* =========================================================
   正規化答案
========================================================= */

function normalizeQuizAnswer(text) {

  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


/* =========================================================
   建立題目
========================================================= */

function buildQuizQuestions(words) {

  const usableWords =
    words.filter(word =>
      word.word &&
      word.chinese_meaning
    );

  if (usableWords.length < 4) {
    return [];
  }

  const shuffledWords =
    shuffleArray(usableWords);

  const questions = [];

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    const word =
      shuffledWords[
        i % shuffledWords.length
      ];

    const questionTypes = [
      "enToZh",
      "zhToEn",
      "listen"
    ];

    const type =
      questionTypes[
        i % questionTypes.length
      ];

    let options = [];

    if (type === "enToZh") {

      const others =
        shuffleArray(
          usableWords.filter(
            item =>
              item.id !== word.id
          )
        );

      options = [
        word.chinese_meaning,
        ...others
          .slice(0, 3)
          .map(
            item =>
              item.chinese_meaning
          )
      ];

    } else {

      const others =
        shuffleArray(
          usableWords.filter(
            item =>
              item.id !== word.id
          )
        );

      options = [
        word.word,
        ...others
          .slice(0, 3)
          .map(
            item =>
              item.word
          )
      ];
    }

    options =
      shuffleArray(
        [...new Set(options)]
      );

    if (options.length < 4) {
      continue;
    }

    questions.push({
      word,
      type,
      options
    });
  }

  return questions;
}


/* =========================================================
   開始測驗
========================================================= */

async function startQuiz() {

  stopAllAudio();
  stopQuizRecognition();

  const words =
    await getQuizWords();

  if (words.length < 4) {

    alert(
      "至少需要 4 個單字才能開始複習測驗。"
    );

    return;
  }

  quizWords =
    words;

  quizQuestions =
    buildQuizQuestions(words);

  if (quizQuestions.length < 10) {

    alert(
      "目前的單字資料不足以建立完整的 10 題測驗，請再加入一些單字。"
    );

    return;
  }

  quizCurrentIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  quizWrongAnswers = [];

  hideNormalAppForQuiz();

  const section =
    createQuizSection();

  section.classList.remove("hidden");

  renderQuizQuestion();
}


/* =========================================================
   顯示題目
========================================================= */

function renderQuizQuestion() {

  stopAllAudio();
  stopQuizRecognition();

  quizAnswered = false;

  const section =
    document.getElementById(
      "quizSection"
    );

  if (!section) {
    return;
  }

  const question =
    quizQuestions[
      quizCurrentIndex
    ];

  const questionNumber =
    quizCurrentIndex + 1;

  let questionTitle = "";

  let questionSubtext = "";

  if (
    question.type ===
    "enToZh"
  ) {

    questionTitle =
      `「${escapeHtml(
        question.word.word
      )}」的中文意思是？`;

    questionSubtext =
      "選出正確的中文意思。";

  } else if (
    question.type ===
    "zhToEn"
  ) {

    questionTitle =
      `「${escapeHtml(
        question.word.chinese_meaning
      )}」的英文是？`;

    questionSubtext =
      "選出正確的英文單字。";

  } else {

    questionTitle =
      "🔊 聽發音，選出正確的單字";

    questionSubtext =
      "請先聽一次，再選擇答案。";
  }

  section.innerHTML = `

    <div
      style="
        width:100%;
        box-sizing:border-box;
        padding:20px;
        border-radius:18px;
        background:#fff;
        box-shadow:0 3px 14px rgba(0,0,0,0.08);
      "
    >

      <div
        style="
          font-size:16px;
          font-weight:700;
          margin-bottom:14px;
          color:#666;
          text-align:center;
        "
      >
        第 ${questionNumber} / 10 題
      </div>


      <div
        style="
          font-size:24px;
          line-height:1.5;
          font-weight:700;
          text-align:center;
          margin:18px 0 8px;
        "
      >
        ${questionTitle}
      </div>


      <div
        style="
          font-size:15px;
          color:#777;
          text-align:center;
          margin-bottom:22px;
        "
      >
        ${questionSubtext}
      </div>


      ${
        question.type === "listen"
          ? `
            <button
              id="quizListenBtn"
              type="button"
              style="
                display:block;
                width:100%;
                min-height:58px;
                margin:0 auto 20px;
                border:1px solid #ccc;
                border-radius:12px;
                background:#f7f7f7;
                font-size:18px;
                cursor:pointer;
              "
            >
              🔊 先聽一次
            </button>
          `
          : ""
      }


      <div
        id="quizOptions"
        style="
          display:flex;
          flex-direction:column;
          gap:12px;
        "
      >

        ${question.options.map(
          (option, index) => `
            <button
              type="button"
              class="quiz-option-btn"
              data-option-index="${index}"
              style="
                width:100%;
                min-height:64px;
                padding:12px 16px;
                border:2px solid #ddd;
                border-radius:14px;
                background:#fff;
                color:#333;
                font-size:18px;
                line-height:1.4;
                cursor:pointer;
                box-sizing:border-box;
              "
            >
              ${escapeHtml(option)}
            </button>
          `
        ).join("")}

      </div>


      <div
        id="quizResult"
        style="
          margin-top:18px;
          min-height:30px;
          text-align:center;
          font-size:18px;
          font-weight:700;
        "
      ></div>


      <div
        id="quizFollowAlong"
        style="
          display:none;
          margin-top:20px;
          padding:18px;
          border-radius:14px;
          background:#f7f9ff;
          border:1px solid #dfe5ff;
        "
      ></div>


      <button
        id="quizNextBtn"
        type="button"
        disabled
        style="
          display:block;
          width:100%;
          min-height:62px;
          margin-top:20px;
          border:none;
          border-radius:14px;
          background:#aaa;
          color:white;
          font-size:20px;
          font-weight:700;
          cursor:not-allowed;
        "
      >
        ${
          questionNumber === 10
            ? "完成測驗 🎉"
            : "下一題 →"
        }
      </button>

    </div>
  `;


  /* =========================
     選項按鈕
  ========================== */

  document
    .querySelectorAll(
      ".quiz-option-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (quizAnswered) {
            return;
          }

          const index =
            Number(
              button.dataset.optionIndex
            );

          answerQuiz(index);
        }
      );
    });


  /* =========================
     聽一次
  ========================== */

  const listenBtn =
    document.getElementById(
      "quizListenBtn"
    );

  if (listenBtn) {

    listenBtn.addEventListener(
      "click",
      () => {

        playWord(
          question.word
        );
      }
    );
  }


  /* =========================
     下一題
  ========================== */

  document
    .getElementById(
      "quizNextBtn"
    )
    .addEventListener(
      "click",
      () => {

        if (!quizAnswered) {
          return;
        }

        if (
          quizCurrentIndex >=
          quizQuestions.length - 1
        ) {

          finishQuiz();

        } else {

          quizCurrentIndex++;

          renderQuizQuestion();
        }
      }
    );


  /* =========================
     聽力題自動播放
  ========================== */

  if (
    question.type === "listen"
  ) {

    setTimeout(
      () => {

        if (!quizAnswered) {
          playWord(
            question.word
          );
        }

      },
      350
    );
  }
}


/* =========================================================
   回答題目
========================================================= */

function answerQuiz(
  selectedIndex
) {

  if (quizAnswered) {
    return;
  }

  quizAnswered = true;

  stopAllAudio();

  const question =
    quizQuestions[
      quizCurrentIndex
    ];

  const selectedAnswer =
    question.options[
      selectedIndex
    ];

  const correctAnswer =
    question.type === "enToZh"
      ? question.word.chinese_meaning
      : question.word.word;

  const isCorrect =
    normalizeQuizAnswer(
      selectedAnswer
    ) ===
    normalizeQuizAnswer(
      correctAnswer
    );

  const optionButtons =
    document.querySelectorAll(
      ".quiz-option-btn"
    );

  optionButtons.forEach(
    button => {

      button.disabled = true;

      button.style.cursor =
        "default";

      const index =
        Number(
          button.dataset.optionIndex
        );

      const answer =
        question.options[index];

      if (
        normalizeQuizAnswer(
          answer
        ) ===
        normalizeQuizAnswer(
          correctAnswer
        )
      ) {

        button.style.border =
          "3px solid #55a868";

        button.style.background =
          "#eef9f0";

      } else if (
        index === selectedIndex &&
        !isCorrect
      ) {

        button.style.border =
          "3px solid #d9534f";

        button.style.background =
          "#fff0f0";
      }
    }
  );


  const result =
    document.getElementById(
      "quizResult"
    );

  if (isCorrect) {

    quizScore++;

    result.innerHTML =
      `
        <span style="color:#3f9148;">
          ✅ 答對了！
        </span>
      `;

  } else {

    quizWrongAnswers.push({
      word:
        question.word,
      question:
        question.type,
      userAnswer:
        selectedAnswer,
      correctAnswer
    });

    result.innerHTML =
      `
        <span style="color:#d9534f;">
          ❌ 答錯了
        </span>
        <div
          style="
            margin-top:8px;
            font-size:16px;
            color:#555;
            font-weight:400;
          "
        >
          正確答案：
          <strong>
            ${escapeHtml(
              correctAnswer
            )}
          </strong>
        </div>
      `;
  }


  showQuizFollowAlong(
    question.word
  );


  const nextBtn =
    document.getElementById(
      "quizNextBtn"
    );

  nextBtn.disabled = false;

  nextBtn.style.background =
    "#6b8afd";

  nextBtn.style.cursor =
    "pointer";
}


/* =========================================================
   跟讀功能
========================================================= */

function getSpeechRecognitionConstructor() {

  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null
  );
}


function isSpeechRecognitionSupported() {

  return !!getSpeechRecognitionConstructor();
}


/* =========================================================
   顯示跟讀區
========================================================= */

function showQuizFollowAlong(
  word
) {

  const container =
    document.getElementById(
      "quizFollowAlong"
    );

  if (!container) {
    return;
  }

  container.style.display =
    "block";

  const supported =
    isSpeechRecognitionSupported();

  if (!supported) {

    container.innerHTML = `

      <div
        style="
          font-size:20px;
          font-weight:700;
          text-align:center;
          margin-bottom:8px;
        "
      >
        🎤 跟讀練習
      </div>

      <div
        style="
          text-align:center;
          color:#666;
          line-height:1.6;
          margin-bottom:16px;
        "
      >
        這個裝置目前不支援語音跟讀。
        <br>
        可以直接進入下一題。
      </div>

      <button
        id="quizFollowListenBtn"
        type="button"
        style="
          display:block;
          width:100%;
          min-height:54px;
          border:1px solid #ccc;
          border-radius:12px;
          background:#fff;
          font-size:17px;
          cursor:pointer;
        "
      >
        🔊 先聽一次
      </button>
    `;

    document
      .getElementById(
        "quizFollowListenBtn"
      )
      .addEventListener(
        "click",
        () => {

          playWord(word);

        }
      );

    return;
  }


  container.innerHTML = `

    <div
      style="
        font-size:20px;
        font-weight:700;
        text-align:center;
        margin-bottom:12px;
      "
    >
      🎤 跟讀練習
    </div>


    <div
      style="
        text-align:center;
        font-size:18px;
        margin-bottom:16px;
      "
    >
      請跟著念：
      <strong>
        ${escapeHtml(
          word.word
        )}
      </strong>
    </div>


    <button
      id="quizFollowListenBtn"
      type="button"
      style="
        display:block;
        width:100%;
        min-height:54px;
        margin-bottom:10px;
        border:1px solid #ccc;
        border-radius:12px;
        background:#fff;
        font-size:17px;
        cursor:pointer;
      "
    >
      🔊 先聽一次
    </button>


    <button
      id="quizFollowStartBtn"
      type="button"
      style="
        display:block;
        width:100%;
        min-height:58px;
        border:none;
        border-radius:12px;
        background:#6b8afd;
        color:white;
        font-size:18px;
        font-weight:700;
        cursor:pointer;
      "
    >
      🎤 開始跟讀
    </button>


    <div
      id="quizFollowStatus"
      style="
        margin-top:14px;
        min-height:28px;
        text-align:center;
        font-size:16px;
        line-height:1.5;
      "
    ></div>


    <div
      id="quizRecognizedText"
      style="
        margin-top:10px;
        padding:12px;
        min-height:24px;
        border-radius:10px;
        background:#fff;
        text-align:center;
        color:#555;
        word-break:break-word;
      "
    ></div>
  `;


  document
    .getElementById(
      "quizFollowListenBtn"
    )
    .addEventListener(
      "click",
      () => {

        playWord(word);

      }
    );


  document
    .getElementById(
      "quizFollowStartBtn"
    )
    .addEventListener(
      "click",
      () => {

        startQuizFollowAlong(
          word
        );

      }
    );
}


/* =========================================================
   開始跟讀
========================================================= */

function startQuizFollowAlong(
  word
) {

  stopAllAudio();
  stopQuizRecognition();

  const Recognition =
    getSpeechRecognitionConstructor();

  if (!Recognition) {

    showQuizFollowAlong(
      word
    );

    return;
  }

  quizListening = true;

  const recognition =
    new Recognition();

  quizRecognition =
    recognition;

  recognition.lang =
    "en-US";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  recognition.maxAlternatives =
    1;


  const status =
    document.getElementById(
      "quizFollowStatus"
    );

  const recognized =
    document.getElementById(
      "quizRecognizedText"
    );

  const startBtn =
    document.getElementById(
      "quizFollowStartBtn"
    );


  if (status) {

    status.textContent =
      "🎤 請開始念...";
  }


  if (recognized) {

    recognized.textContent =
      "";
  }


  if (startBtn) {

    startBtn.disabled =
      true;

    startBtn.textContent =
      "🎤 聆聽中...";
  }


  recognition.onresult =
    event => {

      const text =
        event.results?.[0]?.[0]?.transcript ||
        "";

      if (recognized) {

        recognized.textContent =
          `你說的是：「${text}」`;
      }


      const expected =
        normalizeQuizAnswer(
          word.word
        );

      const actual =
        normalizeQuizAnswer(
          text
        );


      const success =
        actual === expected ||
        actual.includes(expected) ||
        expected.includes(actual);


      if (status) {

        if (success) {

          status.innerHTML =
            `
              <span style="color:#3f9148;font-weight:700;">
                🎉 跟讀成功！
              </span>
            `;

        } else {

          status.innerHTML =
            `
              <span style="color:#d9534f;font-weight:700;">
                ❌ 沒有辨識成正確單字，可以再試一次。
              </span>
            `;
        }
      }


      if (startBtn) {

        startBtn.disabled =
          false;

        startBtn.textContent =
          "🎤 再跟讀一次";
      }
    };


  recognition.onerror =
    event => {

      console.warn(
        "語音辨識錯誤：",
        event.error
      );


      if (status) {

        if (
          event.error ===
          "not-allowed"
        ) {

          status.innerHTML =
            `
              <span style="color:#d9534f;">
                麥克風權限被拒絕，仍然可以按下一題。
              </span>
            `;

        } else if (
          event.error ===
          "no-speech"
        ) {

          status.innerHTML =
            `
              <span style="color:#d9534f;">
                沒有聽到聲音，可以再試一次。
              </span>
            `;

        } else {

          status.innerHTML =
            `
              <span style="color:#d9534f;">
                語音跟讀暫時無法使用，可以再試一次。
              </span>
            `;
        }
      }


      if (startBtn) {

        startBtn.disabled =
          false;

        startBtn.textContent =
          "🎤 再跟讀一次";
      }

      quizListening =
        false;

      quizRecognition =
        null;
    };


  recognition.onend =
    () => {

      quizListening =
        false;

      quizRecognition =
        null;

      if (startBtn) {

        startBtn.disabled =
          false;

        if (
          startBtn.textContent ===
          "🎤 聆聽中..."
        ) {

          startBtn.textContent =
            "🎤 再跟讀一次";
        }
      }
    };


  try {

    recognition.start();

  } catch (error) {

    console.error(
      "開始跟讀失敗：",
      error
    );

    quizListening =
      false;

    quizRecognition =
      null;

    if (status) {

      status.textContent =
        "語音跟讀暫時無法開始，可以再試一次。";
    }

    if (startBtn) {

      startBtn.disabled =
        false;

      startBtn.textContent =
        "🎤 再跟讀一次";
    }
  }
}


/* =========================================================
   停止跟讀
========================================================= */

function stopQuizRecognition() {

  if (quizRecognition) {

    try {

      quizRecognition.onresult =
        null;

      quizRecognition.onerror =
        null;

      quizRecognition.onend =
        null;

      quizRecognition.stop();

    } catch (error) {

      console.warn(
        "停止語音辨識：",
        error
      );
    }
  }

  quizRecognition =
    null;

  quizListening =
    false;
}


/* =========================================================
   測驗完成
========================================================= */

function finishQuiz() {

  stopAllAudio();
  stopQuizRecognition();

  const section =
    document.getElementById(
      "quizSection"
    );

  if (!section) {
    return;
  }

  const percentage =
    Math.round(
      quizScore / 10 * 100
    );


  section.innerHTML = `

    <div
      style="
        width:100%;
        box-sizing:border-box;
        padding:30px 20px;
        border-radius:18px;
        background:#fff;
        box-shadow:0 3px 14px rgba(0,0,0,0.08);
        text-align:center;
      "
    >

      <div
        style="
          font-size:28px;
          font-weight:700;
          margin-bottom:20px;
        "
      >
        測驗完成 🎉
      </div>


      <div
        style="
          font-size:48px;
          font-weight:700;
          margin:20px 0;
        "
      >
        ${quizScore} / 10
      </div>


      <div
        style="
          font-size:22px;
          margin-bottom:28px;
        "
      >
        ${percentage}%
      </div>


      ${
        quizWrongAnswers.length
          ? `
            <button
              id="quizWrongBtn"
              type="button"
              style="
                display:block;
                width:100%;
                min-height:58px;
                margin-bottom:12px;
                border:1px solid #ccc;
                border-radius:12px;
                background:#fff;
                font-size:18px;
                cursor:pointer;
              "
            >
              📝 查看錯題
            </button>
          `
          : `
            <div
              style="
                margin-bottom:20px;
                font-size:18px;
                color:#3f9148;
                font-weight:700;
              "
            >
              🎉 全部答對！
            </div>
          `
      }


      <button
        id="quizRetryBtn"
        type="button"
        style="
          display:block;
          width:100%;
          min-height:58px;
          margin-bottom:12px;
          border:none;
          border-radius:12px;
          background:#6b8afd;
          color:white;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        "
      >
        🔄 再測一次
      </button>


      <button
        id="quizBackWordsBtn"
        type="button"
        style="
          display:block;
          width:100%;
          min-height:58px;
          border:1px solid #ccc;
          border-radius:12px;
          background:#fff;
          font-size:18px;
          cursor:pointer;
        "
      >
        📚 回到我的單字
      </button>

    </div>
  `;


  const retryBtn =
    document.getElementById(
      "quizRetryBtn"
    );

  if (retryBtn) {

    retryBtn.addEventListener(
      "click",
      startQuiz
    );
  }


  const backBtn =
    document.getElementById(
      "quizBackWordsBtn"
    );

  if (backBtn) {

    backBtn.addEventListener(
      "click",
      () => {

        showNormalAppAfterQuiz();

        loadWords();
      }
    );
  }


  const wrongBtn =
    document.getElementById(
      "quizWrongBtn"
    );

  if (wrongBtn) {

    wrongBtn.addEventListener(
      "click",
      showQuizWrongAnswers
    );
  }
}


/* =========================================================
   顯示錯題
========================================================= */

function showQuizWrongAnswers() {

  const section =
    document.getElementById(
      "quizSection"
    );

  if (!section) {
    return;
  }


  section.innerHTML = `

    <div
      style="
        width:100%;
        box-sizing:border-box;
        padding:20px;
        border-radius:18px;
        background:#fff;
        box-shadow:0 3px 14px rgba(0,0,0,0.08);
      "
    >

      <div
        style="
          font-size:26px;
          font-weight:700;
          text-align:center;
          margin-bottom:24px;
        "
      >
        📝 本次錯題
      </div>


      ${
        quizWrongAnswers.map(
          (item, index) => `
            <div
              style="
                padding:16px;
                margin-bottom:12px;
                border-radius:12px;
                background:#fafafa;
                border:1px solid #eee;
              "
            >

              <div
                style="
                  font-size:20px;
                  font-weight:700;
                  margin-bottom:8px;
                "
              >
                ${index + 1}.
                ${escapeHtml(
                  item.word.word
                )}
              </div>


              <div
                style="
                  line-height:1.7;
                  color:#555;
                "
              >
                你的答案：
                <span style="color:#d9534f;">
                  ${escapeHtml(
                    item.userAnswer
                  )}
                </span>
                <br>
                正確答案：
                <strong>
                  ${escapeHtml(
                    item.correctAnswer
                  )}
                </strong>
              </div>


              <button
                type="button"
                class="quizWrongAudioBtn"
                data-word-index="${index}"
                style="
                  margin-top:10px;
                  min-height:44px;
                  padding:8px 14px;
                  border:1px solid #ccc;
                  border-radius:10px;
                  background:#fff;
                  font-size:16px;
                  cursor:pointer;
                "
              >
                🔊 聽單字
              </button>

            </div>
          `
        ).join("")
      }


      <button
        id="quizWrongBackBtn"
        type="button"
        style="
          display:block;
          width:100%;
          min-height:58px;
          margin-top:20px;
          border:none;
          border-radius:12px;
          background:#6b8afd;
          color:white;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        "
      >
        ← 回到測驗結果
      </button>

    </div>
  `;


  document
    .querySelectorAll(
      ".quizWrongAudioBtn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.wordIndex
            );

          const item =
            quizWrongAnswers[
              index
            ];

          if (item?.word) {

            playWord(
              item.word
            );
          }
        }
      );
    });


  document
    .getElementById(
      "quizWrongBackBtn"
    )
    .addEventListener(
      "click",
      finishQuiz
    );
}


/* =========================================================
   初始化複習測驗
========================================================= */

createQuizUI();
