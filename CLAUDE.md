# Proyecto: [Nombre de la app] — Web + Móvil

## Qué es
App usable desde navegador web y desde smartphone (iOS/Android), con lógica de
negocio compartida entre ambas plataformas. Funcionalidades principales:
- Gestión de usuarios (registro, login, perfil)
- Marcadores en un mapa (crear, ver, filtrar por ubicación)
- Comentarios y puntuaciones sobre esos marcadores

## Stack
- **Frontend (compartido web+móvil):** Expo + Expo Router, con `react-native-web`
  activado para que el mismo código compile a iOS, Android y web.
- **Backend:** Node.js + Fastify + Prisma ORM
- **Base de datos:** PostgreSQL + extensión PostGIS (para consultas geoespaciales
  de los marcadores: proximidad, radios, clustering)
- **Auth:** JWT propio (pendiente de decidir si se usa Auth.js/Clerk)
- **Mapas:** abstracción propia en `lib/maps` — `react-native-maps` en nativo,
  `react-map-gl` (o Leaflet) en web, misma interfaz expuesta a los componentes.

## Estructura del repo
```
/app          → pantallas Expo Router (compartidas web+móvil)
/components   → UI compartida
/lib/api      → cliente API compartido (fetch/axios + tipos)
/lib/maps     → wrapper que abstrae la librería de mapas (nativo vs web)
/server       → backend (Fastify + Prisma)
/prisma       → schema de base de datos
```

## Convenciones de código
- TypeScript estricto en todo el repo (frontend y backend).
- Nombres de archivo: kebab-case. Componentes: PascalCase.
- Un módulo de dominio = una carpeta con su propio `types.ts`, no todo en un
  archivo gigante.
- Nunca importar `react-native-maps` directamente en un componente — siempre
  pasar por `lib/maps`.

## Comandos habituales
```
npm run dev          # arranca Expo (menú: presiona 'w' para abrir en web)
npm run dev:server    # arranca el backend Fastify
npx prisma studio     # explorador visual de la base de datos
npx prisma migrate dev --name <nombre>   # nueva migración
```

## Instrucciones de compactación (/compact)
Al compactar contexto, conservar siempre:
- Cambios de código recientes y su motivo
- Estado de las migraciones de Prisma
- Resultados de tests
Descartar: exploración de archivos ya entendida, discusiones de diseño ya
zanjadas.

## Estado del proyecto
Fase inicial — aún sin código. Prioridad: levantar el esqueleto (auth básica +
CRUD de marcadores) antes de comentarios/puntuaciones.
