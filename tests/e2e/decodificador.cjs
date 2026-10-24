const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
const palabras = [['sopa', ['so', 'pa']], ['mapa', ['ma', 'pa']], ['sapo', ['sa', 'po']], ['paso', ['pa', 'so']]]
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    await page.goto(BASE + '/leccion/colores-decodificador')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SP}/d1-inicio-${nombre}.png` })
    const chip = (s) => page.getByRole('button', { name: `Color de la sílaba ${s}`, exact: true })
    for (const [k, [w, sils]] of palabras.entries()) {
      if (k === 1) {
        await chip('so').click(); await page.waitForTimeout(600)
        await chip('sa').click(); await page.waitForTimeout(700)
        await page.screenshot({ path: `${SP}/d3-pista-${nombre}.png` })
      }
      for (const [i, s] of sils.entries()) {
        await chip(s).click({ force: true }); await page.waitForTimeout(500)
        if (k === 0 && i === 0) await page.screenshot({ path: `${SP}/d2-medio-${nombre}.png` })
      }
      await page.waitForTimeout(800)
      if (k === 0) await page.screenshot({ path: `${SP}/d4-elegir-${nombre}.png` })
      if (k === 2) {
        const otra = palabras.map((p) => p[0]).find((x) => x !== w && ['paso', 'sopa'].includes(x))
        await page.getByRole('button', { name: `Imagen ${otra}` }).click(); await page.waitForTimeout(2500)
      }
      await page.getByRole('button', { name: `Imagen ${w}` }).click()
      await page.waitForTimeout(k === 0 ? 1800 : 4500)
      if (k === 0) { await page.screenshot({ path: `${SP}/d5-bien-${nombre}.png` }); await page.waitForTimeout(2500) }
    }
    await page.waitForTimeout(1000)
    const fin = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label').catch(() => 'NO LLEGÓ AL FINAL')
    console.log(nombre, 'final:', fin, '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), '| scrollHeight', await page.evaluate(() => document.documentElement.scrollHeight))
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
