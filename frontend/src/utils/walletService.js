import { ethers } from 'ethers';
import * as bip39 from 'bip39';

export const WalletService = {
  generateMnemonic: () => {
    return bip39.generateMnemonic();
  },

  createWalletFromMnemonic: (mnemonic) => {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return {
      id: crypto.randomUUID(),
      name: 'Wallet 1',
      address: wallet.address,
      mnemonic: mnemonic,
      privateKey: wallet.privateKey,
      createdAt: Date.now(),
    };
  },

  createWalletFromPrivateKey: (privateKey) => {
    const wallet = new ethers.Wallet(privateKey);
    return {
      id: crypto.randomUUID(),
      name: 'Imported Wallet',
      address: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: Date.now(),
    };
  },

  getBalance: async (address, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  },

  getTokenBalance: async (tokenAddress, walletAddress, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
      const contract = new ethers.Contract(tokenAddress, abi, provider);
      const [balance, decimals] = await Promise.all([contract.balanceOf(walletAddress), contract.decimals()]);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  },

  getTokenInfo: async (tokenAddress, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ];
      const contract = new ethers.Contract(tokenAddress, abi, provider);
      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
      ]);
      return { name, symbol, decimals: Number(decimals) };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  },

  // NFT functions
  getNFTInfo: async (contractAddress, tokenId, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // ERC721 ABI
      const abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function ownerOf(uint256 tokenId) view returns (address)',
      ];
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const [name, symbol, tokenURI, owner] = await Promise.all([
        contract.name().catch(() => 'Unknown'),
        contract.symbol().catch(() => 'NFT'),
        contract.tokenURI(tokenId).catch(() => ''),
        contract.ownerOf(tokenId).catch(() => ''),
      ]);
      
      // Try to fetch metadata from tokenURI
      let metadata = {};
      if (tokenURI) {
        try {
          let uri = tokenURI;
          // Handle IPFS URIs
          if (uri.startsWith('ipfs://')) {
            uri = `https://ipfs.io/ipfs/${uri.slice(7)}`;
          }
          const response = await fetch(uri);
          metadata = await response.json();
        } catch (e) {
          console.error('Error fetching NFT metadata:', e);
        }
      }
      
      return {
        name,
        symbol,
        tokenURI,
        owner,
        metadata,
        image: metadata.image || metadata.image_url || '',
        nftName: metadata.name || `${name} #${tokenId}`,
        description: metadata.description || '',
      };
    } catch (error) {
      console.error('Error getting NFT info:', error);
      throw error;
    }
  },

  sendTransaction: async (privateKey, to, amount, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });
      return tx;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  },

  sendToken: async (privateKey, tokenAddress, to, amount, rpcUrl) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
      ];
      const contract = new ethers.Contract(tokenAddress, abi, wallet);
      const decimals = await contract.decimals();
      const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals));
      return tx;
    } catch (error) {
      console.error('Error sending token:', error);
      throw error;
    }
  },

  isValidAddress: (address) => {
    return ethers.isAddress(address);
  },

  isValidMnemonic: (mnemonic) => {
    return bip39.validateMnemonic(mnemonic);
  },
};

export default WalletService;
