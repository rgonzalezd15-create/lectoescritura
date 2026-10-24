const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
const PRI = ['ma', 'pa', 'sa'], SEG = ['pa', 'no', 'la', 'fo']
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    await page.goto(BASE + '/leccion/ruleta')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SP}/r1-inicio-${nombre}.png` })
    const ext = page.getByRole('slider', { name: 'Rueda de afuera' })
    const int = page.getByRole('slider', { name: 'Rueda de adentro' })
    // 1) Arrastre circular del anillo exterior: de arriba a la derecha (90° horario = una casilla atrás)
    const box = await page.locator('svg[aria-label="Ruleta de sílabas"]').boundingBox()
    const s = box.width / 320
    const cx = box.x + 160 * s, cy = box.y + 160 * s
    await page.mouse.move(cx, cy - 122 * s); await page.mouse.down()
    for (let a = 0; a <= 120; a += 10) {
      const r = (a * Math.PI) / 180
      await page.mouse.move(cx + 122 * s * Math.sin(r), cy - 122 * s * Math.cos(r))
    }
    await page.mouse.up(); await page.waitForTimeout(900)
    const trasArrastre = await ext.getAttribute('aria-valuetext')
    if (trasArrastre !== 'sa') errs.push(`${nombre}: el arrastre dejó "${trasArrastre}" (esperado "sa")`)
    // 2) "sapa" no es palabra → error a propósito
    await page.getByRole('button', { name: '¡Es una palabra!' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SP}/r2-no-palabra-${nombre}.png` })
    await page.waitForTimeout(1500)
    // 3) Giro sorpresa
    await page.getByRole('button', { name: 'Girar la ruleta' }).click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${SP}/r3-girando-${nombre}.png` })
    await page.waitForTimeout(2200)
    // 4) Encontrar 5 palabras con el teclado
    const poner = async (slider, lista, meta) => {
      let actual = lista.indexOf(await slider.getAttribute('aria-valuetext'))
      const objetivo = lista.indexOf(meta)
      await slider.focus()
      while (actual !== objetivo) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450); actual = (actual + 1) % lista.length }
    }
    for (const [k, w] of ['mapa', 'mano', 'papa', 'sala', 'sano'].entries()) {
      await poner(ext, PRI, w.slice(0, 2)); await poner(int, SEG, w.slice(2))
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: '¡Es una palabra!' }).click()
      await page.waitForTimeout(k === 4 ? 4500 : 1600)
      if (k === 2) await page.screenshot({ path: `${SP}/r4-album-${nombre}.png` })
    }
    await page.waitForTimeout(800)
    const fin = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label').catch(() => 'NO LLEGÓ AL FINAL')
    console.log(nombre, 'final:', fin, '| scroll', await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight].join('x')))
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
