/***********************
 * 1. CONTRACT PARAMETERS
 ***********************/
const contractAddress = "0x121af877c249ab6b950634026c8251baa9226a1e";
const contractABI = [
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
  }
];

/***********************
 * 2. GLOBAL SETTINGS
 ***********************/
let score = 0;
let currentBubbleCount = 20;
let currentSpeed = 1;
let soundOn = true;
// Локальный ник пользователя (только у себя, в блокчейне не хранится)
let localUsername = localStorage.getItem("username") || "";

/***********************
 * 3. CONNECT METAMASK (SIMPLE)
 ***********************/
async function connectMetamask() {
  if (!window.ethereum) {
    alert("Metamask not found. Please install a wallet extension.");
    return null;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return { provider, signer };
  } catch (err) {
    alert("Wallet connection rejected");
    return null;
  }
}

/***********************
 * 4. LOAD TOP-10 (CHAIN)
 ***********************/
async function loadTop10() {
  const result = await connectMetamask();
  if (!result) return;
  const { signer } = result;

  try {
    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const top = await faucetContract.getTop10();
    // Собираем массив данных (адрес -> короткий вид)
    const leaderData = top.map((item) => ({
      user: shortAddress(item.player),
      tokens: item.score.toString(),
    }));

    renderLeaderboard(leaderData);

    // Дополнительно покажем лучший счёт подключённого адреса (необязательно)
    const signerAddress = await signer.getAddress();
    const best = await faucetContract.scores(signerAddress);
    const bestScoreEl = document.getElementById("myBestScore");
    if (bestScoreEl) {
      bestScoreEl.textContent = "Your best score: " + best.toString();
    }
  } catch (err) {
    alert("Failed to load leaderboard");
  }
}

/***********************
 * 5. BUTTON "SAVE SCORE" (NATIVE PAYMENT)
 ***********************/
const saveScoreBtn = document.getElementById("saveScoreBtn");
if (saveScoreBtn) {
  saveScoreBtn.addEventListener("click", async () => {
    const result = await connectMetamask();
    if (!result) return;
    const { signer } = result;

    try {
      const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
      // 1 native token
      const priceWei = ethers.utils.parseEther("1");
      const tx = await faucetContract.submitScore(score, { value: priceWei });
      await tx.wait();
      alert("Score submitted successfully!");
      await loadTop10();
    } catch {
      alert("Failed to submit score");
    }
  });
}

/***********************
 * 6. GAME (BUBBLES)
 ***********************/
for (let i = 0; i < 20; i++) {
  createBubble("port");
  createBubble("Fearel");
  createBubble("mikeweb");
}

function createBubble(type = "random") {
  const bubble = document.createElement("div");
  if (type === "random") {
    const rnd = Math.random();
    if (rnd < 0.33) bubble.classList.add("bubble", "port");
    else if (rnd < 0.66) bubble.classList.add("bubble", "Fearel");
    else bubble.classList.add("bubble", "mikeweb");
  } else {
    bubble.classList.add("bubble", type);
  }

  bubble.style.top = `${Math.random() * 80}vh`;
  bubble.style.left = `${Math.random() * 80}vw`;
  document.querySelector(".bubble-container").appendChild(bubble);

  let deltaX = (Math.random() * 0.89 + 0.44) * (Math.random() > 0.5 ? 1 : -1) * currentSpeed;
  let deltaY = (Math.random() * 0.89 + 0.44) * (Math.random() > 0.5 ? 1 : -1) * currentSpeed;

  function moveBubble() {
    const bubbleRect = bubble.getBoundingClientRect();
    const containerRect = document.querySelector(".bubble-container").getBoundingClientRect();

    if (bubbleRect.left <= containerRect.left) deltaX = Math.abs(deltaX);
    else if (bubbleRect.right >= containerRect.right) deltaX = -Math.abs(deltaX);
    if (bubbleRect.top <= containerRect.top) deltaY = Math.abs(deltaY);
    else if (bubbleRect.bottom >= containerRect.bottom) deltaY = -Math.abs(deltaY);

    bubble.style.left = `${bubble.offsetLeft + deltaX}px`;
    bubble.style.top = `${bubble.offsetTop + deltaY}px`;
    if (!bubble.classList.contains("pop")) requestAnimationFrame(moveBubble);
  }
  moveBubble();

  bubble.addEventListener("click", () => {
    bubble.classList.add("pop");
    playSound("pop.mp3");
    score++;
    document.getElementById("score").textContent = score;
    setTimeout(() => {
      bubble.remove();
      createBubble(type);
    }, 300);
  });
}

function playSound(soundFile) {
  if (!soundOn) return;
  new Audio(soundFile).play();
}

/***********************
 * 7. MENU / SETTINGS
 ***********************/
const menu = document.querySelector(".menu");
const startBtn = document.getElementById("startBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

const bubbleCountSelect = document.getElementById("bubbleCount");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");
const soundToggle = document.getElementById("soundToggle");
const resetScoreBtn = document.getElementById("resetScoreBtn");

startBtn.addEventListener("click", () => {
  playSound("pop.mp3");
  menu.style.display = "none";
});

settingsBtn.addEventListener("click", () => {
  playSound("pop.mp3");
  settingsModal.style.display = "block";
});

closeSettingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "none";
  applySettings();
  reSpawnGame();
});

function applySettings() {
  currentBubbleCount = parseInt(bubbleCountSelect.value);
  currentSpeed = parseFloat(speedRange.value);
  soundOn = soundToggle.checked;
}

function reSpawnGame() {
  document.querySelectorAll(".bubble").forEach((b) => b.remove());
  for (let i = 0; i < currentBubbleCount; i++) {
    createBubble("port");
    createBubble("Fearel");
    createBubble("mikeweb");
  }
}

resetScoreBtn.addEventListener("click", () => {
  score = 0;
  document.getElementById("score").textContent = score;
});

speedRange.addEventListener("input", () => {
  speedValue.textContent = speedRange.value;
});

const settingsIcon = document.getElementById("settingsIcon");
settingsIcon.addEventListener("click", () => {
  playSound("pop.mp3");
  settingsModal.style.display = "block";
});

/***********************
 * 8. LEADERBOARD (TABLE)
 ***********************
   Теперь добавим:
   - колонку # (номер места)
   - короткий адрес
   - score
   А сверху покажем одну строку с локальным ником (если есть).
*/
function renderLeaderboard(leaderData) {
  const leaderboardBody = document.querySelector("#leaderboard tbody");
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = "";

  // Если есть локальный ник, показываем отдельную строку в самом начале
  if (localUsername) {
    const rowMe = document.createElement("tr");

    // Пустая ячейка вместо "#", чтобы ник выделялся
    const emptyCell = document.createElement("td");
    emptyCell.textContent = "You";
    rowMe.appendChild(emptyCell);

    // Ник
    const userCell = document.createElement("td");
    userCell.textContent = localUsername;
    rowMe.appendChild(userCell);

    // Текущий счёт (локальный)
    const myScoreCell = document.createElement("td");
    myScoreCell.textContent = score.toString();
    rowMe.appendChild(myScoreCell);

    leaderboardBody.appendChild(rowMe);
  }

  // Затем нумеруем топ-10
  leaderData.forEach((item, index) => {
    const row = document.createElement("tr");

    // Место (1..10)
    const rankCell = document.createElement("td");
    rankCell.textContent = (index + 1).toString();
    row.appendChild(rankCell);

    // Адрес (короткий)
    const userCell = document.createElement("td");
    userCell.textContent = item.user;
    row.appendChild(userCell);

    // Счёт
    const tokensCell = document.createElement("td");
    tokensCell.textContent = item.tokens;
    row.appendChild(tokensCell);

    leaderboardBody.appendChild(row);
  });
}

/***********************
 * 9. (USERNAME REMOVED FROM BLOCKCHAIN)
 ***********************/
// Мы не сохраняем ник в блокчейне — только локально.
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtnField = document.getElementById("saveUsernameBtn");

if (usernameInput && saveUsernameBtnField) {
  usernameInput.value = localUsername;
  saveUsernameBtnField.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    if (!name) {
      alert("Enter a valid username!");
      return;
    }
    localUsername = name;
    localStorage.setItem("username", name);
    alert(`Username "${name}" saved locally!`);
    // Перерисуем таблицу, чтобы обновить "You" строку
    // (либо дождёмся loadTop10, если нужна актуализация)
    const leaderboardBody = document.querySelector("#leaderboard tbody");
    if (leaderboardBody) {
      // Можно снова вызвать loadTop10() — тогда и наша строка обновится
      loadTop10();
    }
  });
}

/***********************
 * 10. CONNECT WALLET BUTTON (Metamask)
 ***********************/
const connectWalletBtn = document.getElementById("connectWalletBtn");
if (connectWalletBtn) {
  connectWalletBtn.addEventListener("click", async () => {
    const result = await connectMetamask();
    if (!result) {
      alert("Could not connect to Metamask");
      return;
    }
    const { signer } = result;
    const address = await signer.getAddress();
    connectWalletBtn.textContent = `Wallet: ${shortAddress(address)}`;

    // При подключении сразу грузим топ-10
    await loadTop10();
  });
}

/**********************************************
 * 11. MAKE SURE THE BUTTON IS ABOVE THE MENU
 **********************************************/
const topRightControls = document.querySelector(".top-right-controls");
if (topRightControls) {
  topRightControls.style.zIndex = "10001";
  topRightControls.style.pointerEvents = "auto";
}

function shortAddress(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
