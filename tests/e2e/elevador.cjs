const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    await page.goto(BASE + '/')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SP}/1-home-${nombre}.png` })
    await page.getByRole('button', { name: 'Consonantes y Sílabas' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SP}/2-modulo-${nombre}.png` })
    await page.getByRole('button', { name: 'Lección m', exact: true }).click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SP}/3-presentacion-${nombre}.png` })
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SP}/4-elevador-${nombre}.png` })
    // Resolver los 5 retos: ma, mo, me, mu, mi
    const vocales = ['a', 'e', 'i', 'o', 'u']
    for (const [k, t] of ['ma', 'mo', 'me', 'mu', 'mi'].entries()) {
      const sel = await page.locator('[aria-label="Vocales"] [aria-selected="true"]').innerText()
      let actual = vocales.indexOf(sel), meta = vocales.indexOf(t[1])
      if (k === 0 && nombre === 'tablet') {
        // Probar el arrastre con el dedo/ratón en el primer reto
        const box = await page.locator('[aria-label="Vocales"]').boundingBox()
        const x = box.x + box.width / 2, y = box.y + box.height / 2
        await page.mouse.move(x, y); await page.mouse.down()
        await page.mouse.move(x, y + (actual - meta) * 88, { steps: 12 }); await page.mouse.up()
        await page.waitForTimeout(500)
      } else {
        while (actual !== meta) {
          await page.getByRole('button', { name: actual < meta ? 'Vocal siguiente' : 'Vocal anterior' }).click()
          actual += actual < meta ? 1 : -1
          await page.waitForTimeout(80)
        }
      }
      const ahora = await page.locator('[aria-label="Vocales"] [aria-selected="true"]').innerText()
      if (ahora !== t[1]) errs.push(`${nombre}: reto ${t} quedó en ${ahora}`)
      await page.getByRole('button', { name: 'Comprobar' }).click()
      if (k === 0) { await page.waitForTimeout(300); await page.screenshot({ path: `${SP}/5-acierto-${nombre}.png` }) }
      await page.waitForTimeout(4500)
    }
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SP}/6-fin-${nombre}.png` })
    const estrellas = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label')
    console.log(nombre, 'final:', estrellas)
    if (nombre === 'tablet') {
      await page.goto(BASE + '/leccion/palabras-elevador')
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${SP}/7-palabras-${nombre}.png` })
      await page.goto(BASE + '/adultos')
      const q = await page.getByText(/cuánto es/).innerText()
      const [, a, b] = q.match(/(\d+) \+ (\d+)/)
      await page.getByRole('button', { name: String(+a + +b), exact: true }).click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${SP}/8-panel.png`, fullPage: true })
    } else {
      await page.goto(BASE + '/leccion/palabras-elevador')
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${SP}/7-palabras-${nombre}.png` })
      const sw = await page.evaluate(() => document.documentElement.scrollWidth)
      console.log('movil scrollWidth', sw)
    }
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
