const nodemailer = require('nodemailer');

console.log('📧 Configurando servicio de email...');
console.log('SMTP User:', process.env.SMTP_USER);
console.log('SMTP Host:', process.env.SMTP_HOST);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s/g, '')
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar conexión
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Error configurando email:', error.message);
        if (error.code === 'EAUTH') {
            console.log('🔐 Problema de autenticación - verifica la contraseña de aplicación de Gmail');
        }
    } else {
        console.log('✅ Servidor de email configurado correctamente');
    }
});

// Función principal para enviar correos
async function enviarCorreo({ to, subject, html, text }) {
    console.log(`📧 Intentando enviar email a: ${to}`);
    
    try {
        if (!transporter) {
            throw new Error('Transporter de email no configurado');
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || `"Gestion WMS" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            html: html,
            text: text
        };

        console.log('📤 Enviando email...');
        const result = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email enviado exitosamente a:', to);
        console.log('📨 Message ID:', result.messageId);
        
        return {
            success: true,
            messageId: result.messageId
        };

    } catch (error) {
        console.error('❌ Error enviando email:');
        console.error('   - Destinatario:', to);
        console.error('   - Error:', error.message);
        console.error('   - Código:', error.code);
        
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Funciones específicas para recuperación de contraseña
async function enviarCorreoRecuperacion(destinatario, nombre, resetLink) {
    const subject = 'Restablecer tu Contraseña - Gestion WMS';
    
    console.log('🔗 Enlace en email:', resetLink);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Gestion WMS</h1>
            <p>Restablecimiento de Contraseña</p>
        </div>
        <div class="content">
            <h2>Hola ${nombre},</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <p style="text-align: center;">
                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 14px;">
                ${resetLink}
            </p>
            <div class="warning">
                <strong>⚠️ Este enlace expirará en 1 hora.</strong>
                <p>Por seguridad, el enlace solo puede ser utilizado una vez.</p>
            </div>
            <p>Si no solicitaste este restablecimiento, puedes ignorar este mensaje.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Gestion WMS. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const text = `
Restablecimiento de Contraseña - Gestion WMS

Hola ${nombre},

Has solicitado restablecer tu contraseña. Usa el siguiente enlace para crear una nueva contraseña:

${resetLink}

⚠️ Este enlace expirará en 1 hora y solo puede ser utilizado una vez.

Si no solicitaste este restablecimiento, puedes ignorar este mensaje.

© 2024 Gestion WMS. Todos los derechos reservados.
    `;

    return await enviarCorreo({ to: destinatario, subject, html, text });
}

async function enviarCorreoConfirmacion(destinatario, nombre) {
    const subject = 'Contraseña Actualizada - Gestion WMS';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .success { color: #10b981; font-size: 48px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Gestion WMS</h1>
            <p>Contraseña Actualizada</p>
        </div>
        <div class="content">
            <div class="success">✓</div>
            <h2>Hola ${nombre},</h2>
            <p>Tu contraseña ha sido actualizada exitosamente.</p>
            <p><strong>Fecha y hora de la actualización:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <p>Si no realizaste este cambio, por favor contacta inmediatamente al administrador del sistema.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Gestion WMS. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const text = `
Contraseña Actualizada - Gestion WMS

Hola ${nombre},

Tu contraseña ha sido actualizada exitosamente.

Fecha y hora de la actualización: ${new Date().toLocaleString('es-ES')}

Si no realizaste este cambio, por favor contacta inmediatamente al administrador del sistema.

© 2024 Gestion WMS. Todos los derechos reservados.
    `;

    return await enviarCorreo({ to: destinatario, subject, html, text });
}

module.exports = { 
    enviarCorreo, 
    enviarCorreoRecuperacion, 
    enviarCorreoConfirmacion, 
    transporter 
};