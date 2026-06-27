import { useState } from 'react'
import { useStore } from '../state/store'
import { css } from '../css'

const inputCss =
  'border:1px solid var(--border);border-radius:11px;padding:12px 14px;font-size:15px;background:var(--panel);width:100%'

function EmailForm({ cta, onSubmit }: { cta: string; onSubmit: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email chưa hợp lệ.')
    if (pw.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự.')
    setError(null)
    onSubmit()
  }
  return (
    <form onSubmit={submit} style={css('display:flex;flex-direction:column;gap:10px')}>
      <input
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setError(null)
        }}
        placeholder="Email"
        aria-label="Email"
        autoComplete="email"
        style={css(inputCss)}
      />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        type="password"
        placeholder="Mật khẩu"
        aria-label="Mật khẩu"
        autoComplete="current-password"
        style={css(inputCss)}
      />
      {error && (
        <div role="alert" style={css('font-size:13px;color:var(--danger)')}>
          {error}
        </div>
      )}
      <button
        type="submit"
        style={css('background:var(--ink);color:var(--bg);border-radius:11px;padding:13px;text-align:center;cursor:pointer;font-size:15px;font-weight:500;border:none;font:inherit')}
      >
        {cta}
      </button>
    </form>
  )
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.42-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function Auth() {
  const { v } = useStore()
  if (!v.showAuth) return null
  return (
    <div style={css('position:fixed;inset:0;z-index:70;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;animation:dim .2s ease;overflow-y:auto')}>
      <div style={css('width:380px;max-width:100%')}>
        <div style={css('display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:24px')}>
          <div style={css('width:15px;height:15px;border-radius:50%;background:var(--ink);box-shadow:inset -4px -4px 0 var(--bg)')} />
          <span style={css("font-family:var(--font-display);font-size:28px")}>Nova</span>
        </div>

        {v.isLoginForm && (
          <>
            <div style={css("font-family:var(--font-display);font-size:34px;text-align:center;line-height:1.1")}>{v.authTitle}</div>
            <div style={css('font-size:15px;color:var(--muted);text-align:center;margin-top:8px;margin-bottom:26px')}>{v.authSub}</div>
            <div style={css('display:flex;flex-direction:column;gap:9px;margin-bottom:18px')}>
              <button type="button" onClick={v.doLogin} data-hover="white" style={css('display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid var(--border);border-radius:11px;padding:12px;cursor:pointer;font-size:14.5px;background:var(--panel);text-align:left;font:inherit')}>
                <GoogleMark />Tiếp tục với Google
              </button>
              <button type="button" onClick={v.doLogin} data-hover="white" style={css('display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid var(--border);border-radius:11px;padding:12px;cursor:pointer;font-size:14.5px;background:var(--panel);text-align:left;font:inherit')}>
                <GithubMark />Tiếp tục với GitHub
              </button>
            </div>
            <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:18px;color:var(--faint);font-size:12px')}>
              <div style={css('flex:1;height:1px;background:var(--border)')} />
              hoặc
              <div style={css('flex:1;height:1px;background:var(--border)')} />
            </div>
            <EmailForm cta={v.authCta} onSubmit={v.doLogin} />
            <div style={css('text-align:center;margin-top:20px;font-size:13.5px;color:var(--muted)')}>
              {v.authToggleText} <button type="button" onClick={v.authToggleAct} style={css('color:var(--accent);cursor:pointer;background:transparent;border:none;text-align:left;font:inherit')}>{v.authToggleLink}</button>
            </div>
          </>
        )}

        {v.isOnboarding && (
          <>
            <div style={css("font-family:var(--font-display);font-size:32px;text-align:center;line-height:1.1")}>Chào mừng đến Nova</div>
            <div style={css('font-size:15px;color:var(--muted);text-align:center;margin-top:8px;margin-bottom:26px')}>Vài lựa chọn nhanh để Nova hợp với bạn.</div>
            <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:8px")}>TÊN TRỢ LÝ</div>
            <input defaultValue="Nova" style={css('width:100%;border:1px solid var(--border);border-radius:11px;padding:12px 14px;font-size:15px;background:var(--panel);margin-bottom:20px')} />
            <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:10px")}>PHONG CÁCH</div>
            <div style={css('display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px')}>
              <span style={css('border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);border-radius:9px;padding:7px 14px;font-size:13.5px')}>Ngắn gọn</span>
              <span style={css('border:1px solid var(--border);color:var(--muted);border-radius:9px;padding:7px 14px;font-size:13.5px')}>Ấm áp</span>
              <span style={css('border:1px solid var(--border);color:var(--muted);border-radius:9px;padding:7px 14px;font-size:13.5px')}>Trang trọng</span>
            </div>
            <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:10px")}>MÔ HÌNH MẶC ĐỊNH</div>
            <div style={css('display:flex;gap:8px;margin-bottom:24px')}>
              <div style={css('flex:1;border:1px solid var(--accent);background:var(--accent-soft);border-radius:11px;padding:12px 14px')}>
                <div style={css('font-size:14px')}>Thông minh</div>
                <div style={css('font-size:12px;color:var(--muted)')}>Opus 4.8</div>
              </div>
              <div style={css('flex:1;border:1px solid var(--border);border-radius:11px;padding:12px 14px')}>
                <div style={css('font-size:14px')}>Nhanh</div>
                <div style={css('font-size:12px;color:var(--muted)')}>Haiku 4.8</div>
              </div>
            </div>
            <button type="button" onClick={v.finishOnboarding} style={css('background:var(--ink);color:var(--bg);border-radius:11px;padding:13px;text-align:center;cursor:pointer;font-size:15px;font-weight:500;border:none;font:inherit')}>
              Bắt đầu dùng Nova
            </button>
          </>
        )}
      </div>
    </div>
  )
}
