import { getRequestURL, proxyRequest } from 'h3'

/**
 * Same-origin API proxy so session cookies are first-party.
 * Safari / iOS block cross-site cookies between *.up.railway.app hosts.
 *
 * Browser → https://web-host/api/... → Nitro → apiProxyTarget/api/...
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const targetBase = String(config.apiProxyTarget || 'http://127.0.0.1:4000').replace(
    /\/$/,
    ''
  )
  const reqUrl = getRequestURL(event)
  return proxyRequest(event, `${targetBase}${reqUrl.pathname}${reqUrl.search}`)
})
