const { default: axios } = require('axios');
const bitcoin = require('bitcoinjs-lib'); // 引入 bitcoinjs-lib 库
// 校验 Base58 地址
function validateBase58Address(address) {
  try {
    bitcoin.address.toOutputScript(address);
    return true;
  } catch (e) {
    return false;
  }
}

// 校验 Bech32 地址
function validateBech32Address(address) {
  try {
    bitcoin.address.fromBech32(address);
    return true;
  } catch (e) {
    return false;
  }
}

// 校验比特币地址
function validateBTCAddress(address) {
  // 判断地址格式
  if (address.startsWith('1') || address.startsWith('3')) {
    return validateBase58Address(address);
  } else if (address.startsWith('bc1')) {
    return validateBech32Address(address);
  } else {
    return false;
  }
}
function calculateBalance(data) {
  // const chainReceived = data.chain_stats.funded_txo_sum;
  // const chainSpent = data.chain_stats.spent_txo_sum;
  // const mempoolReceived = data.mempool_stats.funded_txo_sum;
  // const mempoolSpent = data.mempool_stats.spent_txo_sum;

  // const totalReceived = chainReceived + mempoolReceived;
  // const totalSpent = chainSpent + mempoolSpent;

  // const balance = totalReceived - totalSpent;
  // return balance;
  const chainReceived = data.chain_stats.funded_txo_sum;
  const chainSpent = data.chain_stats.spent_txo_sum;
  const mempoolReceived = data.mempool_stats.funded_txo_sum;
  const mempoolSpent = data.mempool_stats.spent_txo_sum;

  const totalReceived = chainReceived + mempoolReceived;
  const totalSpent = chainSpent + mempoolSpent;

  const balanceSatoshis = totalReceived - totalSpent;
  const balanceBTC = balanceSatoshis / 100000000;
  return {
    balanceSatoshis,
    balanceBTC
  }
}
const getCoinRate = async (coin) => {
  try {
    const rateRes = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=USD`)
    return rateRes.data.USD
  } catch (error) {
    return -1
  }
}
module.exports = {
  validateBTCAddress,
  calculateBalance,
  getCoinRate
}