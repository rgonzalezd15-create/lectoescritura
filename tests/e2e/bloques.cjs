const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
const silabas = { mamá: ['ma', 'má'], papá: ['pa', 'pá'], mapa: ['ma', 'pa'], sopa: ['so', 'pa'], sapo: ['sa', 'po'] }
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    await page.goto(BASE + '/modulo/5')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SP}/b0-modulo5-${nombre}.png` })
    await page.getByRole('button', { name: 'Lección familia' }).click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${SP}/b1-inicio-${nombre}.png` })
    const bloque = (s) => page.locator('[aria-label="Bloques"]').getByRole('button', { name: `Sílaba ${s}`, exact: true }).first()
    const palabras = Object.keys(silabas)
    for (const [k, w] of palabras.entries()) {
      const [a, b] = silabas[w]
      if (k === 1) {
        // Error a propósito: segunda sílaba equivocada, y luego corregir
        await bloque(a).click(); await page.waitForTimeout(300)
        await bloque('ma').click(); await page.waitForTimeout(500)
        await page.screenshot({ path: `${SP}/b3-error-${nombre}.png` })
        await page.waitForTimeout(4500)
        const enBase = await page.locator('[data-hueco] button').count()
        if (enBase !== 1) errs.push(`${nombre}: tras el error deberían quedar 1 bloque fijo, hay ${enBase}`)
        await bloque(b).click()
      } else if (k === 2) {
        // Arrastrar ambas sílabas a sus huecos
        for (const [i, s] of [a, b].entries()) {
          const src = await bloque(s).boundingBox()
          const dst = await page.locator(`[data-hueco="${i}"]`).boundingBox()
          await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
          await page.mouse.down()
          await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 15 })
          await page.mouse.up()
          await page.waitForTimeout(600)
        }
      } else {
        await bloque(a).click(); await page.waitForTimeout(300)
        if (k === 0) await page.screenshot({ path: `${SP}/b2-medio-${nombre}.png` })
        await bloque(b).click()
      }
      await page.waitForTimeout(1500)
      if (k === 0) await page.screenshot({ path: `${SP}/b4-lectura-${nombre}.png` })
      await page.waitForTimeout(5000)
    }
    await page.waitForTimeout(1000)
    const fin = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label').catch(() => 'NO LLEGÓ AL FINAL')
    console.log(nombre, 'final:', fin, '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth))
    await page.screenshot({ path: `${SP}/b5-fin-${nombre}.png` })
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
