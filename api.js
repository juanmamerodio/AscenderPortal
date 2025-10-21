// La URL de tu Web App de Google Apps Script.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSsojp1uIp7kg9wW3NqWgQxMvGDpDXyzO8Rm8msQzuafgJUhNcVMGokq0CMK6wsR7s/exec'; // <-- PEGA TU URL DE APPS SCRIPT AQUÍ

const PROXY_PATH = '/api';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith(PROXY_PATH)) {
    const targetUrl = new URL(SCRIPT_URL);
    targetUrl.search = url.search;

    // *** INICIO DE LA SOLUCIÓN AL REDIRECT 302 ***

    // Hacemos la primera petición a Google, pero le decimos que no siga las redirecciones automáticamente.
    let response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual' // ¡Clave!
    });

    // Si Google nos pide redirigir (status 301, 302, 307, 308), seguimos la redirección manualmente.
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        // Hacemos una SEGUNDA petición a la nueva URL que nos dio Google,
        // pero esta vez forzamos a que mantenga el método POST y el cuerpo original.
        response = await fetch(location, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow' // Ahora sí podemos seguir.
        });
      }
    }
    
    // *** FIN DE LA SOLUCIÓN ***

    // Creamos una nueva respuesta final para poder añadir las cabeceras CORS.
    let newResponse = new Response(response.body, response);

    // Permitimos que tu dominio (ascender.uno) pueda leer la respuesta.
    newResponse.headers.set('Access-Control-Allow-Origin', `https://${url.hostname}`);
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Si la petición original es OPTIONS (preflight CORS), respondemos inmediatamente.
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: newResponse.headers });
    }

    return newResponse;
  }

  return fetch(request);
}

