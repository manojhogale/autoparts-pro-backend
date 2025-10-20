# 🚀 AutoParts Pro - Backend Setup Guide

## ✅ Prerequisites

```bash
- Node.js v18+ 
- MongoDB v5+
- npm or yarn
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# या Windows वर:
net start MongoDB
```

### Port 5000 Already in Use:
```bash
# .env मध्ये port बदला
PORT=5001
```

### Module Not Found Error:
```bash
# node_modules delete करा आणि reinstall करा
rm -rf node_modules package-lock.json
npm install
```

### Firebase Token Error:
```bash
# Development मध्ये OTP bypass करण्यासाठी:
# authController.js मध्ये temporary mock auth add करा
```

---

## 📊 API Endpoints Overview

### 🔐 Authentication
```
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/refresh-token
POST   /api/auth/logout
GET    /api/auth/me
```

### 👥 Users
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### 📦 Products
```
GET    /api/products
GET    /api/products/:id
GET    /api/products/barcode/:code
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/low-stock
GET    /api/products/out-of-stock
```

### 🛒 Sales
```
GET    /api/sales
GET    /api/sales/:id
POST   /api/sales
PUT    /api/sales/:id
DELETE /api/sales/:id
GET    /api/sales/drafts
POST   /api/sales/:id/pdf
POST   /api/sales/:id/whatsapp
```

### 🔄 Purchases
```
GET    /api/purchases
GET    /api/purchases/:id
POST   /api/purchases
PUT    /api/purchases/:id
POST   /api/purchases/:id/payments
```

### 💰 Udhari (Credit)
```
GET    /api/udhari
GET    /api/udhari/:id
POST   /api/udhari/:id/payments
POST   /api/udhari/:id/reminder
GET    /api/udhari/overdue
GET    /api/udhari/aging-report
```

### 📈 Reports
```
GET    /api/reports/sales
GET    /api/reports/profit-loss
GET    /api/reports/stock
GET    /api/reports/top-selling
GET    /api/reports/gst
GET    /api/reports/export/excel
```

### 📊 Dashboard
```
GET    /api/dashboard
GET    /api/dashboard/charts/sales
```

### 💾 Backup
```
POST   /api/backup/create
GET    /api/backup/list
POST   /api/backup/restore/:id
GET    /api/backup/download/:id
```

### 🔄 Sync (Offline Support)
```
POST   /api/sync/bulk
GET    /api/sync/queue
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
```bash
# ⚠️ NEVER commit .env file
# Add to .gitignore:
echo ".env" >> .gitignore
```

### 2. JWT Secrets
```bash
# Strong secrets generate करा:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. MongoDB Security
```bash
# Production मध्ये authentication enable करा
# mongo.conf मध्ये:
security:
  authorization: enabled
```

### 4. Rate Limiting
```bash
# .env मध्ये adjust करा:
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window
```

---

## 🚀 Deployment

### PM2 (Recommended)
```bash
# PM2 install करा
npm install -g pm2

# Start application
pm2 start server.js --name autoparts-api

# Auto-restart on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs autoparts-api

# Restart
pm2 restart autoparts-api
```

### Docker (Optional)
```bash
# Dockerfile create करा
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]

# Build & Run
docker build -t autoparts-api .
docker run -p 5000:5000 --env-file .env autoparts-api
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📞 Support & Issues

### Common Issues Fixed:

✅ **Missing asyncHandler** - Created in `middlewares/asyncHandler.js`
✅ **Missing Settings model** - Created in `models/Settings.js`
✅ **Missing route files** - All placeholder routes created
✅ **Path inconsistencies** - Fixed controller imports
✅ **Seed.js password issue** - Fixed duplicate hashing
✅ **SMS/WhatsApp services** - Created in `utils/` folder

### If You Face Issues:

1. Check logs: `tail -f logs/error.log`
2. Verify MongoDB connection
3. Check `.env` configuration
4. Ensure all dependencies installed: `npm install`
5. Clear node_modules: `rm -rf node_modules && npm install`

---

## 📝 Next Steps

### Phase 1: ✅ Backend Setup (Complete)
- ✅ Database models
- ✅ Authentication
- ✅ Core APIs
- ✅ Middleware

### Phase 2: 🔄 Testing
- Write unit tests
- API integration tests
- Load testing

### Phase 3: 🎨 Frontend Integration
- Connect React/Flutter app
- Implement offline sync
- Real-time notifications

### Phase 4: 🚀 Advanced Features
- AI-powered demand prediction
- Advanced analytics
- Multi-branch support
- Barcode scanner integration

---

## 📚 Documentation

### API Documentation:
```bash
# Install Swagger (optional)
npm install swagger-jsdoc swagger-ui-express

# Access docs at:
http://localhost:5000/api-docs
```

### Postman Collection:
Import the provided Postman collection for easy API testing.

---

## 🎉 You're All Set!

तुमचा AutoParts Pro backend आता पूर्णपणे कार्यरत आहे!

**Default Login:**
- Phone: `9876543210`
- Password: `admin123`

**API Base URL:**
```
http://localhost:5000/api
```

**Health Check:**
```
http://localhost:5000/health
```

---

## 📧 Contact

For any issues or questions:
- Create GitHub issue
- Email: support@autoparts.com
- Phone: +91-9876543210

---

**Happy Coding! 🚀** 📦 Step 1: Installation

```bash
# Clone repository
git clone <your-repo-url>
cd autoparts-backend

# Install dependencies
npm install

# या yarn install
```

---

## 🔐 Step 2: Environment Setup

```bash
# .env file तयार करा
cp .env.example .env

# .env file edit करा आणि तुमची माहिती भरा:
nano .env  # किंवा कोणत्याही editor ने
```

### **Required Fields (Mandatory):**
```bash
MONGO_URI=mongodb://localhost:27017/autoparts-pro
JWT_SECRET=your_very_long_secret_key_minimum_32_characters
REFRESH_SECRET=another_very_long_secret_key_minimum_32_chars
COMPANY_NAME=तुमचं दुकानाचं नाव
COMPANY_PHONE=तुमचा phone नंबर
```

### **Optional Fields (Later configure करू शकता):**
- Firebase (for OTP)
- Cloudinary (for images)
- MSG91 (for SMS)
- WhatsApp API

---

## 🗄️ Step 3: Database Setup

```bash
# MongoDB चालू करा
mongod

# दुसऱ्या terminal मध्ये seed data चालवा:
npm run seed
```

**Output:**
```
✅ Admin user created
   Phone: 9876543210
   Password: admin123

✅ 8 categories created
✅ 7 brands created  
✅ 5 sample products created
✅ Settings created

🎉 Database seeded successfully!
```

---

## ▶️ Step 4: Start Server

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

**आता तुमचा API चालू आहे:**
```
http://localhost:5000
```

---

## 🧪 Step 5: Test API

### Health Check:
```bash
curl http://localhost:5000/health
```

### Login Test:
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "firebaseToken": "test_token",
    "name": "Admin User"
  }'
```

---

## 📁 Project Structure

```
autoparts-backend/
├── config/           # DB, Firebase, Cloudinary setup
├── controllers/      # Business logic
├── middleware/       # Auth, validation, error handling
├── middlewares/      # asyncHandler
├── models/           # Mongoose schemas
├── routes/           # API endpoints
├── services/         # SMS, WhatsApp, Notifications
├── utils/            # Helper functions
├── logs/             # Application logs
├── uploads/          # Temporary file uploads
├── backups/          # Database backups
├── server.js         # Main entry point
└── package.json
```

---

## 🔧 Common Commands

```bash
# Install dependencies
npm install

# Development server with auto-restart
npm run dev

# Production server
npm start

# Seed database
npm run seed

# Create manual backup
curl -X POST http://localhost:5000/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN"

# Run tests (if configured)
npm test
```

---

##