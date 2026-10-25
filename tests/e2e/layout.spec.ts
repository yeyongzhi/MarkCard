import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toBeVisible()
})

test('uses a neutral workbench, uniform text and an inline template tab', async ({ page }) => {
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
    '16px',
  )
  const elements = [
    'header a',
    '[data-slot=tabs-trigger]',
    '.markdown-editor',
    '.workspace-footer time',
    '.workspace-footer [role=toolbar] span',
  ]
  for (const selector of elements) {
    await expect(page.locator(selector).first()).toHaveCSS('font-size', '16px')
  }
  for (const card of await page
    .locator('.app-shell > [data-slot=card], main [data-slot=card]')
    .all()) {
    await expect(card).toHaveCSS('background-color', /^(rgb\(255, 255, 255\)|oklch\(1 0 0\))$/)
  }
  await expect(page.locator('[data-slot=card-footer]')).toHaveCSS(
    'background-color',
    /^(rgb\(255, 255, 255\)|oklch\(1 0 0\))$/,
  )
  await expect(
    page.getByRole('region', { name: '卡片预览' }).locator('[data-slot=scroll-area-viewport]'),
  ).toBeVisible()
  const primary = await page
    .getByRole('button', { name: '导出卡片' })
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  const channels = primary.match(/[\d.]+/g)?.slice(0, 3)
  if (primary.startsWith('oklch')) expect(Number(channels?.[1])).toBe(0)
  else expect(new Set(channels).size).toBe(1)
  await expect(page.getByRole('tab', { name: '模板', exact: true })).toBeVisible()
  await expect(page.locator('[aria-label^=应用][aria-label$=模板]')).toHaveCount(12)
  await expect
    .poll(() =>
      page
        .locator('.template-thumbnail')
        .evaluateAll(
          (elements) =>
            elements.length === 12 &&
            elements.every((el) => el.clientWidth > 50 && el.clientHeight > 50),
        ),
    )
    .toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('实时预览', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '下一张卡片' })).toHaveCount(0)
  await expect(page.getByText('全部数据均保存在本地，不上传云端', { exact: true })).toHaveCount(0)
  const zoomToolbar = page.getByRole('toolbar', { name: '预览缩放' })
  await expect(page.locator('footer').getByRole('toolbar', { name: '预览缩放' })).toBeVisible()
  await expect(page.getByRole('region', { name: '卡片预览' }).getByRole('toolbar')).toHaveCount(0)
  await expect(zoomToolbar.locator('span')).not.toHaveText('10%')
  const originalZoom = Number((await zoomToolbar.locator('span').innerText()).replace('%', ''))
  await page.getByRole('button', { name: '放大预览' }).click()
  await expect(zoomToolbar.locator('span')).toHaveText(`${originalZoom + 10}%`)
  await page.getByRole('button', { name: '适应画布' }).click()
  await expect(zoomToolbar.locator('span')).toHaveText(`${originalZoom}%`)
  const time = await page.locator('footer time').innerText()
  await expect(page.locator('footer time')).toHaveText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/)
  await expect(page.locator('footer time')).not.toHaveText(time)
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  expect(
    await page
      .getByRole('menuitem', { name: '导入作品', exact: true })
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe('16px')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1024, height: 900 })
  const tabs = page.locator('aside [data-slot=tabs-list]')
  await expect(tabs).toHaveCSS('height', '40px')
  await expect(tabs).toHaveCSS('overflow-y', 'hidden')
  expect(
    await tabs.evaluate((el) => {
      const outer = el.getBoundingClientRect()
      return Array.from(el.children).every((child) => {
        const rect = child.getBoundingClientRect()
        return rect.top >= outer.top && rect.bottom <= outer.bottom
      })
    }),
  ).toBe(true)
})

test('both separators resize panels using pointer and keyboard', async ({ page }) => {
  const panels = page.locator('[data-slot=resizable-panel]')
  const left = page.getByRole('separator', { name: '调整编辑区宽度' })
  const right = page.getByRole('separator', { name: '调整样式区宽度' })
  const originalLeft = (await panels.nth(0).boundingBox())!.width
  const leftBox = (await left.boundingBox())!
  await page.mouse.move(leftBox.x, leftBox.y + leftBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(leftBox.x + 90, leftBox.y + leftBox.height / 2, { steps: 12 })
  await page.mouse.up()
  expect((await panels.nth(0).boundingBox())!.width).toBeGreaterThan(originalLeft + 60)
  const originalRight = (await panels.nth(2).boundingBox())!.width
  const rightBox = (await right.boundingBox())!
  await page.mouse.move(rightBox.x, rightBox.y + rightBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(rightBox.x - 60, rightBox.y + rightBox.height / 2, { steps: 12 })
  await page.mouse.up()
  expect((await panels.nth(2).boundingBox())!.width).toBeGreaterThan(originalRight + 35)
  const beforeKey = (await panels.nth(0).boundingBox())!.width
  await left.focus()
  await page.keyboard.press('ArrowRight')
  expect((await panels.nth(0).boundingBox())!.width).toBeGreaterThan(beforeKey)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test('toolbar formats a selection, supports undo/redo and opens an image chooser', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', { name: 'Markdown 正文' })
  await editor.fill('测试文字')
  await editor.selectText()
  await page.getByRole('button', { name: '加粗', exact: true }).click()
  await expect(editor).toHaveValue('**测试文字**')
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(editor).toHaveValue('测试文字')
  await page.getByRole('button', { name: '重做', exact: true }).click()
  await expect(editor).toHaveValue('**测试文字**')
  await page.getByRole('button', { name: '标题级别' }).click()
  await page.getByRole('menuitem', { name: '2 级标题', exact: true }).click()
  await expect(editor).toHaveValue('## **测试文字**')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '插入本地图片', exact: true }).click()
  await chooser
  await expect(page.locator('#local-image')).toBeHidden()
  await expect(page.locator('.editor-asset')).toHaveCount(0)
})
