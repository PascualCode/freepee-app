# Proyecto: pipiApp — App móvil (iOS/Android)

## Qué es
App para smartphone (iOS/Android). Funcionalidades principales:
- Gestión de usuarios (registro, login, perfil)
- Marcadores en un mapa (crear, ver, filtrar por ubicación)
- Reseñas y puntuaciones sobre esos marcadores

## Stack
- **Frontend:** Expo + Expo Router (iOS/Android).
- **Backend:** Node.js + Fastify + Prisma ORM
- **Base de datos:** PostgreSQL + extensión PostGIS (para consultas geoespaciales
  de los marcadores: proximidad, radios, clustering)
- **Auth:** JWT propio.
- **Mapas:** abstracción propia en `lib/maps` — `@maplibre/maplibre-react-native`,
  tiles raster de OpenStreetMap, **sin ninguna API key** (ver Notas
  técnicas → "De `react-native-maps` a MapLibre" sobre por qué no se usa
  Google Maps).
- **Ubicación:** `expo-location` (permiso + posición actual), usado en la
  pantalla de mapa para buscar marcadores cercanos.
- **CAPTCHA:** Cloudflare Turnstile — vía `react-native-webview` (única
  dependencia nativa añadida solo para esto, ver Estado del proyecto →
  Antibots).

**Caveat transversal de verificación:** el flujo completo ya se ha probado
de verdad en un dispositivo Android físico (vía `adb`, cable USB, ver Notas
técnicas → "Segunda verificación en dispositivo Android real"): mapa
(tiles, pines, `<UserLocation />`, recentrado), selección de ubicación
tocando el mapa, `expo-blur` en `(welcome)`, y el widget de Turnstile en
`WebView`. **iOS aparcado indefinidamente** (decisión del usuario,
2026-08-29): sacar la app en iOS exige una cuenta de Apple Developer de
pago, coste que se prefiere ahorrar por ahora — ver Pendiente / deuda
técnica → Resueltos/descartados.

**Fase del proyecto (2026-08-26):** el usuario considera esta primera fase
de desarrollo lista para empezar a probarla con usuarios reales — un grupo
cerrado y pequeño de gente cercana, no público general todavía. A partir de
aquí, tener en cuenta que los bugs y el feedback pueden venir de personas
reales usando la app de verdad (no solo de pruebas propias) — sigue siendo
una fase de prueba controlada, no un lanzamiento público, pero el listón de
"funciona de verdad" importa más que antes. **Desplegado ese mismo día**
(backend en Railway, Android vía EAS Build — ver Despliegue) para que el
grupo cerrado pudiera probarlo desde sus propios móviles en vez de
depender del entorno local. **Segunda tanda de pruebas preparada el
2026-08-30** (tras el rebrand a FreePee, ver Diseño): backend redesplegado
a Railway con las claves reales de Turnstile/ORS ya en producción (antes
solo en local, ver Pendiente / deuda técnica) y APK nuevo generado vía EAS
— ver Despliegue para los dos enlaces de descarga (alpha 1 y alpha 2).

## Estructura del repo
```
/src/app            → pantallas Expo Router
/src/app/(welcome)  → punto de entrada — SIEMPRE la primera pantalla al
                      arrancar la app, con o sin sesión (ver useAppEntry en
                      Estado del proyecto). "Buscar ahora" / botón
                      secundario que cambia entre "Iniciar sesión" (sin
                      sesión) e "Ir al mapa" (con sesión)
/src/app/(auth)     → login.tsx, register.tsx — solo accesibles sin sesión
/src/app/(tabs)     → index.tsx (Home, mapa autenticado con creación de
                      marcadores) — solo accesible con sesión
/src/app/map.tsx    → mapa público (sin sesión) — SIN guard; si detecta
                      sesión activa redirige a `(tabs)`, ver Estado del
                      proyecto
/src/app/marker/[id].tsx → detalle de un marcador + reseñas — sin guard
/src/app/profile.tsx → perfil del usuario + estadísticas resumen — dentro
                      del guard `!!user` del layout raíz (solo con sesión),
                      pero fuera de `(tabs)` (no es una pestaña, se navega
                      con router.push desde `BottomNavBar`)
/src/app/my-markers.tsx → listado de marcadores propios, editar/eliminar —
                      mismo guard que profile.tsx
/src/components     → UI compartida, incluye `nearby-markers-map.tsx`
                      (núcleo de mapa+listado compartido entre /map y Home),
                      `create-marker-modal.tsx`, `edit-marker-modal.tsx`,
                      `marker-type-price-fields.tsx` (selector de tipo/precio),
                      `marker-gender-field.tsx` (selector de género con su
                      color, ver Estado del proyecto), `marker-image-field.tsx`
                      (selector de imagen de cabecera), `marker-review-form.tsx`
                      + `rating-field.tsx` (formulario de reseña, ver Estado
                      del proyecto) — los tres primeros compartidos entre los
                      dos modales de marcador,
                      `bottom-nav-bar.tsx` (píldora flotante de navegación,
                      ver Estado del proyecto → Mapa y marcadores),
                      `search-filters-panel.tsx` (controles de "Ajustes" —
                      distancia/tipo/género/puntuación mínima, ver Estado
                      del proyecto), `auth-split-layout.tsx` y
                      `turnstile-widget.tsx` (CAPTCHA de Cloudflare
                      Turnstile en el registro, WebView — ver Estado del
                      proyecto → Antibots)
/src/components/ui  → primitivas reutilizables (AppButton, AppTextField, Card...)
/src/constants/theme.ts → Colors (incluye paleta `primary`/`primarySoft`/`onPrimary`), Spacing, Radius
/src/hooks/use-nearby-markers.ts → lógica de datos compartida (todos los
                      marcadores para el mapa, permiso de ubicación,
                      posición, fetch de cercanos para el desplegable, y la
                      búsqueda manual del botón "Buscar") — ver Estado del
                      proyecto
/src/hooks/use-app-entry.tsx → Context `hasEntered` — fuerza (welcome) como
                      primera pantalla al arrancar, con o sin sesión (ver
                      Estado del proyecto)
/src/utils          → helpers puros de frontend (format.ts: distancia/precio/tipo/género,
                      validation.ts, marker-search-filters.ts: tipo de los
                      filtros de "Ajustes", search-intent.ts: señal para el
                      popup automático de cercanos, ver Estado del proyecto)
/lib/api      → cliente API (fetch + tipos), ver lib/api/client.ts
/lib/auth     → sesión: storage del token (expo-secure-store) + Context/hook useSession()
/lib/maps     → wrapper que abstrae MapLibre (`map-view.tsx`)
/assets/images → imágenes estáticas (icono, splash, fondo de auth...). El
                 alias `@/assets/*` apunta aquí (raíz del repo), NO a
                 `src/assets` — no existe esa carpeta, no crearla.
/server       → backend (Fastify + Prisma)
```

## Convenciones de código
- TypeScript estricto en todo el repo (frontend y backend).
- Nombres de archivo: kebab-case. Componentes: PascalCase.
- Un módulo de dominio = una carpeta con su propio `types.ts`, no todo en un
  archivo gigante.
- Nunca importar `@maplibre/maplibre-react-native` directamente en un
  componente — siempre pasar por `lib/maps`.

## Comandos habituales
```
npm run dev          # arranca Expo (presiona 'a' para Android)
npm run dev:server    # arranca el backend Fastify
npx prisma studio     # explorador visual de la base de datos
npx prisma migrate dev --name <nombre>   # nueva migración (¡no usar contra Supabase! ver Notas técnicas)
```

## Despliegue
Primer despliegue real (2026-08-26), para probar con un grupo cerrado de
usuarios reales — ver Estado del proyecto → "Fase del proyecto". Solo
Android; iOS aparcado indefinidamente por decisión del usuario (ver
Pendiente / deuda técnica → Resueltos/descartados).

- **Backend → Railway.** Proyecto `pipiapp-backend`
  (cuenta `josemanuel.pascualmora@gmail.com`), servicio `pipiapp-backend`,
  desplegado directo desde `server/` (`railway up ./server --path-as-root`,
  sin Dockerfile — Railway autodetecta Node y usa
  `build`/`start` de `server/package.json`). URL pública:
  **https://pipiapp-backend-production.up.railway.app**. Variables de
  entorno puestas en Railway (nunca en el repo): `DATABASE_URL` (ver más
  abajo — pooler, no la conexión directa), `JWT_SECRET` (nuevo, rotado
  respecto al de desarrollo), `JWT_EXPIRES_IN`, `BREVO_API_KEY`,
  `BREVO_SENDER_EMAIL` (mismos valores reales que ya había en
  `server/.env` de desarrollo — Brevo no distingue entornos),
  `TURNSTILE_SECRET_KEY` (clave **real** desde el 2026-08-30 — ver más
  abajo), `ORS_API_KEY` (añadida el 2026-08-30, antes ausente — sin ella
  `/markers/nearby` y "Cómo llegar" usaban el fallback en línea recta
  silenciosamente, ver Backend/API → distancia real a pie).
  Redesplegar: `npx @railway/cli up ./server --path-as-root -s
  pipiapp-backend -p 330704c7-704d-4aa3-8749-6e760eacd0f4 -e production`.
- **Android → EAS Build (APK de distribución interna, sin pasar por Play
  Store).** Proyecto Expo `@manupascual/pipiapp`
  (`extra.eas.projectId` en `app.json`, `owner: "manupascual"`).
  `eas.json` → perfil `preview` (`distribution: internal`,
  `android.buildType: apk`, `environment: preview`). Variables de ese
  entorno "preview" en EAS (`eas env:list --environment preview`):
  `EXPO_PUBLIC_API_URL` (la URL de Railway),
  `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (clave **real** desde el 2026-08-30,
  antes de prueba — `npx eas-cli env:set preview --name
  EXPO_PUBLIC_TURNSTILE_SITE_KEY --value <clave> --visibility plaintext
  --non-interactive`, `env:update` está deprecado). Generar un
  APK nuevo: `npx eas-cli build --platform android --profile preview`
  (build en la nube, ~10-20 min; el enlace de descarga queda en
  https://expo.dev/accounts/manupascual/projects/pipiapp/builds y también
  se puede compartir directo desde ahí — instalar el APK exige activar
  "Instalar apps desconocidas" en el dispositivo Android, mismo gotcha ya
  documentado para el *development build* en Notas técnicas).
  **Primer APK de esta alpha** (build `02f9bb80-52af-480d-8ebf-e40c0e39cbf3`,
  26/08/2026): descarga directa
  https://expo.dev/artifacts/eas/DcLyTm9NcnEZFBwRxEwpV8TCLoqoY4Pbv91S2fxIHoQ.apk.
  **Segunda tanda de pruebas — alpha 2** (build
  `152f1c44-174e-4610-8fde-d1fa93c173e2`, 30/08/2026, tras el rebrand a
  FreePee + icono/splash nuevos + fotos de marcador más grandes en el pin,
  ver Estado del proyecto → Diseño y Mapa y marcadores): descarga directa
  https://expo.dev/artifacts/eas/n03AdPDdgItWgwFiigNKBHJ1P_sdnUGO43s-BbLkSvE.apk
  — este enlace es fijo para esta build concreta; cada nuevo `eas build`
  genera una URL de artefacto distinta (consultable con `npx eas-cli
  build:view <id> --json`, campo `artifacts.buildUrl`), hay que volver a
  compartir el enlace nuevo con el grupo cuando se regenere.

### Cuentas usadas
Railway y Expo/EAS, ambas con `josemanuel.pascualmora@gmail.com` (EAS bajo
la cuenta personal `manupascual`).

### Decisiones/fixes durante este primer despliegue
- **`prisma generate` nunca se ejecutaba en un `npm install` limpio** —
  `server/package.json` no tenía `postinstall`, así que en local funcionaba
  porque alguien ya había corrido `prisma generate` a mano alguna vez (el
  cliente generado quedaba en `node_modules/@prisma/client`, no versionado
  pero tampoco borrado entre sesiones). El primer build en Railway (`npm
  install` limpio en un contenedor nuevo) falló con `Module "@prisma/client"
  has no exported member 'PrismaClient'` — arreglado añadiendo
  `"postinstall": "prisma generate"` a `server/package.json`. Cualquier
  hosting que parta de un `npm install` limpio (todos, en realidad) lo
  necesita — que funcionara en local sin él fue casualidad de no haber
  borrado nunca `node_modules`.
- **Supabase resuelve la conexión directa (`db.*.supabase.co:5432`) a una
  dirección IPv6, y Railway no tiene salida IPv6** — el backend arrancaba
  bien (JWT/env cargaban) pero cualquier consulta a la base fallaba con
  `connect ENETUNREACH <ipv6>`. Es un problema conocido de Supabase con
  hostings sin salida IPv6, no algo particular de este proyecto. Solución:
  usar el **connection pooler** de Supabase (Transaction pooler, puerto
  6543, host `aws-1-eu-west-1.pooler.supabase.com`, usuario
  `postgres.xbaarheegbbnsdmsnyxp` en vez de `postgres` a secas) en vez de
  la conexión directa — compatible con IPv4. Mismo usuario/contraseña de
  siempre, solo cambia host/puerto/formato de usuario. `server/.env` local
  se dejó con la conexión directa tal cual (funciona igual en local, sin
  el problema de IPv6 del hosting) — solo el `DATABASE_URL` de Railway usa
  el pooler.

### Pendiente antes de abrir a más gente (no solo el grupo cerrado)
Ver también Pendiente / deuda técnica conocida para el detalle completo de
cada uno:
- Confirmar con testers reales que el deep link `pipiapp://verify-email` del
  email de verificación abre la app de verdad (ver Resueltos/descartados) —
  algunos clientes de correo bloquean o reescriben esquemas de URL
  personalizados por seguridad; sin verificar todavía con gente real.

## Instrucciones de compactación (/compact)
Al compactar contexto, conservar siempre:
- Cambios de código recientes y su motivo
- Estado de las migraciones de Prisma
- Resultados de tests
Descartar: exploración de archivos ya entendida, discusiones de diseño ya
zanjadas.

## Estado del proyecto

### Backend / API
- Modelos Prisma: `User` (`role: Role` — `USER`/`ADMIN`, por defecto `USER`),
  `Marker`, `Review` (valoración por `comodidad`/`higiene` 1-5, `text`
  opcional, un usuario solo puede tener una reseña por marcador —
  `@@unique([authorId, markerId])`), `Report` (2026-08-30 — reporte de un
  marcador o una reseña, nunca ambos; ver `POST /markers/:id/report` más
  abajo), `Favorite` (2026-08-30 — marcador guardado por un usuario, lista
  personal nunca visible para otros; ver `POST /markers/:id/favorite`).
- Supabase con PostGIS habilitado; `Marker.location` (geography, generada
  automáticamente desde latitude/longitude) con índice GIST para consultas
  geoespaciales rápidas.
- `Marker.type` (`AIRE_LIBRE`/`PUBLICO`/`PRIVADO`, obligatorio) y
  `priceType`/`amount` opcionales, con reglas cruzadas según el tipo
  (`validatePricing` en `server/src/routes/markers.ts`).
- `Marker.gender` (`MASCULINO`/`FEMENINO`/`MIXTO`/`PIPICAN`) es **obligatorio**
  a nivel de BD desde la migración `20260824190000_marker_gender_not_null`
  (antes era nullable para marcadores legados) — ver Pendiente / deuda
  técnica y Notas técnicas.
- **`Marker.openingHours`** (texto libre) y **`Marker.wheelchairAccess`**
  (enum `COMPLETA`/`PARCIAL`/`NINGUNA`, 2026-08-30) — ambos opcionales de
  verdad (`null` = sin especificar, sin backfill al añadirlos, a diferencia
  de `gender`). Añadidos a los schemas de `POST /`/`PUT /:id` y al `data`
  de create/update; **no** se añaden a la query cruda de
  `GET /markers/nearby` (esa lista tampoco muestra género ni imagen, solo
  el detalle completo).
- Auth: `POST /auth/register`, `POST /auth/login`, plugin Fastify
  `app.authenticate` que verifica el JWT, comprueba `isActive` en BD **en
  cada petición** (no solo en login, para que una baja de cuenta corte el
  acceso de inmediato) y adjunta `userId` a la request.
- `User.username` (`String? @unique` a nivel de BD, nullable solo por
  cuentas anteriores a este campo) — el registro lo exige (patrón
  `^[a-zA-Z0-9_.]+$`, 3-24 caracteres) y comprueba su unicidad aparte de la
  del email, con mensajes de error distintos para cada caso. Unicidad
  sensible a mayúsculas/minúsculas — decisión final, descartada como deuda
  (ver Pendiente / deuda técnica).
- **`GET /auth/me`** (protegido) — perfil completo (`id`, `email`, `name`,
  `username`, `role`, `createdAt`) a partir del JWT. `lib/auth/session.tsx`
  lo llama tanto al arrancar como tras login/registro, así que el perfil
  siempre es real y arrancar con un token guardado confirma de verdad que
  sigue siendo válido.
- `GET /markers/nearby` — más cercanos a un punto, ordenados por distancia;
  `radius` es opcional (ausente = sin límite). Alimenta solo el desplegable
  de "cercanos" (radio 5km por defecto) y el botón "Buscar" (sin límite,
  filtrable — ver más abajo). Construye el `WHERE` dinámicamente con
  `Prisma.sql`/`Prisma.join` (nunca interpolando texto), incluyendo un
  filtro de puntuación mínima vía `EXISTS (... HAVING AVG(...) >= $min)` —
  un marcador sin reseñas nunca cumple un mínimo explícito. **`distance_m`
  es distancia real a pie (no línea recta) cuando `ORS_API_KEY` está
  configurada** (2026-08-29, ver Notas técnicas → OpenRouteService): la
  query SQL sigue calculando `ST_Distance` (línea recta, barata) para
  traer un buffer de `limit + 30` candidatos ya pre-ordenados, y solo esos
  candidatos se reenvían a `getWalkingDistances` (`server/src/lib/ors.ts`,
  Matrix API) para recalcular `distance_m` con la distancia/tiempo a pie
  real y reordenar antes de recortar al `limit` pedido. Sin `ORS_API_KEY`,
  o si la llamada a ORS falla entera, comportamiento idéntico al de
  siempre (línea recta, `LIMIT` directo) — nunca rompe el endpoint.
- **`GET /markers/:id/route`** (público, 2026-08-29) — ruta a pie real
  desde `lat`/`lng` (posición del usuario) hasta el marcador, para "Cómo
  llegar" (ver Mapa y marcadores). Llama a `getWalkingRoute`
  (`server/src/lib/ors.ts`, ORS Directions API) y devuelve
  `{ distanceM, durationS, coordinates }` (ya en `{latitude,longitude}`,
  convertido desde el `[lng,lat]` de ORS/GeoJSON en el propio `ors.ts`). A
  diferencia de `/nearby`, aquí no hay fallback razonable si ORS no está
  disponible (no existe una "línea recta dibujada" que tenga sentido como
  ruta a pie) — `503` explícito. Rate-limited (30/hora por IP) para no
  agotar la cuota gratuita de ORS.
- **`POST /markers/:id/report`** y **`POST /markers/:markerId/reviews/:reviewId/report`**
  (protegidos, `{ max: 10, timeWindow: "1 hour" }`, 2026-08-30) — reportar un
  marcador o una reseña ajena. Body `{ reason, details? }`; `reason` uno de
  `SITIO_CERRADO`/`INFORMACION_INCORRECTA`/`CONTENIDO_INAPROPIADO`/`OTRO`
  (mismo enum para ambos endpoints — el backend acepta cualquiera, es el
  frontend quien ofrece solo el subconjunto que tiene sentido: una reseña
  nunca ofrece "Sitio cerrado"). 400 si `reason === 'OTRO'` sin `details`
  (mismo estilo que `validatePricing`). Si el mismo usuario ya tiene un
  reporte `PENDIENTE` sobre el mismo objetivo, responde 200 sin duplicar
  (sin índice único nuevo en BD, un `findFirst` + create condicional basta).
  **Sin endpoint de administración ni cola de moderación en la app** — los
  reportes se revisan a mano vía `npx prisma studio` (modelo `Report`,
  campo `status`), mismo criterio que promocionar a `ADMIN` (ver Notas
  técnicas → Seguridad del campo role).
- **`POST /markers/:id/favorite`** / **`DELETE /markers/:id/favorite`**
  (protegidos, 2026-08-30) — guardar/quitar un marcador de favoritos, lista
  personal (modelo `Favorite`, `@@unique([userId, markerId])`). Sin rate
  limit (mismo criterio que `PUT`/`DELETE` de contenido propio: no crea
  contenido que vean otros). `POST` es idempotente (200 si ya estaba,
  nunca duplica); `DELETE` 404 si no estaba. `GET /users/me/favorites`
  (protegido) devuelve los `Marker[]` guardados, ordenados por fecha en
  que se guardaron.
- **`GET /markers`** (público, sin radio) — todos los marcadores, para
  pintar el mapa completo siempre sin importar la distancia al usuario
  (pedido explícitamente así).
- **`GET /markers/mine`** (protegido) — marcadores del usuario autenticado.
  Convive con `GET /markers/:id` porque find-my-way (router de Fastify)
  prioriza rutas estáticas sobre paramétricas sin importar el orden de
  registro.
- `POST /markers` (protegido) — `ownerId` sale del JWT; `gender` obligatorio.
- `GET /markers/:id` — marcador + reseñas (autor como `{id, name}`, nunca
  email/password; `"Usuario eliminado"` si el autor tiene `isActive: false`).
  404 si no existe.
- `POST /markers/:id/reviews` (protegido) — upsert de la reseña del usuario
  autenticado en ese marcador; `authorId` sale del JWT.
- `DELETE /markers/:id/reviews` (protegido) — borra la reseña propia del
  usuario autenticado en ese marcador, identificada por `authorId` (JWT) +
  `markerId` (URL) — no hay id de reseña en la ruta, mismo patrón que el
  upsert de arriba. 404 si no hay ninguna. Solo la propia — para la de
  otro, ver el siguiente endpoint.
- **`DELETE /markers/:markerId/reviews/:reviewId`** (protegido, 2026-08-30)
  — borra la reseña de **cualquier** usuario: el propio autor o un
  `ADMIN` (rol consultado en BD en el momento de la petición, nunca desde
  el JWT — mismo patrón que `DELETE /markers/:id`), 403 en cualquier otro
  caso. A diferencia del endpoint de arriba, sí necesita el id de la
  reseña en la URL (un `ADMIN` no tiene una clave compuesta propia
  `authorId_markerId` con la que identificarla). Único camino para que un
  `ADMIN` modere una reseña reportada (ver `POST
  /:markerId/reviews/:reviewId/report`) sin editar la tabla `Review` a
  mano en Prisma Studio — cierra el hueco que sí existía antes de esta
  fecha. Sin UI propia en la app (mismo criterio que borrar el marcador de
  otro como `ADMIN`, tampoco tiene botón en ningún sitio) — se invoca
  directamente contra la API.
- `PUT /markers/:id` (protegido) — edición **parcial** de contenido
  (título/descripción/tipo/precio/género/imagen), nunca de la ubicación
  (decisión final, ver Pendiente / deuda técnica) ni de `ownerId`. Solo el
  propietario — **ni siquiera un ADMIN**. La regla cruzada de precio se
  valida sobre el estado resultante (campo enviado + lo ya existente en BD),
  nunca asumiendo que un campo ausente significa "vacío".
- `DELETE /markers/:id` (protegido) — propietario o `role === "ADMIN"`
  (consultado en BD en el momento de la petición, nunca desde el JWT); 403
  si no cumple ninguna. Borra en cascada las reseñas del marcador.
- Baja de cuenta con **soft delete**: `User.isActive`/`deletedAt`; las
  relaciones `User → Marker`/`User → Review` no tienen cascada a propósito,
  para que el contenido de un usuario dado de baja siga intacto para el
  resto. `DELETE /users/me` (protegido, solo sobre uno mismo) marca
  `isActive: false`, anonimiza el email (`deleted-<userId>@pipiapp.local`),
  **libera también el `username`** (a `null`, mismo estado que las cuentas
  legadas anteriores a que este campo existiera — antes se quedaba
  ocupado para siempre, bloqueando que el mismo usuario u otro lo
  reutilizara en un registro nuevo aunque el email sí quedara libre) e
  invalida el password; `POST /auth/login` trata una cuenta inactiva igual
  que una contraseña incorrecta (mismo 401 genérico).
- **`GET /users/me/stats`** (protegido) — para Perfil: `markerCount`,
  `reviewCount` + `avgComodidad`/`avgHigiene` de las reseñas **recibidas**
  en los marcadores propios (`review.marker.ownerId`, no `authorId`). Los
  `avg` son `null` (nunca `0`) sin reseñas todavía, para distinguir "sin
  datos" de "0 de 5".
- **Verificación de email** (`User.emailVerified`, `verificationToken`,
  `verificationTokenExpiresAt`) — primera capa contra bots que rellenen el
  mapa de contenido falso (más capas implementadas, ver Antibots más abajo).
  **Nunca bloquea el login** (decisión explícita del usuario, para no
  añadir fricción a una cuenta real) — solo gatea crear contenido nuevo:
  `POST /markers` y `POST /markers/:id/reviews` devuelven 403
  ("Verifica tu email...") si `emailVerified` es `false`, comprobado en BD
  en el momento de la petición (mismo patrón que `isActive`/`role`, nunca
  desde el JWT). `POST /auth/register` genera el token (32 bytes
  aleatorios, expira en 24h) y envía el correo; si el envío falla, la
  cuenta se crea igual (nunca se pierde un registro por un fallo transitorio
  del proveedor de email) — el usuario puede pedir un reenvío después.
  `POST /auth/verify-email` es **público** (sin `app.authenticate`): el
  enlace del correo puede abrirse en un dispositivo/navegador sin sesión.
  `POST /auth/resend-verification` sí protegido (hace falta saber a quién).
  Cuentas creadas antes de esta migración se backfillearon a verificadas.
- `server/src/lib/email.ts` envía vía la API REST de Brevo (sin SDK, una
  única llamada `fetch`) — elegido por su nivel gratuito (~9.000
  emails/mes) frente a Resend/SendGrid, ver Notas técnicas. **Sin
  `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` configuradas, el correo se registra
  en el log del servidor en vez de enviarse de verdad** — permite probar
  el flujo completo sin depender de una cuenta real (dev únicamente).

### Antibots
Roadmap de 5 puntos acordado con el usuario (verificación de email, arriba,
es el punto 0). Implementados los puntos 1-4; el punto 5 ("reportar
marcador") se plantea aparte, ver Pendiente / deuda técnica.
- **1) Rate limiting** — `@fastify/rate-limit`, registrado globalmente en
  `server/src/index.ts` (300 peticiones/minuto por IP, red de seguridad
  general) más límites específicos por ruta vía `config: { rateLimit }`:
  `POST /auth/register` (5 / 15 min), `POST /markers` (10 / hora),
  `POST /markers/:id/reviews` (20 / hora). Almacén en memoria del propio
  proceso (por defecto del plugin) — el contador se pierde en cada reinicio
  del servidor y no se comparte entre réplicas; suficiente a esta escala,
  revisar (store Redis) si se despliega con más de una instancia.
- **2) CAPTCHA en el registro** — Cloudflare Turnstile. `POST /auth/register`
  acepta `turnstileToken` (opcional en el schema; la comprobación real vive
  en el handler) y lo verifica contra la API de Cloudflare en
  `server/src/lib/turnstile.ts` (`verifyTurnstileToken`). **Sin
  `TURNSTILE_SECRET_KEY` configurada, la verificación se omite** (mismo
  patrón que `BREVO_API_KEY` — nunca debe llegar así a producción). El
  `.env` de la raíz (`EXPO_PUBLIC_TURNSTILE_SITE_KEY`) y `server/.env`
  (`TURNSTILE_SECRET_KEY`) traían por defecto el par de claves de PRUEBA
  oficiales de Cloudflare (widget siempre pasa, verificación real contra la
  API de Cloudflare) — **sustituidas por un sitio real el 2026-08-29** (ver
  Pendiente / deuda técnica). Widget en `turnstile-widget.tsx`: el script
  oficial de Cloudflare embebido en un `WebView` de `react-native-webview`
  (instalado explícitamente para este caso, ver Notas técnicas), comunicado
  con la app vía `postMessage`. En `src/app/(auth)/register.tsx`, remontar
  el widget (`key` incremental) tras un registro fallido — un token de
  Turnstile es de un solo uso. **`source.baseUrl: 'https://localhost'`
  obligatorio** en el `WebView` (añadido al pasar a una clave real, ver
  Notas técnicas → "Turnstile con clave real necesita `baseUrl` en el
  WebView") — con la clave de PRUEBA no hacía falta porque esa clave ignora
  el dominio.
- **3) Límite de marcadores por usuario/día** — `MARKER_DAILY_LIMIT = 3` en
  `server/src/routes/markers.ts`, comprobado en `POST /markers` antes de
  crear. Rolling 24h (`createdAt >= now - 24h`), no día natural — evita
  ambigüedad de zona horaria (servidor en UTC, usuarios en España) sin
  cambiar el efecto práctico. **No aplica a `role: ADMIN`** (mismo patrón
  que el resto de checks de rol: se lee de BD en el momento de la petición,
  nunca del JWT). 429 con mensaje explícito si se alcanza.
- **4) Bloqueo de dominios de email desechables** — paquete
  `disposable-email-domains` (lista mantenida en
  github.com/ivolo/disposable-email-domains), cargado vía `createRequire`
  en `server/src/lib/disposable-email.ts` (`isDisposableEmail`) para evitar
  la complejidad de importar JSON en ESM/NodeNext. Comprobado en
  `POST /auth/register` antes de las comprobaciones de unicidad, con mensaje
  de error explícito (el usuario debe saber por qué no puede registrarse con
  ese email, pedido explícitamente así).

### Auth y sesión (frontend)
- `lib/auth/storage.ts` — `expo-secure-store` (ver Notas técnicas).
- `lib/api/client.ts` — añade `Authorization: Bearer <token>` automáticamente;
  un 401 en un endpoint protegido (no en `/auth/*`) limpia el token y avisa
  vía `onUnauthorized(callback)`. Métodos tipados para todos los endpoints.
- `lib/auth/session.tsx` — `<SessionProvider>` + `useSession()` (`user`,
  `isLoading`, `login`, `register`, `logout`, `refreshUser`), montado en el
  layout raíz. `refreshUser()` vuelve a pedir `GET /auth/me` y actualiza
  `user` en memoria sin pasar por login — lo llama `verify-email.tsx` justo
  tras verificar con éxito, para que `emailVerified` se refleje de inmediato
  aunque la app llevara minimizada desde el registro (antes solo se
  refrescaba al arrancar o tras login/registro).
- **`src/app/verify-email.tsx`** — pantalla del enlace de verificación,
  **sin guard** en `_layout.tsx` (como `map`/`marker/[id]`) por el mismo
  motivo que el endpoint es público: puede abrirse sin sesión. Lee `token`
  de la URL, llama a `verifyEmail()` y muestra éxito/error. El botón
  "Continuar" navega a `/map`, no a `/` — ver Notas técnicas sobre por qué
  `/` no resuelve en este caso.
- **Perfil** (`src/app/profile.tsx`) — tarjeta "Email sin verificar" con
  botón "Reenviar" cuando `user.emailVerified` es `false`; desaparece sola
  en cuanto se verifica (el estado viene de `GET /auth/me`, ya incluye el
  campo).

### Navegación
- Rutas en grupos de Expo Router (`(tabs)`, `(welcome)`, `(auth)`) con
  `Stack.Protected` (API nativa de Expo Router, no `<Redirect>` manual):
  `(welcome)` si `!user || !hasEntered`, `(tabs)` si `!!user && hasEntered`,
  `(auth)` si `!user`. `map` y `marker/[id]` van **fuera** de todos los
  guards. Los tres bloques se declaran en ese orden (`(welcome)` primero) —
  ver Notas técnicas sobre por qué importa el orden. Mientras
  `isLoading` es `true`, se muestra `<LoadingScreen />`.
- **(welcome) siempre es la primera pantalla al arrancar**, con o sin
  sesión — `src/hooks/use-app-entry.tsx` expone `hasEntered`
  (`useState(false)`, no persiste). `enterApp()` se llama desde los dos
  botones de `(welcome)` **y** desde un login/registro exitoso (si no, una
  URL directa a `/login` dejaría `hasEntered` en `false` y el guard
  devolvería a `(welcome)` tras loguearse).

### Mapa y marcadores
- Núcleo compartido entre `/map` (pública) y Home (`(tabs)`):
  `src/hooks/use-nearby-markers.ts` (dos fuentes separadas a propósito —
  `allMarkers` vía `GET /markers`, sin radio, siempre visible; `nearbyMarkers`
  vía `GET /markers/nearby` con radio 5km, depende de la posición GPS;
  `search(filters)`/`searchResults`/`searchState` para el botón "Buscar",
  completamente separados de `nearbyMarkers`; pide ubicación con
  `accuracy: Location.Accuracy.High` — ver Notas técnicas; expone
  `refresh()` (solo recarga datos, nunca pide una posición nueva ni
  recentra el mapa) y `locate()` (permiso + posición nueva + recarga de
  cercanos — la única que recentra la cámara, ver Pendiente / deuda técnica
  → Resueltos/descartados → "Recentrado del mapa demasiado agresivo") y
  `src/components/nearby-markers-map.tsx` (presentacional: mapa con
  `allMarkers`, banner de permiso/error, botón circular "reubicarme" que
  llama a `locate()`, bottom sheet con `nearbyMarkers` o `searchResults`
  según `modalSource`). Cada pantalla llama al hook por su cuenta y pasa
  props extra según necesite (`currentUserId`, `onLocationPicked`,
  `sessionUser`/`onLogout`). Sin `showBackButton` ni `bottomInset` — ambos
  existieron y se eliminaron, ver Resueltos/descartados y Notas técnicas →
  "Segunda ronda de correcciones".
- **Tocar un ítem del bottom sheet vs. tocar el pin en el mapa hacen cosas
  distintas** — un ítem de la lista (`nearbyMarkers`/`searchResults`) centra
  y amplía el mapa sobre ese marcador (`handleListItemPress`, vía
  `MapViewProps.focusRequest` en `lib/maps`, zoom 17); el pin real en el
  mapa (`handleMarkerPress`, vía `onMarkerPress`) navega al detalle +
  reseñas. Ver Resueltos/descartados → "Desplegable de cercanos... cambia
  de comportamiento".
- `/map` redirige a `(tabs)` si detecta sesión activa (evita mantener dos
  pantallas de mapa para un usuario logueado). Nunca muestra un botón
  "Atrás" — se quitó (ver Resueltos/descartados): la única forma de llegar
  aquí es "Buscar ahora" en (welcome) o el botón "Inicio de sesión" del
  propio mapa, ninguna deja una pantalla previa a la que "volver" que
  tuviera sentido.
- **Crear marcador — ubicación tocando el mapa** (nunca la posición GPS):
  `lib/maps` expone `onMapPress` + `selectedLocation`/`selectedLocationColor`
  (pin temporal), vía la prop `onPress` de `<Map>` (MapLibre, ver Notas
  técnicas → "De `react-native-maps` a MapLibre"). `NearbyMarkersMap`
  implementa el modo de selección completo (banner + botones
  Cancelar/Confirmar; tocar otro punto reposiciona, no acumula) y reporta
  solo el punto elegido — nunca conoce `createMarker` ni el formulario.
  `CreateMarkerModal` recibe esa ubicación confirmada y la usa tal cual.
- `initialRegion` recentra el mapa de forma imperativa cuando cambian las
  coordenadas (ver Notas técnicas — `initialViewState` de `<Camera>` no
  reacciona a cambios tras el montaje). El punto azul "aquí estoy" lo da
  gratis `<UserLocation />` de MapLibre, sin ninguna prop propia de
  `lib/maps`.
- **Género de marcador + color en el mapa** — color fijo por género
  (`getMarkerGenderColor` en `src/utils/format.ts`: azul/rojo/morado/amarillo,
  este último reutiliza `theme.primary`), reflejado en el selector del
  formulario y en el pin (`MapMarkerData.color`, agnóstico del dominio para
  `lib/maps`).
- **Horario de apertura + accesibilidad en silla de ruedas (2026-08-30)** —
  dos campos opcionales de `Marker`. Horario: `AppTextField` de texto libre
  inline en `create-marker-modal.tsx`/`edit-marker-modal.tsx` (sin
  componente propio, decisión explícita de no construir un selector
  estructurado día a día). Accesibilidad:
  `src/components/marker-wheelchair-field.tsx` (calcado de
  `marker-gender-field.tsx` — pills con punto de color, semáforo
  `COMPLETA`/`PARCIAL`/`NINGUNA` vía `getWheelchairAccessColor` en
  `format.ts`), con una pill extra "Sin especificar" que pone el valor a
  `null` — necesaria porque, a diferencia de género, este campo si puede
  quedar vacío y hay que poder volver a ese estado al editar. Mostrado en
  `marker/[id].tsx` junto a tipo/género/precio (accesibilidad con su color)
  y como línea "Horario: ..." aparte (solo si está informado). Verificado
  en dispositivo real: crear/editar con ambos campos, guardar, confirmar
  persistencia vía API, y volver a "Sin especificar" limpia el valor en BD.
- **Imagen de cabecera del marcador** — `imageUrl` opcional, guardada como
  data URL base64 (no hay bucket de object storage, ver Pendiente / deuda
  técnica). `marker-image-field.tsx` usa `expo-image-picker`
  (`base64: true`, `quality: 0.5`). Visible en el formulario, en el detalle
  del marcador y **en su propio pin del mapa** — con imagen, la gota de
  color de siempre (`dropPinStyle`, sin cambios) pasa a contener la foto
  como un círculo CENTRADO dentro de ella (`PHOTO_PIN_SIZE`/
  `PHOTO_IMAGE_SIZE` en `map-view.tsx`, este último subido de 24 a 30 antes
  de la 2ª tanda de pruebas alpha — 2026-08-30, a petición del usuario tras
  ver la primera tanda: "que ocupen más superficie de la gota" — verificado
  en dispositivo real contra marcadores reales del grupo cerrado, no datos
  de prueba), no un pin distinto — la gota sigue entera, con su color de
  género visible como marco (más fino ahora, pero nunca desaparece del
  todo) alrededor de la foto y en el "rabito" de abajo (pedido
  explícitamente así, para no perder esa identificación visual del tipo de
  baño — el límite real al subir `PHOTO_IMAGE_SIZE` es no comerse ese marco
  entero, no la geometría de la gota en sí: el círculo de la foto cabe
  entero dentro de la zona redondeada mientras su radio no supere
  `PHOTO_PIN_SIZE / 2`). Sin imagen, la gota es idéntica a como era antes.
  El círculo de la foto lleva su propio `rotate('45deg')` para compensar el
  `rotate(-45deg)` de la gota que lo contiene — si no, la foto se vería
  girada (su recorte circular no cambia de forma, pero sí el contenido).
- **`BottomNavBar` (`src/components/bottom-nav-bar.tsx`)** —
  píldora flotante al pie (`nearby-markers-map.tsx`)
  sustituye al antiguo sidebar (☰) + FAB + botón "Buscar" sueltos: 5
  iconos en fila — Mis marcadores (bookmark) · Perfil (persona) · Añadir
  marcador (círculo amarillo `primary`, 56px, icono "+") · Buscar (lupa) ·
  Ajustes (sliders, abre un bottom sheet con `SearchFiltersPanel`, antes
  vivía dentro del sidebar). Mis marcadores/Perfil quedan deshabilitados
  (opacidad reducida) sin sesión, igual que hacía el sidebar antiguo.
  "Cerrar sesión" se mudó a Perfil (ver Perfil / Mis marcadores). Posición
  siempre `bottom: Spacing.four` fija, sin ningún `bottomInset` — ver más
  abajo por qué se eliminó ese prop por completo.
  **Colores fijos** (`#ffffff` la barra, `#000000` los iconos,
  `#F7B500`/`#241C00` el círculo de añadir) — deliberadamente NO usa
  `useTheme()`: es una superficie de diseño cerrado, igual que
  GlassCard/AuthSplitLayout/Perfil/Mis marcadores, así que no debe seguir el
  theme del sistema (con el móvil en modo oscuro, `theme.background` la
  pintaba en negro, muy distinto del mockup — bug real detectado y
  corregido en la primera verificación en dispositivo).
  **Iconos** en `src/components/nav-icons.tsx` (`BookmarkIcon`,
  `PersonIcon`, `SearchIcon`, `SlidersIcon`) — Views planas con trucos CSS
  clásicos (triángulo de borde transparente+coloreado para la cinta del
  bookmark; `SearchIcon` es un aro RELLENO — dos círculos concéntricos
  (uno del color del icono, otro del color de fondo encima para el hueco),
  no un `borderWidth` — con el mango solapado por debajo del disco macizo;
  un disco sólido tapa cualquier solape sin depender de acertar
  exactamente en el borde, a diferencia de un trazo fino, que solo cubre
  una banda estrecha y dejaba un hueco visible a este tamaño de icono pese
  a que la geometría cuadrara "en el papel" — ver Notas técnicas → tercera
  y cuarta ronda de correcciones para el historial completo de intentos),
  nunca emoji: los emoji de Android (Noto
  Color Emoji) se renderizan a todo color (🔖👤🔍⚙️ salían en rojo/azul/gris
  vivos), muy alejado del icono de línea negra del mockup. Sin
  `react-native-svg` ni ninguna librería de iconos — mismo criterio que el
  resto de la app (ver Notas técnicas → icono mostrar/ocultar contraseña),
  evita además añadir una dependencia nativa nueva que forzara regenerar el
  *development build*. Diseño cerrado con el usuario, ver mockup enlazado en
  Resueltos/descartados. **Verificado en el dispositivo Android real** tras
  dos rondas de correcciones — ver Notas técnicas → "Corrección de
  BottomNavBar tras la primera verificación en dispositivo real" y "Segunda
  ronda de correcciones".
- **Avatar/control superior derecho** — ya **no existe con sesión** (Perfil
  ya está en `BottomNavBar`, duplicarlo ahí no aportaba nada — pedido
  explícito del usuario). Sin sesión, un botón de texto **"Inicio de
  sesión"** (mismo hueco arriba a la derecha, mismos colores fijos
  blanco/negro que el resto de `BottomNavBar`) navega a `/login` — hace
  falta porque Mis marcadores/Perfil de `BottomNavBar` quedan
  deshabilitados sin sesión. Sustituye al avatar con icono de persona que
  había antes (navegaba a Perfil o a `/login` según sesión) — ver
  Resueltos/descartados.
- **"Ajustes"** — `SearchFiltersPanel`: distancia (presets, "Sin límite" por
  defecto), tipo y género (multi-selección), puntuación mínima independiente
  para comodidad e higiene. Solo configura filtros aquí; el botón "Buscar"
  de `BottomNavBar` los aplica.
- Género relabeled: `MASCULINO`→"De Pie", `FEMENINO`→"Sentado" (colores más
  intensos `#1D4ED8`/`#DC2626`), solo cambio de etiqueta visible — el
  identificador del enum en Prisma/BD no cambió.
- **Leyenda de colores del mapa (2026-08-30)** — `src/components/map-legend.tsx`:
  botón circular "i" flotante abajo a la izquierda (mismo diseño cerrado que
  "reubicarme", que ocupa la posición espejo a la derecha), despliega un
  panel pequeño con los 4 colores de género (`GENDER_OPTIONS` de
  `marker-gender-field.tsx` + `getMarkerGenderColor`/`formatMarkerGender`).
  **Primer popover "ligero" de la app** — no es un `Modal` de bottom-sheet
  como el resto de contenido extra (desproporcionado para 4 filas de
  texto): un `View` `position: absolute` sobre el mapa + un `Pressable`
  overlay a pantalla completa (transparente) que lo cierra al tocar fuera.
  Renderizado en `nearby-markers-map.tsx` junto a "reubicarme", con el mismo
  `bottom` (`Spacing.four + SEARCH_BUTTON_RESERVED_SPACE`). Verificado en
  dispositivo real: abre, muestra los colores correctos, cierra al tocar
  fuera, no interfiere con "reubicarme" ni `BottomNavBar`.
- **Compartir marcador (2026-08-30)** — botón "Compartir" (`AppButton`
  variant `secondary`) junto a "Cómo llegar" en `marker/[id].tsx`, usa el
  `Share` núcleo de `react-native` (sin dependencia nueva) con un mensaje
  que incluye título, tipo/género y el deep link
  `pipiapp://marker/${marker.id}`. **Limitación conocida**: ese deep link
  solo abre la app en un dispositivo que ya la tenga instalada — no hay
  dominio web al que hacer fallback (app mobile-only, ver Web branch
  removed más abajo); aceptable para el grupo cerrado actual, donde todos
  tienen la app. Verificado en dispositivo real: abre la hoja nativa de
  Android con el texto correcto (sin llegar a enviarlo, para no mandar
  nada a los contactos reales del dispositivo de pruebas).
- El mapa de Home se refresca (`useFocusEffect`) al volver de otra pantalla
  con cambios (p. ej. tras editar/eliminar en "Mis marcadores") — ver Notas
  técnicas.
- **"Cómo llegar" (2026-08-29)** — botón en `marker/[id].tsx`, junto al
  resto de datos del marcador. Sin sesión ni email verificado (acción de
  solo lectura). Al pulsar: pide ubicación (mismo patrón que `locate()` en
  `use-nearby-markers.ts`) y llama a `api.getMarkerRoute` (`GET
  /markers/:id/route`, ver Backend/API). Éxito: guarda el resultado en
  `useActiveRoute()` (`src/hooks/use-active-route.tsx`, Context en memoria
  montado en `_layout.tsx`, mismo patrón que `useAppEntry`) y hace
  `router.back()` — **la ruta se dibuja en el mapa del que se vino, nunca
  en un mini-mapa dentro del detalle** (decisión de UX explícita: el
  detalle no tiene mapa propio, y la única forma de llegar a
  `marker/[id].tsx` hoy es tocando un pin en `/map` o Home, así que
  "atrás" siempre vuelve al mapa correcto). Error (permiso denegado, GPS
  falla, o 503 del backend): texto inline, sin navegar. `NearbyMarkersMap`
  lee `useActiveRoute()` y pasa `route.coordinates` a `<Map>` (nueva prop
  `route` en `lib/maps`, dibuja un `<GeoJSONSource>`+dos `<Layer type="line">`
  apiladas — halo blanco + línea amarilla `primary`, colores fijos como el
  resto del mapa) más una píldora arriba con
  `${formatDistance} · ${formatDuration}` (nuevo `formatDuration` en
  `utils/format.ts`) y un botón "✕" que llama a `clearRoute()`. Sin
  *fit-to-bounds* (lib/maps no tiene ese mecanismo hoy) — la ruta se dibuja
  sobre la vista actual del mapa, que ya suele contener al usuario y al
  marcador porque el flujo empieza tocando un pin visible; limitación
  conocida, no resuelta. Verificado en dispositivo real de punta a punta.

### Reseñas
- `src/app/marker/[id].tsx` usa `useSession()`: con sesión muestra
  `MarkerReviewForm` (`src/components/marker-review-form.tsx`, con
  `RatingField` de `src/components/rating-field.tsx` — pastillas 1-5 para
  comodidad e higiene + comentario opcional) **solo mientras no hay reseña
  propia todavía, o mientras se está editando la ya publicada**
  (`showReviewForm = !myReview || isEditingReview`); sin sesión, una
  tarjeta con botón a `/login`. El botón del formulario cambia entre
  "Publicar reseña"/"Actualizar reseña" según `existingReview` (mismo
  endpoint upsert). Guardar recarga el marcador completo en vez de
  fusionar la respuesta a mano.
- **La reseña propia siempre aparece primera en el listado** (antes de
  `otherReviews`, nunca duplicada), con etiqueta "Tú" y enlaces
  Editar/Borrar en la propia card — pedido explícitamente así (antes vivía
  aparte, solo dentro del formulario, invisible en el listado). "Editar"
  reabre `MarkerReviewForm` prellenado, con un botón "Cancelar" (prop
  `onCancel` nueva del componente, solo presente al editar una ya
  publicada — crear la primera no tiene card a la que volver) que descarta
  cambios sin guardar. "Borrar" pide confirmación en dos pasos inline (sin
  `Alert.alert`), mismo patrón que "Eliminar" en Mis marcadores —
  `DELETE /markers/:id/reviews` (ver Backend/API).
- Sin restricción para que un propietario puntúe su propio marcador — no
  pedido explícitamente.
- **Reportar marcador / reportar reseña (2026-08-30)** — enlace de texto
  "Reportar" (mismo peso visual que "Editar"/"Borrar", `themeColor="danger"`)
  junto a los datos del marcador y en cada card de `otherReviews` (nunca en
  la propia). Abre `src/components/report-modal.tsx` — un único componente
  reutilizado para los dos casos (recibe `reasons`/`onSubmit` como props,
  `marker/[id].tsx` decide cuál según `reportReviewId` sea `null` o no):
  bottom-sheet `Modal` con pills de motivo (sin color por motivo, a
  diferencia del selector de género), campo de detalle obligatorio solo si
  se elige "Otro", y mensaje de éxito inline. Verificado en dispositivo
  real: validación sin motivo elegido, "Otro" sin detalle, envío correcto
  con mensaje de confirmación, y que una reseña solo ofrece sus 3 motivos
  (sin "Sitio cerrado").

### Perfil / Mis marcadores / Favoritos
- **Perfil** (`src/app/profile.tsx`) — cabecera con datos de `useSession().user`
  y una cuadrícula de 4 estadísticas (`GET /users/me/stats`). El resumen en
  sí es **solo lectura** (pedido explícitamente así) — sin edición de perfil
  ni campos inventados. Superficie clara forzada con `ThemeOverrideContext`
  (ver Notas técnicas). Sección "Cuenta" al final con **"Cerrar sesión"**
  (llama a `useSession().logout()`, mismo botón que antes vivía en el
  sidebar — se mudó aquí con el rediseño de la barra inferior, ver Estado
  del proyecto → Mapa y marcadores → `BottomNavBar`)
  y **eliminar cuenta** justo debajo (`DELETE /users/me`, ya existente en el
  backend — ver soft delete más arriba), con confirmación en dos pasos
  inline (sin `Alert.alert`), mismo patrón que "Eliminar" en Mis
  marcadores. El mensaje de confirmación deja claro que **los marcadores y
  reseñas del usuario se conservan** (decisión ya tomada, ver Estado del
  proyecto → Backend/API → soft delete) — se descartó explícitamente dar a
  elegir "borrar también mi contenido" para no complicar el flujo. Al
  confirmar, llama también a `useSession().logout()` (no solo a la API)
  para limpiar el token y el estado de sesión de inmediato.
- **Mis marcadores** (`src/app/my-markers.tsx`) — listado de
  `GET /markers/mine`; "Eliminar" pide confirmación en dos pasos inline (no
  `Alert.alert`); "Editar" abre `EditMarkerModal`
  (`PUT /markers/:id`, nunca cambia la ubicación). `EditMarkerModal` y
  `CreateMarkerModal` comparten `marker-type-price-fields.tsx` para no
  divergir del espejo de `validatePricing`.
- **Favoritos (2026-08-30)** — `src/hooks/use-favorites.tsx` (Context,
  mismo patrón que `use-active-route.tsx`, montado en `_layout.tsx`): pide
  `GET /users/me/favorites` una sola vez cuando hay sesión (nunca sin
  ella), guarda la lista completa (`Marker[]`) y deriva un `Set<string>`
  de ids para `isFavorite()`. Se decidió resolver así en vez de que
  `GET /markers/:id` devolviera un campo `isFavorite` (que habría exigido
  inventar un mecanismo de "auth opcional" nuevo en el backend, ya que ese
  endpoint es público — sin `app.authenticate` — a propósito). Corazón
  (`HeartIcon` en `nav-icons.tsx`, `View`s planas sin `react-native-svg`,
  mismo criterio que el resto de iconos — construcción corregida el
  2026-08-30, ver Notas técnicas → "Costura visible en HeartIcon") junto al
  título en `marker/[id].tsx`, **solo con sesión** (favoritos exige cuenta,
  igual que dejar reseña); `toggleFavorite`
  actualiza el estado local al instante (optimista) antes de esperar la
  respuesta del backend. **`src/app/favorites.tsx`** (nuevo, mismo guard
  `!!user` que Perfil/Mis marcadores) — mismo scaffold que `my-markers.tsx`
  pero sin editar/eliminar: la única acción es "Quitar de favoritos" de un
  solo tap (reversible, sin confirmación en dos pasos). Entrada desde
  Perfil, nueva sección "Favoritos" entre "Resumen" y "Cuenta". Verificado
  en dispositivo real de punta a punta: marcar desde el detalle, verlo en
  la lista, quitarlo, estado vacío correcto.

### Diseño
- `src/constants/theme.ts`: paleta amarilla (`primary`/`primarySoft`/
  `onPrimary`, light+dark), escala `Radius`. Primitivas en
  `src/components/ui/`: `AppButton`, `AppTextField` (toggle
  Mostrar/Ocultar sin iconos de plataforma — ver Notas técnicas), `Card`,
  `GlassCard` (glassmorphism vía `expo-blur`, usada solo por `(welcome)`).
- `ThemeOverrideContext` (`src/hooks/use-theme.ts`) fuerza un theme fijo
  para un subárbol — usado por `GlassCard`, `AuthSplitLayout`, Perfil y Mis
  marcadores (superficies de diseño fijo sin variante oscura propia). Ver
  Notas técnicas para el gotcha de dónde puede llamarse `useTheme()`.
- **Login/registro** (`AuthSplitLayout`) — layout de dos columnas: panel de
  formulario claro (~480px) + foto a pantalla completa al lado
  (`imageSide: 'left' | 'right'`, derecha en login/izquierda en registro).
  Por debajo de 900px (`WIDE_BREAKPOINT`) la foto desaparece y el
  formulario ocupa toda la pantalla. Botón primario amarillo. No se
  añadieron "Iniciar sesión con Google"/"Recordarme"/"¿Olvidaste tu
  contraseña?" (no hay funcionalidad real detrás; un botón inerte ahí sería
  engañoso, no solo decorativo) — confirmar con el usuario si se quiere ese
  alcance más adelante. Registro pide la contraseña dos veces ("Repite la
  contraseña") — comprobación puramente de frontend en `validate()`, el
  backend nunca ve ese segundo campo.
- **Rebrand pipiApp → FreePee (2026-08-30)** — tras las primeras pruebas con
  el grupo cerrado, el nombre "pipiApp" no convencía; se rota a "FreePee".
  Alcance decidido con el usuario ("lo que recomiendes, el nombre puede
  volver a cambiar"): todo lo **visible** cambia (`app.json` `name`,
  wordmark, textos de permisos en los plugins de `app.json`, asunto/cuerpo
  del email de verificación en `server/src/lib/email.ts`, mensaje de
  "Compartir marcador"), pero **no** el deep link (`pipiapp://`, sigue
  siendo el scheme registrado — cambiarlo rompería el enlace de
  verificación de emails ya enviados) ni el slug/rutas internas —
  identificadores técnicos ya desacoplados a propósito del nombre visible
  (mismo criterio que `android.package: com.freepee.app`, fijado el
  2026-08-29 mientras el nombre visible seguía siendo "pipiApp"). El nombre
  visible vive en un único sitio, `src/constants/brand.ts` (`APP_NAME`),
  para que el próximo cambio de nombre sea barato.
- **Wordmark** — centralizado en `src/components/wordmark.tsx`
  (`<Wordmark type={...} />`), antes duplicado como JSX suelto en
  `AuthSplitLayout` y en la tarjeta de `(welcome)`. "Free" en `text` (negro
  en claro), "Pee" en `primary` (amarillo) — mismo patrón de color que
  tenía "pipi"+"App".
- **Icono/logo de la app (2026-08-30)** — antes el icono/splash por
  defecto de la plantilla de Expo (la "A" azul), nunca personalizado.
  Explorado con el usuario en un canvas de diseño (varias direcciones —
  pin+gota de agua, monograma "FP", pin+persona — antes de decidir):
  dirección final **"gota de marca"** — reutiliza literalmente la forma del
  pin de los marcadores del mapa (`border-radius: 50% 50% 50% 0` +
  `rotate(135deg)`, el mismo truco CSS que `dropPinStyle` en
  `lib/maps/map-view.tsx`) como icono de la app, sin ningún monograma ni
  detalle tallado dentro (se probó un "FP" grande dentro del pin y no
  convenció en pruebas con el público — descartado). Fondo `onPrimary`
  (`#241C00`), pin `primary` (`#F7B500`). Assets regenerados
  programáticamente (PowerShell + `System.Drawing`, replicando a mano la
  geometría exacta del `border-radius` — sin Pillow/ImageMagick
  disponibles en esta máquina) en vez de exportados a mano desde el canvas:
  `assets/images/icon.png` (1024×1024, fondo sólido), `android-icon-foreground.png`
  y `android-icon-monochrome.png` (transparentes, pin dentro de la zona seguridad
  ~61% de Android) y `splash-icon.png` (transparente, 512×512). Eliminado
  `android-icon-background.png` (imagen de fondo con textura de la
  plantilla) — ya no se referencia en `app.json`, basta con
  `adaptiveIcon.backgroundColor: "#241C00"`. `expo-splash-screen` también
  actualizado a ese mismo fondo oscuro (antes `#208AEF`, azul de plantilla).
  **Sin verificar todavía en un rebuild nativo real** — un cambio de icono/
  splash solo se ve de verdad tras `expo prebuild` + reinstalar en
  dispositivo (o un build de EAS), no con Fast Refresh; pendiente de que el
  usuario lo pida antes de tocar su entorno nativo/dispositivo (ver
  Notas técnicas — "Local dev iteration phase", redespliegues en pausa).
- **(welcome)** — descripción ("Mapa colaborativo de sitios donde hacer tus
  necesidades en paz y a gusto, solo o con tu mascota. Empezamos por
  Cáceres — ayúdanos a hacerlo crecer añadiendo los tuyos.") deliberadamente
  refleja la fase actual (pocos marcadores reales, todos en Cáceres, ver
  Datos de prueba) en vez de prometer cobertura que todavía no existe —
  revisar/ampliar según crezca el contenido real fuera de Cáceres. **La app
  es para personas** (con o sin mascota) que buscan un sitio donde hacer sus
  necesidades — no una app exclusiva para pasear perros; cuidado con volver
  a introducir ese enfoque en textos futuros (`PIPICAN` es solo uno de los
  cuatro valores de `Marker.gender`, no el género implícito de toda la app).

### Datos de prueba
- **Cuenta admin** (`admin@pipiapp.local`, `role: ADMIN`) creada a mano en
  la BD — credenciales compartidas con el usuario en el chat, nunca en el
  repo.
- **5 marcadores reales de Cáceres, España**, creados con esa cuenta:
  Paseo de Cánovas (operativo), Parque del Rodeo, Parque del Príncipe,
  Parque Padre Pacífico y Plaza Mayor. Coordenadas reales vía
  Nominatim/OSM, `type: PUBLICO`, `gender: MIXTO`. Fuente:
  [nota de prensa del Ayuntamiento de Cáceres](https://www.ayto-caceres.es/noticias/el-ayuntamiento-pondra-en-marcha-una-red-de-banos-publicos-por-diferentes-zonas-de-la-ciudad/).

## Pendiente / deuda técnica conocida

### Cambios pendientes de la ronda de pruebas con el grupo cerrado (2026-08-29)
Recopilados en conversación con el usuario tras las primeras pruebas reales
de la app ya desplegada. **Ronda cerrada (2026-08-30) — los 8 puntos están
implementados y verificados en dispositivo real.** Detalle completo de cada
uno en Estado del proyecto/Notas técnicas (enlazado en cada bullet); aquí
solo el resumen de qué cambió.

- **Recentrado del mapa demasiado agresivo** → `useNearbyMarkers` separado
  en `locate()` (permiso + posición nueva, única que recentra la cámara) y
  `refresh()` (solo recarga datos) — ver Estado del proyecto → Mapa y
  marcadores.
- **Reseñas propias invisibles en el listado** → la reseña propia aparece
  primera en el listado con "Tú"/editar/borrar inline; `DELETE
  /markers/:id/reviews` nuevo — ver Estado del proyecto → Reseñas.
- **Imagen del marcador integrada en el pin del mapa** → la foto se dibuja
  como círculo centrado dentro de la gota de color, sin perder el "rabito"
  — ver Estado del proyecto → Mapa y marcadores → Imagen de cabecera.
- **Rutas propias / distancia real vía OpenRouteService** → `GET
  /markers/nearby` con distancia/tiempo a pie reales y `GET
  /markers/:id/route` + botón "Cómo llegar" — ver Estado del proyecto →
  Backend/API y Mapa y marcadores. **Pendiente antes del próximo
  redespliegue**: añadir `ORS_API_KEY` a Railway (ver Despliegue).
- **Desplegable de "cercanos" cambia de comportamiento** → tocar un ítem de
  la lista centra/amplía el mapa en vez de navegar; el detalle solo se abre
  tocando el pin (`MapViewProps.focusRequest`) — ver Estado del proyecto →
  Mapa y marcadores.
- **Bug: verificar el email no actualiza la sesión si la app se minimizó**
  → `refreshUser()` nuevo en `SessionProvider`, llamado desde
  `verify-email.tsx` tras verificar con éxito — ver Estado del proyecto →
  Auth y sesión (frontend).
- **Enlaces "← Atrás" → botón/icono "✕"** → mismo `router.back()` de
  siempre en profile/my-markers/marker, solo cambió el texto por "✕".

- ~~`JWT_SECRET` de desarrollo~~ → resuelto para producción: el backend
  desplegado en Railway usa un secreto distinto, generado aparte y puesto
  solo como variable de entorno de Railway (nunca en el repo) — ver
  Despliegue. `server/.env` local sigue con el secreto de desarrollo de
  siempre, sin tocar (entornos completamente separados).
- `removeAdditional: true` en la validación de Fastify: los campos no
  permitidos en el body (como un `role` inyectado, o un campo mal escrito
  por error del cliente) se descartan en silencio en vez de devolver un
  error explícito. Decisión correcta de cara a seguridad (bloquea mass
  assignment), pero un campo mal escrito por error del frontend no avisa al
  desarrollador — comportamiento consciente, no revisar salvo confusión
  real en desarrollo.
- La imagen de un marcador se guarda como data URL base64 en la propia fila
  de Postgres (`imageUrl`, `TEXT`), no en un bucket de object storage — ver
  Notas técnicas → "Almacenamiento de la imagen de un marcador".
  **Prioridad baja de forma deliberada** (confirmado con el usuario): se
  revisará solo al entrar en fase beta con testers, no antes.
- **Roadmap antibots — orden acordado con el usuario, verificación de email
  es el punto 0**: puntos 1-4 (rate limiting, CAPTCHA Turnstile, límite de
  3 marcadores/día, bloqueo de dominios desechables) **implementados** — ver
  Estado del proyecto → Antibots para el detalle de cada uno. ~~Punto 5,
  "reportar marcador"~~ → **implementado** (2026-08-30, junto con "reportar
  reseña", añadido a la vez a petición del usuario aunque no era parte
  original de este roadmap — ver Estado del proyecto → Reseñas y
  Backend/API).
- El remitente de Brevo (`BREVO_SENDER_EMAIL`) es un Gmail personal, no un
  dominio propio — Brevo avisa de que no cumple los requisitos de
  autenticación (DKIM/DMARC) que Google/Yahoo/Microsoft piden a
  remitentes masivos, lo que puede afectar a que el correo caiga en spam.
  **Prioridad baja por ahora** (funciona para desarrollo/pruebas): mejorar
  solo si se compra un dominio propio para el proyecto, autenticándolo en
  Brevo (Dominios → Añadir dominio + registros DNS).
- Login/registro con **Google** (OAuth) — estudiado y aparcado como
  opcional de baja prioridad a petición del usuario: mayor coste de
  implementación (credenciales por plataforma, `password` pasaría a
  opcional en `User`) que las demás mejoras de esta lista, y no resuelve
  el problema de bots por sí solo. Retomar solo si el usuario lo pide
  explícitamente.
- ~~**Claves de Cloudflare Turnstile de PRUEBA**~~ → **resuelto de punta a
  punta** (real en local desde el 2026-08-29; llevado a producción el
  2026-08-30 junto con `ORS_API_KEY` — antes ausente en Railway del todo,
  ver Despliegue — al preparar la alpha 2): sitio real creado en
  Cloudflare, `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (`.env` raíz + variable
  `preview` de EAS) y `TURNSTILE_SECRET_KEY` (`server/.env` + Railway
  producción) con las claves reales — nunca en el repo ni en CLAUDE.md,
  solo en los `.env` locales (gitignored) y en las variables de entorno de
  cada plataforma.
- ~~`android.package` de plantilla (`com.anonymous.pipiapp`)~~ →
  **cambiado a `com.freepee.app`** (2026-08-29, decisión del usuario — nombre
  de marca "FreePee"; no hace falta poseer ese dominio de verdad, es solo el
  identificador). Aplicado en `app.json` + `npx expo prebuild --platform
  android --clean` + reinstalado en el dispositivo de pruebas (Android trata
  un cambio de `applicationId` como una app distinta — no es una
  actualización in place, hay que desinstalar el `com.anonymous.pipiapp`
  viejo a mano si sigue instalado en algún dispositivo). Los dos pendientes
  que quedaban de este punto ya están resueltos: revisado antes del build
  de EAS de la alpha 2 que ningún `EXPO_PUBLIC_...` lee `android.package`
  en ningún sitio del código (no existe esa variable, no hacía falta
  tocar nada); y el nombre visible de la app/marca sí cambió a "FreePee"
  el 2026-08-30 — ver Estado del proyecto → Diseño → "Rebrand pipiApp →
  FreePee".
- **Roadmap de funcionalidades futuras** — investigado comparando con apps
  similares (buscadores de baños públicos: Flush, Toilet Finder, Kgon,
  AseosPublicos.es; pet-friendly: BringFido; mapas de accesibilidad:
  Wheelmap), pendiente de decidir cuándo se retoma tras la fase de
  depuración móvil. Por peso/prioridad:
  - Nivel 1 (alto valor, bajo esfuerzo): ~~"Cómo llegar"~~ → **implementado**
    (2026-08-29, ver Estado del proyecto → Mapa y marcadores) — pero como
    ruta propia dibujada en el mapa vía OpenRouteService, no como el deep
    link a Google/Apple Maps que se planteaba aquí originalmente; si en
    algún momento se quiere ADEMÁS un botón que abra Google/Apple Maps
    (para navegación turn-by-turn real, que esta app no ofrece), sigue
    siendo una feature nueva y separada, no cubierta por lo ya hecho.
    ~~"Compartir marcador"~~ → **implementado** (2026-08-30, ver Estado del
    proyecto → Mapa y marcadores). ~~"Reportar marcador"~~ (ya era el punto
    5 del roadmap antibots) y ~~"reportar reseña"~~ (no estaba en este
    roadmap original) → **implementados** (2026-08-30, ver Estado del
    proyecto → Reseñas). Además del roadmap original: leyenda desplegable
    de colores del mapa → **implementada** (2026-08-30, ver Estado del
    proyecto → Mapa y marcadores). **Nivel 1 completo.**
  - Nivel 2 (alto valor, esfuerzo medio): ~~favoritos/guardados~~ (lista
    personal, patrón BringFido), ~~horario de apertura~~ (texto libre) y
    ~~accesibilidad en silla de ruedas~~ (semáforo Wheelmap, 3 niveles +
    sin especificar) → **implementados** (2026-08-30, ver Estado del
    proyecto → Perfil / Mis marcadores / Favoritos y Mapa y marcadores).
    **Nivel 2 completo.**
  - Nivel 3 (esperar a más adelante): modo offline, varias fotos por
    marcador (bloqueado por la deuda de almacenamiento de imágenes de más
    arriba), internacionalización (prematuro con una sola ciudad
    sembrada).
Resueltos/descartados (referencia, no volver a plantear salvo que el
usuario lo pida):
- ~~Build y verificación de iOS~~ → **aparcado indefinidamente**
  (2026-08-29, decisión explícita del usuario): sacar la app en iOS exige
  una cuenta de Apple Developer de pago, coste que se prefiere ahorrar por
  ahora. No es un bloqueante técnico (EAS compila en la nube, no hace falta
  Mac local) — es una decisión de negocio. Retomar solo si el usuario lo
  pide explícitamente.
- ~~Rediseño de la barra inferior del mapa (nativo)~~ → implementado:
  sidebar (☰) + FAB + pills sueltos sustituidos por `BottomNavBar`
  (`src/components/bottom-nav-bar.tsx`) + avatar propio arriba a la
  derecha, según el mockup cerrado con el usuario
  (https://claude.ai/code/artifact/943f11dd-d32a-4b49-9b78-d4e38e7d3ab9,
  página 1). Detalle completo en Estado del proyecto → Mapa y marcadores.
  Web no se tocó. **Verificado en dispositivo Android real** — ver Notas
  técnicas → "Corrección de BottomNavBar tras la primera verificación en
  dispositivo real" (la primera implementación sí tenía bugs de verdad:
  colores en negro por no forzar tema fijo, iconos emoji a todo color en
  vez de monocromos — ambos corregidos en esa misma verificación).
- ~~Endpoint "whoami"~~ → `GET /auth/me`.
- ~~Unicidad de `username` sensible a mayúsculas/minúsculas~~ → descartada
  a petición explícita ("no me parece un problema real"); "Ana"/"ana"
  siguen siendo usuarios distintos, decisión final.
- ~~Mover la ubicación de un marcador ya creado~~ → confirmado que **no**
  se implementará; editar nunca toca latitude/longitude, decisión final.
- ~~`gender` nullable en BD~~ → resuelto, columna `NOT NULL` desde la
  migración `20260824190000_marker_gender_not_null` (backfill a `MIXTO`
  para legados).
- ~~Barra de pestañas "Home"/"Explore" de la plantilla visible al pie del
  Home en nativo~~ → `app-tabs.tsx` usaba `NativeTabs` (plantilla de
  create-expo-app sin tocar) en vez del mismo patrón ya aplicado en web
  — ver Notas técnicas → "Barra de pestañas de la plantilla visible en
  nativo".
- ~~Verificar `lib/maps/map-view.native.tsx` (MapLibre), `expo-blur` y
  `turnstile-widget.native.tsx` en un dispositivo Android real~~ →
  verificado de punta a punta (ver Notas técnicas → "Segunda verificación
  en dispositivo Android real"). Los tres funcionan correctamente.
  Resuelta también la pregunta abierta sobre `onMarkerPress`: tocar un
  marcador ya existente durante el modo de selección de ubicación **sí
  pasa el toque como `onMapPress`** — el `<Marker>` de MapLibre no lo
  absorbe cuando `onPress` es `undefined`.

Los puntos activos de esta lista requieren confirmación explícita del
usuario antes de tocarlos.

## Notas técnicas

### Turnstile con clave real necesita `baseUrl` en el WebView
Al sustituir la clave de PRUEBA de Cloudflare Turnstile por una real
(2026-08-29), el widget dejó de funcionar en el dispositivo: en vez del
checkbox "Verifique que es un ser humano" mostraba "No es posible
conectarse al sitio web" (pantalla de error genérica de Cloudflare, con su
logo — no un error de red real). Causa: `turnstile-widget.tsx` carga el
HTML del widget con `source={{ html }}` en el `WebView` (`react-native-webview`),
sin ninguna URL real de por medio — el script de Turnstile ve
`location.hostname` vacío/null, que no coincide con ningún dominio dado de
alta en el sitio de Cloudflare. La clave de PRUEBA nunca mostró este
problema porque ignora la restricción de dominio por completo; una clave
real sí la aplica. Arreglado añadiendo `baseUrl: 'https://localhost'` a
`source` (`source={{ html, baseUrl: 'https://localhost' }}`) — fija el
origen del WebView a un hostname real, que debe estar añadido como dominio
del sitio en el dashboard de Cloudflare Turnstile (junto con el dominio de
producción cuando se despliegue). Verificado en dispositivo real: el
widget pasa la verificación (`¡Operación exitosa!`) y el registro completo
funciona de punta a punta con la clave real.

### `expo-system-ui` parecía sin usar, pero lo necesita `userInterfaceStyle`
Al auditar dependencias sin uso (ningún `import` en `src`/`lib` ni en el
array `plugins` de `app.json`), `expo-system-ui` se quitó de `package.json`
por error — un `grep` de imports no basta para paquetes de Expo que actúan
solo como implementación de una clave de configuración de `app.json`.
`userInterfaceStyle: "automatic"` (raíz de `app.json`) depende de
`expo-system-ui` para aplicarse en Android; sin él, `npx expo prebuild`
avisa con `» android: userInterfaceStyle: Install expo-system-ui in your
project to enable this feature.` — no rompe el build, pero esa clave deja
de tener efecto en silencio. Reinstalado con `npx expo install
expo-system-ui` (resuelve la versión compatible con el SDK sola). Regla
general para futuras auditorías de dependencias en este proyecto: un
paquete `expo-*` sin ningún `import` puede seguir siendo necesario si
respalda una clave de nivel raíz en `app.json` — verificar con `npx expo
prebuild` (busca avisos de plugins) antes de dar por buena su eliminación,
no solo comprobar imports.

### Migraciones de Prisma contra Supabase
`npx prisma migrate dev` **no funciona directo** contra esta base de Supabase:
al comparar el historial de migraciones con la shadow database, detecta
"drift" en extensiones nativas de Supabase (`postgis`, `pgcrypto`,
`pg_stat_statements`, `uuid-ossp`) y termina sugiriendo `prisma migrate
reset`, que borraría todas las tablas de la base compartida. **Nunca aceptar
esa sugerencia.**

El flujo que sí funciona, aplicando el SQL directo y registrándolo a mano en
el historial de Prisma:

```
# 1. Editar prisma/schema.prisma con el cambio de modelo

# 2. Crear la carpeta de migración a mano (timestamp formato YYYYMMDDHHMMSS)
#    y escribir el SQL correspondiente en migration.sql
#    (verificar que el archivo quede en UTF-8, no UTF-16 — algunos editores
#    de Windows lo guardan en UTF-16 y eso rompe la lectura de Prisma)

# 3. Aplicar el SQL directamente contra la base real (sin pasar por shadow DB)
npx prisma db execute --file prisma/migrations/<timestamp>_<nombre>/migration.sql

# 4. Registrar la migración como aplicada en el historial de Prisma
npx prisma migrate resolve --applied <timestamp>_<nombre>

# 5. Verificar que quedó todo en sincronía
npx prisma migrate status   # debe decir "Database schema is up to date!"

# 6. Regenerar el cliente
npx prisma generate
```

Si la columna que pasa a obligatoria ya tiene filas existentes, hacer
backfill **antes** del `ALTER COLUMN ... SET NOT NULL` en el mismo script
(ver `prisma/migrations/20260824190000_marker_gender_not_null/`, que rellena
con `MIXTO` antes de restringir) — mismo patrón a seguir para cualquier
futura columna nullable→obligatoria con datos ya existentes.

### Seguridad del campo `role` (política válida para todo endpoint futuro)
- `role` nunca debe poder venir del body de una petición del cliente, en
  ningún endpoint. Se asigna siempre en el servidor — `@default(USER)`.
- Los endpoints que crean/actualizan `User` deben construir el `data` de
  Prisma con una whitelist explícita, nunca pasando el body completo. Ver
  `POST /auth/register` — usa además `additionalProperties: false` en el
  schema de Fastify, que combinado con `removeAdditional: true` elimina en
  silencio cualquier campo no esperado antes de que llegue al handler.
- Cualquier endpoint que compruebe permisos debe leer `role` desde la BD en
  el momento de la petición (nunca desde el JWT, que solo lleva `userId`),
  para que un cambio de rol surta efecto de inmediato. Ver `DELETE /markers/:id`.
- No existe (y no debe crearse) ningún endpoint público para promocionar a
  `ADMIN`. Se promociona siempre a mano en la base de datos.

### Almacenamiento del token de sesión
`lib/auth/storage.ts` usa `expo-secure-store`, que cifra el valor fuera del
proceso de la app (Keychain/Keystore del sistema).

### Estilos
- **Sombras**: `Card` usa `boxShadow` unificado en string (RN 0.76+) en vez
  de `shadow*`/`elevation` por separado, más `borderWidth: 1` explícito
  (pedido explícitamente "que sean notables los bordes").
- **Icono mostrar/ocultar contraseña**: deliberadamente texto simple
  "Mostrar"/"Ocultar" en vez de SF Symbols/`expo-symbols` — evita elegir un
  nombre de símbolo que no exista en alguna plataforma y falle solo en
  runtime, no en build.

### Blur/glassmorphism (`GlassCard`) y por qué el fondo no se veía
`GlassCard` usa `expo-blur` (`BlurView`, blur de sistema real). El tinte
blanco se aplica en una `View` aparte superpuesta, no como `backgroundColor`
del propio `BlurView`.

**El bug real:** con el `<ImageBackground>` ya montado correctamente, la
foto quedaba tapada por un fondo gris opaco. Causa: cada pantalla de Expo
Router se envuelve en un `Background` interno
(`expo-router/build/react-navigation/elements/Background.js`) que pinta
`colors.background` del tema de **navegación** (react-navigation,
`<ThemeProvider value={DefaultTheme}>` en `_layout.tsx`) — nada que ver con
`useTheme()` de `src/constants/theme.ts`. `contentStyle` solo llega a un
`View` hijo de ese `Background`, nunca al propio `Background`. Solución:
envolver el `<Stack>` del grupo en un `<ThemeProvider>` derivado de
`DefaultTheme` con `colors.background: 'transparent'` (hoy en
`(welcome)/_layout.tsx`, que es quien mantiene una foto a pantalla
completa).

### Corte de acceso inmediato al dar de baja una cuenta
`app.authenticate` consulta `isActive` en BD en cada petición autenticada,
no solo verifica la firma del JWT — si no, un JWT válido (hasta 7 días)
emitido antes de una baja seguiría funcionando. Coste: una consulta extra
por petición protegida, aceptable a esta escala; cachear con invalidación
corta si el volumen lo justifica en el futuro.

### Selección de ubicación tocando el mapa: `onMapPress` en `lib/maps`
El propio `<Map>` de MapLibre tiene su prop `onPress`
(`event.nativeEvent.lngLat`, tupla `[longitude, latitude]` — OJO al orden,
al revés que el resto de la app). El pin temporal se dibuja con un `View`
normal (cuadrado con 3 esquinas redondeadas + `rotate(-45deg)`, sin ningún
asset de imagen) dentro de un `<Marker anchor="bottom">` — ver Notas
técnicas → "De `react-native-maps` a MapLibre".

### El mapa arrancaba en Madrid y no se recentraba al llegar la posición real
`initialViewState` de `<Camera>` (MapLibre) no reacciona a cambios después
del montaje inicial — es solo para el primer render, por diseño de la
librería. Cuando la posición GPS real llegaba un instante después del
montaje (mapa ya centrado en el fallback de Madrid), el mapa se quedaba ahí
para siempre. Solución: recentrar de forma imperativa cuando cambian las
coordenadas, vía una ref a `<Camera>` (`CameraRef`) +
`cameraRef.current.easeTo({ center, zoom, duration: 500 })`, saltando el
primer render — comparando por `latitude`/`longitude` primitivos, no por el
objeto `initialRegion` completo (cambia de referencia en cada render aunque
el valor sea el mismo).

### De `react-native-maps` a MapLibre — primera prueba en Android real
Primera vez que se probó `lib/maps` en un dispositivo Android físico (vía
Expo Go, misma WiFi que el PC de desarrollo). Aparecieron dos problemas
independientes, diagnosticados por separado antes de tocar nada:

**1. `lib/api/client.ts` apuntaba a `http://localhost:3000` fijo.** En web
eso funciona porque navegador y backend comparten host en desarrollo; en un
dispositivo/emulador móvil `localhost` se refiere al propio dispositivo,
nunca al ordenador del backend — login, registro y todas las peticiones
fallaban por red. Arreglado derivando la IP de LAN automáticamente en
nativo desde `Constants.expoConfig.hostUri` (expuesto por `expo-constants`
solo en desarrollo vía `@expo/cli` — es la misma IP que Metro ya usa para
servir el bundle, así que si el dispositivo pudo cargar la app, también
puede llegar a esa IP): `EXPO_PUBLIC_API_URL` explícito sigue teniendo
prioridad si se define (para producción). Ver también el catch de
`use-nearby-markers.ts`, que antes mostraba "No se pudo obtener tu
ubicación" tanto si fallaba el GPS como si fallaba esta petición de red —
separado en dos try/catch con mensajes distintos, para no confundir un
fallo de conexión con un fallo real de geolocalización.

Aun con la IP correcta, la conexión seguía fallando
(`ConnectException: Failed to connect`) — causa real: el Firewall de
Windows del PC de desarrollo (perfil de red activo detectado como
"Pública", sin ninguna regla de entrada para el puerto 3000 ni para
`node.exe`). Se diagnosticó con `Get-NetFirewallRule`/`Get-NetConnectionProfile`
(sondeo de solo lectura, sin tocar nada) antes de proponer una regla
`New-NetFirewallRule` — cambio de sistema, no de repo, así que se dejó a
que el propio usuario la aplicara en vez de ejecutarla automáticamente.
Sin esa regla, un `curl` desde el propio PC a su propia IP de LAN
**sí funciona** (tráfico que Windows trata como local) aunque el mismo
puerto esté bloqueado para un dispositivo externo real — no sirve como
prueba de que el firewall vaya a dejar pasar tráfico ajeno.

**2. El mapa se veía gris/negro sin tiles, y un toque para crear un
marcador generaba coordenadas sin sentido (un punto en mitad del
océano).** No era culpa del usuario "tocando mal" — con el mapa nativo sin
inicializar tiles/proyección de verdad, un toque puede devolver
coordenadas arbitrarias. Causa: `react-native-maps` en Android usa el SDK
de Google Maps como motor de renderizado nativo, que necesita
autenticarse contra la API de Google — la documentación de Expo dice que
"no hace falta configuración adicional para probar en Expo Go" (Expo Go
trae su propia clave de prueba integrada), pero en la práctica, con la
versión de `react-native-maps` de este proyecto (1.27.2), esa
autenticación fallaba dentro de Expo Go (mapa nativo montado — de ahí que
un toque sí generara *algún* evento — pero sin tiles reales ni proyección
fiable).

En vez de perseguir una clave de Google Maps propia (exige activar
facturación en un proyecto de Google Cloud, aunque el uso se quede dentro
del nivel gratuito) se decidió sustituir el motor de mapas nativo por
**MapLibre** (`@maplibre/maplibre-react-native`) con tiles raster de
OpenStreetMap, sin ninguna cuenta ni clave. Decisión explícita del
usuario tras valorar el trade-off (más trabajo de implementación ahora,
cero fricción de facturación/cuenta después) frente a mantener
`react-native-maps` + clave de Google.

**Detalles de la migración** (`lib/maps/map-view.tsx`, reescrito por
completo):
- `mapStyle` de `<Map>` es un `StyleSpecification` completo definido a
  mano (`OSM_STYLE`: una única fuente `raster` apuntando a
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png` + una capa que la
  pinta) en vez de una URL de estilo remota — evita depender de un style
  JSON de terceros y deja explícita la atribución obligatoria de OSM. La
  fuente lleva `maxzoom: 19` (mismo límite real que tiene el servidor de
  OSM) — sin él, en la primera prueba en dispositivo real el mapa pedía
  tiles a z=20+ al hacer zoom cerca y el servidor respondía `HTTP 400` en
  bucle (visible en el log nativo, no rompía la app pero dejaba esa zona
  sin tiles).
- MapLibre usa coordenadas `LngLat` = `[longitude, latitude]` (orden
  invertido respecto al resto de la app, que siempre usa
  `{latitude, longitude}`) — la conversión se hace en los bordes del
  componente (al construir `lngLat` para `<Marker>`/`<Camera>`, y al leer
  `event.nativeEvent.lngLat` en `onPress`), nunca se filtra ese orden
  hacia `MapViewProps`.
- `<Marker anchor="bottom">` reemplaza a `<Marker pinColor={...}>` de
  react-native-maps — ya no hay una prop de color nativa, así que el pin
  se construye a mano con un `View` (mismo truco visual que
  `createDropIcon` en web: cuadrado con 3 esquinas redondeadas +
  `rotate(-45deg)`, `anchor="bottom"` para que la punta de la gota caiga
  sobre la coordenada real, no su centro).
- `<UserLocation />` sustituye a `showsUserLocation` — a diferencia de
  `react-native-maps`, gestiona su propia posición internamente (no
  recibe la prop `userLocation` de `lib/maps`, igual que antes).
- Recentrado imperativo vía `CameraRef.easeTo(...)` en vez de
  `mapRef.current.animateToRegion(...)` — ver la nota de arriba ("El mapa
  arrancaba en Madrid...").
- **No funciona dentro de Expo Go** (ninguna de las dos alternativas
  habría funcionado ahí — ni una clave de Google Maps propia, que Expo Go
  no puede usar por estar compilada en un binario fijo ajeno al proyecto,
  ni MapLibre, que necesita código nativo no incluido en Expo Go). A
  partir de esta migración, probar el mapa en nativo exige un
  *development build* (`npx expo prebuild` + `npx expo run:android`/`ios`,
  o EAS Build) — el usuario eligió generar ese build localmente
  (Android Studio/SDK propio) en vez de EAS Build.

### Primer *development build* local en Windows — problemas de entorno, no de código
Generar el primer build nativo (`npx expo prebuild` + `npx expo run:android`)
tras instalar Android Studio desde cero sacó a la luz varios problemas de
**entorno del PC de desarrollo**, ninguno del código del proyecto en sí —
documentados aquí porque volverán a aparecer en cualquier máquina nueva que
tenga que repetir este proceso:

- **`JAVA_HOME` apuntando a un JDK más nuevo que el que soportan las
  herramientas nativas.** El JBR que trae Android Studio (`D:\APPSTUDIO\jbr`,
  JDK 25) hace fallar las tareas de CMake/NDK de algunos módulos nativos
  (`react-native-worklets`, `react-native-screens`) con `WARNING: A
  restricted method in java.lang.System has been called` — una protección de
  seguridad nueva de Java 24+ que ese tooling nativo concreto todavía no
  soporta bien. Nunca cambiar el `JAVA_HOME` global (Android Studio puede
  depender de esa versión para sí mismo) — se instaló Eclipse Temurin 17
  (LTS, la combinación estable con el Android Gradle Plugin actual) aparte,
  y se fijó **solo para Gradle** vía `org.gradle.java.home` en
  `gradle.properties` dentro de `GRADLE_USER_HOME` (ver punto siguiente) —
  nunca en `android/gradle.properties`, que se regenera con cada
  `expo prebuild` y perdería el cambio.
- **La caché de Gradle (`%USERPROFILE%\.gradle`) llenó el disco C:.**
  Docenas de dependencias nativas (Compose, Fresco, MapLibre...) agotaron el
  espacio libre de C: a mitad de descarga (`Espacio en disco insuficiente`
  en decenas de tareas a la vez, fácil de confundir con un problema real de
  red/repositorio). Solución: `GRADLE_USER_HOME` redirigido a una carpeta en
  D: (`D:\gradle-home`, con espacio de sobra) — variable de entorno de
  usuario, no de sesión, hace falta una terminal nueva tras fijarla. El
  mismo archivo `gradle.properties` que fija el JDK (punto anterior) vive
  dentro de esa carpeta.
- **Variables de entorno nuevas (`JAVA_HOME`, `ANDROID_HOME`,
  `GRADLE_USER_HOME`) no las ve una terminal ya abierta** — hay que cerrarla
  del todo y abrir una nueva (o reiniciar VS Code si es su terminal
  integrada) después de cada cambio; si no, sigue resolviendo la versión
  vieja de lo que sea vía `PATH`.
- **`adb.exe: INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`** al
  instalar el APK en un móvil real por USB — protección propia de Android
  (muy común en MIUI/HyperOS de Xiaomi, pero no exclusiva) que exige
  activar **"Instalar vía USB"** en Opciones de desarrollador, aparte de la
  Depuración USB básica; en Xiaomi además "Depuración USB (ajustes de
  seguridad)" y a veces desactivar la optimización de MIUI/HyperOS. No es
  un fallo de build, la app ya estaba compilada correctamente en ese punto.
- **`localhost:3000` inalcanzable desde el móvil solo cuando se instala por
  USB (`expo run:android`), aunque por WiFi (Expo Go) funcionaba bien.**
  `npx expo run:android` monta un túnel `adb reverse tcp:8081 tcp:8081`
  para el bundle de Metro cuando el dispositivo está conectado por cable —
  en ese caso, `Constants.expoConfig.hostUri` (de donde `lib/api/client.ts`
  deriva la IP del backend, ver la nota de la sección de arriba sobre la
  IP de LAN) pasa a valer `localhost:8081` en vez de la IP real, así que la
  URL derivada (`http://localhost:3000`) vuelve a apuntar al propio
  dispositivo. Arreglado extendiendo el mismo túnel al puerto del backend:
  `adb reverse tcp:3000 tcp:3000` — dura solo mientras el cable siga
  conectado en esa sesión, hay que repetirlo si se desconecta y se vuelve a
  conectar el móvil. Sin cambios de código: la lógica de `resolveApiUrl()`
  ya calculaba correctamente `localhost:3000` en este escenario, solo
  faltaba que ese puerto también estuviera reenviado.

### Segunda verificación en dispositivo Android real — MapLibre, expo-blur y Turnstile
Con el *development build* ya generado (ver sección anterior) y
`react-native-webview` recién enlazado (`npx expo prebuild --platform
android` regenera `android/`, carpeta en `.gitignore`, sin tocar la config
de Gradle en `GRADLE_USER_HOME` que sí persiste entre regeneraciones — ver
más arriba), se verificó el flujo nativo completo controlando el
dispositivo por `adb` (capturas de pantalla + `input tap`/`input text`, sin
tocar el móvil a mano) en vez de solo revisar el código. Con el cable ya
conectado, hace falta repetir `adb reverse tcp:3000 tcp:3000` (el túnel de
Metro en 8081 lo monta `expo run:android` solo, el del backend no) — mismo
gotcha ya documentado arriba, solo que esta vez el guion se olvidó y el
símbolo fue simplemente "no carga nada de red", fácil de diagnosticar con
`adb reverse --list`.

Resultado, todo correcto a la primera:
- **`expo-blur` (`GlassCard` de `(welcome)`)** — el blur de sistema se ve
  de verdad, con el tinte blanco encima y los bordes redondeados bien
  recortados (`overflow: hidden` necesario en Android, ya estaba puesto).
- **MapLibre** — tiles reales de OSM, los 5 marcadores de Cáceres con su
  pin morado (`MIXTO`) correcto, `<UserLocation />` mostrando la posición
  real del dispositivo (el punto azul), y el recentrado imperativo
  (`cameraRef.current?.easeTo`) funcionando al llegar la posición GPS tras
  el fallback de Madrid.
- **Selección de ubicación tocando el mapa** — coordenadas correctas
  (`39.45221, -6.37601`, dentro de Cáceres, nada de "punto en mitad del
  océano" como el bug antiguo de `react-native-maps`), tocar otro punto
  reposiciona el pin en vez de acumular.
- **La pregunta abierta sobre `onMarkerPress`** (¿un marcador ya existente
  absorbe el toque durante el modo de selección, o lo deja pasar como
  `onMapPress`?) — se resolvió tocando directamente encima de un marcador
  real durante ese modo: el toque **sí pasa** como `onMapPress` (aparece el
  pin de selección apilado sobre el marcador real, banner cambia a
  "Ubicación marcada..."). El `<Marker>` de MapLibre no lo absorbe cuando
  su `onPress` es `undefined` — comportamiento distinto (más simple) de lo
  que `react-native-maps` podría haber hecho, ya no es una incógnita.
- **`turnstile-widget.native.tsx` (WebView)** — el script de Cloudflare
  carga dentro del `WebView` y resuelve solo (clave de prueba), el puente
  `postMessage` entrega el token, y un registro real de principio a fin
  (formulario + Turnstile + `POST /auth/register` a través del túnel `adb
  reverse`) completó y dejó al usuario logueado en el Home.

Un hallazgo nuevo, no un fallo de esta prueba: apareció una barra de
pestañas "Home"/"Explore" al pie del Home autenticado, con pinta de
plantilla de Expo sin tocar — arreglada en el momento, ver siguiente
sección. Único hueco que sigue quedando: iOS, sin Mac ni dispositivo
disponible en este entorno — sin verificar.

### Corrección de BottomNavBar tras la primera verificación en dispositivo real
La primera implementación de `BottomNavBar` (ver Estado del proyecto →
Mapa y marcadores) se escribió sin dispositivo conectado y pasaba `tsc`,
pero el usuario la vio muy distinta del mockup al probarla de verdad — dos
bugs reales, ninguno visible por lectura de código:

1. **Colores en negro en vez de blanco.** `BottomNavBar` y el avatar
   usaban `theme.background`/`theme.text` (vía `useTheme()`), y el
   dispositivo de prueba tenía el tema del sistema en oscuro — pintaba la
   píldora y el avatar en negro sólido, muy lejos del blanco fijo del
   mockup. El bug no es "olvidarse del modo oscuro": es que esta barra
   **no debería seguir el tema del sistema en absoluto** — es una
   superficie de diseño cerrado con colores exactos ya aprobados, mismo
   caso que `GlassCard`/`AuthSplitLayout`/Perfil/Mis marcadores (que sí
   usan `ThemeOverrideContext` para fijarse a claro). Aquí, al ser colores
   literales del mockup (`#ffffff`/`#000000`/`#F7B500`/`#241C00`) y no la
   paleta clara normal de la app, se hardcodearon directamente en
   `bottom-nav-bar.tsx` y en el estilo del avatar en
   `nearby-markers-map.tsx`, sin pasar por `useTheme()` ni por
   `ThemeOverrideContext`.
2. **Iconos en emoji a todo color.** 🔖👤🔍⚙️ se veían con los colores
   propios de Noto Color Emoji de Android (rojo/azul/gris vivos), no como
   los iconos de línea negra del mockup — un texto/emoji "monocromo" en
   otras partes de la app (p. ej. "🔍 Buscar" del botón de búsqueda en web)
   nunca había sido un problema porque nunca competía con un diseño de
   línea fina ya cerrado con colores exactos. Solución: iconos propios en
   `src/components/nav-icons.tsx`, construidos con `View`s planas (mismo
   criterio que el pin de marcador o el hamburger/FAB de antes: sin
   `react-native-svg`, ver Notas técnicas → icono mostrar/ocultar
   contraseña) — `BookmarkIcon` recorta la cinta con el truco CSS clásico
   del triángulo (borde transparente a los lados + borde inferior
   coloreado, ver el archivo); `SearchIcon` calcula el punto medio del
   mango sobre la diagonal a 45° desde el centro del aro y fija `top`/`left`
   en base a ese centro (restando la mitad de cada dimensión) — al rotar
   sin trasladar, RN gira alrededor del centro real del elemento por
   defecto, así que el mango queda anclado solo. (Un primer intento
   encadenaba `rotate`+`translateY` para lograr lo mismo — funcionaba en
   teoría pero salió "mal formado" en la verificación siguiente, ver más
   abajo; la versión final es más simple de razonar y no depende de en qué
   orden aplica RN cada transform.)

Ambos bugs se detectaron y corrigieron en la misma sesión, con el
dispositivo ya conectado: capturas de pantalla (`adb exec-out screencap`)
recortadas y ampliadas con PowerShell (`System.Drawing.Bitmap`, sin
librerías de imagen en Node disponibles) para inspeccionar los iconos de
cerca antes/después de cada cambio. Verificado de punta a punta tras la
corrección: barra blanca, iconos negros, círculo amarillo de "+" (incluido
"Mis marcadores"/Perfil deshabilitados sin sesión, el botón "+" abriendo
selección de ubicación, y el avatar navegando a Perfil).

**Automatizar taps con `adb shell input tap` a partir de coordenadas leídas
de un screenshot es poco fiable para inputs de texto** — los campos
Email/Contraseña de este formulario aparentaban estar en una posición (a
ojo desde la captura) pero los taps repetidamente enfocaban el campo
equivocado o no enfocaban nada. La causa real nunca se confirmó (posibles
diferencias de escala entre el espacio de captura y el de toque, o
simplemente error de estimación visual), pero el diagnóstico fiable fue
`adb shell uiautomator dump` — vuelca el árbol de vistas con los `bounds`
reales de cada `EditText`/`Button` en coordenadas de toque exactas. Regla
general para cualquier automatización futura de formularios vía `adb`: no
estimar coordenadas de un `screencap`, usar `uiautomator dump` y leer
`bounds` del nodo real (y su atributo `focused`/`text` para confirmar el
resultado antes de seguir encadenando acciones a ciegas).

### Segunda ronda de correcciones sobre BottomNavBar (icono de lupa + botón "+" siempre visible)
Tras la corrección de colores/emoji de más arriba, el propio usuario probó
la app de nuevo (con el dispositivo ya conectado) y reportó tres cosas más:

1. **"No se pudo conectar con el servidor" al ejecutar `expo run:android`.**
   No era un bug de la app — al terminar la verificación anterior se mató
   el backend y se hizo `adb reverse --remove tcp:3000` como "limpieza",
   sin caer en que ese túnel y ese proceso son el entorno de desarrollo real
   del usuario en el móvil, no un artefacto desechable de la propia
   comprobación (mismo gotcha ya documentado arriba: el túnel de 3000 no lo
   monta `expo run:android` solo —a diferencia del de 8081— y no sobrevive
   a un reinicio de cable ni a una limpieza). Arreglado repitiendo
   `adb reverse tcp:3000 tcp:3000` con el backend ya corriendo. Lección: no
   volver a matar el backend ni a quitar el `adb reverse` como parte de la
   limpieza de una verificación — solo limpiar lo que uno mismo creó sin
   propósito posterior (cuentas de prueba, capturas, sesiones de browser),
   dejando correr el entorno de desarrollo real del usuario.
2. **El icono de la lupa (Buscar) seguía "mal formado"** pese a la primera
   corrección — el truco `rotate`+`translateY` encadenado del mango
   resultaba frágil. Reescrito calculando directamente el centro del mango
   sobre la diagonal a 45° y fijando `top`/`left` a partir de ese centro
   (ver más arriba, y el propio `nav-icons.tsx`) — un solo `transform:
   rotate` sin acumular nada más.
3. **El botón "+" (Añadir marcador) debe verse siempre, incluso sin
   sesión** — antes `BottomNavBar` lo ocultaba del todo si no se pasaba
   `onLocationPicked` (caso de `/map`, pública). Pedido explícitamente:
   mostrarlo siempre como affordance de la función, pero en gris
   (`#E4E4E7` fondo / `#9A9AA2` icono, mismo tono que `theme.border`) hasta
   que se pueda usar de verdad — lo que además del login exige el email
   verificado (mismo requisito que ya aplicaba el backend en
   `POST /markers`, antes solo visible al fallar el envío). `BottomNavBar`
   pasó de `onAdd?: () => void` (opcional, ocultaba el botón) a
   `onAdd: () => void` + `canAdd: boolean` (siempre visible, el booleano
   decide el color); `nearby-markers-map.tsx` calcula
   `canAdd = isAuthenticated && sessionUser?.emailVerified === true`.

Verificado de nuevo en el dispositivo tras los tres cambios, los cuatro
estados de "+": backend alcanzable sin el aviso de conexión, lupa con
forma correcta, gris en `/map` sin sesión, gris con una cuenta logueada
pero sin verificar, y amarillo con una cuenta logueada y verificada (tres
cuentas de prueba creadas vía API con el token dummy de Turnstile
`XXXX.DUMMY.TOKEN.XXXX` — ver Antibots —, la última marcada
`emailVerified: true` a mano con `npx prisma db execute` solo para esta
comprobación; las tres eliminadas después con `DELETE /users/me`).

### Tercera ronda de correcciones (toolbar que se desplazaba, lupa aún rota, controles superiores)
El usuario probó de nuevo y reportó cinco cosas más, todas en la misma
sesión con el dispositivo ya conectado:

1. **La barra inferior se desplazaba hacia arriba al iniciar sesión** —
   `bottomInset` (pensado para reservar hueco sobre la antigua barra de
   pestañas nativa) valía `BottomTabInset + Spacing.three` en la Home
   autenticada pero `0` en `/map`, y `BottomNavBar` sumaba ese valor a su
   `bottom`. Con la barra de pestañas ya invisible del todo
   (`TabList` con `display:'none'`, ver "Barra de pestañas..." más abajo),
   ese hueco reservado no tenía ya ningún propósito real — vestigio de antes
   del rediseño. Solución: se eliminó `bottomInset` por completo (prop,
   interfaz, las dos pantallas que lo usaban) en vez de parchear solo
   `BottomNavBar` — `pickerActions`, `reopenButton` y el `paddingBottom`
   de los bottom sheets pasaron todos a usar `Spacing.four` fijo. Ver
   `nearby-markers-map.tsx` y `(tabs)/index.tsx`.
2. **La lupa seguía sin parecer una lupa** pese a la corrección anterior —
   inspeccionando una captura ampliada con PowerShell se vio la causa real:
   el aro y el mango, aunque geométricamente "debían" tocarse en el papel,
   dejaban un hueco visible de un par de píxeles (redondeo de subpíxel al
   tamaño de icono real). Solución en `SearchIcon`
   (`src/components/nav-icons.tsx`): el mango se solapa deliberadamente
   por dentro del aro (`overlap`, unos px de margen de sobra) en vez de
   anclarse justo en el borde matemático — así el hueco desaparece pase lo
   que pase con ese redondeo. También se engrosaron ligeramente aro y
   mango (`strokeWidth`/`handleWidth` de 2 a 2.5) para más legibilidad a
   este tamaño.
3. **El botón "Atrás" (arriba a la izquierda) en `/map` sin sesión** se
   eliminó por completo, a petición explícita — `showBackButton` (prop,
   interfaz, JSX, estilo) se quitó entero de `nearby-markers-map.tsx` y de
   su único consumidor (`src/app/map.tsx`); no queda ningún otro sitio
   desde el que volver que tuviera sentido (ver Estado del proyecto →
   Mapa y marcadores).
4. **El avatar arriba a la derecha desaparece por completo con sesión**
   (Perfil ya está en `BottomNavBar`, duplicarlo no aportaba nada — pedido
   explícito) **y se sustituye por un botón de texto "Inicio de sesión"
   sin sesión** (mismo hueco, mismos colores fijos blanco/negro que el
   resto de controles nativos cerrados) — antes había un único avatar con
   icono de persona que navegaba a Perfil o a `/login` según hubiera
   sesión. `PersonIcon` dejó de usarse en `nearby-markers-map.tsx` (sigue
   viva en `BottomNavBar`).
5. **El texto del popup "Marcadores cercanos"/"Resultados de tu búsqueda"
   era demasiado grande** (`type="subtitle"`, 32px — pensado para títulos
   de pantalla, no para la cabecera de un bottom sheet) **y el enlace
   "Cerrar" de al lado quedaba cortado** cuando el título era largo — sin
   `flex`/`numberOfLines` en el título, este ocupaba todo el ancho que
   quisiera y empujaba "Cerrar" fuera del área visible de la hoja.
   Solución: nuevo estilo `sheetTitle` (`flex:1`, `fontSize:20`,
   `lineHeight:26`, `marginRight`) + `numberOfLines={1}` en el título,
   aplicado tanto al sheet de marcadores como al de "Ajustes" — el título
   ahora se encoge/trunca antes de invadir el espacio de "Cerrar", en vez
   de depender de que quepan los dos a su tamaño natural.

**Hallazgo aparte, no un bug:** a mitad de esta verificación, el
dispositivo mostraba una sesión ya iniciada que no era ninguna de las
cuentas de prueba (`devicecheck*@example.com`) — resultó ser la cuenta real
del propio usuario ("ManuTest", `juegospascualsl@gmail.com`), logueada en
el dispositivo por su cuenta entre una verificación y la siguiente. Se
comprobó con cuidado (perfil real, nunca asumido) antes de seguir — jamás
tocar/eliminar esa cuenta como si fuera una de prueba. Para probar el flujo
de invitado hizo falta cerrar esa sesión real desde el propio dispositivo
(el usuario tuvo que volver a iniciarla él mismo después, no hay forma de
que Claude la recupere sin su contraseña).

### Cuarta corrección de `SearchIcon` — de trazo fino a aro relleno
Tras la tercera ronda (solape deliberado sobre un aro de `borderWidth`), el
usuario volvió a decir que no se parecía a una lupa y pasó una referencia
visual: un icono "solid" clásico (aro macizo + mango corto y grueso, estilo
Font Awesome/Material). El enfoque de trazo fino era frágil de raíz: un
`borderWidth` solo pinta una banda estrecha, así que por buena que fuera la
geometría del solape, bastaba con que el mango no cayera justo dentro de
esa banda fina para que se viera un hueco o un blob en la unión — ya había
pasado dos veces (la del hueco por redondeo de subpíxel, y una versión con
más solape que aun así dejaba un empalme irregular).

Solución estructural, no otro ajuste de números: `SearchIcon` reconstruido
como un **aro relleno** — un círculo macizo del color del icono (no un
trazo) con un segundo círculo más pequeño del color de fondo superpuesto
encima para recortar el hueco central (dos círculos concéntricos, mismo
principio que el "recorte" en blanco de `BookmarkIcon`). El mango se
dibuja **debajo** de ambos discos y se solapa generosamente hacia el
centro; como el disco exterior es sólido (no una banda fina), cualquier
solape del mango por debajo queda completamente tapado sin depender de
acertar en un borde exacto — el hueco/blob deja de ser posible por
construcción, no solo "menos probable". `background` pasó a ser un
parámetro de `SearchIcon` (por defecto `'#ffffff'`, el color de las
superficies donde vive hoy) en vez de un blanco fijo como en
`BookmarkIcon`, para poder recortar el círculo interior contra el fondo
real.

Esta corrección arregló de verdad el hueco/blob de las rondas anteriores,
pero el usuario **todavía** dijo que no se parecía a una lupa — las
proporciones (aro pequeño, mango corto, ángulo a 45°) simplemente no eran
las que tenía en mente, ni con una cuarta ronda de ajustes por mi parte
parecía que fuera a acertarlas por descripción/captura. En vez de seguir
iterando a ciegas, le indiqué el archivo y qué constante controla qué
(`outerSize`, `thickness`, `handleLength`, el ángulo del `rotate`...) para
que lo ajustara él mismo viéndolo en vivo en el dispositivo (Fast Refresh,
sin rebuild). **El usuario lo terminó de afinar por su cuenta** —
`outerSize` de `size * 0.62` a `size * 0.82` (aro más grande), `handleLength`
de `size * 0.4` a `size * 0.8` (mango mucho más largo) y el `rotate` del
mango de `'45deg'` a `'125deg'` (otro ángulo) — y lo dio por bueno. Lección
general: tras varias rondas sin acertar un detalle puramente visual/de
gusto (no un bug funcional), señalar dónde y qué tocar suele resolver más
rápido que seguir iterando a ciegas por descripción — sobre todo cuando
"correcto" depende del ojo del usuario, no de una especificación exacta.

### Barra de pestañas de la plantilla visible en nativo (`app-tabs.tsx`)
Al probar el Home autenticado en el dispositivo Android real apareció una
barra "Home"/"Explore" al pie de la pantalla, con iconos de ejemplo — nunca
diseñada para pipiApp (la navegación real es el sidebar ☰). Causa:
`app-tabs.tsx` usaba `NativeTabs` de `expo-router/unstable-native-tabs` —
la barra de pestañas nativa real de la plantilla de `create-expo-app`,
sin tocar.

Arreglado con `Tabs`/`TabSlot`/`TabList` de `expo-router/ui` (a diferencia
de `NativeTabs`, esta API es JS pura, no dibuja ningún tab bar nativo
propio) con `<TabList style={{ display: 'none' }}>` — los `<TabTrigger>`
siguen registrando las rutas (`Tabs`/`TabSlot` los necesitan, si no la app
no arranca), pero no dibujan nada visible. Verificado en el propio
dispositivo tras el cambio: el Home ya no muestra ninguna barra al pie.

### El punto de ubicación aparecía muy alejado de la posición real
`useNearbyMarkers` llamaba a `Location.getCurrentPositionAsync({})` sin
`accuracy`. La implementación web de expo-location decide
`enableHighAccuracy` así: `(options.accuracy ?? 0) > LocationAccuracy.Balanced`
— con `options` vacío, eso siempre da `false`: **sin accuracy explícito,
siempre se pedía precisión baja**, nunca alta. En un portátil sin chip GPS
eso resuelve la posición por triangulación WiFi/IP, con desvíos de varios
kilómetros. Arreglado pasando `accuracy: Location.Accuracy.High`
explícitamente — no garantiza precisión perfecta (sigue dependiendo del
hardware real), pero pide la mejor fuente disponible en vez de conformarse
con la más barata.

### `ThemeOverrideContext` — forzar un theme fijo para un subárbol
Varias superficies (`GlassCard`, `AuthSplitLayout`, Perfil, Mis marcadores)
son diseños de foto/panel claro fijos, sin variante oscura propia. Sin
override, con el sistema en modo oscuro `useTheme()` normal devuelve
`Colors.dark` sobre una superficie que sigue siendo clara — texto blanco
sobre fondo casi blanco, inputs en negro sólido. `ThemeOverrideContext`
(`src/hooks/use-theme.ts`) sustituye el esquema de color dentro de
`useTheme()` cuando está presente; esas superficies envuelven su contenido
en `<ThemeOverrideContext.Provider value="light">`.

**Gotcha real:** el `Provider` solo afecta a `useContext()` de componentes
**descendientes**, nunca al propio componente que lo crea. Si una pantalla
llama a `const theme = useTheme()` en su propio cuerpo de función (para
estilos inline) y renderiza el `Provider` como parte de su `return`, esa
variable `theme` sigue viendo el theme del sistema — solo un `ThemedText`
anidado en el JSX (verdadero descendiente) lo ve bien. Solución: partir la
pantalla en un componente exterior que solo renderiza el `Provider` y un
componente interior (hijo de ese `Provider`) donde vive el `useTheme()`
real junto con el resto de la lógica. Regla general: cualquier `useTheme()`
para un estilo inline bajo un `ThemeOverrideContext.Provider` propio tiene
que vivir en un componente **hijo** de ese `Provider`, nunca en el mismo
componente que lo crea.

### Rediseño de login/registro a dos columnas (`AuthSplitLayout`)
Punto de corte responsive: por debajo de 900px (`WIDE_BREAKPOINT` en
`useWindowDimensions().width`) la foto desaparece del todo en vez de
comprimirse — la referencia visual era un diseño de escritorio y comprimir
la foto habría dejado el formulario demasiado apretado. Nunca verificado
en simulador/dispositivo nativo real.

### React Native: un string vacío no es lo mismo que `null` para `&&`
`{marker.description && <ThemedText>...}</ThemedText>}` renderiza mal si
`description` es `""` (no `null`) — React Native, a diferencia del DOM web,
trata un string vacío como nodo de texto real, inválido fuera de un
`<Text>`. Regla general: nunca `condición && <Componente>` cuando
`condición` puede ser un string (aunque sea opcional/nullable) — usar
siempre un ternario con `null` explícito en el otro lado.

### Almacenamiento de la imagen de un marcador
El proyecto no tiene bucket de object storage configurado — añadir uno
habría sido desproporcionado para la petición original. La imagen se guarda
como data URL base64 en `imageUrl` (`TEXT`). Efectos secundarios aceptados:
`bodyLimit` de Fastify subido a 4MB (`server/src/index.ts`) para dar margen
sobre `MAX_IMAGE_LENGTH` (~2.6M caracteres, validado también con prefijo
`data:image/` obligatorio); `GET /markers` trae la imagen de todos los
marcadores de golpe, sin paginar (ver Pendiente / deuda técnica).

### El bloque de (welcome) tenía que declararse primero en el `<Stack>`
Con `(tabs)`/`(auth)`/`(welcome)` en ese orden, recargar la app con sesión
activa (token guardado, `hasEntered` aún `false`) aterrizaba siempre en
`/login` en vez de `(welcome)`, aunque el guard de `(auth)` ya evaluara
`false` en ese momento. Causa: react-navigation resuelve una ruta inicial
de respaldo en el primer render del `<Stack>`, calculada a partir del
**primer** `Stack.Screen` entre los bloques incluidos en ese instante — no
la recalcula después solo porque los guards cambien de valor (los guards
deciden qué pantallas *existen*, no fuerzan un nuevo cálculo de cuál debería
estar enfocada). Arreglado declarando `(welcome)` primero. Regla general:
el bloque que deba ganar cualquier ambigüedad de "ruta de respaldo" en el
primer render tiene que declararse **antes** que el resto, aunque los
guards ya sean mutuamente excluyentes sobre el papel.

### `router.replace('/')` no navegaba a ningún sitio desde `verify-email`
Al pulsar "Continuar" en `src/app/verify-email.tsx` tras verificar el email
(pantalla cargada en frío desde el enlace del correo, nunca navegada desde
dentro de la app), `router.replace('/')` no hacía nada — sin error en
consola, la URL simplemente no cambiaba.

Causa, ligada al mismo mecanismo que la nota anterior sobre "(welcome)
declarado primero": la ruta "/" no apunta a una pantalla fija, se resuelve
según qué `Stack.Protected` (`(welcome)`/`(auth)`/`(tabs)`) esté activo en
ese momento — algo que react-navigation solo termina de resolver bien
partiendo de una navegación normal dentro del árbol. Con `verify-email`
cargada como URL de entrada directa (fuera de todos los grupos, como
`map`/`marker/[id]`), pedirle a `router.replace` que resuelva "/" desde ahí
quedaba en un estado ambiguo que no navegaba a ningún sitio. El resto de la
app nunca tiene este problema porque nunca navega así tras una acción —
login/registro no llaman a `router.replace` en absoluto, dejan que el
propio guard reaccione solo al cambiar `user`/`hasEntered` (ver Estado del
proyecto) — pero aquí no hay sesión con la que reaccionar, el enlace se
abre en un navegador/dispositivo aparte.

Arreglado apuntando a `/map` en vez de `/` — ruta siempre accesible sin
guard (como `marker/[id]`), sin la ambigüedad de "/". Regla general: un
botón "continuar" en una pantalla sin guard, alcanzable por URL directa
sin haber navegado antes dentro de la app, debe apuntar a otra ruta
también sin guard — nunca a "/" ni a una ruta cuya resolución dependa de
qué `Stack.Protected` esté activo.

### El `.env` con `CLAVE= "valor"` (espacio + comillas) rompe `dotenv`
Los correos de verificación no llegaban aunque el registro devolvía 201 y
no había ningún error visible en la app — la API de Brevo los rechazaba en
silencio (el `try/catch` alrededor de `sendVerificationEmail` en
`POST /auth/register` solo deja constancia en el log del servidor, nunca
tumba el registro, ver Estado del proyecto). Causa: `BREVO_API_KEY` y
`BREVO_SENDER_EMAIL` en `server/.env` se habían escrito como
`CLAVE= "valor"` (espacio antes de las comillas) en vez de `CLAVE="valor"`
o `CLAVE=valor` — `dotenv` no reconoce esa forma como un valor entrecomillado
válido, así que el valor final incluía las comillas literales (`"algo@x.com"`
en vez de `algo@x.com`), un formato de email/API-key que Brevo rechaza.
Nada que ver con el aviso de DKIM/DMARC del panel de Brevo (ese es real,
pero solo afecta a la entregabilidad — spam sí/no —, no bloquea el envío en
sí). Arreglado quitando el espacio y las comillas de ambas líneas. Regla
general para cualquier variable en `.env` de este proyecto: o bien
`CLAVE=valor` sin comillas, o bien `CLAVE="valor"` pegado sin espacio —
nunca `CLAVE= "valor"`.

### El email de verificación usa un deep link nativo, no una URL web
`server/src/lib/email.ts` envía `pipiapp://verify-email?token=...` (custom
scheme `pipiapp` ya declarado en `app.json` — Expo Router registra el deep
linking de todas las rutas automáticamente a partir de ahí, sin config de
`linking` aparte), no una URL de navegador. **Sin verificar todavía con
testers reales** — algunos clientes de correo bloquean o reescriben
esquemas de URL personalizados por seguridad; si algún tester reporta que
el enlace del email no abre la app, ese es el primer sitio donde mirar
(ver Pendiente / deuda técnica).

### OpenRouteService — Matrix vs Directions, y el `paint`/`layout` de `<Layer>` en MapLibre RN
Implementando "rutas propias / distancia real" (ver Estado del proyecto →
Backend/API y Mapa y marcadores, 2026-08-29), tres decisiones/gotchas no
obvios:

- **Matrix (para `/nearby`) y Directions (para `/:id/route`) son dos
  llamadas a APIs de ORS distintas**, no una reutilizada para lo otro:
  Matrix da solo distancia/tiempo (barato, un origen contra N destinos de
  golpe, sin geometría) — sirve para reordenar una lista. Directions da la
  geometría completa de la ruta entre dos puntos (más caro por punto) —
  hace falta para dibujarla, pero no escala a "N candidatos a la vez" como
  Matrix. `server/src/lib/ors.ts` expone las dos funciones por separado
  (`getWalkingDistances`/`getWalkingRoute`), cada una con su propio
  fallback (`null`) — no se intentó forzar una sola función genérica.
- **`GET /markers/nearby` pide un buffer de candidatos (`limit + 30`)
  antes de llamar a Matrix**, en vez de pedir exactamente `limit` filas
  por línea recta y reordenarlas: el orden por distancia real a pie no es
  necesariamente un prefijo del orden por línea recta (una calle puede dar
  un rodeo), así que sin buffer un marcador algo más lejos en línea recta
  pero con una ruta a pie más corta se quedaría fuera antes de tener
  ocasión de compararse. Confirmado en la prueba real contra los
  marcadores de Cáceres: el top-3 por distancia real no coincidía con el
  top-3 por línea recta.
- **El `<Layer>` de `@maplibre/maplibre-react-native` tiene DOS APIs de
  estilo distintas y no hay que mezclarlas**: la deprecada (`style` prop)
  usa un objeto camelCase propio de esta librería (`LineLayerStyle` →
  `lineColor`, `lineWidth`...), pero esa prop está tipada `never` a la vez
  que `paint`/`layout` — son mutuamente excluyentes a nivel de tipos. La
  API vigente (`paint`/`layout`) usa las claves **dash-case del MapLibre
  Style Spec real** (`'line-color'`, `'line-width'`, `'line-cap'`...), no
  camelCase — un primer intento con `paint={{ lineColor: ... }}` fallaba
  en `tsc` porque TypeScript no lograba estrechar la unión de tipos de
  `LayerProps` a partir de `type="line"` con esas claves. Ver el dibujo de
  la ruta activa en `lib/maps/map-view.tsx` (`<GeoJSONSource>` con una
  `Feature` GeoJSON `LineString` + dos `<Layer type="line">` apiladas —
  halo blanco ancho debajo, línea de color estrecha encima).

### Costura visible en HeartIcon — dos formas independientes no encajan por coincidencia
El primer `HeartIcon` (favoritos, 2026-08-30) usaba el truco CSS más clásico
de corazón: dos círculos + un cuadrado rotado 45°. El usuario lo vio
"desfigurado" en el dispositivo — capturas ampliadas con PowerShell (mismo
método que las rondas de `SearchIcon`, ver más abajo) mostraron una muesca
visible a cada lado, justo donde el arco de cada círculo debía continuar en
la arista recta del cuadrado. Causa: `circleSize` (`size * 0.5`) y
`squareSize` (`size * 0.62`) no tenían ninguna relación matemática entre
sí — eran dos formas independientes con proporciones sueltas que solo
"parecían" encajar a ojo, sin garantía geométrica de continuidad en el
punto de unión.

Arreglado reconstruyendo el icono con **una sola pieza continua por
mitad** (forma de "lápida": semicírculo arriba con `borderTopLeftRadius`/
`borderTopRightRadius` = mitad del ancho, recta abajo), rotada ±45°
alrededor de un punto de pivote común — al ser una única forma por mitad,
no hay dos bordes independientes que puedan desalinearse; la costura deja
de ser posible por construcción, no solo "menos probable" (mismo tipo de
solución estructural, no un ajuste de números, que la cuarta corrección de
`SearchIcon` más abajo). Como RN rota siempre alrededor del centro del
propio elemento (sin `transformOrigin`, para no depender de si esta
versión de RN lo soporta bien — mismo criterio ya usado en `SearchIcon`),
cada pieza se reposiciona con un `rotatePoint()` a mano (nuevo helper de
trigonometría en `nav-icons.tsx`) para que su centro caiga justo donde
hace falta y, tras la rotación, su esquina inferior aterrice exactamente
en el pivote — ahí es donde se juntan las dos mitades, formando la punta
del corazón. Verificado con capturas ampliadas antes/después en el
dispositivo real, en gris (sin marcar) y en rojo (marcado).

**Regla general para futuros iconos compuestos en `nav-icons.tsx`**: si un
icono se construye combinando dos o más formas independientes (círculos,
cuadrados rotados...), verificar que exista una relación matemática
explícita entre sus tamaños/posiciones que garantice que los bordes
coincidan — no ajustar cada tamaño "a ojo" por separado. Cuando sea
posible, preferir una única pieza continua por región del icono (como aquí,
o como el aro relleno de `SearchIcon`) en vez de piezas independientes que
dependan de encajar por coincidencia.
