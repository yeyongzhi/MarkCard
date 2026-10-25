import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toBeVisible()
})

test('global typography and corners persist without changing card rendering', async ({ page }) => {
  const content = page.locator('.preview-canvas .markcard-content')
  const paper = page.locator('.preview-canvas .card-paper')
  const originalFont = await content.evaluate((el) => getComputedStyle(el).fontSize)
  const originalRadius = await paper.evaluate((el) => getComputedStyle(el).borderRadius)
  const markdown = await page.getByRole('textbox', { name: 'Markdown 正文' }).inputValue()
  await page.getByRole('button', { name: '全局设置', exact: true }).click()
  const settings = page.getByRole('dialog', { name: '全局设置', exact: true })
  await settings.getByRole('slider', { name: '界面字号' }).focus()
  await page.keyboard.press('End')
  await expect(page.locator('html')).toHaveCSS('font-size', '24px')
  await settings.getByRole('slider', { name: '界面圆角' }).focus()
  await page.keyboard.press('Home')
  await expect(settings).toHaveCSS('border-radius', '0px')
  await page.keyboard.press('End')
  await expect(settings).toHaveCSS('border-radius', '24px')
  await expect(content).toHaveCSS('font-size', originalFont)
  await expect(paper).toHaveCSS('border-radius', originalRadius)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '导出卡片' })).toHaveCSS('font-size', '24px')
  await expect(page.getByRole('button', { name: '导出卡片' })).toHaveCSS('border-radius', '24px')
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('font-size', '24px')
  await expect(page.getByRole('button', { name: '全局设置' })).toHaveCSS('border-radius', '24px')
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toHaveValue(markdown)
  await page.getByRole('button', { name: '全局设置', exact: true }).click()
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await expect(page.locator('html')).toHaveCSS('font-size', '16px')
  await expect(settings).toHaveCSS('border-radius', '10px')
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
})

test('popover palettes and validated custom HEX update all card colors', async ({ page }) => {
  const card = page.locator('.preview-canvas .export-card')
  await page.getByRole('tab', { name: '排版', exact: true }).click()
  await page.getByRole('button', { name: /^正文色：/ }).click()
  await page.getByRole('button', { name: '正文色 #ef4444', exact: true }).click()
  await expect
    .poll(() => card.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--card-ink')))
    .toBe('#ef4444')
  await page.getByRole('button', { name: /^正文色：/ }).click()
  const hex = page.getByRole('textbox', { name: '正文色 HEX', exact: true })
  await hex.fill('#zzzzzz')
  await expect(hex).toHaveAttribute('aria-invalid', 'true')
  expect(
    await card.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--card-ink')),
  ).toBe('#ef4444')
  await hex.fill('#123456')
  await expect
    .poll(() => card.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--card-ink')))
    .toBe('#123456')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /^强调色：/ }).click()
  await page.getByRole('button', { name: '强调色 #3b82f6', exact: true }).click()
  await expect
    .poll(() => card.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--card-accent')))
    .toBe('#3b82f6')
  await page.getByRole('tab', { name: '背景', exact: true }).click()
  await page.locator('#background').click()
  await page.getByRole('option', { name: '自定纯色', exact: true }).click()
  await page.getByRole('button', { name: /^背景色：/ }).click()
  await page.getByRole('button', { name: '背景色 #f97316', exact: true }).click()
  await expect(card).toHaveCSS('background-color', 'rgb(249, 115, 22)')
})

test('width slider updates the preview and restores its saved value', async ({ page }) => {
  await page.getByRole('tab', { name: '排版', exact: true }).click()
  const slider = page.getByRole('slider', { name: '卡片宽度', exact: true })
  await expect(slider).toHaveCount(1)
  await slider.focus()
  await page.keyboard.press('Home')
  await expect(page.locator('.preview-canvas .export-card')).toHaveCSS('width', '320px')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.preview-canvas .export-card')).toHaveCSS('width', '330px')
  await page.keyboard.press('End')
  await expect(page.locator('.preview-canvas .export-card')).toHaveCSS('width', '1440px')
  await expect(page.getByRole('tablist', { name: '卡片宽度', exact: true })).toHaveCount(0)
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.locator('.preview-canvas .export-card')).toHaveCSS('width', '1440px')
})

test('right settings drawer persists theme and reacts to system appearance', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.getByRole('button', { name: '选择界面外观', exact: true }).click()
  await page.getByRole('button', { name: '暗色', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0)
  await page.getByRole('button', { name: '选择界面外观', exact: true }).click()
  await page.getByRole('button', { name: '跟随系统', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  const card = page.locator('.preview-canvas .export-card')
  const originalColor = await card.evaluate((el) => getComputedStyle(el).color)
  await page.getByRole('button', { name: '全局设置', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '全局设置', exact: true })
  await expect(drawer).toHaveAttribute('data-slot', 'sheet-content')
  await expect(drawer).toHaveAttribute('data-side', 'right')
  await expect(drawer.getByRole('tab', { name: '跟随系统', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await drawer.getByRole('tab', { name: '暗色', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await drawer.getByRole('tab', { name: '亮色', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await drawer.getByRole('tab', { name: '跟随系统', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(card).toHaveCSS('color', originalColor)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.reload()
  await page.getByRole('button', { name: '全局设置', exact: true }).click()
  await expect(drawer.getByRole('tab', { name: '跟随系统', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect
    .poll(async () =>
      Math.round((await drawer.boundingBox())!.x + (await drawer.boundingBox())!.width),
    )
    .toBe(1440)
  const box = (await drawer.boundingBox())!
  expect(Math.round(box.y)).toBe(0)
  expect(Math.round(box.height)).toBe(1000)
  await page.screenshot({
    path: `artifacts/settings-sheet-${test.info().project.name}.png`,
    animations: 'disabled',
  })
})
