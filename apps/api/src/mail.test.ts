import { afterEach, describe, expect, it, vi } from 'vitest'
import { mailConfigured, sendMail, type MailEnv } from './mail'

const env: MailEnv = {
  MS_GRAPH_TENANT_ID: 'tenant',
  MS_GRAPH_CLIENT_ID: 'client',
  MS_GRAPH_CLIENT_SECRET: 'secret',
  MS_GRAPH_MAIL_SENDER: 'sender@kinalgames.com',
  MS_GRAPH_SAVE_TO_SENT_ITEMS: 'true',
}

afterEach(() => vi.unstubAllGlobals())

describe('mailConfigured', () => {
  it('is true only when every Graph field is present', () => {
    expect(mailConfigured(env)).toBe(true)
    expect(mailConfigured({ ...env, MS_GRAPH_CLIENT_SECRET: undefined })).toBe(false)
    expect(mailConfigured({})).toBe(false)
  })
})

describe('sendMail — Microsoft Graph transport', () => {
  it('fetches an app token, then posts sendMail as the sender', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('/oauth2/v2.0/token'))
        return new Response(JSON.stringify({ access_token: 'AT' }), { status: 200 })
      return new Response(null, { status: 202 }) // Graph sendMail = 202 Accepted
    })
    await sendMail(env, { to: 'x@kinal.co', subject: 'Hi', html: '<b>hi</b>', text: 'hi' })
    // token request carried the client-credentials grant
    expect(calls[0].url).toContain('login.microsoftonline.com/tenant/oauth2/v2.0/token')
    expect(String(calls[0].init.body)).toContain('grant_type=client_credentials')
    // sendMail hit the sender's endpoint with the bearer and the recipient
    expect(calls[1].url).toContain('/users/sender%40kinalgames.com/sendMail')
    expect((calls[1].init.headers as Record<string, string>).authorization).toBe('Bearer AT')
    const body = JSON.parse(String(calls[1].init.body))
    expect(body.message.toRecipients[0].emailAddress.address).toBe('x@kinal.co')
    expect(body.saveToSentItems).toBe(true)
  })

  it('throws with the status when the token request fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 401 }))
    await expect(sendMail(env, { to: 'x@kinal.co', subject: 's', html: 'h', text: 't' })).rejects.toThrow(
      /graph token 401/,
    )
  })

  it('throws when Graph rejects the sendMail', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('token')
        ? new Response(JSON.stringify({ access_token: 'AT' }), { status: 200 })
        : new Response('denied', { status: 403 }),
    )
    await expect(sendMail(env, { to: 'x@kinal.co', subject: 's', html: 'h', text: 't' })).rejects.toThrow(
      /graph sendMail 403/,
    )
  })
})
