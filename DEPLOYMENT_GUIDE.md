# 🚀 Creator Card API - Render Deployment Guide

## Quick Deployment Steps

### 1. **Create Render Account**
- Go to [render.com](https://render.com)
- Sign up with your GitHub account (recommended)

### 2. **Deploy Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `Quayyum-a/contact-card`
3. Configure deployment settings:
   - **Name**: `creator-card-api`
   - **Region**: `Oregon (US West)` or closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node bootstrap.js`

### 3. **Environment Variables**
Add these environment variables in Render dashboard:

```
PORT=3000
APP_BASE_URL=https://creator-card-api.onrender.com
APP_NAME=Creator Card API
JWT_SECRET=your_secure_jwt_secret_change_this
JWT_DEFAULT_EXPIRY=3600
HASH_SALT_ROUNDS=10
MONGODB_URI=mongodb+srv://quayyumaariyo_db_user:iNFl5POXVGKDGXhZ@contact-card.3z6i92z.mongodb.net/?appName=contact-card
PINO_LOG_LEVEL=info
SHOW_RAW_HEADERS=false
LOG_APP_REQUEST=true
CAN_LOG_ENDPOINT_INFORMATION=true
NO_SINGLE_ERRORS=false
TOP_LEVEL_ERROR_MESSAGE=Validation failed
ALLOW_ALL_EMAILS=false
EMAIL_NOTIF_INTERVAL_MINS=5
USE_SECRETS_MANAGER=false
MODEL_MOCK_SESSION=false
USE_MOCK_MODEL=false
ALLOW_MOCKED_HTTP_PROXY=false
```

### 4. **Test Your Deployment**

Once deployed, your API will be available at:
`https://creator-card-api.onrender.com`

#### Test Endpoints:

**Health Check:**
```bash
curl https://creator-card-api.onrender.com/health
```

**Create Creator Card:**
```bash
curl -X POST https://creator-card-api.onrender.com/creator-cards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "title": "Software Engineer",
    "company": "Tech Corp",
    "email": "john@example.com",
    "phone": "+1234567890",
    "bio": "Passionate developer"
  }'
```

**Get Creator Card:**
```bash
curl https://creator-card-api.onrender.com/creator-cards/{card-id}
```

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures**: Check build logs in Render dashboard
2. **Environment Variables**: Ensure all required vars are set
3. **MongoDB Connection**: Verify your Atlas IP whitelist includes `0.0.0.0/0`
4. **Port Issues**: Render automatically sets PORT, don't hardcode it

### Monitoring:
- View logs in Render dashboard
- Monitor performance metrics
- Set up alerts for downtime

## 📱 Free Tier Limits:
- 750 hours/month (31 days = 744 hours)
- Sleeps after 15 minutes of inactivity
- Cold starts take ~30 seconds

## 🔄 Auto-Deploy:
Every push to `main` branch automatically deploys to Render!