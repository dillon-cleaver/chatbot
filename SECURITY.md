# Security

This document outlines security considerations for the chatbot application.

## API Key Storage

### Custom Mode
When using custom mode with your own API keys, the application takes the following security measures:

- **Encryption**: API keys are encrypted using the Web Crypto API (AES-GCM) before storage in localStorage
- **Device-Based Key**: The encryption key is derived from a device fingerprint (screen dimensions + user agent hash)
- **Migration**: Existing unencrypted keys are automatically migrated to encrypted storage

### Security Limitations

**Important**: Browser-based encryption provides limited security against sophisticated attacks. The encryption is designed to protect against:
- Casual inspection of localStorage
- Basic XSS attacks that read localStorage directly
- Accidental exposure through browser debugging

However, it **cannot** protect against:
- Malicious browser extensions with full access
- Sophisticated XSS attacks that can execute arbitrary JavaScript
- Physical access to the device while logged in
- Browser memory dumps or debugger access

### Best Practices

For sensitive use cases, we recommend:

1. **Use Default Server Mode**: API keys never leave the server and are not exposed to the browser
2. **Clear Browser Data**: Clear browser data when using shared computers
3. **Avoid Shared Devices**: Do not use custom mode on untrusted or shared devices
4. **Rotate API Keys**: Regularly rotate your API keys if you use custom mode
5. **Monitor Usage**: Monitor your API key usage for any suspicious activity

## Network Security

### API Key Transmission
- **Google Provider**: API keys are sent in HTTP headers (`X-Goog-Api-Key`), not URL parameters, to prevent exposure in:
  - Browser history
  - Server logs
  - Referrer headers
  - Browser extensions monitoring URLs

### File Processing
- **Local Workers**: PDF.js uses local workers bundled by Vite instead of CDN loading to prevent:
  - Man-in-the-middle (MITM) attacks
  - Compromised CDN content
  - Network-based injection attacks

## Data Privacy

### Local Storage
All conversation data and files are stored locally in IndexedDB:
- Conversations remain on your device
- Files are processed locally
- No server-side storage (except in default mode for messages)

### Server Mode
In default mode:
- Messages are sent to the server for LLM processing
- Server API key is used (never exposed to browser)
- Conversation history still stored locally

## Reporting Security Issues

If you discover a security vulnerability, please report it to:
- **Email**: [Add your contact email]
- **GitHub Issues**: [Add your GitHub security policy link]

Please do not disclose security issues publicly until they have been addressed.

## Security Updates

This document was last updated: February 2026

Security improvements implemented:
- ✅ API key encryption in localStorage (Feb 2026)
- ✅ Google Provider header-based authentication (Feb 2026)
- ✅ Local PDF.js worker (Feb 2026)
- ✅ Connection test warnings (Feb 2026)
- ✅ Rollback on API failures (Feb 2026)

## Security Checklist

When deploying this application:

- [ ] Review and update the server API key regularly
- [ ] Set up proper CORS policies for production
- [ ] Enable HTTPS for all deployments
- [ ] Configure Content Security Policy (CSP) headers
- [ ] Review browser extension permissions
- [ ] Set up rate limiting on server endpoints
- [ ] Monitor API usage for anomalies
- [ ] Keep dependencies updated
