# Payment Voice Alert

Upload your real payment QR as `public/qr.png`.

Render:
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:
- `FIREBASE_DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `RAZORPAY_WEBHOOK_SECRET`

Razorpay webhook:
`https://YOUR-RENDER-DOMAIN/razorpay/webhook`

Enable `payment.captured`.

Never put Firebase service-account credentials or the Razorpay webhook secret in GitHub source code.
