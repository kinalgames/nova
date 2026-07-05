import { test, expect } from '@playwright/test'
import { mockChat, seedApp } from './seed'

// End-to-end guards for the app's core flows on a seeded signed-in device:
// URL-driven navigation, project lifecycle, data-driven message replay,
// palette search. Each test gets a fresh browser context (clean localStorage).

test.beforeEach(async ({ page }) => seedApp(page))

test('the root redirects to the last-open conversation; refresh keeps the URL', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/chat\/c1$/)
  await page.reload()
  await expect(page).toHaveURL(/\/chat\/c1$/)
})

test('deep link renders the right thread; back/forward work', async ({ page }) => {
  await page.goto('/chat/c2')
  await expect(
    page.getByText('Viết giúp mình đoạn mở đầu cho trang đích Aurora.'),
  ).toBeVisible()
  await page.locator('aside').getByRole('link', { name: 'Lịch nội dung 6 tuần' }).click()
  await expect(page).toHaveURL(/\/chat\/c3$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/chat\/c2$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/chat\/c3$/)
})

test('a dead conversation link bounces to the greeting', async ({ page }) => {
  await page.goto('/chat/does-not-exist')
  await expect(page).toHaveURL(/\/new$/)
  await expect(page.getByText(/Mình là Nova/)).toBeVisible()
})

test('project lifecycle: create → view → config → delete', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Dự án mới' }).click()
  await page.getByLabel('TÊN DỰ ÁN').fill('Phong Thần')
  await page.getByLabel('MÔ TẢ').fill('Game ra mắt Q4')
  await page.getByRole('button', { name: 'Tạo dự án' }).click()
  // lands on the new project's view
  await expect(page).toHaveURL(/\/projects\/[^/]+$/)
  await expect(page.getByText('Phong Thần').first()).toBeVisible()
  await expect(page.getByText('Chưa có cuộc trò chuyện nào trong dự án này.')).toBeVisible()
  // config → delete (confirm dialog)
  await page.getByRole('link', { name: 'Cấu hình' }).click()
  await expect(page).toHaveURL(/\/config$/)
  await page.getByRole('button', { name: 'Xóa dự án' }).click()
  await page.getByRole('button', { name: 'Xóa', exact: true }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByText('Phong Thần')).toHaveCount(0)
})

test('the showcase conversation replays rich blocks from data', async ({ page }) => {
  await page.goto('/chat/c1')
  // table + trace summary + sources trigger render straight from thread data
  await expect(page.getByText('Kích hoạt 72h')).toBeVisible()
  await expect(page.getByText('Nova đã tra cứu web và cập nhật tài liệu của bạn')).toBeVisible()
  const sourcesTrigger = page.getByRole('button', { name: '2 nguồn' })
  await expect(sourcesTrigger).toBeVisible()
  await sourcesTrigger.click()
  await expect(page.getByText(/techreview/)).toBeVisible()
})

test('palette search finds a conversation across projects, diacritic-insensitive', async ({
  page,
}) => {
  await page.goto('/chat/c1')
  // wait until the app is interactive before firing the global shortcut
  await expect(page.getByRole('textbox', { name: 'Nhắn cho Nova' })).toBeVisible()
  await page.keyboard.press('ControlOrMeta+k')
  await page.getByPlaceholder(/Tìm cuộc trò chuyện/).fill('khao sat')
  await page.getByRole('button', { name: /Phân tích khảo sát/ }).click()
  await expect(page).toHaveURL(/\/chat\/c4$/)
})

test('sending a message appends it and streams the mocked reply', async ({ page }) => {
  await mockChat(page, 'Nova đã nhận. Mình xử lý ngay đây.')
  await page.goto('/chat/c3')
  await page.getByRole('textbox', { name: 'Nhắn cho Nova' }).fill('Xin chào Nova')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Xin chào Nova')).toBeVisible()
  await expect(page.getByText('Nova đã nhận. Mình xử lý ngay đây.')).toBeVisible({
    timeout: 15_000,
  })
})

test('profile rename flows into the sidebar; the cheatsheet opens from the bar', async ({ page }) => {
  await page.goto('/chat/c1?settings=general')
  await page.getByLabel('TÊN CỦA BẠN').fill('Lan Phương')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Lan Phương').first()).toBeVisible()
  await page.getByRole('button', { name: 'Xem bảng phím tắt' }).click()
  await expect(page.getByText('Mở bảng lệnh')).toBeVisible()
})

test('a code fence renders highlighted WITHOUT the wasm engine', async ({ page }) => {
  const wasmReqs: string[] = []
  page.on('request', (r) => {
    if (/onig|\.wasm/i.test(r.url())) wasmReqs.push(r.url())
  })
  await mockChat(page)
  await page.goto('/chat/c3')
  await page
    .getByRole('textbox', { name: 'Nhắn cho Nova' })
    .fill('Xem code:\n\n```ts\nconst a = 1\n```')
  await page.keyboard.press('Enter')
  await expect(page.locator('pre.shiki').first()).toBeVisible({ timeout: 15_000 })
  expect(wasmReqs).toHaveLength(0)
})

test('project instructions ride the REAL system prompt to the provider', async ({ page }) => {
  // c2 belongs to Aurora, whose description acts as project instructions
  const requests = await mockChat(page)
  await page.goto('/chat/c2')
  await page.getByRole('textbox', { name: 'Nhắn cho Nova' }).fill('Viết đoạn mở đầu thật ngắn')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Nova đã nhận. Mình xử lý ngay đây.')).toBeVisible({
    timeout: 15_000,
  })
  expect(requests[0]?.system).toContain('Ra mắt Aurora vào Q3')
})
