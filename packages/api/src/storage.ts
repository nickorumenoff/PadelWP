import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { newId } from "./db";

/**
 * Almacenamiento de archivos subidos por el usuario (hoy solo comprobantes de
 * pago). Interfaz intercambiable, igual que el patrón de pagos/notifier: la
 * implementación por defecto guarda en el disco local del proceso.
 *
 * ⚠️ En Railway (y la mayoría de PaaS) el disco del contenedor es EFÍMERO: se
 * pierde en cada redeploy o restart — el mismo problema que tenía sqlite antes
 * de migrar a Postgres real. Para que los comprobantes sobrevivan un redeploy,
 * hay que conectar más adelante un bucket S3-compatible (ej. Cloudflare R2,
 * que tiene capa gratuita) o un Railway Volume montado en UPLOADS_DIR.
 */

export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

// @fastify/static necesita que el directorio raíz exista al registrarse.
export async function ensureUploadsDir(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveUploadedFile(
  subdir: string,
  originalFilename: string,
  stream: Readable
): Promise<{ relativePath: string }> {
  const dir = path.join(UPLOADS_DIR, subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(originalFilename || "").slice(0, 10) || ".bin";
  const filename = `${newId("file")}${ext}`;
  const fullPath = path.join(dir, filename);

  await pipeline(stream, createWriteStream(fullPath));

  return { relativePath: `/uploads/${subdir}/${filename}` };
}
