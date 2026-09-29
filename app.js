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

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const userName = document.getElementById("userName");

const newWordInput = document.getElementById("newWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const addWordMessage = document.getElementById("addWordMessage");

const wordSearchInput = document.getElementById("wordSearchInput");

const wordList = document.getElementById("wordList");

const wordDetail = document.getElementById("wordDetail");

const backToWordsBtn = document.getElementById("backToWordsBtn");


/* =========================================================
   使用者名稱 → Supabase 隱藏 Email
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
   使用者名稱驗證
========================================================= */

function isValidUsername(username) {

  return /^[A-Za-z0-9_\-\u4e00-\u9fff]{2,30}$/
    .test(username);

}


/* =========================================================
   顯示登入區
========================================================= */

function showAuth() {

  if (authSection) {
    authSection.style.display = "";
  }

  if (appSection) {
    appSection.style.display = "none";
  }

  if (wordDetail) {
    wordDetail.style.display = "none";
  }

}


/* =========================================================
   顯示 App
========================================================= */

async function showApp() {

  if (authSection) {
    authSection.style.display = "none";
  }

  if (appSection) {
    appSection.style.display = "";
  }

  if (wordDetail) {
    wordDetail.style.display = "none";
  }

  await loadWords();

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
    .select("id, username")
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

  const profile =
    await getProfile(user.id);

  if (userName) {

    userName.textContent =
      profile?.username ||
      "使用者";

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

  if (!isValidUsername(username)) {

    alert(
      "帳號名稱請使用 2～30 個中文字、英文字母、數字、底線或連字號。"
    );

    return;
  }

  if (password.length < 6) {

    alert(
      "密碼至少需要 6 個字元。"
    );

    return;
  }

  const email =
    usernameToInternalEmail(username);

  if (signupBtn) {
    signupBtn.disabled = true;
  }

  try {

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

    if (!data?.user) {
      throw new Error(
        "註冊失敗，沒有取得使用者資料。"
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
        "建立使用者資料失敗：",
        profileError
      );

      alert(
        "帳號已建立，但使用者資料建立失敗。\n\n" +
        profileError.message
      );

      return;
    }

    alert(
      "註冊成功！現在可以登入了。"
    );

    if (passwordInput) {
      passwordInput.value = "";
    }

  } catch (error) {

    console.error(
      "註冊失敗：",
      error
    );

    alert(
      "註冊失敗：" +
      (error?.message || "未知錯誤")
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

  if (!isValidUsername(username)) {

    alert(
      "請輸入正確的帳號名稱。"
    );

    return;
  }

  if (!password) {

    alert(
      "請輸入密碼。"
    );

    return;
  }

  const email =
    usernameToInternalEmail(username);

  if (loginBtn) {
    loginBtn.disabled = true;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (data?.user) {

      await showCurrentUser(
        data.user
      );

    }

  } catch (error) {

    console.error(
      "登入失敗：",
      error
    );

    alert(
      "登入失敗：帳號名稱或密碼不正確"
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

      wordList.innerHTML =
        `<p>載入單字失敗：${escapeHtml(error.message)}</p>`;

    }

    return;
  }

  displayWords(data || []);

}


/* =========================================================
   HTML Escape
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
   顯示單字列表
========================================================= */

function displayWords(words) {

  if (!wordList) {
    return;
  }

  if (!words.length) {

    wordList.innerHTML =
      `<p class="empty-message">目前還沒有單字。</p>`;

    return;
  }

  wordList.innerHTML =
    words.map(word => {

      return `
        <div class="word-item"
             data-word-id="${escapeHtml(word.id)}">

          <div class="word-item-main">

            <div class="word-item-word">
              ${escapeHtml(word.word)}
            </div>

            ${
              word.chinese_meaning
                ? `
                  <div class="word-item-meaning">
                    ${escapeHtml(word.chinese_meaning)}
                  </div>
                `
                : ""
            }

          </div>

          <button
            type="button"
            class="learn-again-btn"
            data-word-id="${escapeHtml(word.id)}"
          >
            再學一次
          </button>

        </div>
      `;

    }).join("");

  wordList
    .querySelectorAll(".word-item")
    .forEach(item => {

      item.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".learn-again-btn"
            )
          ) {
            return;
          }

          openWordDetail(
            item.dataset.wordId
          );

        }
      );

    });

  wordList
    .querySelectorAll(".learn-again-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          openWordDetail(
            button.dataset.wordId
          );

        }
      );

    });

}


/* =========================================================
   搜尋單字
========================================================= */

async function searchWords() {

  const keyword =
    wordSearchInput?.value.trim() || "";

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
        audio_url,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

  if (keyword) {

    query = query.or(
      `word.ilike.%${keyword}%,chinese_meaning.ilike.%${keyword}%`
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
   Audio 狀態
========================================================= */

let currentAudio = null;

let speechUtterance = null;

let playAllGeneration = 0;


/* =========================================================
   停止所有音訊
========================================================= */

function stopAllAudio() {

  playAllGeneration++;

  if (currentAudio) {

    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (error) {
      console.warn(error);
    }

    currentAudio = null;
  }

  if ("speechSynthesis" in window) {

    window.speechSynthesis.cancel();

  }

  speechUtterance = null;

}


/* =========================================================
   播放音檔
========================================================= */

function playAudioUrl(
  url,
  fallbackText = "",
  language = "en-US"
) {

  stopAllAudio();

  if (!url) {

    if (fallbackText) {
      speakText(
        fallbackText,
        language
      );
    }

    return;
  }

  const audio =
    new Audio(url);

  currentAudio = audio;

  audio.play()
    .catch(error => {

      console.warn(
        "音檔播放失敗，改用語音播放：",
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

  audio.onended = () => {

    if (currentAudio === audio) {
      currentAudio = null;
    }

  };

}


/* =========================================================
   語音播放
========================================================= */

function speakText(
  text,
  language = "en-US"
) {

  if (!text) {
    return;
  }

  stopAllAudio();

  if (!("speechSynthesis" in window)) {

    alert(
      "你的瀏覽器不支援語音播放。"
    );

    return;
  }

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.lang = language;

  utterance.rate = 0.9;

  utterance.pitch = 1;

  speechUtterance = utterance;

  window.speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   英文播放
========================================================= */

function playEnglish(text) {

  speakText(
    text,
    "en-US"
  );

}


/* =========================================================
   中文播放
========================================================= */

function playChinese(text) {

  speakText(
    text,
    "zh-TW"
  );

}


/* =========================================================
   Dictionary API
========================================================= */

async function lookupWord(word) {

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

    if (addWordMessage) {

      addWordMessage.textContent =
        "請先輸入單字。";

    }

    return;
  }

  if (addWordBtn) {
    addWordBtn.disabled = true;
  }

  if (addWordMessage) {

    addWordMessage.textContent =
      "正在查詢單字資料……";

  }

  try {

    const {
      data: {
        user
      }
    } =
      await supabaseClient.auth.getUser();

    if (!user) {

      throw new Error(
        "請先登入。"
      );

    }

    const result =
      await lookupWord(word);

    const insertData = {

      user_id: user.id,

      word:
        result.word ||
        word.toLowerCase(),

      phonetic:
        result.phonetic || "",

      part_of_speech:
        result.part_of_speech || "",

      chinese_meaning:
        result.chinese_meaning || "",

      definition_en:
        result.definition_en || "",

      example_en:
        result.example_en || "",

      example_zh:
        result.example_zh || "",

      audio_url:
        result.audio || ""

    };

    const {
      error
    } =
      await supabaseClient
        .from("words")
        .insert(insertData);

    if (error) {
      throw error;
    }

    if (newWordInput) {
      newWordInput.value = "";
    }

    if (addWordMessage) {

      addWordMessage.textContent =
        "新增成功！";

    }

    await loadWords();

  } catch (error) {

    console.error(
      "新增單字失敗：",
      error
    );

    if (addWordMessage) {

      addWordMessage.textContent =
        "新增失敗：" +
        (error?.message || "未知錯誤");

    }

  } finally {

    if (addWordBtn) {
      addWordBtn.disabled = false;
    }

  }

}


/* =========================================================
   開啟單字詳細頁
========================================================= */

async function openWordDetail(wordId) {

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
        audio_url,
        notes
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
   回到單字列表
========================================================= */

function closeWordDetail() {

  stopAllAudio();

  if (wordDetail) {
    wordDetail.style.display = "none";
  }

  if (wordList) {
    wordList.style.display = "";
  }

  const wordContainer =
    wordList?.parentElement;

  if (wordContainer) {
    wordContainer.style.display = "";
  }

}


/* =========================================================
   顯示單字詳細資料
========================================================= */

function renderWordDetail(word) {

  if (!wordDetail) {
    return;
  }

  stopAllAudio();

  if (wordList) {
    wordList.style.display = "none";
  }

  const wordContainer =
    wordList?.parentElement;

  if (wordContainer) {
    wordContainer.style.display = "none";
  }

  wordDetail.style.display = "";

  const existingNotes =
    word.notes || "";

  const noteSeparator =
    "\n\n--- 中文筆記 ---\n\n";

  let englishNotes = "";
  let chineseNotes = "";

  if (
    existingNotes.includes(
      noteSeparator
    )
  ) {

    const parts =
      existingNotes.split(
        noteSeparator
      );

    englishNotes =
      parts[0] || "";

    chineseNotes =
      parts.slice(1).join(
        noteSeparator
      ) || "";

  } else {

    englishNotes =
      existingNotes;

  }

  wordDetail.innerHTML = `

    <div class="word-detail-inner">

      <h2>
        ${escapeHtml(word.word)}
      </h2>

      ${
        word.phonetic
          ? `
            <p class="word-phonetic">
              ${escapeHtml(word.phonetic)}
            </p>
          `
          : ""
      }

      ${
        word.part_of_speech
          ? `
            <p class="word-pos">
              ${escapeHtml(word.part_of_speech)}
            </p>
          `
          : ""
      }

      <div class="detail-section">

        <h3>中文意思</h3>

        <div class="detail-audio-row">

          <div class="detail-text">
            ${escapeHtml(
              word.chinese_meaning ||
              "暫無資料"
            )}
          </div>

          ${
            word.chinese_meaning
              ? `
                <button
                  type="button"
                  id="meaningAudioBtn"
                >
                  🔊
                </button>
              `
              : ""
          }

        </div>

      </div>


      <div class="detail-section">

        <h3>英文定義</h3>

        <div class="detail-audio-row">

          <div class="detail-text">
            ${escapeHtml(
              word.definition_en ||
              "暫無資料"
            )}
          </div>

          ${
            word.definition_en
              ? `
                <button
                  type="button"
                  id="definitionAudioBtn"
                >
                  🔊
                </button>
              `
              : ""
          }

        </div>

      </div>


      <div class="detail-section">

        <h3>英文例句</h3>

        <div class="detail-audio-row">

          <div class="detail-text">
            ${escapeHtml(
              word.example_en ||
              "暫無資料"
            )}
          </div>

          ${
            word.example_en
              ? `
                <button
                  type="button"
                  id="exampleEnAudioBtn"
                >
                  🔊
                </button>
              `
              : ""
          }

        </div>

      </div>


      <div class="detail-section">

        <h3>中文例句</h3>

        <div class="detail-audio-row">

          <div class="detail-text">
            ${escapeHtml(
              word.example_zh ||
              "暫無資料"
            )}
          </div>

          ${
            word.example_zh
              ? `
                <button
                  type="button"
                  id="exampleZhAudioBtn"
                >
                  🔊
                </button>
              `
              : ""
          }

        </div>

      </div>


      <div class="detail-section">

        <h3>我的英文筆記</h3>

        <div class="note-audio-row">

          <textarea
            id="englishNotesInput"
            rows="4"
            placeholder="輸入自己的英文筆記……"
          ></textarea>

          <button
            type="button"
            id="englishNoteAudioBtn"
          >
            🔊
          </button>

        </div>

      </div>


      <div class="detail-section">

        <h3>我的中文筆記</h3>

        <div class="note-audio-row">

          <textarea
            id="chineseNotesInput"
            rows="4"
            placeholder="輸入自己的中文筆記……"
          ></textarea>

          <button
            type="button"
            id="chineseNoteAudioBtn"
          >
            🔊
          </button>

        </div>

      </div>


      <div class="detail-actions">

        <button
          type="button"
          id="saveNotesBtn"
        >
          💾 儲存筆記
        </button>

        <button
          type="button"
          id="playAllBtn"
        >
          ▶️ 全部播放
        </button>

        <button
          type="button"
          id="deleteWordBtn"
        >
          🗑️ 刪除單字
        </button>

        <button
          type="button"
          id="backToWordsDetailBtn"
        >
          ← 回到我的單字
        </button>

      </div>

    </div>

  `;


  const englishNotesInput =
    document.getElementById(
      "englishNotesInput"
    );

  const chineseNotesInput =
    document.getElementById(
      "chineseNotesInput"
    );

  if (englishNotesInput) {
    englishNotesInput.value =
      englishNotes;
  }

  if (chineseNotesInput) {
    chineseNotesInput.value =
      chineseNotes;
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


  const englishNoteAudioBtn =
    document.getElementById(
      "englishNoteAudioBtn"
    );

  if (englishNoteAudioBtn) {

    englishNoteAudioBtn.addEventListener(
      "click",
      () => {

        playEnglish(
          englishNotesInput?.value.trim()
        );

      }
    );

  }


  const chineseNoteAudioBtn =
    document.getElementById(
      "chineseNoteAudioBtn"
    );

  if (chineseNoteAudioBtn) {

    chineseNoteAudioBtn.addEventListener(
      "click",
      () => {

        playChinese(
          chineseNotesInput?.value.trim()
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
      () => {

        saveNotes(
          word.id,
          englishNotesInput,
          chineseNotesInput
        );

      }
    );

  }


  const playAllBtn =
    document.getElementById(
      "playAllBtn"
    );

  if (playAllBtn) {

    playAllBtn.addEventListener(
      "click",
      () => {

        const updatedWord = {

          ...word,

          notes:
            englishNotesInput?.value.trim() ||
            ""

        };

        playAll(
          updatedWord
        );

      }
    );

  }


  const deleteWordBtn =
    document.getElementById(
      "deleteWordBtn"
    );

  if (deleteWordBtn) {

    deleteWordBtn.addEventListener(
      "click",
      () => {

        deleteWord(
          word.id
        );

      }
    );

  }


  const backButton =
    document.getElementById(
      "backToWordsDetailBtn"
    );

  if (backButton) {

    backButton.addEventListener(
      "click",
      closeWordDetail
    );

  }

}


/* =========================================================
   儲存筆記
========================================================= */

async function saveNotes(
  wordId,
  englishInput,
  chineseInput
) {

  const english =
    englishInput?.value.trim() || "";

  const chinese =
    chineseInput?.value.trim() || "";

  const noteSeparator =
    "\n\n--- 中文筆記 ---\n\n";

  let notes = english;

  if (chinese) {

    notes +=
      noteSeparator +
      chinese;

  }

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
    error
  } =
    await supabaseClient
      .from("words")
      .update({
        notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", wordId)
      .eq("user_id", user.id);

  if (error) {

    console.error(
      "儲存筆記失敗：",
      error
    );

    alert(
      "儲存失敗：" +
      error.message
    );

    return;
  }

  alert(
    "筆記已儲存！"
  );

}


/* =========================================================
   刪除單字
========================================================= */

async function deleteWord(wordId) {

  const confirmed =
    confirm(
      "確定要刪除這個單字嗎？"
    );

  if (!confirmed) {
    return;
  }

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
    error
  } =
    await supabaseClient
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

  closeWordDetail();

  await loadWords();

}


/* =========================================================
   Play All
========================================================= */

async function playAll(word) {

  stopAllAudio();

  const generation =
    playAllGeneration;

  async function wait(ms) {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );

  }

  async function speakAndWait(
    text,
    language
  ) {

    if (!text) {
      return true;
    }

    if (
      generation !==
      playAllGeneration
    ) {

      return false;

    }

    return new Promise(
      resolve => {

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        utterance.lang =
          language;

        utterance.rate =
          0.9;

        utterance.onend = () => {
          resolve(true);
        };

        utterance.onerror = () => {
          resolve(false);
        };

        speechUtterance =
          utterance;

        window.speechSynthesis.speak(
          utterance
        );

      }
    );

  }


  if (word.audio_url) {

    if (
      generation !==
      playAllGeneration
    ) {
      return;
    }

    const audio =
      new Audio(
        word.audio_url
      );

    currentAudio =
      audio;

    await new Promise(
      resolve => {

        audio.onended =
          resolve;

        audio.onerror =
          resolve;

        audio.play()
          .catch(resolve);

      }
    );

    if (
      currentAudio === audio
    ) {

      currentAudio =
        null;

    }

  } else {

    const ok =
      await speakAndWait(
        word.word,
        "en-US"
      );

    if (!ok) {
      return;
    }

  }


  await wait(250);


  if (
    generation !==
    playAllGeneration
  ) {
    return;
  }


  await speakAndWait(
    word.chinese_meaning,
    "zh-TW"
  );


  await wait(250);


  if (
    generation !==
    playAllGeneration
  ) {
    return;
  }


  await speakAndWait(
    word.definition_en,
    "en-US"
  );


  await wait(250);


  if (
    generation !==
    playAllGeneration
  ) {
    return;
  }


  await speakAndWait(
    word.example_en,
    "en-US"
  );


  await wait(250);


  if (
    generation !==
    playAllGeneration
  ) {
    return;
  }


  await speakAndWait(
    word.example_zh,
    "zh-TW"
  );

}


/* =========================================================
   複習測驗
========================================================= */

let quizState = {

  words: [],

  questions: [],

  currentIndex: 0,

  score: 0,

  answered: false

};


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
        Math.random() *
        (i + 1)
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
   建立測驗入口
========================================================= */

function createQuizEntry() {

  if (!appSection) {
    return;
  }

  if (
    document.getElementById(
      "quizEntryArea"
    )
  ) {
    return;
  }

  const area =
    document.createElement(
      "div"
    );

  area.id =
    "quizEntryArea";

  area.innerHTML = `
    <button
      type="button"
      id="startQuizBtn"
    >
      📚 開始複習測驗
    </button>
  `;

  appSection.insertBefore(
    area,
    appSection.firstChild
  );

  const button =
    document.getElementById(
      "startQuizBtn"
    );

  if (button) {

    button.addEventListener(
      "click",
      startQuiz
    );

  }

}


/* =========================================================
   建立測驗區
========================================================= */

function createQuizArea() {

  if (!appSection) {
    return;
  }

  if (
    document.getElementById(
      "quizArea"
    )
  ) {
    return;
  }

  const area =
    document.createElement(
      "div"
    );

  area.id =
    "quizArea";

  area.style.display =
    "none";

  appSection.appendChild(
    area
  );

}


/* =========================================================
   開始測驗
========================================================= */

async function startQuiz() {

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
    data,
    error
  } =
    await supabaseClient
      .from("words")
      .select(`
        id,
        word,
        phonetic,
        chinese_meaning,
        definition_en,
        example_en,
        example_zh,
        audio_url
      `)
      .eq("user_id", user.id);

  if (error) {

    console.error(
      "取得測驗單字失敗：",
      error
    );

    alert(
      "取得測驗資料失敗。"
    );

    return;
  }

  if (!data || data.length < 4) {

    alert(
      "至少需要 4 個單字才能開始測驗。"
    );

    return;
  }

  quizState.words =
    data;

  quizState.questions =
    createQuizQuestions(
      data
    );

  quizState.currentIndex =
    0;

  quizState.score =
    0;

  quizState.answered =
    false;

  showQuizArea();

  renderQuizQuestion();

}


/* =========================================================
   建立題目
========================================================= */

function createQuizQuestions(words) {

  const shuffled =
    shuffleArray(words);

  const selected =
    shuffled.slice(
      0,
      Math.min(
        10,
        shuffled.length
      )
    );

  return selected.map(
    word => {

      const types = [
        "enToZh",
        "zhToEn",
        "listen"
      ];

      const type =
        types[
          Math.floor(
            Math.random() *
            types.length
          )
        ];

      let options;

      if (
        type === "enToZh"
      ) {

        options =
          createOptions(
            word,
            words,
            "chinese_meaning"
          );

      } else {

        options =
          createOptions(
            word,
            words,
            "word"
          );

      }

      return {

        word,

        type,

        options,

        answer:
          type === "enToZh"
            ? word.chinese_meaning
            : word.word

      };

    }
  );

}


/* =========================================================
   建立四個選項
========================================================= */

function createOptions(
  answerWord,
  words,
  field
) {

  const correct =
    answerWord[field];

  const others =
    shuffleArray(
      words.filter(
        item =>
          item.id !==
          answerWord.id &&
          item[field]
      )
    )
    .slice(
      0,
      3
    )
    .map(
      item =>
        item[field]
    );

  return shuffleArray([
    correct,
    ...others
  ]);

}


/* =========================================================
   顯示測驗區
========================================================= */

function showQuizArea() {

  const quizArea =
    document.getElementById(
      "quizArea"
    );

  if (!quizArea) {
    return;
  }

  quizArea.style.display =
    "";

  const quizEntry =
    document.getElementById(
      "quizEntryArea"
    );

  if (quizEntry) {
    quizEntry.style.display =
      "none";
  }

  const normalChildren =
    Array.from(
      appSection.children
    );

  normalChildren.forEach(
    child => {

      if (
        child.id !==
        "quizArea" &&
        child.id !==
        "quizEntryArea"
      ) {

        child.dataset.quizHidden =
          child.style.display;

        child.style.display =
          "none";

      }

    }
  );

}


/* =========================================================
   關閉測驗
========================================================= */

function hideQuizArea() {

  const quizArea =
    document.getElementById(
      "quizArea"
    );

  if (quizArea) {

    quizArea.style.display =
      "none";

  }

  const quizEntry =
    document.getElementById(
      "quizEntryArea"
    );

  if (quizEntry) {

    quizEntry.style.display =
      "";

  }

  if (!appSection) {
    return;
  }

  Array.from(
    appSection.children
  ).forEach(
    child => {

      if (
        child.id !==
        "quizArea" &&
        child.id !==
        "quizEntryArea"
      ) {

        child.style.display =
          child.dataset.quizHidden ||
          "";

      }

    }
  );

}


/* =========================================================
   顯示測驗題目
========================================================= */

function renderQuizQuestion() {

  const quizArea =
    document.getElementById(
      "quizArea"
    );

  if (!quizArea) {
    return;
  }

  const index =
    quizState.currentIndex;

  const total =
    quizState.questions.length;

  if (
    index >= total
  ) {

    renderQuizResult();

    return;
  }

  const question =
    quizState.questions[index];

  quizState.answered =
    false;

  let questionText =
    "";

  if (
    question.type ===
    "enToZh"
  ) {

    questionText =
      `
        <div class="quiz-label">
          英文 → 中文
        </div>

        <div class="quiz-question-word">
          ${escapeHtml(
            question.word.word
          )}
        </div>
      `;

  } else if (
    question.type ===
    "zhToEn"
  ) {

    questionText =
      `
        <div class="quiz-label">
          中文 → 英文
        </div>

        <div class="quiz-question-word">
          ${escapeHtml(
            question.word.chinese_meaning
          )}
        </div>
      `;

  } else {

    questionText =
      `
        <div class="quiz-label">
          聽發音選單字
        </div>

        <button
          type="button"
          id="quizListenBtn"
        >
          🔊 播放
        </button>
      `;

  }

  quizArea.innerHTML = `

    <div class="quiz-container">

      <div class="quiz-progress">
        第 ${index + 1} / ${total} 題
      </div>

      <div class="quiz-score">
        目前得分：${quizState.score}
      </div>

      <div class="quiz-question">
        ${questionText}
      </div>

      <div
        id="quizOptions"
        class="quiz-options"
      >

        ${question.options.map(
          option => `
            <button
              type="button"
              class="quiz-option"
              data-option="${escapeHtml(
                option
              )}"
            >
              ${escapeHtml(option)}
            </button>
          `
        ).join("")}

      </div>

      <div
        id="quizFeedback"
        class="quiz-feedback"
      ></div>

      <div
        id="quizFollowArea"
        style="display:none;"
      >
        <button
          type="button"
          id="quizFollowBtn"
        >
          🎤 跟著讀
        </button>

        <div
          id="quizFollowResult"
        ></div>
      </div>

      <button
        type="button"
        id="quizNextBtn"
        style="display:none;"
      >
        下一題 →
      </button>

      <button
        type="button"
        id="quizExitBtn"
      >
        返回
      </button>

    </div>

  `;


  document
    .querySelectorAll(
      ".quiz-option"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            answerQuiz(
              button.dataset.option,
              button
            );

          }
        );

      }
    );


  const listenButton =
    document.getElementById(
      "quizListenBtn"
    );

  if (listenButton) {

    listenButton.addEventListener(
      "click",
      () => {

        playAudioUrl(
          question.word.audio_url,
          question.word.word,
          "en-US"
        );

      }
    );

  }


  const nextButton =
    document.getElementById(
      "quizNextBtn"
    );

  if (nextButton) {

    nextButton.addEventListener(
      "click",
      () => {

        quizState.currentIndex++;

        renderQuizQuestion();

      }
    );

  }


  const exitButton =
    document.getElementById(
      "quizExitBtn"
    );

  if (exitButton) {

    exitButton.addEventListener(
      "click",
      () => {

        stopAllAudio();

        hideQuizArea();

      }
    );

  }

}


/* =========================================================
   回答測驗
========================================================= */

function answerQuiz(
  selected,
  selectedButton
) {

  if (quizState.answered) {
    return;
  }

  quizState.answered =
    true;

  const question =
    quizState.questions[
      quizState.currentIndex
    ];

  const correct =
    question.answer;

  const isCorrect =
    selected === correct;

  const feedback =
    document.getElementById(
      "quizFeedback"
    );

  document
    .querySelectorAll(
      ".quiz-option"
    )
    .forEach(
      button => {

        button.disabled =
          true;

        if (
          button.dataset.option ===
          correct
        ) {

          button.classList.add(
            "correct"
          );

        }

      }
    );


  if (isCorrect) {

    quizState.score++;

    selectedButton.classList.add(
      "correct"
    );

    if (feedback) {

      feedback.textContent =
        "✅ 答對了！";

    }

  } else {

    selectedButton.classList.add(
      "wrong"
    );

    if (feedback) {

      feedback.textContent =
        `❌ 答錯了。正確答案是：${correct}`;

    }

  }


  const followArea =
    document.getElementById(
      "quizFollowArea"
    );

  if (followArea) {

    followArea.style.display =
      "";

  }


  const followButton =
    document.getElementById(
      "quizFollowBtn"
    );

  if (followButton) {

    followButton.onclick =
      () => startFollowReading(
        question.word.word
      );

  }


  const nextButton =
    document.getElementById(
      "quizNextBtn"
    );

  if (nextButton) {

    nextButton.style.display =
      "";

  }

}


/* =========================================================
   跟讀
========================================================= */

function startFollowReading(text) {

  const result =
    document.getElementById(
      "quizFollowResult"
    );

  if (
    !(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    )
  ) {

    if (result) {

      result.textContent =
        "你的瀏覽器不支援語音跟讀功能。";

    }

    return;
  }

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const recognition =
    new Recognition();

  recognition.lang =
    "en-US";

  recognition.interimResults =
    false;

  recognition.continuous =
    false;

  if (result) {

    result.textContent =
      "🎤 請跟著讀……";

  }

  recognition.onresult =
    event => {

      const spoken =
        event.results[0][0]
          .transcript
          .trim();

      if (result) {

        result.textContent =
          `你說的是：「${spoken}」`;

      }

    };

  recognition.onerror =
    event => {

      if (result) {

        result.textContent =
          "沒有辨識成功，請再試一次。";

      }

    };

  recognition.onend =
    () => {

      if (result &&
          !result.textContent) {

        result.textContent =
          "跟讀結束。";

      }

    };

  recognition.start();

}


/* =========================================================
   測驗結果
========================================================= */

function renderQuizResult() {

  const quizArea =
    document.getElementById(
      "quizArea"
    );

  if (!quizArea) {
    return;
  }

  const total =
    quizState.questions.length;

  quizArea.innerHTML = `

    <div class="quiz-container">

      <h2>
        🎉 測驗完成
      </h2>

      <p class="quiz-final-score">
        你的分數：
        ${quizState.score}
        /
        ${total}
      </p>

      <button
        type="button"
        id="quizRetryBtn"
      >
        🔄 再測一次
      </button>

      <button
        type="button"
        id="quizFinishBtn"
      >
        ← 回到單字
      </button>

    </div>

  `;


  const retryButton =
    document.getElementById(
      "quizRetryBtn"
    );

  if (retryButton) {

    retryButton.addEventListener(
      "click",
      () => {

        quizState.questions =
          createQuizQuestions(
            quizState.words
          );

        quizState.currentIndex =
          0;

        quizState.score =
          0;

        renderQuizQuestion();

      }
    );

  }


  const finishButton =
    document.getElementById(
      "quizFinishBtn"
    );

  if (finishButton) {

    finishButton.addEventListener(
      "click",
      () => {

        hideQuizArea();

      }
    );

  }

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
   事件
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


if (newWordInput) {

  newWordInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        event.preventDefault();

        addWord();

      }

    }
  );

}


if (wordSearchInput) {

  wordSearchInput.addEventListener(
    "input",
    searchWords
  );

}


if (backToWordsBtn) {

  backToWordsBtn.addEventListener(
    "click",
    closeWordDetail
  );

}


/* =========================================================
   初始化
========================================================= */

createQuizEntry();

createQuizArea();

checkUser();
