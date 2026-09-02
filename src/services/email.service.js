const nodemailer = require('nodemailer');

/**
 * Send OTP access code email via SMTP using Nodemailer
 * @param {string} toEmail 
 * @param {string} otpCode 
 */
async function sendOTPEmail(toEmail, otpCode) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
    const smtpFrom = process.env.SMTP_FROM || `"HabiTrack" <${smtpUser || 'no-reply@habitrack.app'}>`;
    const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.log(`[SMTP NO CONFIGURADO] Código para ${toEmail}: ${otpCode}`);
        return { sent: false, reason: 'SMTP no configurado en variables de entorno.' };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">🏠 HabiTrack</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Tu gestor de compraventa inmobiliaria</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Tu código de acceso</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">Introduce el siguiente código numérico de 6 dígitos para acceder a tu cuenta:</p>
                
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background-color: #eeeffe; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otpCode}</span>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">Este código caducará en 15 minutos. Si no has solicitado este acceso, puedes ignorar este correo.</p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: smtpFrom,
            to: toEmail,
            subject: `${otpCode} es tu código de acceso a HabiTrack`,
            html: htmlContent,
            text: `Tu código de acceso a HabiTrack es: ${otpCode}`
        });
        console.log(`[EMAIL SMTP ENVIADO CON ÉXITO] A: ${toEmail}`);
        return { sent: true };
    } catch (err) {
        console.error('[SMTP ERROR]:', err.message);
        return { sent: false, error: err.message };
    }
}

module.exports = {
    sendOTPEmail
};
