# Punto de partida — App Web + Móvil

## 1. Arrancar el proyecto Expo

```bash
npx create-expo-app@latest . --template
npx expo install react-native-web react-dom
```

Copia dentro las carpetas `app/`, `components/`, `lib/` de este paquete
(sustituyen a las que genera el template).

## 2. Backend

```bash
mkdir -p server && cd server
npm init -y
npm install fastify @fastify/cors prisma @prisma/client
npx prisma init
```

Sustituye `prisma/schema.prisma` generado por el de este paquete (ya incluye
User, Marker, Comment y el índice geoespacial).

Configura `DATABASE_URL` en `server/.env`:
```
DATABASE_URL="postgresql://usuario:password@localhost:5432/tu_db"
```

## 3. Instalar Graphify (recomendado, opcional)

Da a Claude Code un mapa consultable del proyecto en vez de tener que releer
archivos cada vez — útil sobre todo cuando el código crezca y haya más
relaciones cruzadas entre `lib/`, `app/` y `server/`.

```bash
uv tool install graphifyy
graphify install
```

Dentro de Claude Code, una vez tengas algo de código:
```
/graphify .
```

Esto genera `graphify-out/` (ya excluido en `.claudeignore` y
`.graphifyignore` de este paquete). Con poco código aún no aporta mucho —
tiene más sentido ejecutarlo cuando ya haya varios módulos conectados.

## 4. Archivos incluidos en este paquete

```
CLAUDE.md              → contexto persistente del proyecto para Claude Code
.claudeignore           → archivos que Claude Code no debe leer
.graphifyignore         → archivos que Graphify no debe indexar
prisma/schema.prisma    → modelos iniciales: User, Marker, Comment
lib/maps/               → wrapper de mapas (nativo vs web)
lib/api/client.ts       → cliente API compartido
```

## 5. Próximos pasos sugeridos
1. Levantar auth básica (registro/login + JWT)
2. CRUD de marcadores + integración con PostGIS
3. Implementar `lib/maps/index.native.ts` y `lib/maps/index.web.ts`
4. Comentarios y puntuaciones sobre marcadores
