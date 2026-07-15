# AXO File Upload Security

- Allowed extensions and maximum size are configured centrally and validated in browser and server.
- Server checks declared MIME, extension and magic-byte signatures before storage.
- Executables and script extensions are rejected.
- Filenames are sanitized; S3 objects remain private and are referenced by database IDs.
- Access must use time-limited signed URLs from authenticated routes. Never expose bucket URLs.
- `lib/storage/malware.ts` is the approved scanner integration boundary. Set `MALWARE_SCAN_REQUIRED=true` only after configuring a scanner; production can then fail closed.
- Uploads are rate-limited. Failed uploads preserve the brief and offer retry or WhatsApp fallback.
- Retention and deletion periods must be approved by WriteX operations and reflected in Privacy before launch.
