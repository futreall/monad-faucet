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
 * 3. CONNECT + SWITCH to Monad Devnet
 ***********************/
// chainId=20143 => hex "0x4EAF"
async function connectAndSwitchMonadDevnet() {
  if (!window.ethereum) {
    alert("Metamask not found. Please install a wallet extension.");
    return null;
  }

  try {
    // 1) Запрашиваем доступ к аккаунтам
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log("Wallet connected (account access).");

    // 2) Пытаемся переключить сеть на chainId=0x4EAF
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: "0x4EAF" }]
    });
    console.log("Switched to Monad Devnet (chainId 0x4EAF).");

  } catch (err) {
    if (err.code === 4902) {
      // Сеть не известна Metamask => добавим
      console.log("Monad Devnet not found, adding chain...");
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: "0x4EAF",
            chainName: "Monad Devnet",
            nativeCurrency: {
              name: "DMON",
              symbol: "DMON",
              decimals: 18
            },
            // Если не требует auth: 
            rpcUrls: ["https://rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a"],
            // Если требует basic auth: 
            // rpcUrls: ["https://username:password@rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a"],
            
            blockExplorerUrls: ["https://explorer.monad-devnet.devnet101.com/"]
          }]
        });
        console.log("Monad Devnet added. Now switching...");
        // Пытаемся снова переключить
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: "0x4EAF" }]
        });
      } catch (addError) {
        console.error("Failed to add or switch to Monad Devnet:", addError);
        alert("Could not add Monad Devnet to Metamask automatically.");
        return null;
      }
    } else {
      console.error("Failed to switch to Monad Devnet:", err);
      alert("Switch network request was rejected or failed.");
      return null;
    }
  }

  // 3) Теперь мы на нужной сети => создаём ethers-провайдер
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return { provider, signer };
}

/***********************
 * 4. APPROVE + SUBMIT + LOADTOP10
 ***********************/
async function approveTokens(amountWei) {
  const result = await connectAndSwitchMonadDevnet();
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
  const result = await connectAndSwitchMonadDevnet();
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
  const result = await connectAndSwitchMonadDevnet();
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
    const priceWei = "1000000000000000000"; // 1 token (18 decimals)
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
// (остальная логика пузырьков, без изменений)
for (let i = 0; i < 20; i++) {
  createBubble('port');
  createBubble('Fearel');
  createBubble('mikeweb');
}

function createBubble(type = 'random') {
  // ...
  // (тот же код, не меняем)
}

function playSound(soundFile) {
  // ...
}

/***********************
 * 7. MENU / SETTINGS
 ***********************/
// (остальной код меню + resetScoreBtn, etc., без изменений)

/***********************
 * 8. LEADERBOARD (TABLE)
 ***********************/
// renderLeaderboard, etc.

/***********************
 * 9. USERNAME (LOCAL)
 ***********************/
// (тот же код: renderLocalLeaderboard, etc.)

/***********************
 * 10. CONNECT WALLET BUTTON (Monad Devnet)
 ***********************/
const connectWalletBtn = document.getElementById('connectWalletBtn');
if (connectWalletBtn) {
  connectWalletBtn.addEventListener('click', async () => {
    console.log("Connect Wallet clicked!");
    const result = await connectAndSwitchMonadDevnet();
    if (!result) {
      alert("Could not connect or switch to Monad Devnet");
      return;
    }
    // Получаем address, меняем текст кнопки
    const { signer } = result;
    const address = await signer.getAddress();
    connectWalletBtn.textContent = `Wallet: ${shortAddress(address)}`;
    console.log("Wallet connected on Monad Devnet:", address);
  });
}

// Функция укорачивает адрес: 0x1234...abcd
function shortAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

/**********************************************
 * 11. MAKE SURE THE BUTTON IS ABOVE THE MENU
 **********************************************/
const topRightControls = document.querySelector('.top-right-controls');
if (topRightControls) {
  topRightControls.style.zIndex = '10001';
  topRightControls.style.pointerEvents = 'auto';
}
