## API 
* 查询指定链是否支持

  ```
  api/v1/chainTypeIsSupport?chainType=BTC
  ```
  * method：GET
  * params：
    * chainType：BTC | ETH | SOL | TRX
  * response：
    * status：0 | -1
    * message：提示信息
    * data
      * chainType：BTC | ETH | SOL | TRX
      * isSupport：true | false


* 查询指定链的地址余额
  
    ```
    api/v1/chainBalance?chainType=BTC&address=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa&priceType=USD
    ```
    * method：GET
    * params：
      * chainType：BTC | ETH | SOL | TRX
      * address：地址
      * priceType：USD | CNY | EUR
    * response：
      * status：0 | -1
      * message：提示信息
      * data
        * chainType：BTC | ETH | SOL | TRX
        * address：地址
        * balance：余额
        * unit：单位
        * price：价格    

* 查询指定链的智能合约余额
  
    ```
    api/v1/chainTokenBalance?chainType=ETH&address=0x&tokenAddress=0x&priceType=USD
    ```
    * method：GET
    * params：
      * chainType：BTC | ETH | SOL | TRX
      * address：地址
      * tokenAddress：合约地址
      * priceType：USD | CNY | EUR
      * chainId：链ID (可选)
    * response：
      * status：0 | -1
      * message：提示信息
      * data
        * chainType：ETH | SOL | TRX
        * address：地址
        * tokenAddress：合约地址
        * balance：余额
        * unit：单位
        * price：价格        
