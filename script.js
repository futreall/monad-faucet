/***********************
 * 1. CONTRACT PARAMETERS
 ***********************/
const contractAddress = "0xa0f4c7218a5f5dcb999cd6317be6027e70fdc8f4"; 
const contractABI = [
  // ... ABI ...
];

// ERC-20 token
const tokenAddress = "0x044789496dE6BFfC78A56965d582B08a2045BeB5"; 
const tokenAbi = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value",   "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
];

/***********************
 * 2. GLOBAL SETTINGS
 ***********************/
let score = 0;
let currentBubbleCount = 20;
let currentSpeed = 1;
let soundOn = true;

let localUsername = localStorage.getItem('username') || "";

/***********************
 * 3. CONNECT METAMASK (SIMPLE)
 ***********************/
async function connectMetamask() {
  if (!window.ethereum) {
    alert("Metamask not found. Please install a wallet extension.");
    return null;
  }
  try {
    // Запрашиваем доступ к аккаунтам
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log("Wallet connected!");

    // Создаём ethers-провайдер
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    return { provider, signer };
  } catch (err) {
    console.error("User rejected request:", err);
    alert("Wallet connection rejected");
    return null;
  }
}

/***********************
 * 4. APPROVE + SUBMIT + LOADTOP10
 ***********************/
async function approveTokens(amountWei) {
  const result = await connectMetamask();
  if (!result) return false;
  const { signer } = result;

  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
    const tx = await tokenContract.approve(contractAddress, amountWei);
    await tx.wait();
    console.log("Approved tokens:", amountWei);
    return true;
  } catch (err) {
    console.error("approveTokens error:", err);
    alert("Approve failed");
    return false;
  }
}

async function submitScoreOnChain(finalScore) {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const tx = await faucetContract.submitScore(finalScore);
    await tx.wait();

    console.log("Score submitted on-chain:", finalScore);
    alert("Score submitted successfully!");
  } catch (err) {
    console.error("submitScore error:", err);
    alert("Failed to submit score");
  }
}

async function loadTop10() {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const top = await faucetContract.getTop10();
    const leaderData = top.map(item => ({
      user: item.player,
      tokens: item.score.toString()
    }));
    console.log("Top-10 from contract:", leaderData);

    renderLeaderboard(leaderData, true);
  } catch (err) {
    console.error("loadTop10 error:", err);
    alert("Failed to load leaderboard");
  }
}

/***********************
 * 5. BUTTON "SAVE SCORE"
 ***********************/
const saveScoreBtn = document.getElementById('saveScoreBtn');
if (saveScoreBtn) {
  saveScoreBtn.addEventListener('click', async () => {
    const priceWei = "1000000000000000000"; // 1 token
    const ok = await approveTokens(priceWei);
    if (ok) {
      await submitScoreOnChain(score);
      await loadTop10(); 
    }
  });
}

/***********************
 * 6. GAME (BUBBLES)
 ***********************/
for (let i = 0; i < 20; i++) {
  createBubble('port');
  createBubble('Fearel');
  createBubble('mikeweb');
}

function createBubble(type = 'random') {
  const bubble = document.createElement('div');

  if (type === 'random') {
    const rnd = Math.random();
    if (rnd < 0.33) bubble.classList.add('bubble', 'port');
    else if (rnd < 0.66) bubble.classList.add('bubble', 'Fearel');
    else bubble.classList.add('bubble', 'mikeweb');
  } else {
    bubble.classList.add('bubble', type);
  }

  bubble.style.top = `${Math.random() * 80}vh`;
  bubble.style.left = `${Math.random() * 80}vw`;
  document.querySelector('.bubble-container').appendChild(bubble);

  let deltaX = (Math.random() * 0.89 + 0.44) * (Math.random() > 0.5 ? 1 : -1) * currentSpeed;
  let deltaY = (Math.random() * 0.89 + 0.44) * (Math.random() > 0.5 ? 1 : -1) * currentSpeed;

  function moveBubble() {
    const bubbleRect = bubble.getBoundingClientRect();
    const containerRect = document.querySelector('.bubble-container').getBoundingClientRect();

    if (bubbleRect.left <= containerRect.left) {
      deltaX = Math.abs(deltaX);
    } else if (bubbleRect.right >= containerRect.right) {
      deltaX = -Math.abs(deltaX);
    }
    if (bubbleRect.top <= containerRect.top) {
      deltaY = Math.abs(deltaY);
    } else if (bubbleRect.bottom >= containerRect.bottom) {
      deltaY = -Math.abs(deltaY);
    }

    bubble.style.left = `${bubble.offsetLeft + deltaX}px`;
    bubble.style.top = `${bubble.offsetTop + deltaY}px`;

    if (!bubble.classList.contains('pop')) {
      requestAnimationFrame(moveBubble);
    }
  }
  moveBubble();

  bubble.addEventListener('click', () => {
    bubble.classList.add('pop');
    playSound('pop.mp3');
    score++;
    document.getElementById('score').textContent = score;

    renderLocalLeaderboard();

    setTimeout(() => {
      bubble.remove();
      createBubble(type);
    }, 300);
  });
}

function playSound(soundFile) {
  if (!soundOn) return;
  const audio = new Audio(soundFile);
  audio.play();
}

/***********************
 * 7. MENU / SETTINGS
 ***********************/
const menu = document.querySelector('.menu');
const startBtn = document.getElementById('startBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

const bubbleCountSelect = document.getElementById('bubbleCount');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const soundToggle = document.getElementById('soundToggle');
const resetScoreBtn = document.getElementById('resetScoreBtn');

startBtn.addEventListener('click', () => {
  playSound('pop.mp3');
  console.log("Start clicked -> hiding menu");
  menu.style.display = 'none';
});

settingsBtn.addEventListener('click', () => {
  playSound('pop.mp3');
  settingsModal.style.display = 'block';
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
  applySettings();
  reSpawnGame();
});

function applySettings() {
  currentBubbleCount = parseInt(bubbleCountSelect.value);
  currentSpeed = parseFloat(speedRange.value);
  soundOn = soundToggle.checked;
}

function reSpawnGame() {
  const allBubbles = document.querySelectorAll('.bubble');
  allBubbles.forEach(b => b.remove());
  for (let i = 0; i < currentBubbleCount; i++) {
    createBubble('port');
    createBubble('Fearel');
    createBubble('mikeweb');
  }
}

resetScoreBtn.addEventListener('click', () => {
  score = 0;
  document.getElementById('score').textContent = score;
  renderLocalLeaderboard();
});

speedRange.addEventListener('input', () => {
  speedValue.textContent = speedRange.value;
});

const settingsIcon = document.getElementById('settingsIcon');
settingsIcon.addEventListener('click', () => {
  playSound('pop.mp3');
  settingsModal.style.display = 'block';
});

/***********************
 * 8. LEADERBOARD (TABLE)
 ***********************/
function renderLeaderboard(leaderData, isChain = false) {
  const leaderboardBody = document.querySelector('#leaderboard tbody');
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = '';

  // (isChain=false => локальный, isChain=true => контрактные)
  leaderData.forEach((item) => {
    const row = document.createElement('tr');
    let displayName = item.user;
    // (можно тут сравнить address, но мы убрали Web3Modal => оставим так)

    const userCell = document.createElement('td');
    userCell.textContent = displayName;
    row.appendChild(userCell);

    const tokensCell = document.createElement('td');
    tokensCell.textContent = item.tokens;
    row.appendChild(tokensCell);

    leaderboardBody.appendChild(row);
  });
}

/***********************
 * 9. USERNAME (LOCAL)
 ***********************/
const usernameContainer = document.getElementById('usernameContainer');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtnField = document.getElementById('saveUsernameBtn');

if (localUsername) {
  usernameInput.value = localUsername;
}

saveUsernameBtnField.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Enter a valid username!");
    return;
  }
  localUsername = name;
  localStorage.setItem('username', name);
  alert(`Username "${name}" saved locally!`);
  renderLocalLeaderboard();
});

function renderLocalLeaderboard() {
  const data = [];
  if (localUsername) {
    data.push({ user: localUsername, tokens: score });
  }
  renderLeaderboard(data, false);
}
// При загрузке — локальная таблица
renderLocalLeaderboard();

/***********************
 * 10. CONNECT WALLET BUTTON (Metamask)
 ***********************/
const connectWalletBtn = document.getElementById('connectWalletBtn');
if (connectWalletBtn) {
  connectWalletBtn.addEventListener('click', async () => {
    console.log("Connect Wallet clicked!");

    // Вместо web3Modal => simple Metamask connect
    const result = await connectMetamask();
    if (!result) {
      alert("Could not connect to Metamask");
      return;
    }
    console.log("Wallet connected!");
    // option: loadTop10() or do something
  });
}

/**********************************************
 * 11. MAKE SURE THE BUTTON IS ABOVE THE MENU
 **********************************************/
const topRightControls = document.querySelector('.top-right-controls');
if (topRightControls) {
  topRightControls.style.zIndex = '10001';
  topRightControls.style.pointerEvents = 'auto';
}

//new code for connected metamask 
connectWalletBtn.addEventListener('click', async () => {
  console.log("Connect Wallet clicked!");

  const result = await connectMetamask();
  if (!result) {
    alert("Could not connect to Metamask");
    return;
  }

  // Получаем адрес, меняем текст кнопки
  const { signer } = result;
  const address = await signer.getAddress();
  connectWalletBtn.textContent = `Wallet: ${shortAddress(address)}`;
  // Или просто: connectWalletBtn.textContent = "Connected!";

  console.log("Wallet connected:", address);
});

// Сокращённый вид адреса: 0x1234...abcd
function shortAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
