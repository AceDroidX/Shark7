import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import config from './config'
import logger from './logger'
import fs from 'fs'

export async function refreshWeiboCookie() {
  try {
    puppeteer.use(StealthPlugin())
    // logger.debug('使用StealthPlugin')
    if (fs.existsSync('/usr/bin/google-chrome')) {
      var exepath = '/usr/bin/google-chrome'
    }
    else {
      var exepath = ''
    }
    var browser = await puppeteer.launch({
      // pipe: true,
      executablePath: exepath,
      args: ['--no-sandbox', "--single-process", "--no-zygote"],
      // args: ['--no-sandbox', '--disable-setuid-sandbox',
      //   '--disable-dev-shm-usage', '--single-process'],
      headless: true
    })
    logger.info('puppeteer:刷新微博cookie')
    const page = await browser.newPage()

    logger.debug('puppeteer:setViewport')
    await page.setViewport({ width: 1920, height: 1080 });
    var weibo_cookie = config.getWeiboCookie()
    logger.debug(JSON.stringify(weibo_cookie))
    if (weibo_cookie === false) {
      logger.debug('puppeteer:goto')
      await page.goto('https://weibo.com/u/7198559139')
      await page.waitForTimeout(5000)
      await page.screenshot({ path: 'log/weibo-0.png', fullPage: false })
      logger.debug('puppeteer:click')
      await page.click('#app > div.woo-box-flex.woo-box-column.Frame_wrap_3g67Q > div.Frame_top_2ybWw > div > div.Nav_wrap_gHB1a > div > div > div.woo-box-flex.woo-box-justifyEnd.Nav_right_pDw0F > div > div:nth-child(1) > div > a.LoginBtn_btn_10QRY.LoginBtn_btna_1hH9H')
      logger.debug('puppeteer:waitForResponse')
      const finalResponse = await page.waitForResponse(response => response.url().includes('v2.qr.weibo.cn'), { timeout: 10000 });
      logger.info('请在30秒内扫描此二维码登录weibo：\n' + JSON.stringify(finalResponse.url()));
      await page.waitForNavigation({ timeout: 30000, waitUntil: 'domcontentloaded' })
      logger.info('登录成功')
      logger.debug(JSON.stringify(await page.cookies()))
      config.setWeiboCookie(await page.cookies())
    } else {
      logger.debug('puppeteer:setCookie')
      await page.setCookie(...weibo_cookie)
      logger.debug('puppeteer:goto')
      await page.goto('https://weibo.com/u/7198559139')
      logger.debug('puppeteer:waitForResponse')
      await page.waitForTimeout(5000)
    }
    logger.debug('puppeteer:screenshot')
    await page.screenshot({ path: 'log/weibo.png', fullPage: false })

    var weibo_cookie_str = config.get('weibo_cookie')
    if (typeof weibo_cookie_str != "string") {
      logger.warn('weibo_id不存在')
      weibo_cookie_str = ''
    }
    logger.debug('puppeteer:weibo_cookie_json')
    var weibo_cookie_json = strToJson(weibo_cookie_str)
    logger.debug(JSON.stringify(weibo_cookie_json))
    logger.debug('puppeteer:cookies')
    var new_cookie = await page.cookies()
    logger.debug(JSON.stringify(new_cookie))
    logger.debug(jsonToStr(new_cookie))
    config.set('weibo_cookie', jsonToStr(new_cookie))
    for (const item of new_cookie) {
      if (item.name == 'WBPSESS') {
        for (const i2 of weibo_cookie_json) {
          if (i2.name == 'WBPSESS') {
            if (i2.value != item.value) {
              logger.warn('微博cookie已更新')
              await browser.close()
              return true
            }
          }
        }
      }
    }
    logger.info('微博cookie未更新')
    await browser.close()
    return false
  } catch (err) {
    logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
  }
}

function strToJson(source: string) {
  return source.replace(/; /g, ';').replace(/;$/g, '').split(';').map(item => {
    var name = item.match(/^.*?(?==)/)
    var value = item.match(/(?<==)(.*)$/)
    if (name == null || value == null) {
      throw new Error('cookie格式错误')
    }
    return {
      name: name[0], value: value[0], domain: 'weibo.com'
    }
  })
}
function jsonToStr(source: any) {
  var result = ''
  source.forEach((element: any) => {
    result += `${element['name']}=${element['value']};`
  });
  return result.replace(/;$/g, '')
}