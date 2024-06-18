const express = require('express')
const { validateBTCAddress, calculateBalance, getCoinRate, checkIsETHAddress, checkIsTronAddress, isValidSolanaAddress } = require('../check')
const { default: axios } = require('axios')
const { JsonRpcProvider, formatEther, formatUnits } = require('ethers')
const { Contract } = require('ethers')
const TronWeb = require('tronweb')
const solanaWeb3 = require('@solana/web3.js')
const { Client } = require('@solflare-wallet/utl-sdk')
const router = express.Router()

const getError = (res, error) => {
  console.log(typeof error, error);
  let message = 'unknown error'
  if (typeof error === 'string') message = error
  else if (error.response) message = error.response.data.message
  else if (error.message) message = error.message
  res.json({ code: 400, message })
}
const getUSD = async (coin, balance) => {
  const rate = await getCoinRate(coin)
  let usd = 0
  if (rate > 0) {
    usd = rate * Number(balance)
  }
  return {
    usd,
    rate
  }
}
router.get('/api/v1/balance', async (req, res, next) => {
  const { chainType, address, isTest, symbol, rpcURL, tokenAddress } = req.query
  try {
    switch (chainType) {
      case "BTC": {
        let isBTCAddress = validateBTCAddress(address)
        if (!isBTCAddress) {
          getError(res, 'Invalid BTC address')
          return
        }
        const response = await axios.get(`https://blockstream.info/api/address/${address}`)
        const { balanceSatoshis, balanceBTC } = calculateBalance(response.data)
        const { usd, rate } = await getUSD('BTC', balanceBTC)
        res.json({ code: 200, data: { balance: balanceSatoshis, balanceFormat: balanceBTC, rate, usd } })
        return
      }
      case "EVM": {
        if (checkIsETHAddress(address) === false) {
          getError(res, 'Invalid ETH address')
          return
        }
        if (rpcURL === '') {
          getError(res, 'Invalid RPC URL')
          return
        }
        const url = decodeURIComponent(rpcURL)
        const provider = new JsonRpcProvider(url)
        if (!tokenAddress) {
          const balance = await provider.getBalance(address)
          const balanceFormat = formatEther(balance)
          const { usd, rate } = await getUSD(symbol, balanceFormat)
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
          return
        }
        else{
          // 获取合约余额
          const erc20Abi = ["function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address owner) view returns (uint256)"]
          const contract = new Contract(tokenAddress, erc20Abi, provider)
          const symbol = await contract.symbol();
          const decimals = await contract.decimals();
          const balance = await contract.balanceOf(address);
          const balanceFormat = formatUnits(balance, decimals)
          const { usd, rate } = await getUSD(symbol, balanceFormat)
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
        }
        
        return
      }
      case "SOL": {
        if (isValidSolanaAddress(address) === false) {
          getError(res, 'Invalid SOL address')
          return
        }
        const connection = new solanaWeb3.Connection(isTest ? solanaWeb3.clusterApiUrl('devnet') : 'https://sly-hardworking-dew.solana-mainnet.quiknode.pro/f6eb1261fe38b21326f892aabef573a7fa01a80a/')
        const publicKey = new solanaWeb3.PublicKey(address)
        if (tokenAddress && tokenAddress !== '') {
          const tokenPublicKey = new solanaWeb3.PublicKey(tokenAddress)
          const utl = new Client();
          const token = await utl.fetchMint(tokenPublicKey)
          const symbol = token?.symbol || 'UNKNOWN'
          let decimals = token?.decimals || 0
          let balance = 0
          const accounts = await connection.getTokenAccountsByOwner(publicKey, { mint: tokenPublicKey })
          for (let account of accounts.value) {
            const tokenAccountInfo = await connection.getParsedAccountInfo(account.pubkey);
            balance = tokenAccountInfo.value?.data.parsed.info.tokenAmount.amount;
            if (decimals === 0) decimals = tokenAccountInfo.value?.data.parsed.info.tokenAmount.decimals
          }
          const balanceFormat = decimals === 0 ? 0 : formatUnits(balance, decimals)
          const { usd, rate } = await getUSD(symbol, balanceFormat)
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
          return
        }
        const balance = await connection.getBalance(publicKey)
        const balanceFormat = formatUnits(balance, 9)
        const { usd, rate } = await getUSD('SOL', balanceFormat)
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })


        return
      }
      case "TRON": {
        if (checkIsTronAddress(address) === false) {
          getError(res, 'Invalid TRON address')
          return
        }
        const headers = isTest ? {} : { 'TRON-PRO-API-KEY': 'beeb2792-babf-446c-8b2c-a62149b03f6e' }
        const fullHost = isTest ? 'https://api.shasta.trongrid.io' : 'https://api.trongrid.io'
        const tronWeb = new TronWeb({ fullHost, headers })
        tronWeb.setAddress(address)
        if (tokenAddress && tokenAddress !== '') {
          const abi = [
            {
              "constant": true,
              "inputs": [],
              "name": "symbol",
              "outputs": [
                {
                  "name": "",
                  "type": "string"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function"
            },
            {
              "constant": true,
              "inputs": [],
              "name": "decimals",
              "outputs": [
                {
                  "name": "",
                  "type": "uint8"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function"
            },
            {
              "constant": true,
              "inputs": [
                {
                  "name": "owner",
                  "type": "address"
                }
              ],
              "name": "balanceOf",
              "outputs": [
                {
                  "name": "",
                  "type": "uint256"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function"
            }
          ]
          const contract = await tronWeb.contract(abi, tokenAddress)
          const symbol = await contract.symbol().call()
          const decimals = await contract.decimals().call()
          const balance = await contract.balanceOf(address).call()
          const balanceFormat = formatUnits(balance.toString(), decimals)
          const { usd, rate } = await getUSD(symbol, balanceFormat)
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
          return
        }
        const response = await tronWeb.trx.getBalance(address)
        const balance = response
        const balanceFormat = formatUnits(balance, 6)
        const rate = await getCoinRate('TRX', balanceFormat)
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
        return
      }
    }
  } catch (error) {
    getError(res, error)
    return
  }
  res.json({
    code: 200,
    data: {
      balance: 100
    }
  })

})
module.exports = router;
