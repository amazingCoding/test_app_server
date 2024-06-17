var express = require('express');
var { validateBTCAddress, calculateBalance, getCoinRate } = require('../check');
const { default: axios } = require('axios');
var router = express.Router();

router.get('/api/v1/balance', async (req, res, next) => {
  const { chainType, address, isTest, chainID, rpcURL, tokenAddress } = req.query
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

      break
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
