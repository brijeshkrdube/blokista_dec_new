// Native Features - Capacitor Plugins for Mobile
// This file handles camera/barcode scanning and biometric authentication

// Check if running in Capacitor (native app)
export const isNative = () => {
  return window.Capacitor !== undefined;
};

// Biometric Authentication
export const BiometricAuth = {
  // Check if biometric is available
  isAvailable: async () => {
    try {
      if (!isNative()) {
        console.log("Not running in native app");
        return false;
      }

      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch (error) {
      console.error("Biometric check error:", error);
      // Fallback: try native web API
      if (window.PublicKeyCredential) {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    }
  },

  // Authenticate with biometric
  authenticate: async (reason = "Authenticate to continue") => {
    try {
      if (!isNative()) {
        // For web, just return true (no biometric on web preview)
        console.log("Web mode - skipping biometric");
        return true;
      }

      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: reason,
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use Passcode",
        androidTitle: "Biometric Authentication",
        androidSubtitle: reason,
        androidConfirmationRequired: false,
      });
      return true;
    } catch (error) {
      console.error("Biometric auth error:", error);
      return false;
    }
  },
};

// Barcode/QR Scanner
export const BarcodeScanner = {
  // Check if scanner is available
  isAvailable: async () => {
    try {
      if (!isNative()) {
        // Use web camera API
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      }
      return true;
    } catch (error) {
      return false;
    }
  },

  // Request camera permission
  requestPermission: async () => {
    try {
      if (!isNative()) {
        // Web: request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      }

      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      const { camera } = await BarcodeScanner.requestPermissions();
      return camera === 'granted';
    } catch (error) {
      console.error("Permission error:", error);
      return false;
    }
  },

  // Scan barcode/QR code
  scan: async () => {
    try {
      if (!isNative()) {
        // For web, return null - will use manual input
        throw new Error("Use web camera implementation");
      }

      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

      // Check permission first
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== 'granted') {
        const permResult = await BarcodeScanner.requestPermissions();
        if (permResult.camera !== 'granted') {
          throw new Error("Camera permission denied");
        }
      }

      // Start scanning
      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        return result.barcodes[0].rawValue;
      }

      return null;
    } catch (error) {
      console.error("Scan error:", error);
      throw error;
    }
  },
};

// App Lock State Management
export const AppLock = {
  STORAGE_KEY: 'app_lock_enabled',

  isEnabled: () => {
    return localStorage.getItem(AppLock.STORAGE_KEY) === 'true';
  },

  setEnabled: (enabled) => {
    localStorage.setItem(AppLock.STORAGE_KEY, enabled ? 'true' : 'false');
  },

  // Check and authenticate on app open
  checkAndAuthenticate: async () => {
    if (!AppLock.isEnabled()) {
      return true; // No lock enabled
    }

    const isAvailable = await BiometricAuth.isAvailable();
    if (!isAvailable) {
      return true; // Biometric not available, allow access
    }

    return await BiometricAuth.authenticate("Unlock Blokista Wallet");
  },
};

// Secure data access with biometric
export const SecureAccess = {
  // Require biometric to view sensitive data
  requestAccess: async (dataType = "sensitive data") => {
    const isAvailable = await BiometricAuth.isAvailable();

    if (!isAvailable) {
      // Fallback to password prompt on web
      const password = window.prompt(`Enter password to view ${dataType}:`);
      // For demo, accept any non-empty password
      // In production, you'd verify against stored hash
      return password && password.length > 0;
    }

    return await BiometricAuth.authenticate(`Authenticate to view ${dataType}`);
  },
};

export default {
  isNative,
  BiometricAuth,
  BarcodeScanner,
  AppLock,
  SecureAccess,
};