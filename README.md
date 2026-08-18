# Padel WP

Aplicación de reservas de pistas y organización de partidas de pádel para Venezuela (estilo Playtomic). Monorepo con backend, web y app móvil, con paleta de marca azul / verde / blanco (blanco predominante).

Ver la especificación completa del producto en `docs/especificacion.md`.

## Estructura

```
packages/
  shared/   Tipos TypeScript, cliente HTTP y cálculo de nivel de jugador, compartidos entre web y móvil
  api/      Backend (Fastify + TypeScript). Base de datos SQLite embebida (node:sqlite)
  web/      Web (Next.js + Tailwind CSS)
  mobile/   App móvil (Expo / React Native)
```

## Requisitos

- Node.js 22+ (usa el módulo nativo `node:sqlite`)
- pnpm (`npm i -g pnpm`)

## Puesta en marcha

```bash
pnpm install

# 1) Backend — corre en http://localhost:4000
pnpm --filter @padel-ve/api db:seed   # crea datos de ejemplo (clubes, jugadores, partida, patrocinio)
pnpm dev:api

# 2) Web — corre en http://localhost:3000
pnpm dev:web

# 3) Móvil (en otra terminal)
cd packages/mobile
pnpm start   # abre Expo Dev Tools; escanea el QR con Expo Go o corre --ios / --android
```

Usuarios de prueba (contraseña `padel123` para todos):

- `admin@padelve.com` — administrador de plataforma (concilia pagos y activa patrocinios)
- `club@lasmercedespadel.com` — dueño de club
- `maria@example.com` / `jose@example.com` — jugadores

## Qué funciona hoy

- Registro con encuesta de nivel (brazo dominante, frecuencia de juego, años jugando, autoevaluación, si compite) que calcula automáticamente el nivel del jugador en una escala de **1.00 (mejor categoría) a 8.00 (principiante)**, con 2 decimales. La fórmula vive en `packages/shared/src/level.ts` y se reutiliza en el registro (backend) y en la vista previa en vivo del formulario (web y móvil).
- Login/registro con JWT.
- Catálogo de clubes y pistas, con posicionamiento según el plan de visibilidad del club (`NONE` < `BASIC` < `FEATURED` < `PREMIUM`).
- Calendario de disponibilidad por pista (franjas de 1 hora) y reserva.
- Al reservar, se crea automáticamente una partida abierta asociada; otros jugadores pueden unirse por equipo hasta completar 4.
- Filtro de partidas por ciudad y nivel.
- Pagos: como en Venezuela no hay pasarela automatizada ampliamente disponible, el flujo es de **reporte manual** (Pago Móvil, transferencia, Zelle, USDT) con referencia, y conciliación por un administrador (`role: PLATFORM_ADMIN`). Se usa tanto para reservas como para planes de club y patrocinios.
- Espacio de patrocinadores: marcas pueden solicitar un plan y pagar por presencia destacada; al activarse, el club asociado sube de plan de visibilidad.
- Panel básico de club: alta de club, alta de pistas, contratar plan destacado.

## Decisiones técnicas relevantes

- **Base de datos**: el diseño está pensado para PostgreSQL + Prisma en producción (ver `docs/especificacion.md`), pero en este entorno de desarrollo la descarga de binarios de Prisma estaba bloqueada por la política de red del sandbox. Para tener un backend 100% ejecutable aquí se usa el módulo nativo `node:sqlite` (incluido en Node 22+, cero dependencias externas). Toda la lógica de acceso a datos está aislada en `packages/api/src/repositories.ts` y `db.ts`, así que migrar a Postgres/Prisma es un cambio acotado a esos dos archivos.
- **Nivel de jugador**: escala invertida a propósito (1 = mejor, 8 = principiante), calculada con una fórmula ponderada (autoevaluación ×2 + puntos de frecuencia + puntos de experiencia + bono por competir), normalizada a 1.00–8.00 con 2 decimales.
- **Pagos en Venezuela**: sin pasarela automática en el MVP; el modelo de datos ya contempla moneda dual (VES/USD), método y referencia, listo para conectar una pasarela real más adelante sin cambiar el resto del sistema.

## Qué falta para producción

- Pasarela de pago real / conciliación automática.
- Subida real de comprobantes e imágenes (hoy solo se guarda una referencia de texto).
- Notificaciones push, rankings, torneos, reseñas.
- Autoservicio de patrocinadores (hoy la activación la hace un admin a mano).
- Tests automatizados, CI/CD y despliegue (Railway/Render/Fly.io para la API y la web; EAS Build para las tiendas móviles).
- Pulido de diseño UI/UX y accesibilidad.
