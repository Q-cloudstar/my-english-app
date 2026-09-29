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
   常數
========================================================= */

const INTERNAL_AUTH_DOMAIN =
  "my-english-app.invalid";

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

  if (
    value === null ||
    value === undefined
  ) {
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

  stopAllAudio();

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
    wordDetail.innerHTML = "";

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

function showAuthMessage(
  message,
  isError = true
) {

  if (!authMessage) return;

  authMessage.textContent =
    message;

  authMessage.style.color =
    isError ? "#d9534f" : "";

}


/* =========================================================
   顯示新增單字訊息
========================================================= */

function showAddWordMessage(
  message,
  isError = false
) {

  if (!addWordMessage) return;

  addWordMessage.textContent =
    message;

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
    } =
      await supabaseClient.auth.signUp({
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
       建立 profile。

       如果 profile 已經存在，不視為錯誤。
    */
    const {
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .insert({
          id: data.user.id,
          username
        });

    if (
      profileError &&
      !profileError.message?.toLowerCase().includes(
        "duplicate"
      )
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

    await showCurrentUser(
      data.user
    );

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
    } =
      await supabaseClient.auth
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
  } =
    await supabaseClient.auth.signOut();

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
  } =
    await supabaseClient.auth.getUser();

  if (!user) {

    showAuth();
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


/* =========================================================
   顯示單字列表
========================================================= */

function displayWords(words) {

  if (!wordList) return;

  if (
    !words ||
    words.length === 0
  ) {

    wordList.innerHTML = `
      <p class="message">
        目前還沒有單字。
      </p>
    `;

    return;

  }


  wordList.innerHTML =
    words.map(word => {

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
              style="font-size:18px;"
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


          <button
            type="button"
            class="word-audio-btn secondary-btn"
            data-word-id="${escapeHtml(word.id)}"
            aria-label="播放 ${escapeHtml(word.word)} 的英文發音"
            title="聽英文發音"
          >
            🔊
          </button>


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
     點擊英文發音
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
  } =
    await supabaseClient.auth.getUser();

  if (!user) return;

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

    if (wordList) {

      wordList.innerHTML = `
        <p class="message">
          搜尋失敗，請稍後再試。
        </p>
      `;

    }

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

  /*
     每次停止都增加版本號，
     讓舊的「全部播放」立即失效。
  */
  playAllGeneration++;


  if (currentAudio) {

    try {

      currentAudio.pause();
      currentAudio.currentTime = 0;

    } catch (e) {

      console.warn(
        "停止音檔時發生問題：",
        e
      );

    }

    currentAudio = null;

  }


  if (
    "speechSynthesis" in window
  ) {

    try {

      window.speechSynthesis.cancel();

    } catch (e) {

      console.warn(
        "停止語音時發生問題：",
        e
      );

    }

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


    audio.onended =
      () => {

        if (
          currentAudio === audio
        ) {

          currentAudio = null;

        }

      };


    audio.onerror =
      () => {

        if (
          currentAudio === audio
        ) {

          currentAudio = null;

        }

        console.warn(
          "音檔播放失敗，改用瀏覽器語音：",
          url
        );

        if (fallbackText) {

          speakText(
            fallbackText,
            language
          );

        }

      };


    audio.play()
      .catch(error => {

        console.warn(
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
    !("speechSynthesis" in window)
  ) {

    alert(
      "你的瀏覽器不支援語音朗讀。"
    );

    return;

  }

  stopAllAudio();


  const utterance =
    new SpeechSynthesisUtterance(
      String(text)
    );

  utterance.lang =
    language;

  utterance.rate =
    language === "zh-TW"
      ? 0.9
      : 0.85;


  utterance.onend =
    () => {

      if (
        currentUtterance === utterance
      ) {

        currentUtterance = null;

      }

    };


  utterance.onerror =
    () => {

      if (
        currentUtterance === utterance
      ) {

        currentUtterance = null;

      }

    };


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

  console.log(
    "開始查詢單字：",
    word
  );


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


  console.log(
    "lookup-word 原始回傳：",
    data
  );


  if (data?.error) {

    throw new Error(
      data.error
    );

  }


  /*
     支援兩種可能的 Edge Function 回傳：

     ①
     {
       word: "...",
       chinese_meaning: "..."
     }

     ②
     {
       data: {
         word: "...",
         chinese_meaning: "..."
       }
     }
  */

  const dictionary =
    data?.data &&
    typeof data.data === "object"
      ? data.data
      : data;


  if (
    !dictionary ||
    typeof dictionary !== "object"
  ) {

    throw new Error(
      "字典服務沒有回傳有效資料。"
    );

  }


  console.log(
    "整理後的字典資料：",
    dictionary
  );


  return dictionary;

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
    } =
      await supabaseClient.auth.getUser();


    if (!user) {

      showAddWordMessage(
        "請先登入。",
        true
      );

      return;

    }


    /* =====================================================
       查字典
    ===================================================== */

    const dictionary =
      await lookupWord(word);


    /*
       這裡明確整理所有欄位。

       如果 Edge Function 沒有提供某個欄位，
       就存空字串，不會造成 undefined。
    */

    const wordValue =
      dictionary?.word ||
      word;

    const phonetic =
      dictionary?.phonetic ||
      "";

    const partOfSpeech =
      dictionary?.part_of_speech ||
      "";

    const chineseMeaning =
      dictionary?.chinese_meaning ||
      "";

    const definitionEn =
      dictionary?.definition_en ||
      "";

    const exampleEn =
      dictionary?.example_en ||
      "";

    const exampleZh =
      dictionary?.example_zh ||
      "";

    const audioUrl =
      dictionary?.audio_url ||
      "";


    console.log(
      "準備儲存的單字資料：",
      {
        word: wordValue,
        phonetic,
        part_of_speech: partOfSpeech,
        chinese_meaning: chineseMeaning,
        definition_en: definitionEn,
        example_en: exampleEn,
        example_zh: exampleZh,
        audio_url: audioUrl
      }
    );


    /* =====================================================
       檢查是否已經存在
    ===================================================== */

    const {
      data: existing,
      error: existingError
    } =
      await supabaseClient
        .from("words")
        .select("id")
        .eq("user_id", user.id)
        .ilike("word", wordValue)
        .maybeSingle();


    if (existingError) {

      console.error(
        "檢查重複單字失敗：",
        existingError
      );

      showAddWordMessage(
        "檢查單字時發生錯誤：" +
        existingError.message,
        true
      );

      return;

    }


    if (existing) {

      showAddWordMessage(
        "這個單字已經在你的單字庫裡了。",
        true
      );

      return;

    }


    /* =====================================================
       儲存
    ===================================================== */

    const {
      data: insertedData,
      error
    } =
      await supabaseClient
        .from("words")
        .insert({

          user_id:
            user.id,

          word:
            wordValue,

          phonetic:
            phonetic,

          part_of_speech:
            partOfSpeech,

          chinese_meaning:
            chineseMeaning,

          definition_en:
            definitionEn,

          example_en:
            exampleEn,

          example_zh:
            exampleZh,

          audio_url:
            audioUrl,

          notes:
            ""

        })
        .select()
        .single();


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


    console.log(
      "成功儲存單字：",
      insertedData
    );


    showAddWordMessage(
      `「${wordValue}」已加入你的單字庫。`
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


    /*
       不把真正的錯誤全部吃掉，
       方便你之後如果需要看 Console。
    */

    showAddWordMessage(
      "查詢單字資料失敗：" +
      (error?.message || "請稍後再試。"),
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
  } =
    await supabaseClient.auth.getUser();


  if (!user) return;


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


  stopAllAudio();


  wordDetail.classList.remove("hidden");


  /* =====================================================
     筆記拆分
  ===================================================== */

  let englishNotes = "";
  let chineseNotes = "";


  if (word.notes) {

    const parts =
      word.notes.split(noteSeparator);

    englishNotes =
      parts[0] || "";

    chineseNotes =
      parts.slice(1).join(noteSeparator) || "";

  }


  /* =====================================================
     詳細資料 HTML
  ===================================================== */

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
        type="button"
      >
        ← 回到我的單字
      </button>

      <button
        id="deleteWordBtn"
        class="logout-btn"
        type="button"
      >
        🗑 刪除
      </button>

    </div>


    <h2>
      ${escapeHtml(word.word)}
    </h2>


    <button
      id="detailWordAudioBtn"
      class="secondary-btn"
      type="button"
      style="margin-bottom:12px;"
    >
      🔊 聽單字發音
    </button>


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


    <hr>


    <!-- 中文意思 -->

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
                type="button"
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


    <!-- English Definition -->

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
                type="button"
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


    <!-- 英文例句 -->

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
                type="button"
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


    <!-- 中文例句 -->

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
                type="button"
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


    <!-- 英文筆記 -->

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
              type="button"
              style="margin-top:6px;"
            >
              🔊 朗讀英文筆記
            </button>
          `
          : ""
      }

    </div>


    <!-- 中文筆記 -->

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
              type="button"
              style="margin-top:6px;"
            >
              🔊 朗讀中文筆記
            </button>
          `
          : ""
      }

    </div>


    <!-- 儲存 / 全部播放 -->

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
        type="button"
      >
        💾 儲存筆記
      </button>

      <button
        id="playAllBtn"
        class="secondary-btn"
        type="button"
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
     返回
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


  /* =====================================================
     刪除
  ===================================================== */

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


  /* =====================================================
     單字英文發音
  ===================================================== */

  const detailWordAudioBtn =
    document.getElementById(
      "detailWordAudioBtn"
    );

  if (detailWordAudioBtn) {

    detailWordAudioBtn.addEventListener(
      "click",
      () => {

        playAudioUrl(
          word.audio_url || "",
          word.word || "",
          "en-US"
        );

      }
    );

  }


  /* =====================================================
     中文意思發音
  ===================================================== */

  const chineseMeaningAudioBtn =
    document.getElementById(
      "chineseMeaningAudioBtn"
    );

  if (chineseMeaningAudioBtn) {

    chineseMeaningAudioBtn.addEventListener(
      "click",
      () => {

        playChinese(
          word.chinese_meaning || ""
        );

      }
    );

  }


  /* =====================================================
     English Definition 發音
  ===================================================== */

  const definitionAudioBtn =
    document.getElementById(
      "definitionAudioBtn"
    );

  if (definitionAudioBtn) {

    definitionAudioBtn.addEventListener(
      "click",
      () => {

        playEnglish(
          word.definition_en || ""
        );

      }
    );

  }


  /* =====================================================
     英文例句發音
  ===================================================== */

  const exampleEnAudioBtn =
    document.getElementById(
      "exampleEnAudioBtn"
    );

  if (exampleEnAudioBtn) {

    exampleEnAudioBtn.addEventListener(
      "click",
      () => {

        playEnglish(
          word.example_en || ""
        );

      }
    );

  }


  /* =====================================================
     中文例句發音
  ===================================================== */

  const exampleZhAudioBtn =
    document.getElementById(
      "exampleZhAudioBtn"
    );

  if (exampleZhAudioBtn) {

    exampleZhAudioBtn.addEventListener(
      "click",
      () => {

        playChinese(
          word.example_zh || ""
        );

      }
    );

  }


  /* =====================================================
     英文筆記發音
  ===================================================== */

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


  /* =====================================================
     中文筆記發音
  ===================================================== */

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


  /* =====================================================
     儲存筆記
  ===================================================== */

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


  /* =====================================================
     全部播放
  ===================================================== */

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


  /* =====================================================
     自動捲到詳細資料
  ===================================================== */

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
  } =
    await supabaseClient.auth.getUser();


  if (!user) return;


  const {
    error
  } =
    await supabaseClient
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


  if (!confirmed) return;


  const {
    data: {
      user
    }
  } =
    await supabaseClient.auth.getUser();


  if (!user) return;


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


  stopAllAudio();

  closeWordDetail();

  await loadWords();

}


/* =========================================================
   全部播放
========================================================= */

function playAll(word) {

  stopAllAudio();


  if (
    !("speechSynthesis" in window)
  ) {

    alert(
      "你的瀏覽器不支援語音朗讀。"
    );

    return;

  }


  /*
     取得這次播放的版本。

     如果使用者中途按任何其他 🔊，
     stopAllAudio() 會讓這次播放失效。
  */

  const generation =
    playAllGeneration;


  const items = [];


  /*
     ① 英文單字
  */

  if (word.word) {

    items.push({
      text: word.word,
      language: "en-US",
      audioUrl: word.audio_url || ""
    });

  }


  /*
     ② 英文定義
  */

  if (word.definition_en) {

    items.push({
      text: word.definition_en,
      language: "en-US"
    });

  }


  /*
     ③ 英文例句
  */

  if (word.example_en) {

    items.push({
      text: word.example_en,
      language: "en-US"
    });

  }


  /*
     ④ 中文意思
  */

  if (word.chinese_meaning) {

    items.push({
      text: word.chinese_meaning,
      language: "zh-TW"
    });

  }


  /*
     ⑤ 中文例句
  */

  if (word.example_zh) {

    items.push({
      text: word.example_zh,
      language: "zh-TW"
    });

  }


  if (items.length === 0) {

    return;

  }


  let index = 0;


  function isCancelled() {

    return (
      generation !==
      playAllGeneration
    );

  }


  function playNext() {

    if (isCancelled()) {

      return;

    }


    if (
      index >= items.length
    ) {

      currentUtterance = null;
      return;

    }


    const item =
      items[index];

    index++;


    /*
       第一項如果有真正的音檔，
       優先使用音檔。
    */

    if (
      item.audioUrl
    ) {

      const audio =
        new Audio(item.audioUrl);

      currentAudio =
        audio;


      audio.onended =
        () => {

          if (
            currentAudio === audio
          ) {

            currentAudio = null;

          }

          if (!isCancelled()) {

            setTimeout(
              playNext,
              150
            );

          }

        };


      audio.onerror =
        () => {

          if (
            currentAudio === audio
          ) {

            currentAudio = null;

          }

          if (!isCancelled()) {

            playSpeechItem();

          }

        };


      audio.play()
        .catch(() => {

          if (
            currentAudio === audio
          ) {

            currentAudio = null;

          }

          if (!isCancelled()) {

            playSpeechItem();

          }

        });


      return;

    }


    playSpeechItem();


    function playSpeechItem() {

      if (isCancelled()) {

        return;

      }


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

          if (isCancelled()) {

            return;

          }

          if (
            currentUtterance ===
            utterance
          ) {

            currentUtterance = null;

          }

          setTimeout(
            playNext,
            150
          );

        };


      utterance.onerror =
        () => {

          if (isCancelled()) {

            return;

          }

          if (
            currentUtterance ===
            utterance
          ) {

            currentUtterance = null;

          }

          setTimeout(
            playNext,
            100
          );

        };


      currentUtterance =
        utterance;


      window.speechSynthesis.speak(
        utterance
      );

    }

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

function initQuiz() {

  if (
    typeof createQuizUI !== "function"
  ) {
    console.error(
      "找不到 createQuizUI()"
    );
    return;
  }

  if (
    typeof appSection === "undefined" ||
    !appSection
  ) {
    console.error(
      "找不到 appSection，無法建立複習測驗"
    );
    return;
  }

  createQuizUI();
}


/* =========================================================
   啟動複習測驗
========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initQuiz
  );

} else {

  initQuiz();

}
