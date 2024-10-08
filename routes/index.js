const express = require('express')
const { validateBTCAddress, calculateBalance, getCoinRate, checkIsETHAddress, checkIsTronAddress, isValidSolanaAddress } = require('../check')
const { default: axios } = require('axios')
const { JsonRpcProvider, formatEther, formatUnits } = require('ethers')
const cheerio = require('cheerio');
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
  console.log(rate);
  let usd = 0
  if (rate > 0) {
    usd = (Number(balance) * rate).toFixed(2)
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
        else {
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
        console.log(response);
        const balance = response
        const balanceFormat = formatUnits(balance, 6)
        const { rate, usd } = await getUSD('TRX', balanceFormat)
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
        return
      }
    }
  } catch (error) {
    console.log(error);
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
router.get('/api/v1/tokenInfo', async (req, res, next) => {
  const { chainType, rpcURL, tokenAddress, isTest } = req.query
  try {
    switch (chainType) {
      case "EVM": {
        if (checkIsETHAddress(tokenAddress) === false) {
          getError(res, 'Invalid token address')
          return
        }
        if (rpcURL === '') {
          getError(res, 'Invalid RPC URL')
          return
        }
        const url = decodeURIComponent(rpcURL)
        const provider = new JsonRpcProvider(url)
        // 获取合约 token 信息 name, symbol, decimals，totalSupply
        const erc20Abi = ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)"]
        const contract = new Contract(tokenAddress, erc20Abi, provider)
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const name = await contract.name();
        const totalSupply = await contract.totalSupply();
        res.json({ code: 200, data: { name, symbol, decimals: Number(decimals.toString()), totalSupply: totalSupply.toString() } })
        return
      }
      case "SOL": {
        console.log(tokenAddress);
        if (isValidSolanaAddress(tokenAddress) === false) {
          getError(res, 'Invalid SOL address')
          return
        }
        const connection = new solanaWeb3.Connection(isTest ? solanaWeb3.clusterApiUrl('devnet') : 'https://sly-hardworking-dew.solana-mainnet.quiknode.pro/f6eb1261fe38b21326f892aabef573a7fa01a80a/')
        const tokenPublicKey = new solanaWeb3.PublicKey(tokenAddress)
        const utl = new Client();
        const token = await utl.fetchMint(tokenPublicKey)
        const result = await connection.getParsedAccountInfo(tokenPublicKey)
        const symbol = token?.symbol || 'UNKNOWN'
        const name = token?.name || 'UNKNOWN'
        let decimals = token?.decimals || 0
        const totalSupply = result.value.data.parsed.info.supply || 0
        if (decimals === 0) decimals = result.value.data.parsed.info.decimals
        res.json({ code: 200, data: { name, symbol, totalSupply, decimals: Number(decimals.toString()) } })
        return
      }
      case "TRON": {
        if (checkIsTronAddress(tokenAddress) === false) {
          getError(res, 'Invalid TRON address')
          return
        }
        const headers = isTest ? {} : { 'TRON-PRO-API-KEY': 'beeb2792-babf-446c-8b2c-a62149b03f6e' }
        const fullHost = isTest ? 'https://api.shasta.trongrid.io' : 'https://api.trongrid.io'
        const tronWeb = new TronWeb({ fullHost, headers })
        tronWeb.setAddress('TG8QEg8CaDEqMt8snmLFmSuxEAPQdkQDUq')
        const abi = [
          {
            "constant": true,
            "inputs": [],
            "name": "name",
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
            "inputs": [],
            "name": "totalSupply",
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
        const name = await contract.name().call()
        const totalSupply = await contract.totalSupply().call()
        const decimals = await contract.decimals().call()
        res.json({ code: 200, data: { name, symbol, totalSupply: totalSupply.toString(), decimals: Number(decimals.toString()) } })
        return

        return
      }
    }
  } catch (error) {
    console.log(error);
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
router.get('/api/v1/getShitHolders', async (req, res, next) => {
  const { tokenAddress } = req.query
  //header Token
  const apiKey = '4fc487d2-3a1d-4619-a3a8-2f0ce8de2a5b'
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
  let allOwners = new Set();
  let cursor;
  while (true) {
    let params = { limit: 1000, mint: tokenAddress }
    if (cursor != undefined) params.cursor = cursor

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "text", method: "getTokenAccounts", params: params })
    })
    const data = await response.json()
    if (!data.result || data.result.token_accounts.length === 0) {
      console.log("No more results");
      break;
    }
    data.result.token_accounts.forEach((account) => {
      allOwners.add(account.owner);
    })
    cursor = data.result.cursor
  }
  // 所有持有者的地址
  res.json({
    code: 200,
    data: {
      holdersNumber: allOwners.size,
    }
  })
})
router.get('/api/v1/getTokentHolderAddress', async (req, res, next) => {
  const { tokenAddress } = req.query
  //header Token
  const apiKey = 'cf33bf4e-9364-4262-a27f-c8e869c5443e'
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
  let allOwners = new Set();
  let cursor;
  while (true) {
    let params = { limit: 1000, mint: tokenAddress }
    if (cursor != undefined) params.cursor = cursor

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "text", method: "getTokenAccounts", params: params })
    })
    const data = await response.json()
    if (!data.result || data.result.token_accounts.length === 0) {
      console.log("No more results");
      break;
    }
    data.result.token_accounts.forEach((account) => {
      allOwners.add(account.owner);
    })
    cursor = data.result.cursor
  }
  // 所有持有者的地址
  const allOwnersArray = Array.from(allOwners)
  res.json({
    code: 200,
    data: {
      holders: allOwnersArray,
    }
  })
})

router.get('/test', async (req, res, next) => {
  // 关闭
  await browser.close();
})
module.exports = router;
