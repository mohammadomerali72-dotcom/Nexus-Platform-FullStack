# Security Implementation - Milestone 7

This document outlines the security enhancements implemented for the Nexus platform as part of Milestone 7.

## 🔒 Security Features Implemented

### 1. Input Validation & Sanitization

#### NoSQL Injection Prevention
- **express-mongo-sanitize**: Removes `$` and `.` characters from user input to prevent NoSQL injection attacks
- **Custom validators**: Additional validation to ensure inputs are not objects or contain malicious patterns
- Applied to all user inputs (body, query, params)

#### XSS Protection
- **Custom XSS middleware**: Strips script tags and event handlers from user input
- Sanitizes HTML content before processing
- Applied globally to all routes

### 2. Password Security

#### Bcrypt Hashing
- **Salt rounds**: Configurable via `BCRYPT_ROUNDS` environment variable (default: 12)
- **Pre-save hook**: Automatically hashes passwords before saving to database
- **Secure comparison**: Uses bcrypt's built-in comparison method

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### 3. Two-Factor Authentication (2FA)

#### Email-Based OTP
- **6-digit OTP**: Generated using crypto.randomInt for security
- **Hashed storage**: OTPs are hashed before storing in database
- **Expiration**: OTPs expire after 10 minutes
- **Attempt limiting**: Maximum 3 attempts per OTP
- **Rate limiting**: Maximum 3 OTP requests per 15 minutes per IP

#### 2FA Flow
1. User logs in with email/password
2. If 2FA is enabled, OTP is sent to user's email
3. User enters OTP to complete login
4. Failed attempts are tracked and limited

#### 2FA Management
- **Enable 2FA**: `/api/auth/enable-2fa` (authenticated)
- **Disable 2FA**: `/api/auth/disable-2fa` (requires password confirmation)
- **Verify OTP**: `/api/auth/verify-otp`
- **Resend OTP**: `/api/auth/resend-otp` (rate limited)

### 4. Rate Limiting

#### Multiple Rate Limiters
- **Auth limiter**: 5 requests per 15 minutes (login, register)
- **OTP limiter**: 3 requests per 15 minutes (OTP requests)
- **Password reset limiter**: 3 requests per hour
- **API limiter**: 100 requests per 15 minutes (general API)
- **Strict limiter**: 10 requests per hour (sensitive operations)

#### Features
- Skip successful requests for auth endpoints
- Standard headers for rate limit info
- Custom error messages with error codes

### 5. Account Security

#### Brute Force Protection
- **Login attempts tracking**: Tracks failed login attempts
- **Account locking**: Locks account after 5 failed attempts for 2 hours
- **Automatic unlock**: Account unlocks after lock period expires
- **Reset on success**: Login attempts reset on successful login

#### Password Management
- **Password change tracking**: Tracks last password change date
- **Token invalidation**: All refresh tokens cleared on password change
- **Password reset**: Secure token-based password reset with 10-minute expiration

### 6. JWT Token Security

#### Token Configuration
- **Access token**: Short-lived (7 days default)
- **Refresh token**: Long-lived (30 days default)
- **Separate secrets**: Different secrets for access and refresh tokens
- **Token rotation**: Refresh tokens are rotated on use

#### Token Management
- **Token storage**: Refresh tokens stored in database
- **Token limit**: Maximum 5 refresh tokens per user
- **Token cleanup**: Old tokens automatically removed
- **Token validation**: Tokens validated on each request

### 7. Security Headers

#### Helmet.js Configuration
- **Content Security Policy**: Restricts resource loading
- **HSTS**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking (DENY)
- **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
- **X-XSS-Protection**: Enables browser XSS filter

#### Custom Headers
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricts geolocation, microphone, camera

### 8. Email Security

#### Nodemailer Integration
- **SMTP configuration**: Configurable via environment variables
- **Development mode**: Logs emails to console in development
- **HTML templates**: Professional email templates with security warnings
- **Error handling**: Graceful error handling for email failures

#### Email Types
- **OTP emails**: For 2FA verification
- **Password reset emails**: For password recovery
- **Security warnings**: Included in all security-related emails

## 🔧 Configuration

### Environment Variables

\`\`\`env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRE=30d

# Bcrypt Configuration
BCRYPT_ROUNDS=12

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Nexus Platform

# Encryption Key
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
\`\`\`

### Required NPM Packages

\`\`\`json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "express-mongo-sanitize": "^2.2.0",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.8"
  }
}
\`\`\`

## 📋 API Endpoints

### Authentication Endpoints

#### Login with 2FA
\`\`\`
POST /api/auth/login
Body: { email, password, role }
Response: { requiresOTP: true, tempToken } or { token, refreshToken, user }
\`\`\`

#### Verify OTP
\`\`\`
POST /api/auth/verify-otp
Body: { tempToken, otp }
Response: { token, refreshToken, user }
\`\`\`

#### Resend OTP
\`\`\`
POST /api/auth/resend-otp
Body: { tempToken }
Response: { message }
\`\`\`

#### Enable 2FA
\`\`\`
POST /api/auth/enable-2fa
Headers: { Authorization: Bearer <token> }
Response: { twoFactorEnabled: true }
\`\`\`

#### Disable 2FA
\`\`\`
POST /api/auth/disable-2fa
Headers: { Authorization: Bearer <token> }
Body: { password }
Response: { twoFactorEnabled: false }
\`\`\`

## 🛡️ Security Best Practices

### For Developers

1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Validate all inputs**: Use express-validator for all user inputs
3. **Sanitize outputs**: Escape HTML when rendering user content
4. **Use HTTPS**: Always use HTTPS in production
5. **Keep dependencies updated**: Regularly update npm packages
6. **Log security events**: Log all authentication and authorization events
7. **Monitor rate limits**: Track and alert on rate limit violations

### For Deployment

1. **Set strong JWT secrets**: Use long, random strings for JWT secrets
2. **Configure email service**: Set up proper SMTP service for production
3. **Enable HTTPS**: Use SSL/TLS certificates
4. **Set secure cookies**: Use secure, httpOnly, sameSite cookies
5. **Configure CORS**: Restrict CORS to specific origins
6. **Set up monitoring**: Monitor for security events and anomalies
7. **Regular backups**: Backup database regularly

## 🔍 Testing Security Features

### Test 2FA Flow
1. Enable 2FA for a user account
2. Log out and log back in
3. Verify OTP is sent to email
4. Enter OTP to complete login
5. Test invalid OTP handling
6. Test OTP expiration

### Test Rate Limiting
1. Make multiple rapid requests to login endpoint
2. Verify rate limit is enforced after 5 attempts
3. Wait for rate limit window to expire
4. Verify requests are allowed again

### Test Account Locking
1. Make 5 failed login attempts
2. Verify account is locked
3. Try to login with correct password
4. Verify login is blocked
5. Wait for lock period to expire
6. Verify login is allowed again

## 📊 Security Monitoring

### Metrics to Monitor
- Failed login attempts per user/IP
- Rate limit violations
- Account lockouts
- 2FA enrollment rate
- Password reset requests
- Token refresh patterns

### Alerts to Configure
- Multiple failed login attempts from same IP
- Account lockout events
- Rate limit violations
- Unusual token refresh patterns
- Multiple password reset requests

## 🚀 Future Enhancements

1. **TOTP-based 2FA**: Add support for authenticator apps (Google Authenticator, Authy)
2. **Backup codes**: Generate backup codes for 2FA recovery
3. **Session management**: Add ability to view and revoke active sessions
4. **IP whitelisting**: Allow users to whitelist trusted IPs
5. **Security audit log**: Detailed log of all security events
6. **Biometric authentication**: Add support for WebAuthn/FIDO2
7. **Risk-based authentication**: Adaptive authentication based on risk factors

## 📝 Compliance

This implementation follows security best practices and helps meet requirements for:
- OWASP Top 10 protection
- GDPR data protection
- PCI DSS (for payment data)
- SOC 2 compliance

## 🆘 Support

For security issues or questions:
1. Check this documentation first
2. Review the code comments in security middleware
3. Test in development environment
4. Contact the development team for assistance

**Note**: Never share security credentials or tokens in support requests.
