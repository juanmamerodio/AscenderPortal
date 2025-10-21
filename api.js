// La URL de tu Web App de Google Apps Script.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSsojp1uIp7kg9wW3NqWgQxMvGDpDXyzO8Rm8msQzuafgJUhNcVMGokq0CMK6wsR7s/exec'; // <-- PEGA TU URL DE APPS SCRIPT AQUÍ

// CAMBIO CLAVE: De '/api' a una ruta específica para evitar bloqueadores de anuncios.
const PROXY_PATH = '//auth';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // La lógica ahora busca el nuevo path.
  if (url.pathname.startsWith(PROXY_PATH)) {
    const targetUrl = new URL(SCRIPT_URL);
    targetUrl.search = url.search;

    let response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual'
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        response = await fetch(location, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow'
        });
      }
    }

    let newResponse = new Response(response.body, response);

    newResponse.headers.set('Access-Control-Allow-Origin', `https://${url.hostname}`);
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: newResponse.headers });
    }

    return newResponse;
  }

  return fetch(request);
}

