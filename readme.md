// TEST

// BTC
http://localhost:3001/api/v1/balance?chainType=BTC&address=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa&priceType=USD

// EVM 原生币 ETH
http://localhost:3001/api/v1/balance?chainType=EVM&address=0x95cfE0834cf9b831E2c4592252740Ac52f604Bb1&priceType=USD&rpcURL=https%3A%2F%2Frpc-sepolia.rockx.com&symbol=ETH

// EVM TOKEN ETH-USDT
http://localhost:3001/api/v1/balance?chainType=EVM&address=0x95cfE0834cf9b831E2c4592252740Ac52f604Bb1&priceType=USD&rpcURL=https%3A%2F%2Frpc-sepolia.rockx.com&tokenAddress=0xe2D7250B2EC3CD208AC5B42886Edd162411529C4


// TRON 原生币 TRX
http://localhost:3001/api/v1/balance?chainType=TRON&address=TG8QEg8CaDEqMt8snmLFmSuxEAPQdkQDUq&priceType=USD
http://localhost:3001/api/v1/balance?chainType=TRON&address=TG8QEg8CaDEqMt8snmLFmSuxEAPQdkQDUq&priceType=USD&isTest=true

// TRON TOKEN TRX-USDT
http://localhost:3001/api/v1/balance?chainType=TRON&address=TG8QEg8CaDEqMt8snmLFmSuxEAPQdkQDUq&priceType=USD&tokenAddress=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t


// SOL 原生币 SOL
http://localhost:3001/api/v1/balance?chainType=SOL&address=FwzkteDPohkFbVWArWd6MTvKWGQRaoct2NTsxdQ2JaKQ&priceType=USD

http://localhost:3001/api/v1/balance?chainType=SOL&address=FwzkteDPohkFbVWArWd6MTvKWGQRaoct2NTsxdQ2JaKQ&priceType=USD&tokenAddress=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB


## api/v1/balance
- GET
- Params:
  - chainType: BTC | EVM | TRON | SOL
  - address: string
  - priceType: USD
  - rpcURL: string  [only EVM]
  - symbol: string  [only EVM]
  - tokenAddress: string [only EVM | TRON | SOL]
  - isTest: boolean [only TRON | SOL]