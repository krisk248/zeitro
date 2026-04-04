import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:8001';
    const headers = new Headers(event.request.headers);
    headers.delete('host');

    const resp = await fetch(`${apiUrl}${event.url.pathname}${event.url.search}`, {
      method: event.request.method,
      headers,
      body: event.request.method !== 'GET' && event.request.method !== 'HEAD' ? event.request.body : undefined,
      duplex: 'half',
    } as RequestInit);

    const responseHeaders = new Headers(resp.headers);
    responseHeaders.delete('transfer-encoding');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: responseHeaders });
  }
  return resolve(event);
};
