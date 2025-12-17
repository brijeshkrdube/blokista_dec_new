import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ethers } from "ethers";
import useWalletStore from "./store/walletStore";
import { CHAINS } from "./config/chains";
import { WalletService } from "./utils/walletService";
import { PriceService } from "./utils/priceService";
import { PinService } from "./utils/pinService";
import { WalletConnectService } from "./utils/walletConnectService";
import {
  Wallet, Send, ArrowDown, RefreshCw, Copy, ChevronDown, Plus, Settings,
  Globe, ArrowLeft, Check, Eye, EyeOff, Trash2, QrCode, Image, X, Search, Camera, UserPlus, Users,
  Lock, Unlock, Key, Link2, Unlink, Shield, ExternalLink, AlertTriangle
} from "lucide-react";
import "./App.css";

// Token logos - Using reliable CDN sources
const TOKEN_LOGOS = {
  BCC: "https://raw.githubusercontent.com/ApeSwapFinance/assets/main/blockchains/bcc/logo.png",
  ETH: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  BNB: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
  MATIC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  USDT: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
  USDC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
};

// Toast Context for notifications
const ToastContext = createContext();

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === "success" && <Check className="w-5 h-5" />}
            {toast.type === "error" && <X className="w-5 h-5" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log(msg) };
  }
  return context;
}

// PIN Input Component
function PinInput({ length = 6, value, onChange, error }) {
  const inputRefs = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    
    const newValue = value.split('');
    newValue[index] = val.slice(-1);
    const newPin = newValue.join('');
    onChange(newPin);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    if (/^\d+$/.test(pastedData)) {
      onChange(pastedData.padEnd(length, '').slice(0, length));
    }
  };

  return (
    <div className="pin-input-container">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`pin-input ${error ? 'pin-input-error' : ''}`}
          data-testid={`pin-input-${index}`}
        />
      ))}
    </div>
  );
}

// PIN Setup Screen
function PinSetupScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const { setIsPinSetup } = useWalletStore();

  const handleSetPin = () => {
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirmPin = () => {
    if (confirmPin !== pin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }
    PinService.savePin(pin);
    setIsPinSetup(true);
    if (onComplete) onComplete();
  };

  return (
    <div className="screen-container" data-testid="pin-setup-screen">
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-white" />
        </div>
        
        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Set Your PIN</h1>
            <p className="text-gray-400 text-center mb-8">
              Create a 6-digit PIN to secure your wallet
            </p>
            <PinInput value={pin} onChange={setPin} error={!!error} />
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <button
              className="btn-primary w-full mt-8"
              onClick={handleSetPin}
              disabled={pin.length !== 6}
              data-testid="set-pin-btn"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Confirm Your PIN</h1>
            <p className="text-gray-400 text-center mb-8">
              Re-enter your PIN to confirm
            </p>
            <PinInput value={confirmPin} onChange={setConfirmPin} error={!!error} />
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <button
              className="btn-primary w-full mt-8"
              onClick={handleConfirmPin}
              disabled={confirmPin.length !== 6}
              data-testid="confirm-pin-btn"
            >
              Confirm PIN
            </button>
            <button
              className="btn-secondary w-full mt-4"
              onClick={() => { setStep(1); setPin(''); setConfirmPin(''); setError(''); }}
            >
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// PIN Verify Modal
function PinVerifyModal({ isOpen, onClose, onSuccess, title = "Enter PIN" }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(attempts);

  // Update ref when attempts change
  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  // Reset state when modal opens/closes
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Modal just opened - reset state
      setPin('');
      setError('');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  const handleVerify = useCallback(() => {
    if (PinService.verifyPin(pin)) {
      setAttempts(0);
      onSuccess();
      onClose();
    } else {
      const currentAttempts = attemptsRef.current;
      setAttempts(prev => prev + 1);
      setError(`Incorrect PIN. ${3 - currentAttempts - 1} attempts remaining.`);
      setPin('');
      if (currentAttempts >= 2) {
        setError('Too many attempts. Please try again later.');
        setTimeout(() => {
          onClose();
          setAttempts(0);
        }, 2000);
      }
    }
  }, [pin, onSuccess, onClose]);

  useEffect(() => {
    if (pin.length === 6) {
      handleVerify();
    }
  }, [pin, handleVerify]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-testid="pin-verify-modal">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-center mb-6">
            Enter your 6-digit PIN to continue
          </p>
          <PinInput value={pin} onChange={setPin} error={!!error} />
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// Reset PIN Screen
function ResetPinScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleVerifyCurrentPin = () => {
    if (!PinService.verifyPin(currentPin)) {
      setError('Incorrect current PIN');
      setCurrentPin('');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSetNewPin = () => {
    if (newPin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleConfirmNewPin = () => {
    if (confirmPin !== newPin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }
    PinService.resetPin(newPin);
    showToast('PIN updated successfully', 'success');
    navigate(-1);
  };

  return (
    <div className="screen-container" data-testid="reset-pin-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Reset PIN</span>
        <div className="w-6" />
      </div>
      
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        {step === 1 && (
          <>
            <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Current PIN</h2>
            <p className="text-gray-400 text-center mb-6">
              Enter your current PIN to continue
            </p>
            <PinInput value={currentPin} onChange={setCurrentPin} error={!!error} />
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <button
              className="btn-primary w-full mt-8"
              onClick={handleVerifyCurrentPin}
              disabled={currentPin.length !== 6}
            >
              Verify
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">New PIN</h2>
            <p className="text-gray-400 text-center mb-6">
              Enter your new 6-digit PIN
            </p>
            <PinInput value={newPin} onChange={setNewPin} error={!!error} />
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <button
              className="btn-primary w-full mt-8"
              onClick={handleSetNewPin}
              disabled={newPin.length !== 6}
            >
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Confirm New PIN</h2>
            <p className="text-gray-400 text-center mb-6">
              Re-enter your new PIN to confirm
            </p>
            <PinInput value={confirmPin} onChange={setConfirmPin} error={!!error} />
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <button
              className="btn-primary w-full mt-8"
              onClick={handleConfirmNewPin}
              disabled={confirmPin.length !== 6}
            >
              Confirm
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Token Logo Component with fallback
function TokenLogo({ symbol, size = 40 }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = TOKEN_LOGOS[symbol];
  
  if (!logoUrl || imgError) {
    return (
      <div 
        className="token-logo-fallback" 
        style={{ width: size, height: size, borderRadius: size / 2, fontSize: size * 0.4 }}
      >
        {symbol ? symbol[0] : "?"}
      </div>
    );
  }
  
  return (
    <img 
      src={logoUrl} 
      alt={symbol} 
      className="token-logo"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

// Welcome Screen
function WelcomeScreen() {
  const navigate = useNavigate();
  return (
    <div className="screen-container" data-testid="welcome-screen">
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Blokista Wallet</h1>
        <p className="text-gray-400 text-center mb-8">Your secure multi-chain crypto wallet</p>
        <button
          data-testid="create-wallet-btn"
          className="btn-primary w-full mb-4"
          onClick={() => navigate("/create")}
        >
          Create New Wallet
        </button>
        <button
          data-testid="import-wallet-btn"
          className="btn-secondary w-full"
          onClick={() => navigate("/import")}
        >
          Import Existing Wallet
        </button>
      </div>
    </div>
  );
}

// Create Wallet Screen
function CreateWalletScreen() {
  const navigate = useNavigate();
  const { addWallet, isPinSetup } = useWalletStore();
  const [step, setStep] = useState(isPinSetup ? 1 : 0); // Start with PIN setup if not done
  const [mnemonic, setMnemonic] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // Generate mnemonic on mount
  const [mnemonicGenerated] = useState(() => WalletService.generateMnemonic());
  
  useEffect(() => {
    setMnemonic(mnemonicGenerated);
  }, [mnemonicGenerated]);

  const handlePinSetupComplete = () => {
    setStep(1);
  };

  const handleCreate = () => {
    const wallet = WalletService.createWalletFromMnemonic(mnemonic);
    addWallet(wallet);
    navigate("/home");
  };

  if (step === 0) {
    return <PinSetupScreen onComplete={handlePinSetupComplete} />;
  }

  return (
    <div className="screen-container" data-testid="create-wallet-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Create Wallet</span>
        <div className="w-6" />
      </div>
      <div className="content px-6">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Recovery Phrase</h2>
            <p className="text-gray-400 text-sm mb-6">
              Write down these 12 words in order. Never share them with anyone!
            </p>
            <div className="bg-gray-800 rounded-xl p-4 mb-6 relative">
              <button
                className="absolute top-2 right-2 p-2"
                onClick={() => setShowMnemonic(!showMnemonic)}
              >
                {showMnemonic ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </button>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {mnemonic.split(" ").map((word, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-500 mr-2">{i + 1}.</span>
                    <span className={showMnemonic ? "text-white" : "blur-sm text-white"} aria-hidden={!showMnemonic}>{word}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => setStep(2)}
              disabled={!showMnemonic}
            >
              I Have Written It Down
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Confirm Recovery Phrase</h2>
            <p className="text-gray-400 text-sm mb-6">
              Please confirm you have saved your recovery phrase.
            </p>
            <label className="flex items-center gap-3 text-white mb-6">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 accent-purple-600"
              />
              I have securely saved my recovery phrase
            </label>
            <button
              data-testid="confirm-create-btn"
              className="btn-primary w-full"
              onClick={handleCreate}
              disabled={!confirmed}
            >
              Create Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Import Wallet Screen
function ImportWalletScreen() {
  const navigate = useNavigate();
  const { addWallet, isPinSetup } = useWalletStore();
  const [showPinSetup, setShowPinSetup] = useState(!isPinSetup);
  const [importType, setImportType] = useState("mnemonic");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handlePinSetupComplete = () => {
    setShowPinSetup(false);
  };

  const handleImport = () => {
    setError("");
    try {
      let wallet;
      if (importType === "mnemonic") {
        if (!WalletService.isValidMnemonic(input.trim())) {
          setError("Invalid recovery phrase");
          return;
        }
        wallet = WalletService.createWalletFromMnemonic(input.trim());
      } else {
        wallet = WalletService.createWalletFromPrivateKey(input.trim());
      }
      addWallet(wallet);
      navigate("/home");
    } catch (e) {
      setError("Invalid input. Please check and try again.");
    }
  };

  if (showPinSetup) {
    return <PinSetupScreen onComplete={handlePinSetupComplete} />;
  }

  return (
    <div className="screen-container" data-testid="import-wallet-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Import Wallet</span>
        <div className="w-6" />
      </div>
      <div className="content px-6">
        <div className="flex gap-2 mb-6">
          <button
            className={`flex-1 py-2 rounded-lg ${importType === "mnemonic" ? "bg-purple-600" : "bg-gray-800"}`}
            onClick={() => setImportType("mnemonic")}
          >
            Recovery Phrase
          </button>
          <button
            className={`flex-1 py-2 rounded-lg ${importType === "privateKey" ? "bg-purple-600" : "bg-gray-800"}`}
            onClick={() => setImportType("privateKey")}
          >
            Private Key
          </button>
        </div>
        <textarea
          data-testid="import-input"
          className="input-field w-full h-32 mb-4 resize-none"
          placeholder={importType === "mnemonic" ? "Enter 12-word recovery phrase..." : "Enter private key..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          data-testid="import-btn"
          className="btn-primary w-full"
          onClick={handleImport}
          disabled={!input.trim()}
        >
          Import Wallet
        </button>
      </div>
    </div>
  );
}

// Home Screen
function HomeScreen() {
  const navigate = useNavigate();
  const { getCurrentWallet, currentChainId, setCurrentChainId, tokens, nfts } = useWalletStore();
  const wallet = getCurrentWallet();
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [nativePrice, setNativePrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [tokenBalances, setTokenBalances] = useState([]);
  const [activeTab, setActiveTab] = useState("tokens");
  const [dataLoaded, setDataLoaded] = useState(false);

  const currentChain = CHAINS.find((c) => c.chainId === currentChainId) || CHAINS[0];
  const chainTokens = tokens.filter((t) => t.chainId === currentChainId);
  const chainNFTs = nfts.filter((n) => n.chainId === currentChainId);

  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      if (!wallet) return;
      
      setLoading(true);
      
      try {
        const bal = await WalletService.getBalance(wallet.address, currentChain.rpcUrl);
        if (isMounted) setBalance(bal);
        
        const priceData = await PriceService.getPrice(currentChain.chainId, currentChain.symbol);
        if (isMounted && priceData) {
          setNativePrice(priceData.price);
          setPriceChange(priceData.change);
        }
        
        const currentTokens = tokens.filter((t) => t.chainId === currentChainId);
        if (currentTokens.length > 0) {
          const balances = await Promise.all(
            currentTokens.map(async (token) => {
              try {
                const tokenBal = await WalletService.getTokenBalance(token.address, wallet.address, currentChain.rpcUrl);
                let tokenPriceData = null;
                if (currentChain.chainId === 639054) {
                  tokenPriceData = await PriceService.getBlokirstaTokenPrice(token.symbol);
                } else {
                  tokenPriceData = await PriceService.getTokenPriceByContract(currentChain.chainId, token.address);
                }
                const price = tokenPriceData?.price || null;
                return { ...token, balance: tokenBal, price, usdValue: price ? parseFloat(tokenBal) * price : 0 };
              } catch (error) {
                return { ...token, balance: "0", price: null, usdValue: 0 };
              }
            })
          );
          if (isMounted) setTokenBalances(balances);
        } else {
          if (isMounted) setTokenBalances([]);
        }
        
        if (isMounted) setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadAllData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address, currentChainId, tokens.length]);

  const { showToast } = useToast();

  const copyToClipboard = async (text, label = "Address") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied!`, "success");
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showToast(`${label} copied!`, "success");
      } catch (fallbackErr) {
        window.prompt(`Copy this ${label.toLowerCase()}:`, text);
      }
    }
  };

  const copyAddress = () => copyToClipboard(wallet?.address, "Address");

  if (!wallet) {
    return <WelcomeScreen />;
  }

  return (
    <div className="screen-container" data-testid="home-screen">
      <div className="header">
        <button
          className="chain-selector"
          onClick={() => setShowChainSelector(!showChainSelector)}
          data-testid="chain-selector"
        >
          <span>{currentChain.name}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/settings")} className="icon-btn">
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {showChainSelector && (
        <div className="chain-dropdown">
          {CHAINS.map((chain) => (
            <button
              key={chain.chainId}
              className={`chain-option ${chain.chainId === currentChainId ? "active" : ""}`}
              onClick={() => {
                setCurrentChainId(chain.chainId);
                setShowChainSelector(false);
              }}
            >
              <span>{chain.name}</span>
              {chain.chainId === currentChainId && <Check className="w-5 h-5 text-purple-500" />}
            </button>
          ))}
        </div>
      )}

      <div className="content overflow-auto">
        <div className="wallet-card">
          <p className="text-gray-400 text-sm mb-1">Total Balance</p>
          {loading ? (
            <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto" />
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-1">
                {parseFloat(balance).toFixed(4)} {currentChain.symbol}
              </h2>
              {nativePrice && (
                <div className="text-center">
                  <p className="text-gray-400">≈ ${PriceService.formatUSD(parseFloat(balance), nativePrice)} USD</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-purple-400 text-sm">
                      {currentChain.symbol} Price: ${PriceService.formatPrice(nativePrice)}
                    </span>
                    {priceChange !== null && (
                      <span className={`text-sm ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <button className="address-badge mt-4" onClick={copyAddress}>
            <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate("/send")} data-testid="send-btn">
            <div className="action-icon"><Send className="w-6 h-6" /></div>
            <span>Send</span>
          </button>
          <button className="action-btn" onClick={() => navigate("/receive")} data-testid="receive-btn">
            <div className="action-icon"><ArrowDown className="w-6 h-6" /></div>
            <span>Receive</span>
          </button>
          <button className="action-btn" onClick={() => alert("Swap feature coming soon!")}>
            <div className="action-icon"><RefreshCw className="w-6 h-6" /></div>
            <span>Swap</span>
          </button>
        </div>

        <div className="flex border-b border-gray-700 mb-4 px-4">
          <button
            className={`flex-1 py-3 text-center ${activeTab === "tokens" ? "text-purple-500 border-b-2 border-purple-500" : "text-gray-400"}`}
            onClick={() => setActiveTab("tokens")}
            data-testid="tokens-tab"
          >
            Tokens
          </button>
          <button
            className={`flex-1 py-3 text-center ${activeTab === "nfts" ? "text-purple-500 border-b-2 border-purple-500" : "text-gray-400"}`}
            onClick={() => setActiveTab("nfts")}
            data-testid="nfts-tab"
          >
            NFTs
          </button>
        </div>

        {activeTab === "tokens" && (
          <div className="px-4 pb-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Tokens</h3>
              <button 
                onClick={() => navigate("/add-token")} 
                className="text-purple-500 p-2 hover:bg-gray-800 rounded-full transition-colors" 
                data-testid="add-token-btn"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="token-item" data-testid="native-token">
              <TokenLogo symbol={currentChain.symbol} size={40} />
              <div className="flex-1">
                <p className="text-white font-medium">{currentChain.symbol}</p>
                <p className="text-gray-400 text-sm">{parseFloat(balance).toFixed(4)}</p>
                {nativePrice && <p className="text-purple-400 text-xs">${PriceService.formatUSD(parseFloat(balance), nativePrice)}</p>}
              </div>
              <div className="text-right">
                {nativePrice && (
                  <>
                    <p className="text-white">${PriceService.formatPrice(nativePrice)}</p>
                    {priceChange !== null && (
                      <p className={`text-sm ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {tokenBalances.map((token) => (
              <div key={token.address} className="token-item" data-testid={`token-${token.symbol}`}>
                <TokenLogo symbol={token.symbol} size={40} />
                <div className="flex-1">
                  <p className="text-white font-medium">{token.symbol}</p>
                  <p className="text-gray-400 text-sm">{parseFloat(token.balance).toFixed(4)}</p>
                  {token.price && <p className="text-purple-400 text-xs">${token.usdValue.toFixed(2)}</p>}
                </div>
                <div className="text-right">
                  {token.price && <p className="text-white">${PriceService.formatPrice(token.price)}</p>}
                </div>
              </div>
            ))}

            {tokenBalances.length === 0 && (
              <p className="text-gray-500 text-center py-4">No custom tokens added</p>
            )}
          </div>
        )}

        {activeTab === "nfts" && (
          <div className="px-4 pb-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">NFTs</h3>
              <button onClick={() => navigate("/add-nft")} className="text-purple-500" data-testid="add-nft-btn">
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {chainNFTs.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {chainNFTs.map((nft, index) => (
                  <div key={`${nft.contractAddress}-${nft.tokenId}-${index}`} className="nft-card" data-testid={`nft-${nft.tokenId}`}>
                    {nft.image ? (
                      <img
                        src={nft.image.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${nft.image.slice(7)}` : nft.image}
                        alt={nft.name}
                        className="nft-image"
                        onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=NFT"; }}
                      />
                    ) : (
                      <div className="nft-placeholder">
                        <Image className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-white font-medium text-sm truncate">{nft.name || `NFT #${nft.tokenId}`}</p>
                      <p className="text-gray-400 text-xs truncate">{nft.collectionName || "Unknown Collection"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No NFTs added yet</p>
                <button
                  onClick={() => navigate("/add-nft")}
                  className="btn-primary mt-4 px-6"
                >
                  Add NFT
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}

// Add Token Screen
function AddTokenScreen() {
  const navigate = useNavigate();
  const { currentChainId, addToken } = useWalletStore();
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const currentChain = CHAINS.find((c) => c.chainId === currentChainId) || CHAINS[0];

  const fetchTokenInfo = async () => {
    if (!tokenAddress) {
      setError("Please enter token address");
      return;
    }

    if (!ethers.isAddress(tokenAddress)) {
      setError("Invalid token address format");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const info = await WalletService.getTokenInfo(tokenAddress, currentChain.rpcUrl);
      setTokenName(info.name);
      setTokenSymbol(info.symbol);
      setTokenDecimals(info.decimals.toString());
      setSuccess(true);
    } catch (err) {
      setError("Failed to fetch token info. Please check the address and try again.");
      setTokenName("");
      setTokenSymbol("");
      setTokenDecimals("");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = () => {
    if (!tokenAddress || !tokenSymbol || !tokenName || !tokenDecimals) {
      setError("Please fill all fields");
      return;
    }

    addToken({
      address: tokenAddress,
      symbol: tokenSymbol,
      name: tokenName,
      decimals: parseInt(tokenDecimals),
      balance: "0",
      chainId: currentChainId,
    });

    navigate(-1);
  };

  return (
    <div className="screen-container" data-testid="add-token-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Add Token</span>
        <div className="w-6" />
      </div>

      <div className="content px-6 py-4">
        <h2 className="text-xl font-bold text-white mb-2">Custom Token</h2>
        <p className="text-gray-400 text-sm mb-6">
          Add any ERC20 token to your wallet on {currentChain.name}
        </p>

        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">Token Contract Address</label>
          <div className="flex gap-2">
            <input
              data-testid="token-address-input"
              className="input-field flex-1"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => {
                setTokenAddress(e.target.value);
                setError("");
                setSuccess(false);
              }}
            />
            <button
              data-testid="search-token-btn"
              className="btn-icon bg-purple-600 hover:bg-purple-700"
              onClick={fetchTokenInfo}
              disabled={loading}
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4" data-testid="error-message">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4" data-testid="success-message">Token info fetched successfully!</p>}

        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">Token Symbol</label>
          <input
            data-testid="token-symbol-input"
            className="input-field w-full"
            placeholder="e.g. USDT"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">Token Name</label>
          <input
            data-testid="token-name-input"
            className="input-field w-full"
            placeholder="e.g. Tether USD"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">Decimals</label>
          <input
            data-testid="token-decimals-input"
            className="input-field w-full"
            placeholder="18"
            type="number"
            value={tokenDecimals}
            onChange={(e) => setTokenDecimals(e.target.value)}
          />
        </div>

        <button
          data-testid="add-token-submit-btn"
          className="btn-primary w-full"
          onClick={handleAddToken}
          disabled={!tokenAddress || !tokenSymbol || !tokenName || !tokenDecimals}
        >
          Add Token
        </button>
      </div>
    </div>
  );
}

// Add NFT Screen
function AddNFTScreen() {
  const navigate = useNavigate();
  const { currentChainId, addNFT, getCurrentWallet } = useWalletStore();
  const wallet = getCurrentWallet();
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nftInfo, setNftInfo] = useState(null);

  const currentChain = CHAINS.find((c) => c.chainId === currentChainId) || CHAINS[0];

  const fetchNFTInfo = async () => {
    if (!contractAddress || !tokenId) {
      setError("Please enter contract address and token ID");
      return;
    }

    if (!ethers.isAddress(contractAddress)) {
      setError("Invalid contract address format");
      return;
    }

    setLoading(true);
    setError("");
    setNftInfo(null);

    try {
      const info = await WalletService.getNFTInfo(contractAddress, tokenId, currentChain.rpcUrl);
      
      if (info.owner && wallet && info.owner.toLowerCase() !== wallet.address.toLowerCase()) {
        setError("Warning: You don't appear to own this NFT");
      }
      
      setNftInfo({
        ...info,
        contractAddress,
        tokenId,
        chainId: currentChainId,
      });
    } catch (err) {
      setError("Failed to fetch NFT info. Please check the address and token ID.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNFT = () => {
    if (!nftInfo) {
      setError("Please fetch NFT info first");
      return;
    }

    let imageUrl = nftInfo.image || nftInfo.metadata?.image || "";
    if (imageUrl.startsWith("ipfs://")) {
      imageUrl = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }

    addNFT({
      contractAddress,
      tokenId,
      chainId: currentChainId,
      name: nftInfo.nftName || `${nftInfo.name} #${tokenId}`,
      collectionName: nftInfo.name,
      symbol: nftInfo.symbol,
      image: imageUrl,
      description: nftInfo.description,
      tokenURI: nftInfo.tokenURI,
    });

    navigate(-1);
  };

  return (
    <div className="screen-container" data-testid="add-nft-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Add NFT</span>
        <div className="w-6" />
      </div>

      <div className="content px-6 py-4 overflow-auto">
        <h2 className="text-xl font-bold text-white mb-2">Import NFT</h2>
        <p className="text-gray-400 text-sm mb-6">
          Add an ERC721 NFT to your wallet on {currentChain.name}
        </p>

        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">Contract Address</label>
          <input
            data-testid="nft-contract-input"
            className="input-field w-full"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => {
              setContractAddress(e.target.value);
              setError("");
              setNftInfo(null);
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">Token ID</label>
          <input
            data-testid="nft-tokenid-input"
            className="input-field w-full"
            placeholder="e.g. 1234"
            value={tokenId}
            onChange={(e) => {
              setTokenId(e.target.value);
              setError("");
              setNftInfo(null);
            }}
          />
        </div>

        <button
          data-testid="fetch-nft-btn"
          className="btn-secondary w-full mb-4"
          onClick={fetchNFTInfo}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Fetch NFT Info
            </>
          )}
        </button>

        {error && <p className="text-red-500 text-sm mb-4" data-testid="nft-error-message">{error}</p>}

        {nftInfo && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6" data-testid="nft-preview">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {nftInfo.image ? (
                  <img
                    src={nftInfo.image.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${nftInfo.image.slice(7)}` : nftInfo.image}
                    alt={nftInfo.nftName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{nftInfo.nftName}</p>
                <p className="text-gray-400 text-sm truncate">{nftInfo.name}</p>
                <p className="text-gray-500 text-xs mt-2 truncate">Token ID: {tokenId}</p>
              </div>
            </div>
            {nftInfo.description && (
              <p className="text-gray-400 text-sm mt-4 line-clamp-2">{nftInfo.description}</p>
            )}
          </div>
        )}

        <button
          data-testid="add-nft-submit-btn"
          className="btn-primary w-full"
          onClick={handleAddNFT}
          disabled={!nftInfo}
        >
          Add NFT
        </button>
      </div>
    </div>
  );
}

// Send Screen
function SendScreen() {
  const navigate = useNavigate();
  const { getCurrentWallet, currentChainId } = useWalletStore();
  const wallet = getCurrentWallet();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const currentChain = CHAINS.find((c) => c.chainId === currentChainId) || CHAINS[0];

  const handleSend = async () => {
    if (!toAddress || !amount) {
      setError("Please fill all fields");
      return;
    }

    if (!ethers.isAddress(toAddress)) {
      setError("Invalid recipient address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const tx = await WalletService.sendTransaction(wallet.privateKey, toAddress, amount, currentChain.rpcUrl);
      alert(`Transaction sent! Hash: ${tx.hash}`);
      navigate(-1);
    } catch (err) {
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = (address) => {
    setToAddress(address);
    setShowScanner(false);
  };

  if (showScanner) {
    return <QRScannerScreen onScan={handleScanResult} onClose={() => setShowScanner(false)} />;
  }

  return (
    <div className="screen-container" data-testid="send-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Send {currentChain.symbol}</span>
        <div className="w-6" />
      </div>

      <div className="content px-6 py-4">
        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">Recipient Address</label>
          <div className="flex gap-2">
            <input
              data-testid="recipient-input"
              className="input-field flex-1"
              placeholder="0x..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
            />
            <button
              data-testid="scan-qr-btn"
              className="btn-icon bg-gray-700"
              onClick={() => setShowScanner(true)}
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">Amount</label>
          <input
            data-testid="amount-input"
            className="input-field w-full"
            placeholder="0.0"
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          data-testid="send-submit-btn"
          className="btn-primary w-full"
          onClick={handleSend}
          disabled={loading || !toAddress || !amount}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

// Receive Screen
function ReceiveScreen() {
  const navigate = useNavigate();
  const { getCurrentWallet } = useWalletStore();
  const wallet = getCurrentWallet();
  const { showToast } = useToast();

  const copyAddress = async () => {
    if (!wallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.address);
      showToast("Address copied!", "success");
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = wallet.address;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showToast("Address copied!", "success");
      } catch (fallbackErr) {
        window.prompt("Copy this address:", wallet.address);
      }
    }
  };

  return (
    <div className="screen-container" data-testid="receive-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Receive</span>
        <div className="w-6" />
      </div>

      <div className="content px-6 py-8 flex flex-col items-center">
        <div className="bg-white p-4 rounded-2xl mb-6">
          <QRCodeSVG value={wallet?.address || ""} size={200} />
        </div>
        <p className="text-gray-400 text-sm mb-2">Your Wallet Address</p>
        <p className="text-white text-sm font-mono bg-gray-800 px-4 py-3 rounded-xl break-all mb-4">
          {wallet?.address}
        </p>
        <button className="btn-primary" onClick={copyAddress} data-testid="copy-address-btn">
          <Copy className="w-5 h-5 mr-2" />
          Copy Address
        </button>
      </div>
    </div>
  );
}

// QR Scanner Screen
function QRScannerScreen({ onScan, onClose }) {
  const navigate = useNavigate();
  const [manualAddress, setManualAddress] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  useEffect(() => {
    let active = true;
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (active) {
          setCameraError(true);
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleManualSubmit = () => {
    if (ethers.isAddress(manualAddress)) {
      if (onScan) {
        onScan(manualAddress);
      }
    } else {
      alert("Invalid address format");
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="screen-container" data-testid="qr-scanner-screen">
      <div className="header absolute top-0 left-0 right-0 z-10 bg-black/50">
        <button onClick={handleClose} className="icon-btn">
          <X className="w-6 h-6" />
        </button>
        <span className="header-title">Scan QR Code</span>
        <div className="w-6" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {!cameraError ? (
          <div className="relative mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-64 h-64 rounded-xl bg-gray-800 object-cover"
            />
            <div className="absolute inset-0 border-2 border-purple-500 rounded-xl pointer-events-none" />
            <p className="text-white text-center mt-4">Point camera at QR code</p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Camera not available</p>
            <p className="text-gray-500 text-sm">Enter address manually below</p>
          </div>
        )}

        <div className="w-full">
          <p className="text-gray-400 text-sm mb-2 text-center">Or enter address manually:</p>
          <input
            data-testid="manual-address-input"
            className="input-field w-full mb-4"
            placeholder="0x..."
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
          />
          <button
            data-testid="manual-submit-btn"
            className="btn-primary w-full"
            onClick={handleManualSubmit}
            disabled={!manualAddress}
          >
            Use This Address
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings Screen with PIN Lock
function SettingsScreen() {
  const navigate = useNavigate();
  const { getCurrentWallet, clearWallet, removeWallet, wallets, setCurrentWallet, currentWalletId } = useWalletStore();
  const wallet = getCurrentWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState(null); // 'privateKey' or 'mnemonic'
  const { showToast } = useToast();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout? Make sure you have saved your recovery phrase.")) {
      PinService.clearPin();
      clearWallet();
      navigate("/");
    }
  };

  const handleRemoveWallet = () => {
    if (window.confirm("Are you sure you want to remove this wallet?")) {
      removeWallet(wallet.id);
      showToast("Wallet removed", "success");
      if (wallets.length <= 1) {
        navigate("/");
      }
    }
  };

  const handleSwitchWallet = (walletId) => {
    setCurrentWallet(walletId);
    showToast("Wallet switched", "success");
  };

  const handleViewPrivateKey = () => {
    if (showPrivateKey) {
      setShowPrivateKey(false);
    } else {
      setPinAction('privateKey');
      setShowPinModal(true);
    }
  };

  const handleViewMnemonic = () => {
    if (showMnemonic) {
      setShowMnemonic(false);
    } else {
      setPinAction('mnemonic');
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = () => {
    if (pinAction === 'privateKey') {
      setShowPrivateKey(true);
    } else if (pinAction === 'mnemonic') {
      setShowMnemonic(true);
    }
    setPinAction(null);
  };

  const copyToClipboard = async (text, label) => {
    // Require PIN to copy sensitive data
    setPinAction('copy');
    setShowPinModal(true);
    
    // Store the copy action for after PIN verification
    window._pendingCopy = { text, label };
  };

  const handleCopyAfterPin = () => {
    if (window._pendingCopy) {
      const { text, label } = window._pendingCopy;
      navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied!`, "success");
      }).catch(() => {
        window.prompt(`Copy this ${label.toLowerCase()}:`, text);
      });
      window._pendingCopy = null;
    }
  };

  const handlePinSuccessForCopy = () => {
    if (pinAction === 'copy') {
      handleCopyAfterPin();
    } else {
      handlePinSuccess();
    }
  };

  return (
    <div className="screen-container" data-testid="settings-screen">
      <div className="header">
        <button onClick={() => navigate(-1)} className="icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="header-title">Settings</span>
        <div className="w-6" />
      </div>

      <div className="content px-6 py-4 overflow-auto pb-24">
        {/* Security Section */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h3>
          <button
            onClick={() => navigate("/reset-pin")}
            className="w-full bg-gray-800 rounded-xl p-4 flex items-center justify-between mb-3"
            data-testid="reset-pin-btn"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-purple-500" />
              <span className="text-white">Reset PIN</span>
            </div>
            <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
        </div>

        {/* Multi-Wallet Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Wallets ({wallets.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/create")}
                className="text-purple-500 p-2 hover:bg-gray-800 rounded-full"
                data-testid="add-new-wallet-btn"
                title="Create New Wallet"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/import")}
                className="text-purple-500 p-2 hover:bg-gray-800 rounded-full"
                data-testid="import-wallet-btn"
                title="Import Wallet"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            {wallets.map((w, index) => (
              <button
                key={w.id}
                onClick={() => handleSwitchWallet(w.id)}
                className={`w-full p-4 flex items-center justify-between border-b border-gray-700 last:border-b-0 ${
                  w.id === currentWalletId ? "bg-purple-600/20" : "hover:bg-gray-700"
                }`}
                data-testid={`wallet-item-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    w.id === currentWalletId ? "bg-purple-600" : "bg-gray-600"
                  }`}>
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{w.name || `Wallet ${index + 1}`}</p>
                    <p className="text-gray-400 text-xs">{w.address.slice(0, 8)}...{w.address.slice(-6)}</p>
                  </div>
                </div>
                {w.id === currentWalletId && (
                  <Check className="w-5 h-5 text-purple-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Wallet Details */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">Current Wallet Details</h3>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Address</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(wallet?.address);
                  showToast("Address copied!", "success");
                }}
                className="text-purple-500 text-sm flex items-center gap-1"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {wallet?.address}
            </p>
          </div>
        </div>

        {wallet?.privateKey && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Private Key
                </span>
                <div className="flex gap-2">
                  <button onClick={handleViewPrivateKey} className="text-purple-500 text-sm" data-testid="toggle-private-key">
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {showPrivateKey && (
                    <button 
                      onClick={() => copyToClipboard(wallet.privateKey, "Private Key")}
                      className="text-purple-500"
                      data-testid="copy-private-key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className={`text-white font-mono text-sm break-all ${!showPrivateKey && "blur-sm select-none"}`}>
                {wallet.privateKey}
              </p>
              {!showPrivateKey && (
                <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PIN required to view
                </p>
              )}
            </div>
          </div>
        )}

        {wallet?.mnemonic && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Recovery Phrase
                </span>
                <div className="flex gap-2">
                  <button onClick={handleViewMnemonic} className="text-purple-500 text-sm" data-testid="toggle-mnemonic">
                    {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {showMnemonic && (
                    <button 
                      onClick={() => copyToClipboard(wallet.mnemonic, "Recovery Phrase")}
                      className="text-purple-500"
                      data-testid="copy-mnemonic"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className={`text-white font-mono text-sm break-all ${!showMnemonic && "blur-sm select-none"}`}>
                {wallet.mnemonic}
              </p>
              {!showMnemonic && (
                <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PIN required to view
                </p>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-700 pt-6">
          <button
            className="w-full py-3 text-red-500 bg-gray-800 rounded-lg mb-4 flex items-center justify-center gap-2"
            onClick={handleRemoveWallet}
            data-testid="remove-wallet-btn"
          >
            <Trash2 className="w-5 h-5" />
            Remove Current Wallet
          </button>
          <button
            className="w-full py-3 text-red-500 border border-red-500 rounded-lg flex items-center justify-center gap-2"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            Logout (Clear All)
          </button>
        </div>
      </div>

      <BottomNav active="settings" />

      <PinVerifyModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccessForCopy}
        title="Security Verification"
      />
    </div>
  );
}

// DApp Browser Screen with WalletConnect
function BrowserScreen() {
  const navigate = useNavigate();
  const { getCurrentWallet, currentChainId, wcSessions, setWcPendingProposal, setWcPendingRequest, addWcSession, removeWcSession } = useWalletStore();
  const wallet = getCurrentWallet();
  const [url, setUrl] = useState("");
  const [wcUri, setWcUri] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { showToast } = useToast();

  const currentChain = CHAINS.find((c) => c.chainId === currentChainId) || CHAINS[0];

  // Initialize WalletConnect
  useEffect(() => {
    const initWC = async () => {
      try {
        const wc = await WalletConnectService.init();
        
        // Listen for session proposals
        wc.on('session_proposal', async (proposal) => {
          console.log('Session proposal:', proposal);
          setPendingProposal(proposal);
          setShowConnectModal(true);
        });

        // Listen for session requests
        wc.on('session_request', async (request) => {
          console.log('Session request:', request);
          setPendingRequest(request);
          setShowRequestModal(true);
        });

        // Listen for session deletions
        wc.on('session_delete', (data) => {
          console.log('Session deleted:', data);
          removeWcSession(data.topic);
          loadSessions();
          showToast('Session disconnected', 'info');
        });

        loadSessions();
      } catch (error) {
        console.error('WC init error:', error);
      }
    };

    initWC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessions = () => {
    const activeSessions = WalletConnectService.getActiveSessions();
    setSessions(Object.values(activeSessions));
  };

  const handleConnect = async () => {
    if (!wcUri.trim()) {
      showToast('Please enter a WalletConnect URI', 'error');
      return;
    }

    setConnecting(true);
    try {
      await WalletConnectService.pair(wcUri);
      setWcUri('');
      showToast('Pairing initiated...', 'success');
    } catch (error) {
      console.error('Connect error:', error);
      showToast('Failed to connect: ' + error.message, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleApproveSession = async () => {
    if (!pendingProposal || !wallet) return;

    try {
      const chainIds = CHAINS.map(c => c.chainId);
      const session = await WalletConnectService.approveSession(pendingProposal, wallet.address, chainIds);
      addWcSession(session);
      loadSessions();
      showToast('Connected to dApp!', 'success');
    } catch (error) {
      console.error('Approve error:', error);
      showToast('Failed to approve: ' + error.message, 'error');
    } finally {
      setPendingProposal(null);
      setShowConnectModal(false);
    }
  };

  const handleRejectSession = async () => {
    if (!pendingProposal) return;

    try {
      await WalletConnectService.rejectSession(pendingProposal);
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setPendingProposal(null);
      setShowConnectModal(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!pendingRequest || !wallet) return;

    try {
      await WalletConnectService.handleRequest(pendingRequest, wallet, currentChain.rpcUrl);
      showToast('Request approved!', 'success');
    } catch (error) {
      console.error('Request error:', error);
      showToast('Request failed: ' + error.message, 'error');
    } finally {
      setPendingRequest(null);
      setShowRequestModal(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequest) return;

    try {
      await WalletConnectService.rejectRequest(pendingRequest);
      showToast('Request rejected', 'info');
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setPendingRequest(null);
      setShowRequestModal(false);
    }
  };

  const handleDisconnect = async (topic) => {
    try {
      await WalletConnectService.disconnectSession(topic);
      removeWcSession(topic);
      loadSessions();
      showToast('Disconnected', 'success');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const getRequestDetails = (request) => {
    if (!request) return { method: '', params: '' };
    const { params } = request;
    const { request: req } = params;
    return {
      method: req.method,
      params: JSON.stringify(req.params, null, 2).slice(0, 200) + '...',
    };
  };

  return (
    <div className="screen-container" data-testid="browser-screen">
      <div className="header">
        <span className="header-title">DApp Browser</span>
      </div>

      <div className="content px-4 py-4 overflow-auto pb-24">
        {/* WalletConnect Section */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-500" />
            WalletConnect
          </h3>
          
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-3">
              Paste WalletConnect URI to connect to a dApp
            </p>
            <input
              className="input-field w-full mb-3"
              placeholder="wc:..."
              value={wcUri}
              onChange={(e) => setWcUri(e.target.value)}
              data-testid="wc-uri-input"
            />
            <button
              className="btn-primary w-full"
              onClick={handleConnect}
              disabled={connecting || !wcUri.trim()}
              data-testid="wc-connect-btn"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5 mr-2" />
                  Connect
                </>
              )}
            </button>
          </div>

          {/* Active Sessions */}
          {sessions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-gray-400 text-sm mb-2">Active Connections</h4>
              {sessions.map((session) => (
                <div key={session.topic} className="bg-gray-800 rounded-xl p-4 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {session.peer?.metadata?.icons?.[0] && (
                      <img 
                        src={session.peer.metadata.icons[0]} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <p className="text-white font-medium">{session.peer?.metadata?.name || 'Unknown dApp'}</p>
                      <p className="text-gray-400 text-xs">{session.peer?.metadata?.url || ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(session.topic)}
                    className="text-red-500 p-2 hover:bg-gray-700 rounded-lg"
                    data-testid={`disconnect-${session.topic}`}
                  >
                    <Unlink className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "BCCScan", url: "https://bccscan.com" },
              { name: "Etherscan", url: "https://etherscan.io" },
              { name: "PolygonScan", url: "https://polygonscan.com" },
              { name: "BscScan", url: "https://bscscan.com" },
              { name: "Uniswap", url: "https://app.uniswap.org" },
              { name: "OpenSea", url: "https://opensea.io" },
            ].map((link) => (
              <button
                key={link.name}
                className="bg-gray-800 p-4 rounded-xl text-left hover:bg-gray-700 transition-colors"
                onClick={() => window.open(link.url, "_blank")}
              >
                <ExternalLink className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-white font-medium text-sm">{link.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">Open URL</h3>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Enter URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && url && window.open(url.startsWith('http') ? url : `https://${url}`, "_blank")}
            />
            <button
              className="btn-icon bg-purple-600"
              onClick={() => url && window.open(url.startsWith('http') ? url : `https://${url}`, "_blank")}
              disabled={!url}
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="browser" />

      {/* Session Proposal Modal */}
      {showConnectModal && pendingProposal && (
        <div className="modal-overlay" data-testid="wc-connect-modal">
          <div className="modal-content">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connection Request</h2>
              <p className="text-gray-400 text-center mb-4">
                {pendingProposal.params?.proposer?.metadata?.name || 'A dApp'} wants to connect to your wallet
              </p>
              {pendingProposal.params?.proposer?.metadata?.url && (
                <p className="text-purple-400 text-sm mb-4">
                  {pendingProposal.params.proposer.metadata.url}
                </p>
              )}
              <div className="bg-gray-800 rounded-xl p-4 w-full mb-4">
                <p className="text-gray-400 text-sm mb-1">Wallet Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {wallet?.address}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  className="btn-secondary flex-1"
                  onClick={handleRejectSession}
                  data-testid="wc-reject-btn"
                >
                  Reject
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleApproveSession}
                  data-testid="wc-approve-btn"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && pendingRequest && (
        <div className="modal-overlay" data-testid="wc-request-modal">
          <div className="modal-content">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Sign Request</h2>
              <p className="text-gray-400 text-center mb-4">
                A dApp is requesting you to sign:
              </p>
              <div className="bg-gray-800 rounded-xl p-4 w-full mb-4">
                <p className="text-purple-400 text-sm mb-1">{getRequestDetails(pendingRequest).method}</p>
                <p className="text-gray-400 text-xs font-mono break-all">
                  {getRequestDetails(pendingRequest).params}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  className="btn-secondary flex-1"
                  onClick={handleRejectRequest}
                  data-testid="wc-reject-request-btn"
                >
                  Reject
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleApproveRequest}
                  data-testid="wc-approve-request-btn"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bottom Navigation
function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav" data-testid="bottom-nav">
      <button
        className={`nav-item ${active === "home" ? "active" : ""}`}
        onClick={() => navigate("/home")}
        data-testid="nav-home"
      >
        <Wallet className="w-6 h-6" />
        <span>Home</span>
      </button>
      <button
        className={`nav-item ${active === "browser" ? "active" : ""}`}
        onClick={() => navigate("/browser")}
        data-testid="nav-browser"
      >
        <Globe className="w-6 h-6" />
        <span>Browser</span>
      </button>
      <button
        className={`nav-item ${active === "settings" ? "active" : ""}`}
        onClick={() => navigate("/settings")}
        data-testid="nav-settings"
      >
        <Settings className="w-6 h-6" />
        <span>Settings</span>
      </button>
    </div>
  );
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<AppEntry />} />
            <Route path="/create" element={<CreateWalletScreen />} />
            <Route path="/import" element={<ImportWalletScreen />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/send" element={<SendScreen />} />
            <Route path="/receive" element={<ReceiveScreen />} />
            <Route path="/add-token" element={<AddTokenScreen />} />
            <Route path="/add-nft" element={<AddNFTScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/browser" element={<BrowserScreen />} />
            <Route path="/scan" element={<QRScannerScreen />} />
            <Route path="/reset-pin" element={<ResetPinScreen />} />
          </Routes>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

// App Entry - Redirects based on wallet state
function AppEntry() {
  const navigate = useNavigate();
  const { wallets } = useWalletStore();

  useEffect(() => {
    if (wallets.length > 0) {
      navigate("/home");
    }
  }, [wallets, navigate]);

  return <WelcomeScreen />;
}

export default App;
