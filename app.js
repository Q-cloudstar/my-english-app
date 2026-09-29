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
                ${escapeHtml(
                  word.part_of_speech
                )}
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


    ${
      word.example_en
        ? `
          <div class="detail-block">

            <div class="detail-label">
              English Example
            </div>

            <div class="detail-text">

              ${escapeHtml(
                word.example_en
              )}

              <button
                id="exampleEnAudioBtn"
                class="audio-btn"
                title="播放英文例句"
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
          <div class="detail-block">

            <div class="detail-label">
              中文例句
            </div>

            <div class="detail-text">

              ${escapeHtml(
                word.example_zh
              )}

              <button
                id="exampleZhAudioBtn"
                class="audio-btn"
                title="播放中文例句"
              >
                🔊
              </button>

            </div>

          </div>
        `
        : ""
    }


    <button
      id="playAllBtn"
      class="play-all-btn"
    >
      ▶️ 播放全部
    </button>

    <br>

    <button
      id="deleteWordBtn"
      class="delete-btn"
    >
      🗑 刪除這個單字
    </button>
  `;


  /* =========================
     返回
  ========================== */

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


  /* =========================
     單字發音
  ========================== */

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


  /* =========================
     中文詞義
  ========================== */

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


  /* =========================
     英文定義
  ========================== */

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


  /* =========================
     英文例句
  ========================== */

  const exampleEnAudioBtn =
    document.getElementById(
      "exampleEnAudioBtn"
    );

  if (exampleEnAudioBtn) {

    exampleEnAudioBtn.addEventListener(
      "click",
      () => {

        playEnglish(
          word.example_en
        );
      }
    );
  }


  /* =========================
     中文例句
  ========================== */

  const exampleZhAudioBtn =
    document.getElementById(
      "exampleZhAudioBtn"
    );

  if (exampleZhAudioBtn) {

    exampleZhAudioBtn.addEventListener(
      "click",
      () => {

        playChinese(
          word.example_zh
        );
      }
    );
  }


  /* =========================
     播放全部
  ========================== */

  const playAllBtn =
    document.getElementById(
      "playAllBtn"
    );

  playAllBtn.addEventListener(
    "click",
    () => {

      playAll(word);
    }
  );


  /* =========================
     刪除
  ========================== */

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
          .eq("id", word.id);

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
   初始化
========================================================= */

checkUser();
