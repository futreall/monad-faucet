/***********************
 * 1. CONTRACT PARAMETERS
 ***********************/
// Adress Faucet-contract
const contractAddress = "0xa0f4c7218a5f5dcb999cd6317be6027e70fdc8f4"; 
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
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "tokenAddress",
				"type": "address"
			},
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
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "withdrawTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "gameToken",
		"outputs": [
			{
				"internalType": "contract IERC20",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
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

// ERC-20 token (for approve)
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

/***********************
 * 3. Metamask Connection
 ***********************/
async function connectWallet() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Wallet connected");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      return { provider, signer };
    } catch (err) {
      console.error("User rejected the request:", err);
      alert("Wallet connection rejected");
    }
  } else {
    alert("No Metamask found. Please install a wallet extension.");
  }
}

/***********************
 * 4. APPROVE + SUBMIT + LOADTOP10
 ***********************/
async function approveTokens(amountWei) {
  try {
    const { signer } = await connectWallet();
    if (!signer) return false;

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
  try {
    const { signer } = await connectWallet();
    if (!signer) return;

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
  try {
    const { signer } = await connectWallet();
    if (!signer) return;

    const faucetContract = new ethers.Contract(contractAddress, contractABI, signer);
    const top = await faucetContract.getTop10();

    // Transforming [{player, score}] -> [{user, tokens}]
    const leaderData = top.map(item => ({
      user: item.player,
      tokens: item.score.toString()
    }));
    console.log("Top-10 from contract:", leaderData);
    renderLeaderboard(leaderData);
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
    const priceWei = "1000000000000000000"; // 1 токен (18 decimals)
    // 1) Approve
    const ok = await approveTokens(priceWei);
    if (ok) {
      // 2) Submit
      await submitScoreOnChain(score);
      // 3) Load top-10
      await loadTop10();
    }
  });
}

/***********************
 * 6. GAME (BUBBLES)
 ***********************/
// Creating bubbles on load (20 of each type)
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

    if (bubble.classList.contains('port')) {
      playSound('pop.mp3');
      score++;
    } else if (bubble.classList.contains('Fearel')) {
      playSound('pop.mp3');
      score++;
    } else if (bubble.classList.contains('mikeweb')) {
      playSound('pop.mp3');
      score++;
    }

    document.getElementById('score').textContent = score;

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

// Start
startBtn.addEventListener('click', () => {
  playSound('pop.mp3');
  menu.style.display = 'none';
});

// Settings
settingsBtn.addEventListener('click', () => {
  playSound('pop.mp3');
  settingsModal.style.display = 'block';
});

// Close settings
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
function renderLeaderboard(leaderData) {
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

// Fake data (remove/replace when in real contract)
const fakeData = [
  { user: 'Vitalik', tokens: 100 },
  { user: 'CZ', tokens: 50 },
  { user: 'Satoshi', tokens: 9999 }
];
renderLeaderboard(fakeData);

/***********************
 * 9. USERNAME (SAVING LOCALLY)
 ***********************/
const usernameContainer = document.getElementById('usernameContainer');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtnField = document.getElementById('saveUsernameBtn');

saveUsernameBtnField.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Enter a valid username!");
    return;
  }
  // Saving in localStorage (example)
  localStorage.setItem('username', name);
  alert(`Username "${name}" saved locally!`);
});
