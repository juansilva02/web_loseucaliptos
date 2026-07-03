import { expect, test } from '@playwright/test'

test('home, catalogo canonico y checkout completo', async ({ page }, testInfo) => {
  await page.route('**/api/delivery/search', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          id: 'direccion-e2e',
          label: 'Av. Monteverde 2800, San Francisco Solano, Buenos Aires',
          locality: 'San Francisco Solano',
          lat: -34.7904,
          lng: -58.3096,
          coverage: {
            status: 'in_range',
            branchKey: 'solano',
            distanceKm: 0.5,
          },
          deliveryFee: null,
        }],
        attribution: 'OpenStreetMap contributors',
      }),
    })
  })
  await page.addInitScript(() => {
    window.open = (url) => {
      window.__e2eOpenedUrl = String(url)
      return {}
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Corralon')
  const primaryCta = page.getByRole('button', { name: 'Compra online' })
  await expect(primaryCta).toBeVisible()
  const preFaqContact = page.locator('.pre-faq-contact')
  await expect(preFaqContact).toBeVisible()
  expect(await preFaqContact.evaluate((element) => element.nextElementSibling?.id))
    .toBe('preguntas-frecuentes')
  await expect(page.locator('.site-footer .site-footer-brand')).toHaveCount(0)
  if (testInfo.project.name === 'mobile-375') {
    const ctaBox = await primaryCta.boundingBox()
    expect(ctaBox?.y).toBeLessThan(812)
  }

  await page.goto('/catalogo/')
  await expect(page).toHaveURL(/\/catalogo$/)
  await expect(page.getByRole('heading', { name: 'Catalogo' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Agregar al carrito' }).first().click()
  await page.getByRole('button', { name: /Mi carrito/ }).first().click()
  await page.getByRole('button', { name: 'Enviar - Solano' }).click()

  await page.locator('#checkout-locality').fill('San Francisco Solano')
  await page.locator('#checkout-street').fill('Av. Monteverde')
  await page.locator('#checkout-street-number').fill('2800')
  await page.getByRole('button', { name: 'Validar cobertura y continuar' }).click()

  await page.locator('#checkout-full-name').fill('Cliente E2E')
  await page.locator('#checkout-phone').fill('11 5555 5555')
  await page.getByRole('button', { name: 'Continuar con fecha de entrega' }).click()
  await page.locator('.checkout-slot-button').first().click()
  await page.getByRole('button', { name: 'Abrir WhatsApp con el pedido' }).click()

  const openedUrl = await page.evaluate(() => window.__e2eOpenedUrl)
  expect(openedUrl).toContain('wa.me/5491159748316')
  expect(openedUrl).toContain('Cliente%3A')
})

test('admin guarda solo la fila editada', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'El flujo admin se cubre una vez en desktop')
  await page.goto('/#admin')
  await page.getByLabel('Usuario').fill('admin@e2e.local')
  await page.getByLabel('Contrasena').fill('Admin-e2e-123')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(/Panel/).first()).toBeVisible()

  const firstProductName = page
    .locator('.admin-table tbody tr')
    .first()
    .locator('input:not([type="file"])')
    .first()
  await firstProductName.fill(`${await firstProductName.inputValue()} E2E`)
  await page.getByRole('button', { name: 'Guardar cambios' }).first().click()
  await expect(page.getByText('1 cambio(s) guardado(s)')).toBeVisible()
})
