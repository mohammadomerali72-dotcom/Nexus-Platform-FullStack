const nodemailer = require("nodemailer")

// Create reusable transporter
const createTransporter = () => {
  // For development, use ethereal email (fake SMTP service)
  if (process.env.NODE_ENV === "development" && !process.env.EMAIL_HOST) {
    console.log("⚠️  Using development email service (emails won't be sent)")
    return null
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Send OTP email
const sendOTPEmail = async (email, name, otp) => {
  const transporter = createTransporter()

  if (!transporter) {
    console.log(`[DEV] OTP for ${email}: ${otp}`)
    return { success: true, messageId: "dev-mode" }
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Nexus Platform"}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Nexus Login Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Nexus Security</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>You requested a verification code to log in to your Nexus account. Use the code below to complete your login:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code expires in 10 minutes</p>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email and ensure your account is secure.
              </div>

              <p>For your security:</p>
              <ul>
                <li>Never share this code with anyone</li>
                <li>Nexus staff will never ask for your verification code</li>
                <li>This code can only be used once</li>
              </ul>

              <p>Best regards,<br>The Nexus Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Nexus Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${name},

You requested a verification code to log in to your Nexus account.

Your verification code is: ${otp}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email and ensure your account is secure.

For your security:
- Never share this code with anyone
- Nexus staff will never ask for your verification code
- This code can only be used once

Best regards,
The Nexus Team
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error: error.message }
  }
}

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const transporter = createTransporter()

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

  if (!transporter) {
    console.log(`[DEV] Password reset URL for ${email}: ${resetUrl}`)
    return { success: true, messageId: "dev-mode" }
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Nexus Platform"}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Nexus Password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>You requested to reset your password for your Nexus account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link expires in 10 minutes. If you didn't request a password reset, please ignore this email.
              </div>

              <p>Best regards,<br>The Nexus Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Nexus Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${name},

You requested to reset your password for your Nexus account.

Click the link below to create a new password:
${resetUrl}

This link expires in 10 minutes.

If you didn't request a password reset, please ignore this email.

Best regards,
The Nexus Team
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
}
