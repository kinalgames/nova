import { test, expect } from '@playwright/test'

// End-to-end guards for the app's core flows: URL-driven navigation,
// project lifecycle, data-driven message replay, palette search.
// Each test gets a fresh browser context (clean localStorage).

test('root redirects to the seeded conversation; refresh keeps the URL', async ({ page }) => {
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

test('the demo conversation replays rich blocks and all switcher states', async ({ page }) => {
  await page.goto('/chat/c1')
  // done state: table + trace summary from data
  await expect(page.getByText('Kích hoạt 72h')).toBeVisible()
  await expect(page.getByText('Nova đã tra cứu web và cập nhật tài liệu của bạn')).toBeVisible()
  // streaming
  await page.getByRole('button', { name: 'Đang soạn' }).click()
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible()
  // approval
  await page.getByRole('button', { name: 'Chờ duyệt' }).click()
  await expect(page.getByRole('button', { name: 'Cho phép' })).toBeVisible()
  // error
  await page.getByRole('button', { name: 'Lỗi' }).click()
  await expect(page.getByText('Phản hồi bị gián đoạn')).toBeVisible()
  // back to done
  await page.getByRole('button', { name: 'Hoàn tất' }).click()
  await expect(page.getByText('Kích hoạt 72h')).toBeVisible()
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

test('sending a message appends it and streams a reply', async ({ page }) => {
  await page.goto('/chat/c3')
  await page.getByRole('textbox', { name: 'Nhắn cho Nova' }).fill('Xin chào Nova')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Xin chào Nova')).toBeVisible()
  // a NOVA reply streams in (generous timeout for thinking + stream)
  await expect(page.locator('main').getByText('NOVA').last()).toBeVisible({ timeout: 15_000 })
})

test('profile rename flows into the sidebar; the cheatsheet opens from the bar', async ({ page }) => {
  await page.goto('/chat/c1?settings=general')
  await page.getByLabel('TÊN CỦA BẠN').fill('Lan Phương')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Lan Phương').first()).toBeVisible()
  await page.getByRole('button', { name: 'Xem bảng phím tắt' }).click()
  await expect(page.getByText('Mở bảng lệnh')).toBeVisible()
})

test('project instructions visibly steer a project reply', async ({ page }) => {
  // c2 belongs to Aurora, whose description acts as project instructions
  await page.goto('/chat/c2')
  await page.getByRole('textbox', { name: 'Nhắn cho Nova' }).fill('Viết đoạn mở đầu thật ngắn')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Bám theo chỉ dẫn của dự án Aurora/)).toBeVisible({
    timeout: 15_000,
  })
})
