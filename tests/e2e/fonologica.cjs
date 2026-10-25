const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'
const SP = process.argv[2] || require('os').tmpdir()
const contenido = require('../../src/content/lecciones/m2-fonologica.json')
const leccion = (id) => contenido.lecciones.find((l) => l.id === id).pasos[0]

;(async () => {
  const browser = await chromium.launch()
  const errs = []
  for (const [nombre, vp] of [['tablet', { width: 1024, height: 768 }], ['movil', { width: 375, height: 740 }]]) {
    const page = await browser.newPage({ viewport: vp })
    page.on('pageerror', (e) => errs.push(nombre + ' pageerror: ' + e.message))
    page.on('console', (m) => m.type() === 'error' && errs.push(nombre + ' console: ' + m.text()))
    const reto = (k, n) => page.locator(`[aria-label="Reto ${k + 1} de ${n}"]`).waitFor({ timeout: 15000 })
    const estrellas = async (id, esperado) => {
      const t = await page.getByRole('img', { name: /de 3 estrellas/ }).first().getAttribute('aria-label', { timeout: 15000 }).catch(() => 'NO LLEGÓ AL FINAL')
      console.log(nombre, id, '→', t)
      if (t !== esperado) errs.push(`${nombre}: ${id} terminó con "${t}" (esperado "${esperado}")`)
    }

    await page.goto(BASE + '/')
    await page.waitForTimeout(500)
    if (await page.getByRole('button', { name: 'Conciencia Fonológica' }).isDisabled()) errs.push(`${nombre}: módulo 2 sigue bloqueado`)

    // 1) Palmadas: golpes correctos salvo en la 2.ª palabra (1 golpe de más y luego bien)
    await page.goto(BASE + '/leccion/m2-palmadas')
    await page.waitForTimeout(900)
    const palabras = leccion('m2-palmadas').palabras
    for (const [k, w] of palabras.entries()) {
      await reto(k, palabras.length)
      await page.waitForTimeout(300)
      const tambor = page.getByRole('button', { name: 'Tambor' })
      if (k === 1) {
        for (let i = 0; i <= w.silabas.length; i++) { await tambor.click(); await page.waitForTimeout(120) }
        await page.getByRole('button', { name: 'Comprobar' }).click()
        await page.waitForTimeout(3800)
      }
      for (let i = 0; i < w.silabas.length; i++) { await tambor.click(); await page.waitForTimeout(120) }
      if (k === 5) await page.screenshot({ path: `${SP}/m2-palmadas-${nombre}.png` })
      await page.getByRole('button', { name: 'Comprobar' }).click()
      if (k === 5) { await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/m2-palmadas-aplauso-${nombre}.png` }) }
      await page.waitForTimeout(w.silabas.length * 700 + 3500)
    }
    await estrellas('palmadas', '2 de 3 estrellas')

    // 2) Sonidos, rimas y parecidos: tocar las correctas (con un error en la primera ronda de cada uno)
    for (const id of ['m2-sonidos', 'm2-rimas', 'm2-parecidos']) {
      await page.goto(BASE + '/leccion/' + id)
      await page.waitForTimeout(900)
      const rondas = leccion(id).rondas
      for (const [k, r] of rondas.entries()) {
        await reto(k, rondas.length)
        await page.waitForTimeout(300)
        if (k === 0) {
          const mala = r.opciones.find((o) => !o.correcta)
          await page.getByRole('button', { name: mala.texto, exact: true }).click()
          await page.waitForTimeout(2500)
          await page.screenshot({ path: `${SP}/${id}-error-${nombre}.png` })
        }
        for (const o of r.opciones.filter((x) => x.correcta)) {
          await page.getByRole('button', { name: o.texto, exact: true }).click()
          await page.waitForTimeout(1200)
        }
        await page.waitForTimeout(2600)
      }
      const total = rondas.length
      const p = (total - 1) / total
      await estrellas(id, `${p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1} de 3 estrellas`)
    }
    console.log(nombre, 'scroll', await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight].join('x')))
    await page.close()
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
