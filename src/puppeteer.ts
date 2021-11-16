import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import config from './config'
import logger from './logger'

export async function refreshWeiboCookie() {
  try {
    puppeteer.use(StealthPlugin())
    // logger.debug('使用StealthPlugin')
    var browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true })
    logger.info('刷新微博cookie')
    const page = await browser.newPage()
    var weibo_cookie_str = config.get('weibo_cookie')
    if (typeof weibo_cookie_str != "string") {
      logger.error('请设置weibo_id')
      process.exit(1)
    }
    var weibo_cookie_json = strToJson(weibo_cookie_str)
    // logger.debug(JSON.stringify(weibo_cookie_json))
    for (const item of weibo_cookie_json) {
      await page.setCookie(item)
    }
    await page.goto('https://weibo.com/u/7198559139')
    await page.waitForTimeout(5000)
    await page.screenshot({ path: 'log/weibo.png', fullPage: true })
    var new_cookie = await page.cookies()
    // logger.debug(JSON.stringify(new_cookie))
    // logger.debug(jsonToStr(new_cookie))
    config.set('weibo_cookie', jsonToStr(new_cookie))
    for (const item of new_cookie) {
      if (item.name == 'WBPSESS') {
        for (const i2 of weibo_cookie_json) {
          if (i2.name == 'WBPSESS') {
            if (i2.value != item.value) {
              logger.warn('微博cookie已更新')
            }
          }
        }
      }
    }
    await browser.close()
  } catch (err) {
    logger.error('刷新微博cookie失败：')
    logger.error(err)
  }
}

function strToJson(source: string) {
  return source.replace(/; /g, ';').replace(/;$/g, '').split(';').map(item => { return { name: item.split('=')[0], value: item.split('=')[1], domain: 'weibo.com' } })
}
function jsonToStr(source: any) {
  var result = ''
  source.forEach((element: any) => {
    result += `${element['name']}=${element['value']};`
  });
  return result.replace(/;$/g, '')
}