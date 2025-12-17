import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { CHAINS } from '../config/chains';

const PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64'; // WalletConnect Cloud Project ID

let web3wallet = null;
let core = null;

export const WalletConnectService = {
  // Initialize WalletConnect
  init: async () => {
    try {
      if (web3wallet) return web3wallet;

      core = new Core({
        projectId: PROJECT_ID,
      });

      web3wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'Blokista Wallet',
          description: 'Multi-chain crypto wallet',
          url: 'https://blokista.com',
          icons: ['https://bccscan.com/images/logo-bcc.png'],
        },
      });

      return web3wallet;
    } catch (error) {
      console.error('WalletConnect init error:', error);
      throw error;
    }
  },

  // Get instance
  getInstance: () => web3wallet,

  // Pair with dApp using URI
  pair: async (uri) => {
    try {
      if (!web3wallet) await WalletConnectService.init();
      await core.pairing.pair({ uri });
      return true;
    } catch (error) {
      console.error('Pairing error:', error);
      throw error;
    }
  },

  // Approve session proposal
  approveSession: async (proposal, walletAddress, chainIds) => {
    try {
      const { id, params } = proposal;
      const { requiredNamespaces, optionalNamespaces } = params;

      // Build namespaces with wallet address
      const namespaces = buildApprovedNamespaces({
        proposal: params,
        supportedNamespaces: {
          eip155: {
            chains: chainIds.map(id => `eip155:${id}`),
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4',
            ],
            events: ['accountsChanged', 'chainChanged'],
            accounts: chainIds.map(id => `eip155:${id}:${walletAddress}`),
          },
        },
      });

      const session = await web3wallet.approveSession({
        id,
        namespaces,
      });

      return session;
    } catch (error) {
      console.error('Session approval error:', error);
      throw error;
    }
  },

  // Reject session proposal
  rejectSession: async (proposal) => {
    try {
      const { id } = proposal;
      await web3wallet.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED'),
      });
    } catch (error) {
      console.error('Session rejection error:', error);
      throw error;
    }
  },

  // Handle session request (sign, send tx, etc.)
  handleRequest: async (request, wallet, rpcUrl) => {
    const { topic, params, id } = request;
    const { request: req, chainId } = params;
    const { method, params: methodParams } = req;

    try {
      let result;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(wallet.privateKey, provider);

      switch (method) {
        case 'personal_sign': {
          const message = methodParams[0];
          result = await signer.signMessage(
            ethers.isHexString(message) ? ethers.toUtf8String(message) : message
          );
          break;
        }
        case 'eth_sign': {
          const message = methodParams[1];
          result = await signer.signMessage(ethers.getBytes(message));
          break;
        }
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          const data = typeof methodParams[1] === 'string' 
            ? JSON.parse(methodParams[1]) 
            : methodParams[1];
          const { domain, types, message } = data;
          delete types.EIP712Domain;
          result = await signer.signTypedData(domain, types, message);
          break;
        }
        case 'eth_sendTransaction': {
          const txParams = methodParams[0];
          const tx = await signer.sendTransaction({
            to: txParams.to,
            value: txParams.value ? ethers.getBigInt(txParams.value) : 0n,
            data: txParams.data || '0x',
            gasLimit: txParams.gas ? ethers.getBigInt(txParams.gas) : undefined,
          });
          result = tx.hash;
          break;
        }
        case 'eth_signTransaction': {
          const txParams = methodParams[0];
          result = await signer.signTransaction({
            to: txParams.to,
            value: txParams.value ? ethers.getBigInt(txParams.value) : 0n,
            data: txParams.data || '0x',
            gasLimit: txParams.gas ? ethers.getBigInt(txParams.gas) : undefined,
          });
          break;
        }
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result,
        },
      });

      return { success: true, result };
    } catch (error) {
      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: getSdkError('USER_REJECTED'),
        },
      });
      throw error;
    }
  },

  // Reject request
  rejectRequest: async (request) => {
    const { topic, id } = request;
    await web3wallet.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        error: getSdkError('USER_REJECTED'),
      },
    });
  },

  // Disconnect session
  disconnectSession: async (topic) => {
    try {
      await web3wallet.disconnectSession({
        topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  },

  // Get active sessions
  getActiveSessions: () => {
    if (!web3wallet) return {};
    return web3wallet.getActiveSessions();
  },

  // Get pending proposals
  getPendingProposals: () => {
    if (!web3wallet) return {};
    return web3wallet.getPendingSessionProposals();
  },

  // Get pending requests
  getPendingRequests: () => {
    if (!web3wallet) return [];
    return web3wallet.getPendingSessionRequests();
  },
};

export default WalletConnectService;
