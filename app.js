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

