# Desplegar Padel WP para una demo en vivo

Guía rápida para tener una URL pública mientras iteramos hacia una infraestructura definitiva. Backend en **Railway** (o Render), web en **Vercel**. Ambos tienen plan gratuito suficiente para una demo.

## 0) Requisito: el código en GitHub

Railway y Vercel despliegan conectando un repositorio de GitHub.

1. Crea un repositorio nuevo (vacío) en https://github.com/new — por ejemplo `padel-wp`. Puede ser privado.
2. Copia la URL del repo (`https://github.com/tu-usuario/padel-wp.git`).
3. Súbelo desde donde tengas el código:
   ```bash
   git remote add origin https://github.com/tu-usuario/padel-wp.git
   git branch -M main
   git push -u origin main
   ```

## 1) Backend en Railway

1. Entra a https://railway.app → **New Project** → **Deploy from GitHub repo** → selecciona `padel-wp`.
2. Railway detecta Node automáticamente (usa el `pnpm-lock.yaml` de la raíz y el script `start` del `package.json` raíz, que ya deja todo listo: siembra datos de ejemplo y arranca la API).
3. En **Variables** del servicio, añade:
   - `JWT_SECRET` → cualquier cadena larga y aleatoria (por ejemplo, generada con `openssl rand -hex 32`).
   - `DATABASE_URL` → `file:./dev.db`
   - (Railway ya inyecta `PORT` automáticamente, no hace falta configurarlo.)
4. Deploy. Cuando termine, en **Settings → Networking** genera un dominio público (`*.up.railway.app`). Esa es la URL de tu API — pruébala abriendo `https://tu-api.up.railway.app/health`, debe responder `{"ok":true,...}`.

> Nota: el backend usa una base de datos SQLite embebida (ver `README.md`). En el plan gratuito de Railway el disco es efímero entre despliegues (no entre reinicios normales), así que para una demo es perfecto; si más adelante quieres persistencia real, migramos a PostgreSQL + Prisma (el diseño ya está pensado para eso).

## 2) Web en Vercel

1. Entra a https://vercel.com → **Add New → Project** → importa el mismo repo `padel-wp`.
2. En **Root Directory**, selecciona `packages/web` (Vercel detecta que es un monorepo pnpm y usa el lockfile de la raíz automáticamente).
3. Framework detectado: Next.js (no requiere configuración extra).
4. En **Environment Variables**, añade:
   - `NEXT_PUBLIC_API_URL` → la URL pública de Railway del paso anterior (ej. `https://tu-api.up.railway.app`).
5. Deploy. Vercel te da una URL tipo `https://padel-wp.vercel.app` — esa es la que le compartes a tu cliente.

## 3) Verificación rápida

- Abre la URL de Vercel, revisa que cargue la home y liste el club de ejemplo.
- Regístrate con la encuesta de nivel y confirma que el nivel calculado se vea bien.
- Reserva una pista y confirma que aparezca la partida en "Partidas".

## Siguientes pasos (después de la demo)

- Dominio propio en Vercel (ej. `app.padelwp.com`) y en Railway si aplica.
- Migrar a PostgreSQL gestionado (Railway/Neon/Supabase) para persistencia real.
- Variables de entorno y secretos definitivos (no reusar el `JWT_SECRET` de la demo).
- Habilitar CORS solo para el dominio real de la web (hoy está abierto a cualquier origen para simplificar la demo).
