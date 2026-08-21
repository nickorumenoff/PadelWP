/**
 * Interfaz intercambiable para el envío de correos, siguiendo el mismo patrón
 * que el flujo de pagos manuales: la lógica de negocio (recuperar contraseña,
 * y en el futuro cualquier otro correo transaccional) no depende de un
 * proveedor concreto.
 *
 * Implementación por defecto: registra el correo en los logs del servidor
 * (visibles en Railway → Deployments → View logs / Console) en vez de enviarlo
 * de verdad. Para conectar un proveedor real (ej. Resend, SendGrid), basta con
 * añadir una nueva implementación de EmailSender aquí y usarla en vez de
 * `consoleEmailSender` cuando exista la variable de entorno correspondiente
 * (ej. RESEND_API_KEY).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const consoleEmailSender: EmailSender = {
  async send(message: EmailMessage) {
    // eslint-disable-next-line no-console
    console.log(
      `\n📧 [modo registro — sin envío real] Correo para ${message.to}\n` +
        `   Asunto: ${message.subject}\n` +
        `   ${message.body.replace(/\n/g, "\n   ")}\n`
    );
  },
};

export const emailSender: EmailSender = consoleEmailSender;
