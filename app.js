/* =========================================================
   Supabase 設定
========================================================= */

const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   DOM
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
   常數
========================================================= */

const INTERNAL_AUTH_DOMAIN = "my-english-app.invalid";

const noteSeparator =
  "\n\n--- 中文筆記 ---\n\n";


/* =========================================================
   使用者名稱 → Supabase 隱藏 Email
========================================================= */

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
   使用者名稱格式
========================================================= */

function isValidUsername(username) {

  return /^[A-Za-z0-9_\-\u4e00-\u9fff]{2,30}$/
    .test(username);

}


/* =========================================================
   HTML 安全處理
========================================================= */

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   顯示登入畫面
========================================================= */

function showAuth() {

  if (authSection) {
    authSection.classList.remove("hidden");
    authSection.style.display = "";
  }

  if (appSection) {
    appSection.classList.add("hidden");
    appSection.style.display = "";
  }

  if (wordDetail) {
    wordDetail.classList.add("hidden");
  }

}


/* =========================================================
   顯示 App
========================================================= */

async function showApp() {

  if (authSection) {
    authSection.classList.add("hidden");
    authSection.style.display = "";
  }

  if (appSection) {
    appSection.classList.remove("hidden");
    appSection.style.display = "";
  }

  if (wordDetail) {
    wordDetail.classList.add("hidden");
  }

  await loadWords();

}


/* =========================================================
   顯示登入訊息
========================================================= */

function showAuthMessage(message, isError = true) {

  if (!authMessage) return;

  authMessage.textContent = message;

  authMessage.style.color =
    isError ? "#d9534f" : "";

}


/* =========================================================
   顯示新增單字訊息
========================================================= */

function showAddWordMessage(message, isError = false) {

  if (!addWordMessage) return;

  addWordMessage.textContent = message;

  addWordMessage.style.color =
    isError ? "#d9534f" : "";

}


/* =========================================================
   取得 Profile
========================================================= */

async function getProfile(userId) {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {

    console.error(
      "取得使用者資料失敗：",
      error
    );

    return null;
  }

  return data;

}


/* =========================================================
   顯示目前使用者
========================================================= */

async function showCurrentUser(user) {

  if (!user) {
    showAuth();
    return;
  }

  const profile =
    await getProfile(user.id);

  if (userName) {

    userName.textContent =
      profile?.username ||
      user.user_metadata?.username ||
      "學習者";

  }

  await showApp();

}


/* =========================================================
   註冊
========================================================= */

async function signup() {

  const username =
    usernameInput?.value.trim() || "";

  const password =
    passwordInput?.value || "";

  showAuthMessage("");

  if (!username) {

    showAuthMessage(
      "請輸入帳號名稱。"
    );

    return;
  }

  if (!isValidUsername(username)) {

    showAuthMessage(
      "帳號名稱需為 2～30 個字，可使用中文、英文、數字、底線或連字號。"
    );

    return;
  }

  if (password.length < 6) {

    showAuthMessage(
      "密碼至少需要 6 個字元。"
    );

    return;
  }

  if (signupBtn) {
    signupBtn.disabled = true;
  }

  try {

    const email =
      usernameToInternalEmail(username);

    const {
      data,
      error
    } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) {

      console.error(
        "註冊失敗：",
        error
      );

      showAuthMessage(
        "註冊失敗：" +
        error.message
      );

      return;
    }

    if (!data?.user) {

      showAuthMessage(
        "註冊沒有完成，請再試一次。"
      );

      return;
    }

    /*
      建立 profile
    */

    const {
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .insert({
        id: data.user.id,
        username
      });

    if (
      profileError &&
      !profileError.message?.includes("duplicate")
    ) {

      console.error(
        "建立 profile 失敗：",
        profileError
      );

      showAuthMessage(
        "帳號已建立，但使用者資料建立失敗。"
      );

      return;
    }

    showAuthMessage(
      "註冊成功！正在登入……",
      false
    );

    await showCurrentUser(data.user);

  } catch (error) {

    console.error(
      "註冊發生錯誤：",
      error
    );

    showAuthMessage(
      "註冊失敗，請稍後再試。"
    );

  } finally {

    if (signupBtn) {
      signupBtn.disabled = false;
    }

  }

}


/* =========================================================
   登入
========================================================= */

async function login() {

  const username =
    usernameInput?.value.trim() || "";

  const password =
    passwordInput?.value || "";

  showAuthMessage("");

  if (!username || !password) {

    showAuthMessage(
      "請輸入帳號名稱和密碼。"
    );

    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
  }

  try {

    const email =
      usernameToInternalEmail(username);

    const {
      data,
      error
    } = await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });

    if (error) {

      console.error(
        "登入失敗：",
        error
      );

      showAuthMessage(
        "登入失敗：帳號名稱或密碼不正確"
      );

      return;
    }

    if (!data?.user) {

      showAuthMessage(
        "登入失敗，請再試一次。"
      );

      return;
    }

    await showCurrentUser(
      data.user
    );

  } catch (error) {

    console.error(
      "登入發生錯誤：",
      error
    );

    showAuthMessage(
      "登入失敗，請稍後再試。"
    );

  } finally {

    if (loginBtn) {
      loginBtn.disabled = false;
    }

  }

}


/* =========================================================
   登出
========================================================= */

async function logout() {

  stopAllAudio();

  const {
    error
  } = await supabaseClient.auth.signOut();

  if (error) {

    console.error(
      "登出失敗：",
      error
    );

    return;
  }

  if (usernameInput) {
    usernameInput.value = "";
  }

  if (passwordInput) {
    passwordInput.value = "";
  }

  showAuth();

}


/* =========================================================
   載入自己的單字
========================================================= */

async function loadWords() {

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    showAuth();
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
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
      notes,
      audio_url,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "載入單字失敗：",
      error
    );

    if (wordList) {

      wordList.innerHTML = `
        <p class="message">
          載入單字失敗，請重新整理頁面。
        </p>
      `;

    }

    return;
  }

  displayWords(data || []);

}

function displayWords(words) {

  if (!wordList) return;

  /* =====================================================
     沒有單字
  ===================================================== */

  if (!words || words.length === 0) {

    wordList.innerHTML = `
      <p class="message">
        目前還沒有單字。
      </p>
    `;

    return;
  }


  /* =====================================================
     顯示單字列表
     
     固定格式：
     英文單字 + 音標 + 🔊 + 🔄 再學一次
     
     中文翻譯不在列表顯示。
  ===================================================== */

  wordList.innerHTML = words.map(word => {

    return `
      <div
        class="word-item"
        data-word-id="${escapeHtml(word.id)}"
        style="
          display:flex;
          align-items:center;
          gap:10px;
          padding:14px 16px;
          margin:8px 0;
          border:1px solid #e5e5e5;
          border-radius:10px;
          background:#fff;
          box-sizing:border-box;
        "
      >

        <!-- =========================================
             英文單字 + 音標
        ========================================== -->

        <div
          class="word-main"
          data-word-id="${escapeHtml(word.id)}"
          style="
            flex:1;
            min-width:0;
            cursor:pointer;
          "
        >

          <strong
            style="
              font-size:18px;
            "
          >
            ${escapeHtml(word.word)}
          </strong>

          ${
            word.phonetic
              ? `
                <span
                  style="
                    margin-left:8px;
                    color:#777;
                    font-size:14px;
                  "
                >
                  ${escapeHtml(word.phonetic)}
                </span>
              `
              : ""
          }

        </div>


        <!-- =========================================
             英文發音
        ========================================== -->

        <button
          type="button"
          class="word-audio-btn secondary-btn"
          data-word-id="${escapeHtml(word.id)}"
          aria-label="播放 ${escapeHtml(word.word)} 的英文發音"
          title="聽英文發音"
        >
          🔊
        </button>


        <!-- =========================================
             再學一次
        ========================================== -->

        <button
          type="button"
          class="review-word-btn secondary-btn"
          data-word-id="${escapeHtml(word.id)}"
        >
          🔄 再學一次
        </button>

      </div>
    `;

  }).join("");


  /* =====================================================
     點擊英文單字
     
     → 開啟單字詳細資料
  ===================================================== */

  wordList
    .querySelectorAll(".word-main")
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          const wordId =
            element.dataset.wordId;

          if (!wordId) return;

          openWordDetail(wordId);

        }
      );

    });


  /* =====================================================
     點擊 🔊
     
     → 只播放英文發音
     → 不開啟詳細資料
  ===================================================== */

  wordList
    .querySelectorAll(".word-audio-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          const wordId =
            button.dataset.wordId;

          if (!wordId) return;


          const word =
            words.find(
              item =>
                String(item.id) ===
                String(wordId)
            );

          if (!word) return;


          /*
            優先使用 Merriam-Webster 音檔。

            如果沒有音檔，
            playAudioUrl() 會使用英文
            瀏覽器語音朗讀 word.word。
          */

          playAudioUrl(
            word.audio_url || "",
            word.word || "",
            "en-US"
          );

        }
      );

    });


  /* =====================================================
     點擊「再學一次」
     
     → 開啟該單字詳細資料
     → 不讓事件冒泡
  ===================================================== */

  wordList
    .querySelectorAll(".review-word-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          const wordId =
            button.dataset.wordId;

          if (!wordId) return;

          openWordDetail(wordId);

        }
      );

    });

}

/* =========================================================
   搜尋單字
========================================================= */

async function searchWords() {

  const keyword =
    searchInput?.value.trim() || "";

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

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
        notes,
        audio_url,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (keyword) {

    query =
      query.ilike(
        "word",
        `%${keyword}%`
      );

  }

  const {
    data,
    error
  } = await query;

  if (error) {

    console.error(
      "搜尋失敗：",
      error
    );

    return;
  }

  displayWords(data || []);

}


/* =========================================================
   語音 / Audio
========================================================= */

let currentAudio = null;

let currentUtterance = null;

let playAllGeneration = 0;


/* =========================================================
   停止所有語音
========================================================= */

function stopAllAudio() {

  playAllGeneration++;

  if (currentAudio) {

    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}

    currentAudio = null;
  }

  if (
    "speechSynthesis" in window
  ) {

    window.speechSynthesis.cancel();

  }

  currentUtterance = null;

}


/* =========================================================
   播放 Audio URL
========================================================= */

function playAudioUrl(
  url,
  fallbackText = "",
  language = "en-US"
) {

  stopAllAudio();

  if (url) {

    const audio =
      new Audio(url);

    currentAudio = audio;

    audio.play()
      .catch(error => {

        console.warn(
          "音檔播放失敗：",
          error
        );

        currentAudio = null;

        if (fallbackText) {

          speakText(
            fallbackText,
            language
          );

        }

      });

    return;
  }

  if (fallbackText) {

    speakText(
      fallbackText,
      language
    );

  }

}


/* =========================================================
   語音朗讀
========================================================= */

function speakText(
  text,
  language = "en-US"
) {

  if (!text) return;

  if (
    !"speechSynthesis" in window
  ) {

    alert(
      "你的瀏覽器不支援語音朗讀。"
    );

    return;
  }

  stopAllAudio();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = language;

  utterance.rate =
    language === "zh-TW"
      ? 0.9
      : 0.85;

  currentUtterance =
    utterance;

  window.speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   英文語音
========================================================= */

function playEnglish(text) {

  speakText(
    text,
    "en-US"
  );

}


/* =========================================================
   中文語音
========================================================= */

function playChinese(text) {

  speakText(
    text,
    "zh-TW"
  );

}


/* =========================================================
   查詢字典
========================================================= */

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
      "字典查詢失敗：",
      error
    );

    throw error;
  }

  if (data?.error) {

    throw new Error(
      data.error
    );

  }

  return data;

}


/* =========================================================
   新增單字
========================================================= */

async function addWord() {

  const word =
    newWordInput?.value.trim() || "";

  if (!word) {

    showAddWordMessage(
      "請輸入英文單字或片語。",
      true
    );

    return;
  }

  showAddWordMessage(
    "正在查詢單字資料……"
  );

  if (addWordBtn) {
    addWordBtn.disabled = true;
  }

  try {

    const {
      data: {
        user
      }
    } = await supabaseClient.auth.getUser();

    if (!user) {

      showAddWordMessage(
        "請先登入。",
        true
      );

      return;
    }

    /*
      查詢字典
    */

    const dictionary =
      await lookupWord(word);

    /*
      避免同一個使用者重複加入
    */

    const {
      data: existing
    } = await supabaseClient
      .from("words")
      .select("id")
      .eq("user_id", user.id)
      .ilike("word", word)
      .maybeSingle();

    if (existing) {

      showAddWordMessage(
        "這個單字已經在你的單字庫裡了。",
        true
      );

      return;
    }

    /*
      寫入資料庫
    */

    const {
      error
    } = await supabaseClient
      .from("words")
      .insert({
        user_id: user.id,

        word:
          dictionary?.word ||
          word,

        phonetic:
          dictionary?.phonetic ||
          "",

        part_of_speech:
          dictionary?.part_of_speech ||
          "",

        chinese_meaning:
          dictionary?.chinese_meaning ||
          "",

        definition_en:
          dictionary?.definition_en ||
          "",

        example_en:
          dictionary?.example_en ||
          "",

        example_zh:
          dictionary?.example_zh ||
          "",

        audio_url:
          dictionary?.audio_url ||
          "",

        notes:
          ""
      });

    if (error) {

      console.error(
        "儲存單字失敗：",
        error
      );

      showAddWordMessage(
        "儲存失敗：" +
        error.message,
        true
      );

      return;
    }

    showAddWordMessage(
      `「${word}」已加入你的單字庫。`
    );

    if (newWordInput) {
      newWordInput.value = "";
    }

    await loadWords();

  } catch (error) {

    console.error(
      "新增單字錯誤：",
      error
    );

    showAddWordMessage(
      "查詢單字資料失敗，請稍後再試。",
      true
    );

  } finally {

    if (addWordBtn) {
      addWordBtn.disabled = false;
    }

  }

}


/* =========================================================
   開啟單字詳細資料
========================================================= */

async function openWordDetail(wordId) {

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) return;

  const {
    data: word,
    error
  } = await supabaseClient
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
      notes,
      audio_url,
      created_at
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
   渲染詳細資料
========================================================= */

function renderWordDetail(word) {

  if (!wordDetail) return;

  wordDetail.classList.remove("hidden");

  /*
    notes 分開成英文 / 中文
  */

  let englishNotes = "";
  let chineseNotes = "";

  if (word.notes) {

    const parts =
      word.notes.split(noteSeparator);

    englishNotes =
      parts[0] || "";

    chineseNotes =
      parts[1] || "";

  }

  wordDetail.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:15px;
      "
    >

      <button
        id="backToWordsBtn"
        class="secondary-btn"
      >
        ← 回到我的單字
      </button>

      <button
        id="deleteWordBtn"
        class="logout-btn"
      >
        🗑 刪除
      </button>

    </div>


    <h2>
      ${escapeHtml(word.word)}
    </h2>


    ${
      word.phonetic
        ? `
          <p>
            <strong>音標：</strong>
            ${escapeHtml(word.phonetic)}
          </p>
        `
        : ""
    }


    ${
      word.part_of_speech
        ? `
          <p>
            <strong>詞性：</strong>
            ${escapeHtml(word.part_of_speech)}
          </p>
        `
        : ""
    }


    ${
      word.audio_url
        ? `
          <div style="margin:12px 0;">
            <button
              id="wordAudioBtn"
              class="secondary-btn"
            >
              🔊 聽發音
            </button>
          </div>
        `
        : ""
    }


    <hr>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        "
      >

        <h3>中文意思</h3>

        ${
          word.chinese_meaning
            ? `
              <button
                id="chineseMeaningAudioBtn"
                class="secondary-btn"
              >
                🔊
              </button>
            `
            : ""
        }

      </div>

      <p>
        ${
          escapeHtml(
            word.chinese_meaning ||
            "尚無資料"
          )
        }
      </p>

    </div>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        "
      >

        <h3>English Definition</h3>

        ${
          word.definition_en
            ? `
              <button
                id="definitionAudioBtn"
                class="secondary-btn"
              >
                🔊
              </button>
            `
            : ""
        }

      </div>

      <p>
        ${
          escapeHtml(
            word.definition_en ||
            "No definition available."
          )
        }
      </p>

    </div>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        "
      >

        <h3>英文例句</h3>

        ${
          word.example_en
            ? `
              <button
                id="exampleEnAudioBtn"
                class="secondary-btn"
              >
                🔊
              </button>
            `
            : ""
        }

      </div>

      <p>
        ${
          escapeHtml(
            word.example_en ||
            "尚無英文例句"
          )
        }
      </p>

    </div>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        "
      >

        <h3>中文例句</h3>

        ${
          word.example_zh
            ? `
              <button
                id="exampleZhAudioBtn"
                class="secondary-btn"
              >
                🔊
              </button>
            `
            : ""
        }

      </div>

      <p>
        ${
          escapeHtml(
            word.example_zh ||
            "尚無中文例句"
          )
        }
      </p>

    </div>


    <hr>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <h3>📝 英文筆記</h3>

      <textarea
        id="englishNotesInput"
        rows="4"
        style="
          width:100%;
          box-sizing:border-box;
          margin-top:8px;
        "
        placeholder="輸入英文筆記"
      >${escapeHtml(englishNotes)}</textarea>

      ${
        englishNotes
          ? `
            <button
              id="englishNotesAudioBtn"
              class="secondary-btn"
              style="margin-top:6px;"
            >
              🔊 朗讀英文筆記
            </button>
          `
          : ""
      }

    </div>


    <div
      class="detail-section"
      style="margin:15px 0;"
    >

      <h3>📝 中文筆記</h3>

      <textarea
        id="chineseNotesInput"
        rows="4"
        style="
          width:100%;
          box-sizing:border-box;
          margin-top:8px;
        "
        placeholder="輸入中文筆記"
      >${escapeHtml(chineseNotes)}</textarea>

      ${
        chineseNotes
          ? `
            <button
              id="chineseNotesAudioBtn"
              class="secondary-btn"
              style="margin-top:6px;"
            >
              🔊 朗讀中文筆記
            </button>
          `
          : ""
      }

    </div>


    <div
      style="
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:20px;
      "
    >

      <button
        id="saveNotesBtn"
        class="primary-btn"
      >
        💾 儲存筆記
      </button>

      <button
        id="playAllBtn"
        class="secondary-btn"
      >
        ▶️ 全部播放
      </button>

    </div>


    <p
      id="detailMessage"
      class="message"
    ></p>

  `;


  /* =====================================================
     按鈕事件
  ===================================================== */

  const backBtn =
    document.getElementById(
      "backToWordsBtn"
    );

  if (backBtn) {

    backBtn.addEventListener(
      "click",
      closeWordDetail
    );

  }


  const deleteBtn =
    document.getElementById(
      "deleteWordBtn"
    );

  if (deleteBtn) {

    deleteBtn.addEventListener(
      "click",
      () => deleteWord(word.id)
    );

  }


  const audioBtn =
    document.getElementById(
      "wordAudioBtn"
    );

  if (audioBtn) {

    audioBtn.addEventListener(
      "click",
      () => {

        playAudioUrl(
          word.audio_url,
          word.word,
          "en-US"
        );

      }
    );

  }


  const chineseMeaningAudioBtn =
    document.getElementById(
      "chineseMeaningAudioBtn"
    );

  if (chineseMeaningAudioBtn) {

    chineseMeaningAudioBtn.addEventListener(
      "click",
      () => playChinese(
        word.chinese_meaning
      )
    );

  }


  const definitionAudioBtn =
    document.getElementById(
      "definitionAudioBtn"
    );

  if (definitionAudioBtn) {

    definitionAudioBtn.addEventListener(
      "click",
      () => playEnglish(
        word.definition_en
      )
    );

  }


  const exampleEnAudioBtn =
    document.getElementById(
      "exampleEnAudioBtn"
    );

  if (exampleEnAudioBtn) {

    exampleEnAudioBtn.addEventListener(
      "click",
      () => playEnglish(
        word.example_en
      )
    );

  }


  const exampleZhAudioBtn =
    document.getElementById(
      "exampleZhAudioBtn"
    );

  if (exampleZhAudioBtn) {

    exampleZhAudioBtn.addEventListener(
      "click",
      () => playChinese(
        word.example_zh
      )
    );

  }


  const englishNotesAudioBtn =
    document.getElementById(
      "englishNotesAudioBtn"
    );

  if (englishNotesAudioBtn) {

    englishNotesAudioBtn.addEventListener(
      "click",
      () => {

        const input =
          document.getElementById(
            "englishNotesInput"
          );

        playEnglish(
          input?.value || ""
        );

      }
    );

  }


  const chineseNotesAudioBtn =
    document.getElementById(
      "chineseNotesAudioBtn"
    );

  if (chineseNotesAudioBtn) {

    chineseNotesAudioBtn.addEventListener(
      "click",
      () => {

        const input =
          document.getElementById(
            "chineseNotesInput"
          );

        playChinese(
          input?.value || ""
        );

      }
    );

  }


  const saveNotesBtn =
    document.getElementById(
      "saveNotesBtn"
    );

  if (saveNotesBtn) {

    saveNotesBtn.addEventListener(
      "click",
      () => saveNotes(word.id)
    );

  }


  const playAllBtn =
    document.getElementById(
      "playAllBtn"
    );

  if (playAllBtn) {

    playAllBtn.addEventListener(
      "click",
      () => playAll(word)
    );

  }


  /*
    自動捲到詳細資料
  */

  wordDetail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   關閉詳細資料
========================================================= */

function closeWordDetail() {

  stopAllAudio();

  if (wordDetail) {

    wordDetail.classList.add(
      "hidden"
    );

    wordDetail.innerHTML = "";

  }

  if (wordList) {

    wordList.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   儲存筆記
========================================================= */

async function saveNotes(wordId) {

  const englishInput =
    document.getElementById(
      "englishNotesInput"
    );

  const chineseInput =
    document.getElementById(
      "chineseNotesInput"
    );

  const detailMessage =
    document.getElementById(
      "detailMessage"
    );

  const english =
    englishInput?.value.trim() || "";

  const chinese =
    chineseInput?.value.trim() || "";

  let notes = "";

  if (english && chinese) {

    notes =
      english +
      noteSeparator +
      chinese;

  } else if (english) {

    notes = english;

  } else if (chinese) {

    notes =
      noteSeparator +
      chinese;

  }

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) return;

  const {
    error
  } = await supabaseClient
    .from("words")
    .update({
      notes
    })
    .eq("id", wordId)
    .eq("user_id", user.id);

  if (error) {

    console.error(
      "儲存筆記失敗：",
      error
    );

    if (detailMessage) {

      detailMessage.textContent =
        "儲存失敗：" +
        error.message;

      detailMessage.style.color =
        "#d9534f";

    }

    return;
  }

  if (detailMessage) {

    detailMessage.textContent =
      "筆記已儲存。";

    detailMessage.style.color =
      "";

  }

}


/* =========================================================
   刪除單字
========================================================= */

async function deleteWord(wordId) {

  const confirmed =
    window.confirm(
      "確定要刪除這個單字嗎？"
    );

  if (!confirmed) {
    return;
  }

  const {
    data: {
      user
    }
  } = await supabaseClient.auth.getUser();

  if (!user) return;

  const {
    error
  } = await supabaseClient
    .from("words")
    .delete()
    .eq("id", wordId)
    .eq("user_id", user.id);

  if (error) {

    console.error(
      "刪除單字失敗：",
      error
    );

    alert(
      "刪除失敗：" +
      error.message
    );

    return;
  }

  stopAllAudio();

  closeWordDetail();

  await loadWords();

}


/* =========================================================
   全部播放
========================================================= */

async function playAll(word) {

  stopAllAudio();

  const generation =
    playAllGeneration;

  const items = [];

  if (word.word) {

    items.push({
      text: word.word,
      language: "en-US"
    });

  }

  if (word.chinese_meaning) {

    items.push({
      text: word.chinese_meaning,
      language: "zh-TW"
    });

  }

  if (word.definition_en) {

    items.push({
      text: word.definition_en,
      language: "en-US"
    });

  }

  if (word.example_en) {

    items.push({
      text: word.example_en,
      language: "en-US"
    });

  }

  if (word.example_zh) {

    items.push({
      text: word.example_zh,
      language: "zh-TW"
    });

  }

  let index = 0;


  function playNext() {

    if (
      generation !== playAllGeneration
    ) {
      return;
    }

    if (
      index >= items.length
    ) {
      return;
    }

    const item =
      items[index];

    index++;

    const utterance =
      new SpeechSynthesisUtterance(
        item.text
      );

    utterance.lang =
      item.language;

    utterance.rate =
      item.language === "zh-TW"
        ? 0.9
        : 0.85;

    utterance.onend =
      () => {

        if (
          generation !==
          playAllGeneration
        ) {
          return;
        }

        setTimeout(
          playNext,
          150
        );

      };

    utterance.onerror =
      () => {

        if (
          generation !==
          playAllGeneration
        ) {
          return;
        }

        playNext();

      };

    currentUtterance =
      utterance;

    window.speechSynthesis.speak(
      utterance
    );

  }

  playNext();

}


/* =========================================================
   登入狀態檢查
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

    /*
      INITIAL_SESSION：
      checkUser() 會處理，
      避免重複載入。
    */

    if (
      event === "INITIAL_SESSION"
    ) {
      return;
    }

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
   按鈕事件
========================================================= */

if (loginBtn) {

  loginBtn.addEventListener(
    "click",
    login
  );

}


if (signupBtn) {

  signupBtn.addEventListener(
    "click",
    signup
  );

}


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    logout
  );

}


if (addWordBtn) {

  addWordBtn.addEventListener(
    "click",
    addWord
  );

}


if (searchBtn) {

  searchBtn.addEventListener(
    "click",
    searchWords
  );

}


/* =========================================================
   Enter 快捷鍵
========================================================= */

if (passwordInput) {

  passwordInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        login();
      }

    }
  );

}


if (usernameInput) {

  usernameInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        login();
      }

    }
  );

}


if (newWordInput) {

  newWordInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        addWord();
      }

    }
  );

}


if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        searchWords();
      }

    }
  );

}


/* =========================================================
   啟動 App
========================================================= */

checkUser();
