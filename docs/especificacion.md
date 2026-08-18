# Padel WP — Especificación del producto

Aplicación de gestión de partidas y reservas de pádel para Venezuela, inspirada en Playtomic. Conecta jugadores, clubes y patrocinadores en una sola plataforma web y móvil.

## 1. Usuarios de la plataforma

**Jugador**: se registra, define su nivel, busca pistas disponibles, reserva, crea o se une a partidas abiertas, ve su historial y estadísticas.

**Club**: administra sus pistas (canchas), horarios y precios, ve reservas entrantes, puede pagar un plan de suscripción para tener mayor visibilidad dentro de la app.

**Patrocinador**: marca o negocio que paga por presencia publicitaria dentro de la app (banners, espacio destacado, promociones para jugadores).

**Administrador de plataforma**: modera clubes, valida pagos manuales, gestiona patrocinios y resuelve incidencias.

## 2. Funcionalidades — Fase 1 (MVP)

- Registro / inicio de sesión de jugadores y clubes (email + contraseña, con espacio para añadir login social después).
- Perfil de jugador: nombre, nivel autoevaluado (1.0–7.0, escala similar a Playtomic), posición preferida (drive/revés), historial de partidas.
- Catálogo de clubes y pistas: ubicación, fotos, tipo de pista (cristal, muro, indoor/outdoor), precio por hora.
- Calendario de disponibilidad y reserva de pista por franja horaria.
- Partidas: un jugador crea una partida asociada a una reserva (abierta o privada), otros jugadores se apuntan hasta completar 4; filtro por nivel y zona.
- Pagos: en Venezuela los rieles habituales (Stripe, tarjetas internacionales) tienen adopción limitada. El MVP usa un flujo de **comprobante de pago manual** (Pago Móvil, transferencia bancaria nacional, Zelle, USDT/Binance Pay) que el jugador o club sube y un administrador concilia. La arquitectura deja el flujo de pago como una interfaz intercambiable para conectar más adelante una pasarela local (ej. integraciones bancarias venezolanas o un proveedor de pagos con presencia en LATAM).
- Panel básico de club: alta de pistas, precios, horarios bloqueados, listado de reservas.
- Espacio de patrocinadores: un club o marca contrata un "plan" (visibilidad destacada / banner) — gestión manual por el administrador en el MVP, con modelo de datos ya listo para autoservicio futuro.

## 3. Funcionalidades — Fases futuras

- Pasarela de pago automatizada (conciliación en tiempo real) y cobro de reservas online.
- Rankings y ligas por club/ciudad, torneos.
- Emparejamiento automático de partidas por nivel (matchmaking).
- Notificaciones push (recordatorios de partida, confirmación de reserva).
- Reseñas de pistas y clubes.
- App de administración de clubes más completa (reportes de ingresos, ocupación).
- Autoservicio de patrocinadores (checkout de campañas, métricas de impresiones/clics).
- Login social (Google/Apple) y verificación de identidad.

## 4. Modelo de datos (entidades principales)

- **User**: id, nombre, email, passwordHash, teléfono, rol (PLAYER, CLUB_ADMIN, SPONSOR, PLATFORM_ADMIN), nivel, fotoUrl, ciudad.
- **Club**: id, nombre, descripción, dirección, ciudad, ownerId (User), estado (pendiente/aprobado), plan de visibilidad.
- **Court** (pista): id, clubId, nombre, tipo, techada (bool), precioPorHora.
- **Availability/Booking**: id, courtId, fecha, horaInicio, horaFin, estado (disponible/reservada/bloqueada), userId (quién reservó).
- **Match** (partida): id, bookingId, creadorId, tipo (abierta/privada), nivelMin, nivelMax, estado (abierta/completa/jugada/cancelada).
- **MatchPlayer**: id, matchId, userId, equipo (1/2), estado (confirmado/pendiente).
- **Payment**: id, userId, monto, moneda (VES/USD), método (PAGO_MOVIL/TRANSFERENCIA/ZELLE/USDT), referencia, comprobanteUrl, estado (pendiente/verificado/rechazado), relacionadoA (bookingId o sponsorshipId).
- **Sponsorship**: id, sponsorNombre, tipo de plan, clubId (opcional si es patrocinio de un club para destacar), fechaInicio, fechaFin, estado, montoPagado.

## 5. Arquitectura técnica propuesta

- **Monorepo** (pnpm + Turborepo) con tres paquetes: `api` (backend), `web` (Next.js), `mobile` (Expo/React Native), y `shared` (tipos TypeScript y cliente API comunes).
- **Backend**: Node.js + TypeScript, Fastify como framework HTTP, Prisma ORM sobre PostgreSQL (SQLite en desarrollo local para simplificar), autenticación JWT.
- **Web**: Next.js (App Router) + TypeScript + Tailwind CSS.
- **Mobile**: Expo (React Native) + TypeScript, reutilizando el cliente API y los tipos del paquete `shared`.
- **Almacenamiento de archivos** (fotos de pistas, comprobantes de pago): carpeta local en desarrollo, con interfaz preparada para migrar a un bucket S3-compatible.
- Este stack permite desplegar el backend y la web fácilmente en proveedores como Railway/Render/Fly.io, y la app móvil vía Expo (EAS Build) hacia stores.

## 6. Consideraciones específicas para Venezuela

- Moneda dual: mostrar precios en VES y USD (referencia).
- Métodos de pago iniciales sin pasarela automatizada: Pago Móvil, transferencia bancaria nacional, Zelle, USDT — todos con conciliación manual por comprobante en el MVP.
- Conectividad variable: la app debe degradar con gracia ante conexiones lentas (paginación, imágenes optimizadas).

## 7. Alcance de esta sesión

Se construye un **scaffold funcional de extremo a extremo**: backend con base de datos real y endpoints funcionando, web con los flujos principales navegables, y una app móvil Expo con la misma lógica de negocio. No es una app lista para producción (falta pulido de UI, pasarela de pago real, tests exhaustivos, y despliegue), pero sí una base sólida y ejecutable localmente sobre la cual seguir iterando.
