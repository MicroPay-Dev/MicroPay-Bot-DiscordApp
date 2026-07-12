/* Thin fetch wrapper for the dashboard API. Cookies (the session) are sent
   automatically since this is same-origin. */

const Api = {
  async _request(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });

    if (res.status === 401) {
      window.location.href = '/index.html';
      throw new Error('Not authenticated');
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  },

  get(url) { return this._request('GET', url); },
  post(url, body) { return this._request('POST', url, body); },
  put(url, body) { return this._request('PUT', url, body); },
  delete(url) { return this._request('DELETE', url); },
};
