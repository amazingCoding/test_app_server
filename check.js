const { PublicKey } = require('@solana/web3.js');
const { default: axios } = require('axios');
const bitcoin = require('bitcoinjs-lib'); // 引入 bitcoinjs-lib 库
const { formatUnits } = require('ethers');
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
const checkIsETHAddress = (address) => {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}
const checkIsTronAddress = (address) => {
  return /^T[0-9a-zA-Z]{33}$/.test(address)
}
function isValidSolanaAddress(address) {
  try {
    const publicKey = new PublicKey(address);
    // 检查是否是一个有效的公钥
    return PublicKey.isOnCurve(publicKey);
  } catch (error) {
    // 捕获任何异常并返回 false
    return false;
  }
}
function calculateBalance(data) {
  const chainReceived = data.chain_stats.funded_txo_sum;
  const chainSpent = data.chain_stats.spent_txo_sum;
  const mempoolReceived = data.mempool_stats.funded_txo_sum;
  const mempoolSpent = data.mempool_stats.spent_txo_sum;

  const totalReceived = chainReceived + mempoolReceived;
  const totalSpent = chainSpent + mempoolSpent;

  const balanceSatoshis = totalReceived - totalSpent;
  const balanceBTC = formatUnits(balanceSatoshis, 8);
  return {
    balanceSatoshis,
    balanceBTC
  }
}
const getCoinRate = async (coin) => {
  if (coin === 'UNKNOWN') return -1
  try {
    const rateRes = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=USD&&api_key=15a7019616671d15510e0948ca18309c0747dc126576bf35bea1448e9da705d9`,{
      timeout: 15000
    })
    return rateRes.data.USD
  } catch (error) {
    console.log(error);
    return -1
  }
}

module.exports = {
  validateBTCAddress,
  calculateBalance,
  getCoinRate,
  checkIsETHAddress,
  checkIsTronAddress,
  isValidSolanaAddress
}