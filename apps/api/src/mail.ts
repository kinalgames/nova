// Transactional email via Microsoft Graph (client-credentials OAuth2 + the
// sendMail REST endpoint). Pure HTTP — ideal for Workers, and the supported
// path after Microsoft retired Office365 SMTP Basic Auth.

export interface MailEnv {
  MS_GRAPH_TENANT_ID?: string
  MS_GRAPH_CLIENT_ID?: string
  MS_GRAPH_CLIENT_SECRET?: string
  /** the mailbox the app sends AS (needs Mail.Send application permission) */
  MS_GRAPH_MAIL_SENDER?: string
  /** 'true' keeps a copy in the sender's Sent Items */
  MS_GRAPH_SAVE_TO_SENT_ITEMS?: string
}

/** every field a Graph send needs is present */
export function mailConfigured(env: MailEnv): boolean {
  return Boolean(
    env.MS_GRAPH_TENANT_ID &&
      env.MS_GRAPH_CLIENT_ID &&
      env.MS_GRAPH_CLIENT_SECRET &&
      env.MS_GRAPH_MAIL_SENDER,
  )
}

export interface OutMail {
  to: string
  subject: string
  html: string
  text: string
}

/** app-only access token via the client-credentials grant */
async function graphToken(env: MailEnv): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MS_GRAPH_CLIENT_ID as string,
        client_secret: env.MS_GRAPH_CLIENT_SECRET as string,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    },
  )
  if (!res.ok) throw new Error(`graph token ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('graph token: no access_token in response')
  return json.access_token
}

/** send one message; throws on token or sendMail failure (Graph answers 202
 *  Accepted with an empty body on success) */
export async function sendMail(env: MailEnv, msg: OutMail): Promise<void> {
  const token = await graphToken(env)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
      env.MS_GRAPH_MAIL_SENDER as string,
    )}/sendMail`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: msg.subject,
          body: { contentType: 'HTML', content: msg.html },
          toRecipients: [{ emailAddress: { address: msg.to } }],
        },
        saveToSentItems: env.MS_GRAPH_SAVE_TO_SENT_ITEMS === 'true',
      }),
    },
  )
  if (!res.ok) throw new Error(`graph sendMail ${res.status}: ${(await res.text()).slice(0, 300)}`)
}
