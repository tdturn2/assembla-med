type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface ApiOptions {
  method?: HttpMethod
  body?: Record<string, unknown> | string
  responseType?: 'json' | 'text'
  headers?: Record<string, string>
}

export function useApi() {
  const config = useRuntimeConfig()

  async function api<T>(path: string, options: ApiOptions = {}) {
    return $fetch<T>(path, {
      baseURL: config.public.apiBase as string,
      credentials: 'include',
      method: options.method,
      body: options.body,
      responseType: options.responseType,
      headers: options.headers
    })
  }

  return { api }
}
