export const PriceService = {
  // Get price for native tokens using CoinGecko
  getPrice: async (chainId, symbol) => {
    try {
      const coinId = getCoinGeckoId(chainId, symbol);
      if (!coinId) {
        // Try Flikit API for Blokista
        if (chainId === 639054) {
          return await PriceService.getBlokirstaTokenPrice('BCC');
        }
        return null;
      }
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      
      if (data[coinId]) {
        return {
          price: data[coinId].usd,
          change: data[coinId].usd_24h_change || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching price:', error);
      return null;
    }
  },

  // Get price for tokens on Blokista chain
  getBlokirstaTokenPrice: async (symbol) => {
    try {
      const response = await fetch('https://flikit.co/blokista/api/token-prices');
      const data = await response.json();
      
      if (data && data[symbol]) {
        return {
          price: data[symbol].price || data[symbol].usd || 0,
          change: data[symbol].change_24h || data[symbol].priceChange24h || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching Blokista token price:', error);
      return null;
    }
  },

  // Get token price by contract address
  getTokenPriceByContract: async (chainId, contractAddress) => {
    try {
      const platform = getCoinGeckoPlatform(chainId);
      if (!platform) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contractAddress}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      
      const tokenData = data[contractAddress.toLowerCase()];
      if (tokenData) {
        return {
          price: tokenData.usd,
          change: tokenData.usd_24h_change || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  },

  formatPrice: (price) => {
    if (!price) return '0.00';
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  },

  formatUSD: (amount, price) => {
    if (!price) return '0.00';
    const usd = amount * price;
    if (usd < 0.01) return usd.toFixed(6);
    return usd.toFixed(2);
  },
};

function getCoinGeckoId(chainId, symbol) {
  const ids = {
    1: { ETH: 'ethereum' },
    137: { MATIC: 'matic-network' },
    56: { BNB: 'binancecoin' },
    42161: { ETH: 'ethereum' },
    10: { ETH: 'ethereum' },
  };
  return ids[chainId]?.[symbol] || null;
}

function getCoinGeckoPlatform(chainId) {
  const platforms = {
    1: 'ethereum',
    137: 'polygon-pos',
    56: 'binance-smart-chain',
    42161: 'arbitrum-one',
    10: 'optimistic-ethereum',
  };
  return platforms[chainId] || null;
}

export default PriceService;
