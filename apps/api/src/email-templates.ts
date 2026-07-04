// Transactional email bodies. One paper-sheet look: warm off-white, ink text,
// a single accent button. Inline styles only — mail clients strip <style>.

import type { OutMail } from './mail'

const wrap = (inner: string): string => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#faf9f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#23211c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #e5e0d5;border-radius:14px;overflow:hidden">
    <tr><td style="padding:28px 32px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
        <span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:#23211c"></span>
        <span style="font-size:20px;font-weight:600;letter-spacing:-.01em">Nova</span>
      </div>
      ${inner}
    </td></tr>
  </table>
  <div style="max-width:480px;margin:16px auto 0;text-align:center;font-size:12px;color:#8a8578">
    Nova · trợ lý AI của bạn
  </div>
</body></html>`

/** email-address verification link (D5) */
export function verificationEmail(to: string, link: string): OutMail {
  const subject = 'Xác nhận email của bạn cho Nova'
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:600">Xác nhận email của bạn</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#514c43">
      Chạm nút bên dưới để xác nhận đây là email của bạn và kích hoạt đầy đủ tài khoản Nova.
    </p>
    <a href="${link}" style="display:inline-block;background:#23211c;color:#fffdf8;text-decoration:none;font-size:15px;font-weight:500;padding:12px 22px;border-radius:10px">
      Xác nhận email
    </a>
    <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8a8578">
      Nếu nút không bấm được, dán liên kết này vào trình duyệt:<br>
      <span style="color:#514c43;word-break:break-all">${link}</span>
    </p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#8a8578">
      Không phải bạn tạo tài khoản này? Bỏ qua email — sẽ không có gì thay đổi.
    </p>`)
  const text = `Xác nhận email của bạn cho Nova\n\nMở liên kết sau để xác nhận email và kích hoạt tài khoản:\n${link}\n\nKhông phải bạn? Bỏ qua email này.`
  return { to, subject, html, text }
}
