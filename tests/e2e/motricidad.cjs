const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()

/** Recorre un camino del SVG (viewBox 400×200) arrastrando el dedo/ratón. */
async function recorrer(page, salirse) {
  const svg = page.locator('svg[aria-label^="Camino de"]')
  const box = await svg.boundingBox()
  const pts = await svg.evaluate((el) => {
    const p = el.querySelector('path')
    const L = p.getTotalLength()
    return Array.from({ length: 80 }, (_, i) => {
      const q = p.getPointAtLength((i / 79) * L)
      return [q.x, q.y]
    })
  })
  const a = (x, y) => [box.x + (x / 400) * box.width, box.y + (y / 200) * box.height]
  await page.mouse.move(...a(...pts[0]))
  await page.mouse.down()
  for (let i = 1; i < pts.length; i++) {
    if (salirse && i === 30) {
      // Se sale del camino a mitad: debe quedarse donde iba, sin perder lo avanzado
      await page.mouse.move(...a(pts[i][0], pts[i][1] + 120 > 200 ? pts[i][1] - 120 : pts[i][1] + 120), { steps: 3 })
      await page.mouse.up()
      await page.waitForTimeout(300)
      await page.mouse.move(...a(...pts[i - 1]))
      await page.mouse.down()
    }
    await page.mouse.move(...a(...pts[i]), { steps: 2 })
  }
  await page.mouse.up()
}

;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    /** Espera a que la app muestre el reto k (en lugar de esperas fijas que dependen de la voz). */
    const reto = (k, n) => page.locator(`[aria-label="Reto ${k + 1} de ${n}"]`).waitFor({ timeout: 15000 })
    const estrellas = async (leccion) => {
      const t = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label', { timeout: 15000 }).catch(() => 'NO LLEGÓ AL FINAL')
      console.log(nombre, leccion, '→', t)
      if (t === 'NO LLEGÓ AL FINAL') errs.push(`${nombre}: ${leccion} no terminó`)
    }

    // Inicio: el módulo 1 ya está disponible
    await page.goto(BASE + '/')
    await page.waitForTimeout(500)
    if (await page.getByRole('button', { name: 'Motricidad y Coordinación' }).isDisabled()) errs.push(`${nombre}: módulo 1 sigue bloqueado`)

    // 1) Caminos
    await page.goto(BASE + '/leccion/m1-caminos')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SP}/m1-camino-inicio-${nombre}.png` })
    for (let k = 0; k < 5; k++) {
      await reto(k, 5)
      await page.waitForTimeout(300)
      await recorrer(page, k === 1)
      if (k === 0) await page.screenshot({ path: `${SP}/m1-camino-fin-${nombre}.png` })
      await page.waitForTimeout(2600)
    }
    await estrellas('caminos')

    // 2) Unir puntos (tocando cada punto; en la casa, un toque equivocado primero)
    await page.goto(BASE + '/leccion/m1-puntos')
    await page.waitForTimeout(800)
    for (let k = 0; k < 4; k++) {
      await reto(k, 4)
      await page.waitForTimeout(300)
      const svg = page.locator('svg[aria-label^="Une los puntos"]')
      const box = await svg.boundingBox()
      const pts = await svg.evaluate((el) => [...el.querySelectorAll('g > circle[r="4.2"]')].map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy')]))
      const a = ([x, y]) => [box.x + ((x + 4) / 108) * box.width, box.y + ((y + 4) / 108) * box.height]
      if (k === 0) { await page.mouse.click(...a(pts[3])); await page.waitForTimeout(300) }
      for (let i = 1; i < pts.length; i++) {
        await page.mouse.click(...a(pts[i]))
        await page.waitForTimeout(200)
        if (k === 2 && i === 4) await page.screenshot({ path: `${SP}/m1-puntos-medio-${nombre}.png` })
      }
      await page.waitForTimeout(700)
      if (k === 0) await page.screenshot({ path: `${SP}/m1-puntos-fin-${nombre}.png` })
      await page.waitForTimeout(2500)
    }
    await estrellas('puntos')

    // 3) ¿Cuál es diferente? (lee la transformación del DOM para encontrarlo; un error en la ronda 2)
    await page.goto(BASE + '/leccion/m1-diferente')
    await page.waitForTimeout(800)
    for (let k = 0; k < 6; k++) {
      await reto(k, 6)
      await page.waitForTimeout(300)
      const botones = page.getByRole('button', { name: /^Elemento \d+$/ })
      const n = await botones.count()
      let distinto = -1
      for (let i = 0; i < n; i++) {
        const tr = await botones.nth(i).locator('span').evaluate((el) => el.style.transform)
        if (tr) distinto = i
      }
      if (k === 0) await page.screenshot({ path: `${SP}/m1-diferente-${nombre}.png` })
      if (k === 1) { await botones.nth((distinto + 1) % n).click(); await page.waitForTimeout(500) }
      await botones.nth(distinto).click()
      if (k === 5) await page.screenshot({ path: `${SP}/m1-diferente-p-${nombre}.png` })
      await page.waitForTimeout(2600)
    }
    await estrellas('diferente')
    console.log(nombre, 'scroll', await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight].join('x')))
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
