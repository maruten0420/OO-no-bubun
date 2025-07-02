// quizzes.js からクイズデータをインポート
import { quizzes } from './quizzes.js';

// --- DOM要素 ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const settingsModal = document.getElementById('settings-modal');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const retryBtn = document.getElementById('retry-btn');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules-btn');
const backToTitleBtn = document.getElementById('back-to-title-btn');
const tweetBtn = document.getElementById('tweet-btn');
const questionCounter = document.getElementById('question-counter');
const scoreDisplay = document.getElementById('score-display');
const timerBarInner = document.getElementById('timer-bar-inner');
const finalScore = document.getElementById('final-score');
const bgmVolumeSlider = document.getElementById('bgm-volume');
const seVolumeSlider = document.getElementById('se-volume');
const questionLogContainer = document.getElementById('question-log-container');
const answerButtons = document.querySelectorAll('.answer-btn');

// --- ゲーム状態変数 ---
let currentQuestionIndex = 0, score = 0, timer, timeLeft = 0;
const initialTime = 10, MAX_LOG_ITEMS = 10; // ログの最大表示数を調整
let shuffledQuizzes = [], shuffledOptions = [], acceptingAnswers = true, currentLogItem;
const emojiMap = ["1️⃣", "2️⃣", "3️⃣"];
let bgm, seCorrect, seIncorrect, bgmVolume, seVolume;

// --- 音声関連 ---
const initAudio = () => { if (!bgm) { bgmVolume = new Tone.Volume(-20).toDestination(); bgm = new Tone.Loop(time => { const synth = new Tone.Synth().connect(bgmVolume); synth.triggerAttackRelease("C3", "8n", time); synth.triggerAttackRelease("G3", "8n", time + Tone.Time("8n").toSeconds()); synth.triggerAttackRelease("E3", "8n", time + Tone.Time("4n").toSeconds()); }, "2n"); seVolume = new Tone.Volume(-10).toDestination(); seCorrect = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).connect(seVolume); seIncorrect = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 } }).connect(seVolume); updateBgmVolume(); updateSeVolume(); }};
const updateBgmVolume = () => { if(bgmVolume) bgmVolume.volume.value = bgmVolumeSlider.value == 0 ? -Infinity : (bgmVolumeSlider.value / 100) * 40 - 40; };
const updateSeVolume = () => { if(seVolume) seVolume.volume.value = seVolumeSlider.value == 0 ? -Infinity : (seVolumeSlider.value / 100) * 30 - 30; };

// --- ユーティリティ関数 ---
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getCurrentTimestamp = () => new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

// --- 画面遷移 ---
const switchScreen = (activeScreen) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    activeScreen.classList.add('active');
};

// --- ゲームロジック ---
const startGame = async () => {
    // Tone.jsのコンテキストを開始
    if (Tone.context.state !== 'running') await Tone.start();
    
    switchScreen(gameScreen);
    questionLogContainer.innerHTML = '';
    shuffledQuizzes = shuffleArray(quizzes);
    currentQuestionIndex = 0; score = 0;
    updateScoreDisplay();
    if (bgm) { bgm.start(0); Tone.Transport.start(); }
    
    await startCountdown();

    timeLeft = initialTime;
    showQuestion();
    startTimer();
};

const startCountdown = async () => {
    acceptingAnswers = false;
    answerButtons.forEach(btn => btn.disabled = true);
    
    // Discord風のメッセージ要素を作成
    const logItem = createLogItem();
    const messageContent = logItem.querySelector('.message-content');
    
    const countdownTextElement = document.createElement('p');
    countdownTextElement.className = 'message-text countdown-text';
    messageContent.appendChild(countdownTextElement);

    for (let i = 3; i > 0; i--) {
        countdownTextElement.textContent = i;
        await sleep(1000);
    }
    // カウントダウンが終わったらメッセージを削除
    logItem.remove();
};

const showQuestion = () => {
    acceptingAnswers = true;
    answerButtons.forEach(btn => {
        btn.disabled = false;
        btn.className = 'answer-btn discord-button-secondary'; // ボタンの色をリセット
    });
    
    const quiz = shuffledQuizzes[currentQuestionIndex];
    // ★ 修正点1: 選択肢のテキストに「の部分」を追加
    shuffledOptions = quiz.o.map((text, originalIndex) => ({ text: `${text}の部分`, originalIndex })).sort(() => Math.random() - 0.5);
    
    answerButtons.forEach((btn, i) => {
        btn.innerHTML = `<span>${emojiMap[i]}</span><span>${shuffledOptions[i].text}</span>`;
    });

    // 問題をDiscord風メッセージとして表示
    currentLogItem = createLogItem();
    const messageContent = currentLogItem.querySelector('.message-content');
    // ★ 修正点2: 問題文に「 の……」を追加
    messageContent.innerHTML += `<p class="message-text">${currentQuestionIndex + 1}. ${quiz.q} の……</p>`;
    messageContent.innerHTML += `<div class="reactions-container"></div>`;
    
    limitQuestionLog();
    questionCounter.textContent = `Q${currentQuestionIndex + 1}`;
};

// checkAnswer関数をまるごとこちらに置き換えてください

const checkAnswer = (choiceIndex) => {
    if (!acceptingAnswers) return;
    acceptingAnswers = false;
    answerButtons.forEach(btn => btn.disabled = true);
    
    const quiz = shuffledQuizzes[currentQuestionIndex];
    const selectedOption = shuffledOptions[choiceIndex];
    const isCorrect = selectedOption.originalIndex === 0;
    
    const reactionContainer = currentLogItem.querySelector('.reactions-container');
    
    // --- リアクション生成ロジック ---

    // 1. ユーザーが選択した選択肢のリアクション
    //    CSSで色を変えるため、特別なクラスを付与
    const userChoiceReaction = `<span class="reaction user-choice-reaction">${emojiMap[choiceIndex]}<span class="reaction-count">1</span></span>`;
    reactionContainer.innerHTML += userChoiceReaction;

    // 2. 正解・不正解のリアクション
    const resultEmoji = isCorrect ? '⭕' : '❌';
    const resultReaction = `<span class="reaction">${resultEmoji}<span class="reaction-count">1</span></span>`;
    reactionContainer.innerHTML += resultReaction;

    // 3. 25%の確率で追加のリアクション
    if (Math.random() < 0.25) {
        const extraEmojis = isCorrect 
            ? ['🎉', '👍', '😊', '🥳'] // 正解時の絵文字候補
            : ['😢', '😭', '🤔'];   // 不正解時の絵文字候補
        
        const extraEmoji = extraEmojis[Math.floor(Math.random() * extraEmojis.length)];
        const extraReaction = `<span class="reaction">${extraEmoji}<span class="reaction-count">1</span></span>`;
        reactionContainer.innerHTML += extraReaction;
    }

    // --- ここまでリアクション生成ロジック ---

    if (isCorrect) {
        score++;
        if(seCorrect) seCorrect.triggerAttackRelease('C5', '0.1s');
        answerButtons[choiceIndex].classList.remove('discord-button-secondary');
        answerButtons[choiceIndex].classList.add('bg-green-600');
        const timeBonus = Math.max(5 - 0.1 * score, 1 - (0.01 * (Math.max(0, score - 25))), 0.5);
        timeLeft = Math.min(timeLeft + timeBonus, initialTime);
        
    } else {
        if(seIncorrect) seIncorrect.triggerAttackRelease('C3', '0.2s');
        answerButtons[choiceIndex].classList.remove('discord-button-secondary');
        answerButtons[choiceIndex].classList.add('bg-red-600');
        
        const correctBtnIndex = shuffledOptions.findIndex(opt => opt.originalIndex === 0);
        answerButtons[correctBtnIndex].classList.remove('discord-button-secondary');
        answerButtons[correctBtnIndex].classList.add('bg-green-600');
    }

    updateScoreDisplay();

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < shuffledQuizzes.length) { 
            showQuestion(); 
        } else { 
            endGame(); 
        }
    }, 1500);
};

const startTimer = () => {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        const timerWidth = (timeLeft / initialTime) * 100;
        timerBarInner.style.width = `${Math.max(0, timerWidth)}%`;
        
        if(timerWidth < 25) timerBarInner.className = 'h-full rounded-full timer-bar-inner bg-red-500';
        else if(timerWidth < 50) timerBarInner.className = 'h-full rounded-full timer-bar-inner bg-yellow-500';
        else timerBarInner.className = 'h-full rounded-full timer-bar-inner bg-green-500';
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 100);
};

const endGame = () => {
    clearInterval(timer);
    if(bgm) { bgm.stop(); Tone.Transport.stop(); }
    switchScreen(endScreen);
    finalScore.textContent = score;
};

// --- DOM操作ヘルパー ---
const createLogItem = () => {
    const logItem = document.createElement('div');
    logItem.className = 'question-log-item';
    
    // p-colon.png がない場合のためのフォールバック
    const iconHTML = `<img src="p-colon.png" alt="icon" class="user-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #7289da; color: white; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 1rem; display: none;">P</div>`;
    
    logItem.innerHTML = `
        ${iconHTML}
        <div class="message-content">
            <div class="user-info">
                <span class="user-name">ピーコロン</span>
                <span class="timestamp">${getCurrentTimestamp()}</span>
            </div>
        </div>
    `;
    questionLogContainer.prepend(logItem);
    scrollToBottom();
    return logItem;
};

const limitQuestionLog = () => {
    while (questionLogContainer.children.length > MAX_LOG_ITEMS) {
        questionLogContainer.removeChild(questionLogContainer.lastChild);
    }
};

const scrollToBottom = () => {
    questionLogContainer.scrollTop = 0; // column-reverseなので0で一番下に
};

const updateScoreDisplay = () => { scoreDisplay.textContent = `Score: ${score}`; };

// --- イベントリスナー ---
const handleKeyPress = (e) => { 
    if (gameScreen.classList.contains('active') && acceptingAnswers) { 
        if (e.key === '1') checkAnswer(0); 
        if (e.key === '2') checkAnswer(1); 
        if (e.key === '3') checkAnswer(2); 
    } 
};

startBtn.addEventListener('click', () => { initAudio(); startGame(); });
retryBtn.addEventListener('click', startGame);
backToTitleBtn.addEventListener('click', () => switchScreen(startScreen));
tweetBtn.addEventListener('click', () => { 
    const text = `私は○○の○○の部分3択クイズに ${score} 問正解しました！\n↓このリンクからあなたもチャレンジ！↓`;
    const url = "https://maruten0420.github.io/OO-no-bubun/";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank'); 
});
document.addEventListener('keydown', handleKeyPress);
answerButtons.forEach((btn) => btn.addEventListener('click', (e) => checkAnswer(parseInt(e.currentTarget.dataset.choiceIndex))));
rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
bgmVolumeSlider.addEventListener('input', updateBgmVolume);
seVolumeSlider.addEventListener('input', updateSeVolume);
