// config/swagger.js
// ======================================================================
// Swagger Configuration - AutoParts Pro API
// ======================================================================

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ========================================
// Swagger Options
// ========================================
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🚗 AutoParts Pro API',
      version: '2.0.0',
      description: `
This is the official API documentation for the **AutoParts Pro Backend**.

### 🔐 Authentication
Most endpoints require a valid **JWT Bearer Token**.  
Click on the **Authorize 🔒** button (top-right) and enter:

\`\`\`text
Bearer <your_jwt_token>
\`\`\`

### 📦 Modules Covered
- Authentication & Users
- Products, Categories, Brands
- Sales, Purchases, Quotations
- Udhari, Expenses, Vouchers
- Reports, Dashboard, Backup, Notifications
- AI Assistant & Settings
`,
      contact: {
        name: 'Kiwisoft Technologies',
        url: 'https://kiwisofttech.com',
        email: 'support@kiwisofttech.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.autopartspro.in/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Enter JWT token (without quotes). Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // ✅ Scan all route files
  apis: ['./routes/*.js', './routes/**/*.js'],
};

// ========================================
// Generate Swagger Spec
// ========================================
const swaggerSpec = swaggerJsdoc(options);

// ========================================
// Export for server.js
// ========================================
module.exports = { swaggerUi, swaggerSpec };