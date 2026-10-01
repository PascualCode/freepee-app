import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

// Turnstile es un widget web (script + iframe de Cloudflare) — en nativo no
// hay equivalente propio, así que se embebe en un WebView con una página
// mínima que ejecuta el mismo script oficial y devuelve el token vía
// postMessage. `data-callback`/`data-expired-callback` son globales del
// script de Turnstile (nombres fijos, no configurables desde fuera del HTML).
function buildHtml(siteKey: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onVerify" data-expired-callback="onExpire"></div>
    <script>
      function onVerify(token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
      }
      function onExpire() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expire' }));
      }
    </script>
  </body>
</html>`;
}

export function TurnstileWidget({ siteKey, onVerify, onExpire }: TurnstileWidgetProps) {
  const html = useMemo(() => buildHtml(siteKey), [siteKey]);

  function handleMessage(event: WebViewMessageEvent) {
    const data = JSON.parse(event.nativeEvent.data) as { type: string; token?: string };
    if (data.type === 'verify' && data.token) {
      onVerify(data.token);
    } else if (data.type === 'expire') {
      onExpire?.();
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        // baseUrl: un HTML cargado inline (sin él) no tiene ningún origen
        // real, así que el location.hostname que ve el script de Turnstile
        // es vacío/null — no coincide con ningún dominio dado de alta en el
        // sitio de Cloudflare. Con la clave de PRUEBA no importaba (ignora
        // el dominio), pero una clave real sí lo comprueba y el widget
        // fallaba con "No es posible conectarse al sitio web". `localhost`
        // debe estar añadido como dominio del sitio en el dashboard de
        // Cloudflare Turnstile.
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 76,
    width: '100%',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
