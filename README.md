# Razorpay + Firebase Payment Voice Demo

## 1. Install
npm install

## 2. Firebase Admin credentials
Create/download a Firebase service-account JSON from Firebase/Google Cloud.
Do NOT put that JSON in a public website or Git repository.
In Render, add the complete JSON as the secret environment variable:
FIREBASE_SERVICE_ACCOUNT_JSON

## 3. Razorpay webhook
In Razorpay Dashboard, create an HTTPS webhook pointing to:
https://YOUR-DOMAIN.example/razorpay/webhook

Set the same secret in RAZORPAY_WEBHOOK_SECRET.
Enable payment.captured (and optionally order.paid).

## 4. Start
npm start

Open the public/index.html through your web hosting/server.
For local testing, serve the public folder with any static server.

## Important
The webhook signature is verified with the raw request body.
The payment ID is used as the Firebase key to prevent duplicate entries.

The sample voice uses browser SpeechSynthesis. A browser may block automatic speech until the user interacts with the page. For a guaranteed Android background voice/notification, use a native Android app plus Firebase Cloud Messaging/foreground service with appropriate OS permissions and policies.
