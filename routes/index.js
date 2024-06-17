var express = require('express');
var { validateBTCAddress, calculateBalance, getCoinRate } = require('../check');
const { default: axios } = require('axios');
const { JsonRpcProvider, formatEther, formatUnits } = require('ethers');
const { Contract } = require('ethers');
var router = express.Router();

router.get('/api/v1/balance', async (req, res, next) => {
  const { chainType, address, chainID, symbol, rpcURL, tokenAddress } = req.query
  switch (chainType) {
    case "BTC": {
      // http://localhost:3001/api/v1/balance?chainType=BTC&address=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa&priceType=USD
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
        res.json({ code: 200, data: { balance: balance.toString(), balanceFormat, rate, usd } })
      }

      return
    }
    case "SOL": {
      break
    }
    case "TRON": {
      break
    }
  }
  res.json({
    code: 200,
    data: {
      balance: 100
    }
  })

})

module.exports = router;
