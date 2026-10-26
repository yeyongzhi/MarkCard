import { test, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toBeVisible()
})

test('edits, safely renders, splits and restores a draft', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page
    .getByRole('textbox', { name: 'Markdown 正文' })
    .fill(
      '# 第一张\n\n<script>alert(1)</script>\n\n```html\n<!-- card-break -->\n```\n\n<!-- card-break -->\n\n# 第二张',
    )
  await expect(page.locator('.preview-canvas .markcard-content h1')).toHaveText([
    '第一张',
    '第二张',
  ])
  await expect(page.locator('.preview-canvas .markcard-content script')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: '已保存到浏览器' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toHaveValue(/第一张/)
  expect(errors).toEqual([])
})

test('all twelve templates generate real PNG images', async ({ page }) => {
  test.setTimeout(120000)
  const names = [
    '极简白',
    '奶油纸',
    '墨色夜读',
    '薄荷清新',
    '落日渐变',
    '极光紫',
    '终端代码',
    '杂志编辑',
    '蓝图笔记',
    '复古报刊',
    '手帐便签',
    '大字金句',
  ]
  await page
    .getByRole('textbox', { name: 'Markdown 正文' })
    .fill(
      '# 思考与创造\n\n一段中文、English 与 Emoji 🌿。\n\n> 留住灵感。\n\n```typescript\nconst hello: string = "MarkCard";\n```\n\n|内容|说明|\n|---|---|\n|表格|完整导出|',
    )
  await mkdir('artifacts/exports', { recursive: true })
  for (const name of names) {
    await expect(page.locator('[aria-label^=应用][aria-label$=模板]')).toHaveCount(12)
    await page.getByLabel(`应用${name}模板`, { exact: true }).click()
    await page.getByRole('button', { name: '导出卡片' }).click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载 PNG 图片' }).click()
    const download = await pending
    const path = `artifacts/exports/${name}.png`
    await download.saveAs(path)
    const buffer = await readFile(path)
    expect(buffer.subarray(1, 4).toString()).toBe('PNG')
    expect(buffer.readUInt32BE(16)).toBe(1440)
    expect(buffer.length).toBeGreaterThan(5000)
    await expect(page.getByRole('button', { name: '继续创作' })).toBeEnabled()
    await page.getByRole('button', { name: '继续创作' }).click()
  }
})

test('copies a single card or offers a download fallback', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('# 一张卡片\n\n正文内容。')
  await expect(page.locator('.preview-canvas .export-card')).toHaveCount(1)
  const copy = page.getByRole('button', { name: '复制卡片为 PNG' })
  await copy.click()
  if (browserName === 'webkit') {
    await expect(page.getByText('浏览器未允许复制图片，请使用导出卡片下载 PNG')).toBeVisible()
    await expect(page.getByRole('button', { name: '导出卡片' })).toBeEnabled()
    return
  }
  await expect(page.getByText('卡片已复制为 PNG')).toBeVisible()
  if (browserName === 'chromium') {
    const png = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read()
      const blob = await item!.getType('image/png')
      return [...new Uint8Array(await blob.slice(0, 8).arrayBuffer())]
    })
    expect(png).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  }
})

test('local image survives save, backup and valid import; invalid import preserves content', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('# 本地图片')
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 4
      canvas.height = 4
      const context = canvas.getContext('2d')!
      context.fillStyle = '#88a86a'
      context.fillRect(0, 0, 4, 4)
      return canvas.toDataURL('image/png').split(',')[1]!
    }),
    'base64',
  )
  await page
    .locator('#local-image')
    .setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('.preview-canvas .markcard-content img')).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: '已保存到浏览器' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.preview-canvas .markcard-content img')).toHaveCount(1)
  const pending = page.waitForEvent('download')
  await page.keyboard.press('Control+s')
  const download = await pending
  const backup = await readFile((await download.path())!)
  const data = JSON.parse(backup.toString())
  expect(data.assets).toHaveLength(1)
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  await page.getByRole('menuitem', { name: '导入作品', exact: true }).click()
  await page.locator('#import-file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"bad"}'),
  })
  await expect(page.getByText('不支持的项目格式或版本')).toBeVisible()
  await expect(page.locator('.markdown-editor')).toHaveValue(/本地图片/)
  await page
    .locator('#import-file')
    .setInputFiles({ name: 'restore.json', mimeType: 'application/json', buffer: backup })
  await page.getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.locator('.preview-canvas .markcard-content img')).toHaveCount(1)
  await page.getByRole('button', { name: '导出卡片' }).click()
  const imagePending = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 PNG 图片' }).click()
  expect((await imagePending).suggestedFilename()).toMatch(/\.png$/)
})

test('image insertion keeps its original position and rejects edits during image validation', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', { name: 'Markdown 正文' })
  await editor.fill('前后')
  await editor.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(1, 1))
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '插入本地图片' }).click()
  const chooser = await chooserPromise
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 4
      return canvas.toDataURL('image/png').split(',')[1]!
    }),
    'base64',
  )
  await chooser.setFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png })
  await expect(editor).toHaveValue(/^前\n\n!\[pixel\.png\]\(asset:[\w-]+\)\n\n后$/)

  await page.evaluate(() => {
    Image.prototype.decode = () =>
      new Promise<void>((resolve) => {
        ;(window as typeof window & { finishImageDecode?: () => void }).finishImageDecode = resolve
      })
  })
  await page.locator('#local-image').setInputFiles({
    name: 'second.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as typeof window & { finishImageDecode?: () => void }).finishImageDecode),
      ),
    )
    .toBe(true)
  await editor.fill('编辑期间改变正文')
  await page.evaluate(() =>
    (window as typeof window & { finishImageDecode?: () => void }).finishImageDecode?.(),
  )
  await expect(page.getByText('处理图片时正文已改变，请重新插入图片')).toBeVisible()
  await expect(editor).toHaveValue('编辑期间改变正文')
  const assetCount = await page.evaluate(async () => {
    const { useDocumentStore } = await import('/src/stores/document.ts')
    return useDocumentStore().assets.length
  })
  expect(assetCount).toBe(1)
})

test('mobile workflow has no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.getByRole('button', { name: '复制卡片为 PNG' })).toBeInViewport()
  await page.getByRole('tab', { name: '编辑', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Markdown 正文' })
    .fill('# 手机也能创作\n\n你好，MarkCard。')
  await page.getByRole('tab', { name: '预览', exact: true }).click()
  await expect(page.locator('.preview-canvas .markcard-content h1')).toHaveText('手机也能创作')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('tab', { name: '样式', exact: true }).click()
  await page.getByRole('tab', { name: '署名', exact: true }).click()
  await page.getByRole('textbox', { name: '作者', exact: true }).fill('手机作者')
  await page.getByRole('tab', { name: '预览', exact: true }).click()
  await expect(page.locator('.card-signature')).toContainText('手机作者')
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true })
})

test('reports storage failures while retaining the editable content', async ({ page }) => {
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
  })
  await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('# 不能丢失的内容')
  await expect(page.getByText('草稿未保存', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toHaveValue('# 不能丢失的内容')
  await expect(page.getByRole('button', { name: '下载项目备份', exact: true })).toBeVisible()
})

test('clears saved text and assets after explicit confirmation', async ({ page }) => {
  const footerBefore = await page.locator('.workspace-footer').boundingBox()
  await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('# 可删除草稿')
  await expect(page.getByRole('status').filter({ hasText: '已保存到浏览器' })).toBeVisible()
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  await page.getByRole('menuitem', { name: '清空当前作品' }).click()
  await page.getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Markdown 正文' })).toHaveValue('')
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: '当前作品已清空' })
  await expect(toast).toBeVisible()
  await expect
    .poll(async () => {
      const box = await toast.boundingBox()
      const viewport = page.viewportSize()
      return !!box && !!viewport && box.y >= 0 && box.y + box.height <= viewport.height
    })
    .toBe(true)
  const footerAfter = await page.locator('.workspace-footer').boundingBox()
  expect(footerAfter?.y).toBe(footerBefore?.y)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await page.screenshot({ path: `artifacts/toast-${test.info().project.name}.png` })
  await page.reload()
  await expect(page.locator('.preview-canvas .markcard-content')).not.toContainText('可删除草稿')
})

test('does not overwrite an unreadable future draft while editing', async ({ page }) => {
  await page.evaluate(async () => {
    const request = indexedDB.open('markcard', 1)
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = database.transaction('draft', 'readwrite')
    tx.objectStore('draft').put({ schemaVersion: 99, markdown: 'future draft' }, 'current')
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    database.close()
  })
  await page.reload()
  await expect(page.getByText(/已暂停自动保存以保护原数据/)).toBeVisible()
  await page.getByRole('textbox', { name: 'Markdown 正文' }).fill('# 新的内存内容')
  await page.waitForTimeout(800)
  const version = await page.evaluate(async () => {
    const open = indexedDB.open('markcard', 1)
    const database = await new Promise<IDBDatabase>((resolve) => {
      open.onsuccess = () => resolve(open.result)
    })
    const request = database.transaction('draft').objectStore('draft').get('current')
    const result = await new Promise<{ schemaVersion: number }>((resolve) => {
      request.onsuccess = () => resolve(request.result)
    })
    database.close()
    return result.schemaVersion
  })
  expect(version).toBe(99)
})
