import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWalletStore = create(
  persist(
    (set, get) => ({
      wallets: [],
      currentWalletId: null,
      isLocked: true,
      isPinSetup: false,
      currentChainId: 639054, // Default to Blokista
      tokens: [],
      nfts: [],
      customRPCs: [],
      
      // WalletConnect state
      wcSessions: [],
      wcPendingProposal: null,
      wcPendingRequest: null,
      
      setWallets: (wallets) => set({ 
        wallets, 
        currentWalletId: wallets.length > 0 ? wallets[0].id : null,
        isLocked: false 
      }),
      
      addWallet: (wallet) => set((state) => {
        const newWallets = [...state.wallets, wallet];
        return {
          wallets: newWallets,
          currentWalletId: wallet.id,
          isLocked: false,
        };
      }),
      
      setCurrentWallet: (walletId) => set({ currentWalletId: walletId }),
      
      getCurrentWallet: () => {
        const state = get();
        return state.wallets.find(w => w.id === state.currentWalletId) || null;
      },
      
      setIsLocked: (locked) => set({ isLocked: locked }),
      
      setIsPinSetup: (setup) => set({ isPinSetup: setup }),
      
      setCurrentChainId: (chainId) => set({ currentChainId: chainId }),
      
      addToken: (token) => {
        set((state) => {
          const newTokens = [...state.tokens.filter(t => !(t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId)), token];
          return { tokens: newTokens };
        });
      },
      
      removeToken: (address, chainId) => {
        set((state) => {
          const newTokens = state.tokens.filter(t => !(t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId));
          return { tokens: newTokens };
        });
      },
      
      // NFT functions
      addNFT: (nft) => {
        set((state) => {
          const exists = state.nfts.some(n => 
            n.contractAddress.toLowerCase() === nft.contractAddress.toLowerCase() && 
            n.tokenId === nft.tokenId && 
            n.chainId === nft.chainId
          );
          if (exists) return state;
          return { nfts: [...state.nfts, nft] };
        });
      },
      
      removeNFT: (contractAddress, tokenId, chainId) => {
        set((state) => ({
          nfts: state.nfts.filter(n => !(
            n.contractAddress.toLowerCase() === contractAddress.toLowerCase() && 
            n.tokenId === tokenId && 
            n.chainId === chainId
          ))
        }));
      },
      
      getNFTsByChain: (chainId) => {
        return get().nfts.filter(n => n.chainId === chainId);
      },
      
      addCustomRPC: (rpc) => {
        set((state) => ({
          customRPCs: [...state.customRPCs, rpc]
        }));
      },
      
      removeCustomRPC: (id) => {
        set((state) => ({
          customRPCs: state.customRPCs.filter(r => r.id !== id)
        }));
      },
      
      removeWallet: (walletId) => set((state) => {
        const newWallets = state.wallets.filter(w => w.id !== walletId);
        const newCurrentId = newWallets.length > 0 ? newWallets[0].id : null;
        return {
          wallets: newWallets,
          currentWalletId: newCurrentId,
          isLocked: newWallets.length === 0,
        };
      }),
      
      clearWallet: () => set({ 
        wallets: [],
        currentWalletId: null,
        isLocked: true, 
        isPinSetup: false,
        tokens: [],
        nfts: [],
        wcSessions: [],
      }),

      // WalletConnect actions
      setWcSessions: (sessions) => set({ wcSessions: sessions }),
      
      setWcPendingProposal: (proposal) => set({ wcPendingProposal: proposal }),
      
      setWcPendingRequest: (request) => set({ wcPendingRequest: request }),
      
      addWcSession: (session) => set((state) => ({
        wcSessions: [...state.wcSessions.filter(s => s.topic !== session.topic), session]
      })),
      
      removeWcSession: (topic) => set((state) => ({
        wcSessions: state.wcSessions.filter(s => s.topic !== topic)
      })),
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        wallets: state.wallets,
        currentWalletId: state.currentWalletId,
        currentChainId: state.currentChainId,
        tokens: state.tokens,
        nfts: state.nfts,
        customRPCs: state.customRPCs,
        isPinSetup: state.isPinSetup,
        wcSessions: state.wcSessions,
      }),
    }
  )
);

export default useWalletStore;
