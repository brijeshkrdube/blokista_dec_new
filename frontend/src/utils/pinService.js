import CryptoJS from 'crypto-js';

const PIN_STORAGE_KEY = 'blokista_pin_hash';
const PIN_SALT = 'blokista_wallet_2024';

export const PinService = {
  // Hash PIN with salt for secure storage
  hashPin: (pin) => {
    return CryptoJS.SHA256(pin + PIN_SALT).toString();
  },

  // Save PIN to storage
  savePin: (pin) => {
    const hashedPin = PinService.hashPin(pin);
    localStorage.setItem(PIN_STORAGE_KEY, hashedPin);
    return true;
  },

  // Verify PIN
  verifyPin: (pin) => {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;
    const inputHash = PinService.hashPin(pin);
    return storedHash === inputHash;
  },

  // Check if PIN exists
  hasPin: () => {
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  },

  // Reset PIN (after verification)
  resetPin: (newPin) => {
    const hashedPin = PinService.hashPin(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, hashedPin);
    return true;
  },

  // Clear PIN (for logout)
  clearPin: () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
  },
};

export default PinService;
