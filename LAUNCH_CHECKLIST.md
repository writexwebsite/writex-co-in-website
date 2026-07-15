# WriteX Launch Checklist

## Public Website

- Homepage checked
- Pricing page checked
- Service pages checked
- Contact page checked
- WhatsApp links checked
- Mobile checked at 390px, 430px, and 768px
- SEO metadata checked
- Sitemap and robots checked

## Backend

- Quote API works
- File upload works or falls back safely
- Email notifications configured
- Admin login works
- Admin lead list works
- Client login fails safely when invoice verification is unavailable
- Payment/download locked until server-side settlement
- Revision request workflow stores requests
- SLA job requires `JOB_SECRET`
- Health endpoint works

## Security

- No real secrets in repo
- No public mock/demo UI
- Admin routes protected
- Client routes protected
- S3 bucket private
- Signed URLs expire
- Rate limits active
- Payment proof does not unlock downloads automatically

## Deployment

- Production env set
- Build passes
- PM2 running
- Nginx reverse proxy configured
- SSL active
- Rollback plan ready
