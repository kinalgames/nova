import { useState } from 'react'
import { useStore } from '../state/store'

const INPUT = 'field w-full rounded-md border border-border bg-panel px-3 py-3 text-body'

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
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setError(null)
        }}
        placeholder="Email"
        aria-label="Email"
        autoComplete="email"
        className={INPUT}
      />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        type="password"
        placeholder="Mật khẩu"
        aria-label="Mật khẩu"
        autoComplete="current-password"
        className={INPUT}
      />
      {error && (
        <div role="alert" className="text-small text-danger-text">
          {error}
        </div>
      )}
      <button
        type="submit"
        className="cursor-pointer rounded-md border-none bg-ink p-3 text-center text-body font-medium text-bg"
      >
        {cta}
      </button>
    </form>
  )
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.42-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function Auth() {
  const { v } = useStore()
  if (!v.showAuth) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-bg p-6 animate-[dim_.2s_ease]">
      <div className="w-[380px] max-w-full">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="size-[15px] rounded-full bg-ink shadow-[inset_-4px_-4px_0_var(--bg)]" />
          <span className="font-display text-h2">Nova</span>
        </div>

        {v.isLoginForm && (
          <>
            <div className="text-center font-display text-h1 leading-tight">{v.authTitle}</div>
            <div className="mb-6 mt-2 text-center text-body text-muted">{v.authSub}</div>
            <div className="mb-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={v.doLogin}
                className="flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-border bg-panel p-3 text-left text-body hover:bg-white"
              >
                <GoogleMark />Tiếp tục với Google
              </button>
              <button
                type="button"
                onClick={v.doLogin}
                className="flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-border bg-panel p-3 text-left text-body hover:bg-white"
              >
                <GithubMark />Tiếp tục với GitHub
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3 text-meta text-faint">
              <div className="h-px flex-1 bg-border" />
              hoặc
              <div className="h-px flex-1 bg-border" />
            </div>
            <EmailForm cta={v.authCta} onSubmit={v.doLogin} />
            <div className="mt-5 text-center text-ui text-muted">
              {v.authToggleText}{' '}
              <button
                type="button"
                onClick={v.authToggleAct}
                className="cursor-pointer border-none bg-transparent text-left text-accent-text"
              >
                {v.authToggleLink}
              </button>
            </div>
          </>
        )}

        {v.isOnboarding && (
          <>
            <div className="text-center font-display text-h2 leading-tight">Chào mừng đến Nova</div>
            <div className="mb-6 mt-2 text-center text-body text-muted">Vài lựa chọn nhanh để Nova hợp với bạn.</div>
            <div className="mb-2 font-mono text-micro tracking-[.14em] text-faint">TÊN TRỢ LÝ</div>
            <input defaultValue="Nova" className="field mb-5 w-full rounded-md border border-border bg-panel px-3 py-3 text-body" />
            <div className="mb-2.5 font-mono text-micro tracking-[.14em] text-faint">PHONG CÁCH</div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-sm border border-accent bg-accent-soft px-3 py-1.5 text-ui text-accent-text">Ngắn gọn</span>
              <span className="rounded-sm border border-border px-3 py-1.5 text-ui text-muted">Ấm áp</span>
              <span className="rounded-sm border border-border px-3 py-1.5 text-ui text-muted">Trang trọng</span>
            </div>
            <div className="mb-2.5 font-mono text-micro tracking-[.14em] text-faint">MÔ HÌNH MẶC ĐỊNH</div>
            <div className="mb-6 flex gap-2">
              <div className="flex-1 rounded-md border border-accent bg-accent-soft px-3 py-3">
                <div className="text-ui">Thông minh</div>
                <div className="text-meta text-muted">Opus 4.8</div>
              </div>
              <div className="flex-1 rounded-md border border-border px-3 py-3">
                <div className="text-ui">Nhanh</div>
                <div className="text-meta text-muted">Haiku 4.8</div>
              </div>
            </div>
            <button
              type="button"
              onClick={v.finishOnboarding}
              className="cursor-pointer rounded-md border-none bg-ink p-3 text-center text-body font-medium text-bg"
            >
              Bắt đầu dùng Nova
            </button>
          </>
        )}
      </div>
    </div>
  )
}
