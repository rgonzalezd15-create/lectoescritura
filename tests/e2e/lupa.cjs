const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
const retos = [['mapa', ['ma', 'pa'], 'so'], ['lupa', ['lu', 'pa'], 'mi'], ['mano', ['ma', 'no'], null], ['sopa', ['so', 'pa'], null]]
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp, touch] of [['tablet', { width: 1024, height: 768 }, false], ['movil', { width: 375, height: 740 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    await page.goto(BASE + '/leccion/detective-lupa')
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${SP}/l1-inicio-${nombre}.png` })
    const card = page.locator('[aria-label="Tarjeta secreta: pasa la lupa"]')
    const llenos = () => page.locator('[aria-label="Palabra encontrada"] span').count()
    const chip = (s) => page.getByRole('button', { name: `Sílaba ${s}`, exact: true }).first()
    for (const [k, [, sils, error]] of retos.entries()) {
      if (k === 2) {
        // Un solo toque sobre una sílaba escondida: la descubre pero NO la elige
        await page.getByRole('button', { name: 'Escondite 1', exact: true }).click({ force: true })
        await page.waitForTimeout(500)
        if ((await llenos()) !== 0) errs.push(`${nombre}: un toque a ciegas eligió la sílaba`)
        if (!(await chip('ma').isVisible())) errs.push(`${nombre}: el toque no descubrió la sílaba`)
        await page.screenshot({ path: `${SP}/l3-descubierta-${nombre}.png` })
      }
      // Barrido de la lupa por toda la tarjeta (ratón: mover; táctil: arrastrar con el botón pulsado)
      const b = await card.boundingBox()
      await page.mouse.move(b.x + 5, b.y + b.height / 6)
      if (touch) await page.mouse.down()
      for (const fy of [1 / 6, 3 / 6, 5 / 6]) {
        for (let fx = 0.05; fx <= 0.96; fx += 0.06) await page.mouse.move(b.x + fx * b.width, b.y + fy * b.height, { steps: 2 })
        if (k === 0 && fy === 3 / 6) await page.screenshot({ path: `${SP}/l2-barrido-${nombre}.png` })
      }
      if (touch) await page.mouse.up()
      await page.waitForTimeout(400)
      if (error) {
        await chip(error).click({ force: true }); await page.waitForTimeout(1800)
        const op = await chip(error).evaluate((el) => getComputedStyle(el).opacity)
        if (Number(op) > 0.5) errs.push(`${nombre}: el distractor ${error} no se apagó (opacity ${op})`)
        if (k === 0) await page.screenshot({ path: `${SP}/l4-error-${nombre}.png` })
      }
      for (const s of sils) { await chip(s).click({ force: true }); await page.waitForTimeout(700) }
      if (k === 0) { await page.waitForTimeout(600); await page.screenshot({ path: `${SP}/l5-completa-${nombre}.png` }) }
      await page.waitForTimeout(5000)
    }
    await page.waitForTimeout(800)
    const fin = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label').catch(() => 'NO LLEGÓ AL FINAL')
    console.log(nombre, 'final:', fin, '| scroll', await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight].join('x')))
    await ctx.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
