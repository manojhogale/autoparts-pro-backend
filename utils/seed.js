// utils/seed.js
// ======================================================================
// Database Seeder - AutoParts Pro
// ----------------------------------------------------------------------
// Seeds initial data: Admin user, categories, brands, sample products
// ======================================================================

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Settings = require('../models/Settings');

const connectDB = require('../config/db');
const logger = require('../config/logger');

// Seed data
const seedData = async () => {
  try {
    await connectDB();

    console.log('🌱 Seeding database...\n');

    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Brand.deleteMany();
    await Settings.deleteMany();

    console.log('🗑️  Cleared existing data\n');

    // ======================================================================
    // 1. Create Admin User
    // ======================================================================
    const admin = await User.create({
      phone: '9876543210',
      name: 'Admin User',
      email: 'admin@autoparts.com',
      password: 'admin123', // Will be hashed by User model pre-save hook
      role: 'admin',
      isActive: true,
    });

    console.log('✅ Admin user created');
    console.log(`   Phone: 9876543210`);
    console.log(`   Password: admin123\n`);

    // ======================================================================
    // 2. Create Categories
    // ======================================================================
    const categories = [
      { name: 'Engine Parts', description: 'All engine related parts', isActive: true },
      { name: 'Body Parts', description: 'Exterior body components', isActive: true },
      { name: 'Electrical', description: 'Electrical components', isActive: true },
      { name: 'Brake System', description: 'Braking components', isActive: true },
      { name: 'Filters', description: 'Oil, air, fuel filters', isActive: true },
      { name: 'Oils', description: 'Engine oils and lubricants', isActive: true },
      { name: 'Tyres', description: 'All types of tyres', isActive: true },
      { name: 'Batteries', description: 'Car and bike batteries', isActive: true },
    ];

    await Category.insertMany(categories);
    console.log(`✅ ${categories.length} categories created\n`);

    // ======================================================================
    // 3. Create Brands
    // ======================================================================
    const brands = [
      { name: 'Bosch', countryOfOrigin: 'Germany', isActive: true },
      { name: 'NGK', countryOfOrigin: 'Japan', isActive: true },
      { name: 'Castrol', countryOfOrigin: 'UK', isActive: true },
      { name: 'Shell', countryOfOrigin: 'Netherlands', isActive: true },
      { name: 'Denso', countryOfOrigin: 'Japan', isActive: true },
      { name: 'MRF', countryOfOrigin: 'India', isActive: true },
      { name: 'Exide', countryOfOrigin: 'India', isActive: true },
    ];

    await Brand.insertMany(brands);
    console.log(`✅ ${brands.length} brands created\n`);

    // ======================================================================
    // 4. Create Sample Products
    // ======================================================================
    const products = [
      {
        name: 'Castrol Engine Oil 5W-30 (1L)',
        sku: 'SKU000001',
        barcode: '1234567890123',
        category: 'Oils',
        brand: 'Castrol',
        description: 'Premium synthetic engine oil for petrol engines',
        purchasePrice: 350,
        sellingPrice: 450,
        mrp: 500,
        stock: 50,
        minStock: 10,
        unit: 'liter',
        gstDetails: { taxSlab: 18, hsnCode: '2710', isTaxInclusive: false },
        vehicleType: ['Car', 'Bike'],
        isActive: true,
        createdBy: admin._id,
      },
      {
        name: 'Bosch Oil Filter',
        sku: 'SKU000002',
        barcode: '9876543210987',
        category: 'Filters',
        brand: 'Bosch',
        description: 'High quality oil filter for cars',
        purchasePrice: 150,
        sellingPrice: 200,
        mrp: 250,
        stock: 100,
        minStock: 20,
        unit: 'piece',
        gstDetails: { taxSlab: 18, hsnCode: '8421', isTaxInclusive: false },
        vehicleType: ['Car'],
        isActive: true,
        createdBy: admin._id,
      },
      {
        name: 'NGK Spark Plug',
        sku: 'SKU000003',
        barcode: '5555666677778',
        category: 'Engine Parts',
        brand: 'NGK',
        description: 'Iridium spark plug for better performance',
        purchasePrice: 100,
        sellingPrice: 150,
        mrp: 180,
        stock: 200,
        minStock: 30,
        unit: 'piece',
        gstDetails: { taxSlab: 18, hsnCode: '8511', isTaxInclusive: false },
        vehicleType: ['Car', 'Bike'],
        isActive: true,
        createdBy: admin._id,
      },
      {
        name: 'MRF ZVTS Tyre 165/80 R14',
        sku: 'SKU000004',
        barcode: '1111222233334',
        category: 'Tyres',
        brand: 'MRF',
        description: 'Tubeless tyre for hatchback cars',
        purchasePrice: 2500,
        sellingPrice: 3200,
        mrp: 3500,
        stock: 20,
        minStock: 5,
        unit: 'piece',
        gstDetails: { taxSlab: 28, hsnCode: '4011', isTaxInclusive: false },
        vehicleType: ['Car'],
        isActive: true,
        createdBy: admin._id,
      },
      {
        name: 'Exide Car Battery 12V 35AH',
        sku: 'SKU000005',
        barcode: '2222333344445',
        category: 'Batteries',
        brand: 'Exide',
        description: 'Maintenance-free car battery',
        purchasePrice: 3500,
        sellingPrice: 4200,
        mrp: 4500,
        stock: 15,
        minStock: 5,
        unit: 'piece',
        gstDetails: { taxSlab: 28, hsnCode: '8507', isTaxInclusive: false },
        vehicleType: ['Car'],
        warrantyPeriod: 24,
        isActive: true,
        createdBy: admin._id,
      },
    ];

    await Product.insertMany(products);
    console.log(`✅ ${products.length} sample products created\n`);

    // ======================================================================
    // 5. Create Settings
    // ======================================================================
    await Settings.create({
      company: {
        name: process.env.COMPANY_NAME || 'AutoParts Pro',
        address: process.env.COMPANY_ADDRESS || '123 Auto Street, Mumbai, MH 400001',
        phone: process.env.COMPANY_PHONE || '9876543210',
        email: process.env.COMPANY_EMAIL || 'info@autoparts.com',
        gst: process.env.COMPANY_GST || '27XXXXX1234X1ZX',
      },
      billing: {
        taxEnabled: true,
        defaultTax: 18,
        invoicePrefix: 'BILL',
        termsConditions: 'All sales are final. No refunds without valid reason.',
      },
      notifications: {
        lowStockAlert: true,
        paymentReminders: true,
        smsEnabled: false,
        whatsappEnabled: false,
      },
      backup: {
        autoBackup: true,
        backupTime: '02:00',
        backupFrequency: 'daily',
      },
    });

    console.log('✅ Settings created\n');

    console.log('🎉 Database seeded successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📌 LOGIN CREDENTIALS:');
    console.log('   Phone: 9876543210');
    console.log('   Password: admin123');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    logger.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

// Run seeder
seedData();