var express = require('express');
var { validateBTCAddress, calculateBalance, getCoinRate, checkIsETHAddress, checkIsTronAddress, isValidSolanaAddress } = require('../check');
const { default: axios } = require('axios');
const { JsonRpcProvider, formatEther, formatUnits } = require('ethers');
const { Contract } = require('ethers');
const TronWeb = require('tronweb');
const solanaWeb3 = require('@solana/web3.js');
const splToken = require("@solana/spl-token")
// import { Client } from '@solflare-wallet/utl-sdk';
const { Client } = require('@solflare-wallet/utl-sdk');
var router = express.Router();

router.get('/api/v1/balance', async (req, res, next) => {
  const { chainType, address, isTest, symbol, rpcURL, tokenAddress } = req.query
  try {
    switch (chainType) {
      case "BTC": {
        let isBTCAddress = validateBTCAddress(address)
        if (!isBTCAddress) {
          res.json({ code: 400, message: 'Invalid BTC address' })
          return
        }
        try {
          const response = await axios.get(`https://blockstream.info/api/address/${address}`)
          const rate = await getCoinRate(chainType)
          const { balanceSatoshis, balanceBTC } = calculateBalance(response.data)
          const usd = rate * balanceBTC
          res.json({ code: 200, data: { balance: balanceSatoshis, balanceFormat: balanceBTC, rate, usd } })
        } catch (error) {
          res.json({ code: 400, message: error.message })
        }
        return
      }
      case "EVM": {
        if (checkIsETHAddress(address) === false) {
          res.json({ code: 400, message: 'Invalid ETH address' })
          return
        }
        if (rpcURL === '') {
          res.json({ code: 400, message: 'Invalid RPC URL' })
          return
        }
        const url = decodeURIComponent(rpcURL)
        const provider = new JsonRpcProvider(url)
        if (!tokenAddress) {
          const balance = await provider.getBalance(address)
          const rate = await getCoinRate(symbol)
          const balanceFormat = formatEther(balance)
          const usd = rate * balanceFormat
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
        }
        else {
          // 获取合约余额
          const erc20Abi = [
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address owner) view returns (uint256)"
          ]
          const contract = new Contract(tokenAddress, erc20Abi, provider)
          // 先查询 精度
          const symbol = await contract.symbol();
          const decimals = await contract.decimals();
          const balance = await contract.balanceOf(address);
          console.log(symbol);
          console.log(decimals);
          const balanceFormat = formatUnits(balance, decimals)
          const rate = await getCoinRate(symbol)
          const usd = rate * balanceFormat
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
        }

        return
      }
      case "SOL": {
        if (isValidSolanaAddress(address) === false) {
          res.json({ code: 400, message: 'Invalid SOL address' })
          return
        }
        const connection = new solanaWeb3.Connection(isTest ? solanaWeb3.clusterApiUrl('devnet') : 'https://sly-hardworking-dew.solana-mainnet.quiknode.pro/f6eb1261fe38b21326f892aabef573a7fa01a80a/')
        const publicKey = new solanaWeb3.PublicKey(address)
        if (tokenAddress && tokenAddress !== '') {
          const tokenPublicKey = new solanaWeb3.PublicKey(tokenAddress)
          const utl = new Client();
          const token = await utl.fetchMint(tokenPublicKey)
          console.log(token);
          const symbol = token?.symbol || 'UNKNOWN'
          let decimals = token?.decimals || 0
          let balance = 0
          const accounts = await connection.getTokenAccountsByOwner(publicKey, { mint: tokenPublicKey })
          for (let account of accounts.value) {
            const tokenAccountInfo = await connection.getParsedAccountInfo(account.pubkey);
            console.log(tokenAccountInfo.value?.data.parsed);
            balance = tokenAccountInfo.value?.data.parsed.info.tokenAmount.amount;
            if (decimals === 0) decimals = tokenAccountInfo.value?.data.parsed.info.tokenAmount.decimals
          }
          const balanceFormat = decimals === 0 ? 0 : formatUnits(balance, decimals)
          const rate = await getCoinRate(symbol)
          const usd = rate === -1 ? 0 : rate * balanceFormat
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
          return
        }
        const balance = await connection.getBalance(publicKey)
        const rate = await getCoinRate('SOL')
        const balanceFormat = formatUnits(balance, 9)
        const usd = rate === -1 ? 0 : rate * balanceFormat
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })


        return
      }
      case "TRON": {
        if (checkIsTronAddress(address) === false) {
          res.json({ code: 400, message: 'Invalid TRON address' })
          return
        }
        const header = isTest ? {} : { 'TRON-PRO-API-KEY': 'beeb2792-babf-446c-8b2c-a62149b03f6e' }
        const tronWeb = new TronWeb({
          fullHost: isTest ? 'https://api.shasta.trongrid.io' : 'https://api.trongrid.io',
          headers: header
        });
        tronWeb.setAddress(address);
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
          console.log(balance);

          const balanceFormat = formatUnits(balance.toString(), decimals)
          const rate = await getCoinRate(symbol)
          const usd = rate * balanceFormat
          res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd, symbol } })
          return
        }
        const response = await tronWeb.trx.getBalance(address)
        const balance = response
        const balanceFormat = formatUnits(balance, 6)
        const rate = await getCoinRate('TRX')
        const usd = rate * balanceFormat
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
        return
      }
    }
  } catch (error) {
    console.log(typeof error, error);
    let message = 'unknown error'
    if (typeof error === 'string') {
      message = error
    }
    else if (error.response) {
      message = error.response.data.message
    }
    else if (error.message) {
      message = error.message
    }
    else {
      message = error.toString()
    }
    res.json({ code: 400, message })
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
