const { chromium } = require('playwright')
const BASE = process.env.E2E_URL || 'http://localhost:5173'

/**
 * Regresión: al abrir una lección directamente (enlace o recarga), el navegador
 * mantiene el audio suspendido hasta el primer toque. El botón ➜ del
 * reproductor fonético debe activarse igual (antes quedaba bloqueado).
 */
;(async () => {
  const browser = await chromium.launch()
  const errs = []
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  for (const id of ['vocales', 'cons-m', 'cons-s', 'cons-l', 'cons-n', 'cons-f', 'cons-p']) {
    await page.goto(`${BASE}/leccion/${id}`)
    const t0 = Date.now()
    await page
      .getByRole('button', { name: 'Siguiente' })
      .click({ timeout: 5000 })
      .then(() => console.log(id, '➜ activo en', Date.now() - t0, 'ms'))
      .catch(() => errs.push(`${id}: el botón ➜ nunca se activó`))
  }
  console.log('ERRORES:', errs.length ? errs.join('\n') : 'ninguno'); if (errs.length) process.exitCode = 1
  await browser.close()
})()
