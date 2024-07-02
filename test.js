const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const main = async () => {
  const start = Date.now();
  console.log('start: ', start)
  // 启动chrome浏览器
  const browser = await puppeteer.launch();
  // 创建一个新页面
  const page = await browser.newPage();
  // 页面指向指定网址
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('https://www.coincarp.com/chainlist/');
  const $ = cheerio.load(await page.content());
  const chainlist = $('.chainlist-item');
  let list = []
  for (let index = 0; index < chainlist.length; index++) {
    const chainItem = {}
    const element = chainlist[index];
    chainItem.chainid = Number($(element).attr('data-chainid'))

    if (chainItem.chainid === 1 || chainItem.chainid === 56 || chainItem.chainid === 137) {
      continue
    }
    const chainName = $(element).find('.chain-name')
    chainItem.icon = $(chainName).find('img').attr('src').split('?')[0] + '?style=120'
    if (chainItem.icon === 'https://s1.coincarp.com/logo/1/ethereum.png?style=120') {
      chainItem.icon = 'https://raw.githubusercontent.com/amazingCoding/web3Config/master/app_icon/eth.png?raw=true'
    }
    chainItem.name = $(chainName).find('a').text()
    // name 去掉 Mainnet 并且 trim
    chainItem.name = chainItem.name.replace('Mainnet', '').trim()
    const dataNativecurrency = $(element).attr('data-nativecurrency').split(',')
    if (dataNativecurrency.length >= 3) {
      chainItem.symbol = dataNativecurrency[1]
      chainItem.decimals = Number(dataNativecurrency[2])
    }


    chainItem.scanUrl = $(element).attr('data-blockexplorerurls')
    chainItem.rpcUrl = $(element).attr('data-rpcurls').split(',')
    // rpcUrl 过滤 wss 和 带 {rpc} 的
    chainItem.rpcUrl = chainItem.rpcUrl.filter(url => {
      return !url.includes('wss') && !url.includes('{')
    })
    // 只取第一个 rpcUrl
    chainItem.rpcUrl = chainItem.rpcUrl[0]
    //"type": "evm",
    chainItem.type = "evm"
    list.push(chainItem)

    if (!chainItem.symbol || !chainItem.decimals || chainItem.decimals !== 18) {
      console.log('chainItem: ', chainItem)
    }
  }
  // 所有 ICON 是 'https://raw.githubusercontent.com/amazingCoding/web3Config/master/app_icon/eth.png?raw=true' 都排到最后
  const ethIcon = 'https://raw.githubusercontent.com/amazingCoding/web3Config/master/app_icon/eth.png?raw=true'
  const ethList = list.filter(item => item.icon === ethIcon)
  const otherList = list.filter(item => item.icon !== ethIcon)
  list = otherList.concat(ethList)

  await browser.close();
  fs.writeFileSync('chainlist.json', JSON.stringify(list, null, 2))
  const end = Date.now();
  console.log('end: ', end)
  // 打印耗时 分钟
  console.log('time: ', (end - start) / 1000 / 60)
}
const main2 = async () => {
  // 读取 chainlist.json
  // 初始 id 为当前时间戳
  let id = new Date().getTime()
  const chainlist = JSON.parse(fs.readFileSync('chainlist.json').toString())
  // 给每个 chainlist 添加 id
  chainlist.forEach(item => {
    item.id = 'default-' + id
    id += 1
    // 给每个 chainlist 的 tokens 添加 id
    if (item.tokens) {
      item.tokens.forEach(token => {
        token.id = 'default-' + id
        id += 1
      })
    }
  })
  // 写入 chainlist.json
  fs.writeFileSync('chainlist.json', JSON.stringify(chainlist, null, 2))
}
// main()
main2()