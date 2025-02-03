/***********************
 * 1. CONTRACT PARAMETERS
 ***********************/
const contractAddress = "0x121af877c249ab6b950634026c8251baa9226a1e";
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "newName",
        "type": "string"
      }
    ],
    "name": "setUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newScore",
        "type": "uint256"
      }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "withdrawNative",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTop10",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "player",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "score",
            "type": "uint256"
          }
        ],
        "internalType": "struct Faucet.Leader[10]",
        "name": "",
        "type": "tuple[10]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "scores",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "top10",
    "outputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "score",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userNames",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
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

/***********************
 * 3. CONNECT METAMASK
 ***********************/
async function connectMetamask() {
  if (!window.ethereum) {
    alert("Metamask not found. Please install a wallet extension.");
    return null;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log("Wallet connected!");
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
 * 4. SET USERNAME ON-CHAIN
 ***********************/
async function setOnChainUsername(newName) {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const tx = await faucetContract.setUsername(newName);
    await tx.wait();
    alert("Username set on-chain successfully!");
  } catch (err) {
    console.error("setOnChainUsername error:", err);
    alert("Failed to set username on-chain");
  }
}

/***********************
 * 5. LOAD TOP-10
 ***********************/
async function loadTop10() {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const top = await faucetContract.getTop10();

    // Собираем данные для таблицы
    const leaderData = [];
    for (let i = 0; i < top.length; i++) {
      const playerAddr = top[i].player;
      const scoreVal = top[i].score.toString();

      // Запрашиваем имя из контракта
      const chainUsername = await faucetContract.userNames(playerAddr);

      // Если имя не задано, показываем короткий адрес
      const displayName = chainUsername && chainUsername.length > 0
        ? chainUsername
        : shortAddress(playerAddr);

      leaderData.push({
        user: displayName,
        tokens: scoreVal
      });
    }

    console.log("Top-10 from contract:", leaderData);
    renderLeaderboard(leaderData, true);

    // Выведем лучший счёт для текущего адреса
    const signerAddress = await signer.getAddress();
    const best = await faucetContract.scores(signerAddress);
    console.log("Your best on-chain score:", best.toString());

    const bestScoreEl = document.getElementById('myBestScore');
    if (bestScoreEl) {
      bestScoreEl.textContent = "Your best score: " + best.toString();
    }
  } catch (err) {
    console.error("loadTop10 error:", err);
    alert("Failed to load leaderboard");
  }
}

/***********************
 * 5b. LOAD ALL SCORES (IF YOU HAVE SUCH FUNCTION)
 ***********************/
// This contract doesn't have getAllScores event in the new ABI, so commented out
// If needed, re-implement or remove entirely

// async function loadAllScores() {
//   // Not implemented because the new contract doesn't have getAllScores
// }

/***********************
 * 6. SUBMIT SCORE (NATIVE PAYMENT)
 ***********************/
async function submitScoreOnChain(finalScore) {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);

    // Для примера берём price = 1 нативный токен
    const priceWei = ethers.utils.parseEther("1");
    const tx = await faucetContract.submitScore(finalScore, { value: priceWei });
    await tx.wait();
    console.log("Score submitted on-chain:", finalScore);
    alert("Score submitted successfully!");

    // Обновляем Top-10
    await loadTop10();
  } catch (err) {
    console.error("submitScoreOnChain error:", err);
    alert("Failed to submit score");
  }
}

/***********************
 * 7. GAME (BUBBLES)
 ***********************/
let score = 0;
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
 * 8. MENU / SETTINGS
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
 * 9. LEADERBOARD (TABLE)
 ***********************/
function renderLeaderboard(leaderData, isChain = false) {
  const leaderboardBody = document.querySelector('#leaderboard tbody');
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = '';

  leaderData.forEach((item) => {
    const row = document.createElement('tr');

    const userCell = document.createElement('td');
    userCell.textContent = item.user;
    row.appendChild(userCell);

    const tokensCell = document.createElement('td');
    tokensCell.textContent = item.tokens;
    row.appendChild(tokensCell);

    leaderboardBody.appendChild(row);
  });
}

/***********************
 * 10. USERNAME ON-CHAIN
 ***********************/
const onChainNameInput = document.getElementById('usernameInput');
const saveUsernameBtnField = document.getElementById('saveUsernameBtn');

if (onChainNameInput) {
  saveUsernameBtnField.addEventListener('click', async () => {
    const name = onChainNameInput.value.trim();
    if (!name) {
      alert("Enter a valid username!");
      return;
    }
    // Сохраняем имя на блокчейне
    await setOnChainUsername(name);
    alert(`Username "${name}" set on-chain!`);
    // Можно сразу перезагрузить Top-10, чтобы увидеть новое имя
    await loadTop10();
  });
}

/***********************
 * 11. LOCAL LEADERBOARD
 ***********************/
function renderLocalLeaderboard() {
  const data = [{ user: "LocalUser", tokens: score }];
  // Здесь вы просто показываете локальную статистику
  renderLeaderboard(data, false);
}
// При загрузке — локальная таблица
renderLocalLeaderboard();

/***********************
 * 12. CONNECT WALLET BUTTON (Metamask)
 ***********************/
const connectWalletBtn = document.getElementById('connectWalletBtn');
if (connectWalletBtn) {
  connectWalletBtn.addEventListener('click', async () => {
    console.log("Connect Wallet clicked!");
    const result = await connectMetamask();
    if (!result) {
      alert("Could not connect to Metamask");
      return;
    }
    console.log("Wallet connected!");
  });
}

/**********************************************
 * 13. MAKE SURE THE BUTTON IS ABOVE THE MENU
 **********************************************/
const topRightControls = document.querySelector('.top-right-controls');
if (topRightControls) {
  topRightControls.style.zIndex = '10001';
  topRightControls.style.pointerEvents = 'auto';
}

// Show short address after connecting
connectWalletBtn.addEventListener('click', async () => {
  const result = await connectMetamask();
  if (!result) {
    alert("Could not connect to Metamask");
    return;
  }
  const { signer } = result;
  const address = await signer.getAddress();
  connectWalletBtn.textContent = `Wallet: ${shortAddress(address)}`;
  console.log("Wallet connected:", address);
});

/***********************
 * HELPER: SHORT ADDRESS
 ***********************/
function shortAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

/***********************
 * BUTTON "SAVE SCORE"
 ***********************/
const saveScoreBtn = document.getElementById('saveScoreBtn');
if (saveScoreBtn) {
  saveScoreBtn.addEventListener('click', async () => {
    // Отправляем текущий локальный score
    await submitScoreOnChain(score);
  });
}
