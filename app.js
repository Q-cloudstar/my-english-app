/* =========================================================
   我的英文小學堂
   ========================================================= */


/* =========================================================
   Supabase 設定
   ========================================================= */

const SUPABASE_URL = "https://vydgrdgpcrzsculxicww.supabase.co";
const SUPABASE_KEY = "sb_publishable_tFYfMXuvOayfOkWK8dqfug_YEIvCg5l";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   使用者帳號設定
   ========================================================= */

const INTERNAL_AUTH_DOMAIN =
  "my-english-app.invalid";


function usernameToInternalEmail(username) {

  const bytes =
    new TextEncoder().encode(username);

  const encoded =
    Array.from(bytes)
      .map(function (byte) {
        return byte
          .toString(16)
          .padStart(2, "0");
      })
      .join("");

  return `u_${encoded}@${INTERNAL_AUTH_DOMAIN}`;
}


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


/* =========================================================
   訊息
   ========================================================= */

function showAuthMessage(message) {

  authMessage.textContent = message;
}


function showAddWordMessage(message) {

  addWordMessage.textContent = message;
}


/* =========================================================
   登入
   ========================================================= */

async function login() {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;

  if (!username || !password) {

    showAuthMessage(
      "請輸入帳號名稱和密碼。"
    );

    return;
  }

  showAuthMessage("登入中...");

  const email =
    usernameToInternalEmail(username);

  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {

    console.error(error);

    showAuthMessage(
      "登入失敗：帳號名稱或密碼不正確。"
    );

    return;
  }

  await showApp(data.user);
}


/* =========================================================
   建立帳號
   ========================================================= */

async function signup() {

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;

  if (!username || !password) {

    showAuthMessage(
      "請輸入帳號名稱和密碼。"
    );

    return;
  }

  if (username.length < 2) {

    showAuthMessage(
      "帳號名稱至少需要 2 個字元。"
    );

    return;
  }

  if (password.length < 6) {

    showAuthMessage(
      "密碼至少需要 6 個字元。"
    );

    return;
  }

  showAuthMessage("建立帳號中...");

  const email =
    usernameToInternalEmail(username);

  const {
    data,
    error
  } =
    await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

  if (error) {

    console.error(error);

    showAuthMessage(
      "建立帳號失敗：" + error.message
    );

    return;
  }

  if (!data.user) {

    showAuthMessage(
      "帳號建立失敗，請稍後再試。"
    );

    return;
  }


  /* 建立 profiles */

  const {
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .insert({
        id: data.user.id,
        username: username
      });


  if (profileError) {

    console.error(profileError);

    showAuthMessage(
      "帳號已建立，但使用者資料建立失敗。"
    );

    return;
  }


  showAuthMessage(
    "帳號建立成功！正在登入..."
  );


  /*
    如果 Supabase 沒有自動登入，
    這裡再使用登入功能。
  */

  if (data.session) {

    await showApp(data.user);

  } else {

    const {
      data: loginData,
      error: loginError
    } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (loginError) {

      console.error(loginError);

      showAuthMessage(
        "帳號已建立，請重新登入。"
      );

      return;
    }

    await showApp(loginData.user);
  }
}


/* =========================================================
   顯示主程式
   ========================================================= */

async function showApp(user) {

  authSection.classList.add("hidden");

  appSection.classList.remove("hidden");

  await loadProfile(user);

  await loadWords();
}


/* =========================================================
   載入使用者資料
   ========================================================= */

async function loadProfile(user) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();


  if (error) {

    console.error(error);

    userName.textContent =
      "歡迎！";

    return;
  }


  if (data && data.username) {

    userName.textContent =
      "嗨，" + data.username + "！";

  } else {

    userName.textContent =
      "歡迎！";
  }
}


/* =========================================================
   登出
   ========================================================= */

async function logout() {

  await supabaseClient.auth.signOut();

  appSection.classList.add("hidden");

  authSection.classList.remove("hidden");

  usernameInput.value = "";
  passwordInput.value = "";

  showAuthMessage("");
}


/* =========================================================
   載入單字
   ========================================================= */

async function loadWords(searchText = "") {

  wordList.innerHTML =
    '<div class="loading">載入中...</div>';


  const {
    data: authData
  } =
    await supabaseClient.auth.getUser();


  const user =
    authData.user;


  if (!user) {

    wordList.innerHTML =
      '<div class="word-list-empty">請先登入。</div>';

    return;
  }


  let query =
    supabaseClient
      .from("words")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });


  if (searchText) {

    query =
      query.ilike(
        "word",
        "%" + searchText + "%"
      );
  }


  const {
    data,
    error
  } = await query;


  if (error) {

    console.error(error);

    wordList.innerHTML =
      '<div class="word-list-empty">載入單字失敗。</div>';

    return;
  }


  displayWords(data || []);
}


/* =========================================================
   顯示單字列表
   ========================================================= */

function displayWords(words) {

  if (!words.length) {

    wordList.innerHTML =
      '<div class="word-list-empty">目前還沒有單字。</div>';

    return;
  }


  wordList.innerHTML =
    words.map(function (word) {

      return `
        <div class="word-item">

          <div class="word-row">

            <div class="word-name">
              ${escapeHtml(word.word)}
            </div>

            <div class="word-actions">

              <button
                class="learn-again-btn"
                data-id="${word.id}"
              >
                📖 Learn Again
              </button>

              <button
                class="delete-word-btn"
                data-id="${word.id}"
              >
                🗑 刪除
              </button>

            </div>

          </div>

        </div>
      `;

    }).join("");


  /* Learn Again */

  document
    .querySelectorAll(".learn-again-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          const id =
            button.dataset.id;

          const word =
            words.find(function (item) {
              return item.id === id;
            });

          if (word) {

            showWordDetail(word);
          }
        }
      );
    });


  /* 刪除 */

  document
    .querySelectorAll(".delete-word-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        async function () {

          const id =
            button.dataset.id;

          const word =
            words.find(function (item) {
              return item.id === id;
            });

          if (!word) {
            return;
          }

          await deleteWord(word);
        }
      );
    });
}


/* =========================================================
   新增單字
   ========================================================= */

async function addWord() {

  const word =
    newWordInput.value.trim();


  if (!word) {

    showAddWordMessage(
      "請先輸入英文單字或片語。"
    );

    return;
  }


  addWordBtn.disabled = true;

  showAddWordMessage(
    "正在查詢單字資料..."
  );


  try {

    /* 1. 查 Merriam-Webster */

    const dictionaryData =
      await lookupWord(word);


    if (!dictionaryData) {

      showAddWordMessage(
        "找不到這個單字的資料。"
      );

      return;
    }


    /* 2. 翻譯 */

    showAddWordMessage(
      "正在翻譯中文..."
    );


    const translationData =
      await translateWord(
        dictionaryData.definition_en || "",
        dictionaryData.example_en || ""
      );


    /* 3. 取得目前使用者 */

    const {
      data: authData,
      error: authError
    } =
      await supabaseClient.auth.getUser();


    if (authError || !authData.user) {

      showAddWordMessage(
        "登入狀態已失效，請重新登入。"
      );

      return;
    }


    /* 4. 寫入資料庫 */

    const {
      error
    } =
      await supabaseClient
        .from("words")
        .insert({

          word:
            dictionaryData.word || word,

          phonetic:
            dictionaryData.phonetic || null,

          part_of_speech:
            dictionaryData.part_of_speech || null,

          chinese_meaning:
            translationData.chinese_meaning || null,

          definition_en:
            dictionaryData.definition_en || null,

          example_en:
            dictionaryData.example_en || null,

          example_zh:
            translationData.example_zh || null,

          notes:
            null,

          audio_url:
            dictionaryData.audio || null,

          user_id:
            authData.user.id

        });


    if (error) {

      console.error(error);

      showAddWordMessage(
        "新增失敗：" + error.message
      );

      return;
    }


    newWordInput.value = "";

    showAddWordMessage(
      "✅ 新增成功！"
    );


    await loadWords();


  } catch (error) {

    console.error(error);

    showAddWordMessage(
      "新增單字時發生錯誤。"
    );

  } finally {

    addWordBtn.disabled = false;
  }
}


/* =========================================================
   Merriam-Webster 查詢
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
          word: word
        }
      }
    );


  if (error) {

    console.error(
      "lookup-word 錯誤：",
      error
    );

    return null;
  }


  if (!data) {

    return null;
  }


  if (data.error) {

    console.error(
      "字典錯誤：",
      data.error
    );

    return null;
  }


  return data;
}


/* =========================================================
   MyMemory 翻譯
   ========================================================= */

async function translateWord(
  definitionEn,
  exampleEn
) {

  const {
    data,
    error
  } =
    await supabaseClient.functions.invoke(
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


/* =========================================================
   單字詳細頁
   ========================================================= */

function showWordDetail(word) {

  wordList.innerHTML = `

    <div class="word-detail">

      <button
        id="backToListBtn"
        class="back-btn"
      >
        ← 回到單字列表
      </button>


      <div class="detail-word">

        <span>
          ${escapeHtml(word.word)}
        </span>

        ${
          word.audio_url
            ? `
              <button
                class="detail-audio-btn"
                id="wordAudioBtn"
                title="播放英文"
              >
                🔊
              </button>
            `
            : ""
        }

      </div>


      ${
        word.phonetic
          ? `
            <div class="detail-phonetic">
              /${escapeHtml(word.phonetic)}/
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

              <h3>📖 English Definition</h3>

              <div class="detail-text-with-audio">

                <p>
                  ${escapeHtml(word.definition_en)}
                </p>

                <button
                  class="detail-audio-btn"
                  id="definitionAudioBtn"
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
                  id="exampleAudioBtn"
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
                  id="exampleZhAudioBtn"
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
        class="speak-btn"
      >
        ▶️ 全部播放
      </button>


      <button
        id="detailDeleteBtn"
        class="speak-btn detail-delete-btn"
      >
        🗑 刪除這個單字
      </button>

    </div>
  `;


  /* 回列表 */

  document
    .getElementById("backToListBtn")
    .addEventListener(
      "click",
      function () {

        loadWords();
      }
    );


  /* 英文單字 */

  const wordAudioBtn =
    document.getElementById(
      "wordAudioBtn"
    );

  if (wordAudioBtn) {

    wordAudioBtn.addEventListener(
      "click",
      function () {

        playWordAudio(
          word.audio_url,
          word.word
        );
      }
    );
  }


  /* Definition */

  const definitionAudioBtn =
    document.getElementById(
      "definitionAudioBtn"
    );

  if (definitionAudioBtn) {

    definitionAudioBtn.addEventListener(
      "click",
      function () {

        speakEnglish(
          word.definition_en
        );
      }
    );
  }


  /* English example */

  const exampleAudioBtn =
    document.getElementById(
      "exampleAudioBtn"
    );

  if (exampleAudioBtn) {

    exampleAudioBtn.addEventListener(
      "click",
      function () {

        speakEnglish(
          word.example_en
        );
      }
    );
  }


  /* Chinese example */

  const exampleZhAudioBtn =
    document.getElementById(
      "exampleZhAudioBtn"
    );

  if (exampleZhAudioBtn) {

    exampleZhAudioBtn.addEventListener(
      "click",
      function () {

        speakChinese(
          word.example_zh
        );
      }
    );
  }


  /* 全部播放 */

  document
    .getElementById("playAllBtn")
    .addEventListener(
      "click",
      async function () {

        await playAll(word);
      }
    );


  /* 詳細頁刪除 */

  document
    .getElementById("detailDeleteBtn")
    .addEventListener(
      "click",
      async function () {

        await deleteWord(word);
      }
    );
}


/* =========================================================
   刪除單字
   ========================================================= */

async function deleteWord(word) {

  const confirmed =
    window.confirm(
      `確定要刪除「${word.word}」嗎？`
    );


  if (!confirmed) {
    return;
  }


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
      "刪除失敗：" + error.message
    );

    return;
  }


  await loadWords();
}


/* =========================================================
   播放單字音檔
   ========================================================= */

function playWordAudio(
  audioUrl,
  word
) {

  if (audioUrl) {

    const audio =
      new Audio(audioUrl);

    audio.play().catch(
      function (error) {

        console.error(
          "音檔播放失敗：",
          error
        );

        speakEnglish(word);
      }
    );

    return;
  }


  speakEnglish(word);
}


/* =========================================================
   英文語音
   ========================================================= */

function speakEnglish(text) {

  if (!text) {
    return;
  }

  if (!("speechSynthesis" in window)) {

    alert(
      "你的瀏覽器不支援語音播放。"
    );

    return;
  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "en-US";

  utterance.rate = 0.9;

  utterance.pitch = 1;


  const voices =
    window.speechSynthesis.getVoices();


  const englishVoice =
    voices.find(function (voice) {

      return voice.lang &&
        voice.lang
          .toLowerCase()
          .startsWith("en");
    });


  if (englishVoice) {

    utterance.voice =
      englishVoice;
  }


  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   中文語音
   ========================================================= */

function speakChinese(text) {

  if (!text) {
    return;
  }

  if (!("speechSynthesis" in window)) {

    alert(
      "你的瀏覽器不支援語音播放。"
    );

    return;
  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "zh-TW";

  utterance.rate = 0.9;

  utterance.pitch = 1;


  const voices =
    window.speechSynthesis.getVoices();


  const chineseVoice =
    voices.find(function (voice) {

      const lang =
        voice.lang
          ? voice.lang.toLowerCase()
          : "";

      return (
        lang === "zh-tw" ||
        lang.startsWith("zh-tw")
      );
    });


  if (chineseVoice) {

    utterance.voice =
      chineseVoice;
  }


  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   全部播放
   ========================================================= */

async function playAll(word) {

  window.speechSynthesis.cancel();


  /* 英文單字 */

  if (word.audio_url) {

    await playAudioAndWait(
      word.audio_url
    );

  } else {

    await speakAndWait(
      word.word,
      "en-US"
    );
  }


  /* 中文意思 */

  if (word.chinese_meaning) {

    await speakAndWait(
      word.chinese_meaning,
      "zh-TW"
    );
  }


  /* 英文定義 */

  if (word.definition_en) {

    await speakAndWait(
      word.definition_en,
      "en-US"
    );
  }


  /* 英文例句 */

  if (word.example_en) {

    await speakAndWait(
      word.example_en,
      "en-US"
    );
  }


  /* 中文例句 */

  if (word.example_zh) {

    await speakAndWait(
      word.example_zh,
      "zh-TW"
    );
  }
}


/* =========================================================
   等待音檔播放完成
   ========================================================= */

function playAudioAndWait(
  url
) {

  return new Promise(
    function (resolve) {

      const audio =
        new Audio(url);

      audio.onended =
        resolve;

      audio.onerror =
        resolve;

      audio.play().catch(
        resolve
      );
    }
  );
}


/* =========================================================
   等待語音播放完成
   ========================================================= */

function speakAndWait(
  text,
  language
) {

  return new Promise(
    function (resolve) {

      if (!text) {

        resolve();

        return;
      }


      const utterance =
        new SpeechSynthesisUtterance(
          text
        );

      utterance.lang =
        language;

      utterance.rate =
        0.9;


      utterance.onend =
        resolve;

      utterance.onerror =
        resolve;


      window.speechSynthesis.speak(
        utterance
      );
    }
  );
}


/* =========================================================
   搜尋
   ========================================================= */

async function searchWords() {

  const text =
    searchInput.value.trim();

  await loadWords(text);
}


/* =========================================================
   HTML 安全處理
   ========================================================= */

function escapeHtml(value) {

  if (value === null ||
      value === undefined) {

    return "";
  }


  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   事件
   ========================================================= */

loginBtn.addEventListener(
  "click",
  login
);


signupBtn.addEventListener(
  "click",
  signup
);


logoutBtn.addEventListener(
  "click",
  logout
);


addWordBtn.addEventListener(
  "click",
  addWord
);


searchBtn.addEventListener(
  "click",
  searchWords
);


newWordInput.addEventListener(
  "keydown",
  function (event) {

    if (event.key === "Enter") {

      addWord();
    }
  }
);


searchInput.addEventListener(
  "keydown",
  function (event) {

    if (event.key === "Enter") {

      searchWords();
    }
  }
);


/* =========================================================
   Supabase 登入狀態
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async function (event, session) {

    if (session && session.user) {

      await showApp(
        session.user
      );

    } else {

      authSection.classList.remove(
        "hidden"
      );

      appSection.classList.add(
        "hidden"
      );
    }
  }
);


/* =========================================================
   啟動
   ========================================================= */

async function checkUser() {

  const {
    data
  } =
    await supabaseClient.auth.getUser();


  if (data.user) {

    await showApp(
      data.user
    );

  } else {

    authSection.classList.remove(
      "hidden"
    );

    appSection.classList.add(
      "hidden"
    );
  }
}


checkUser();