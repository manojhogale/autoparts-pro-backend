const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

    // Create admin user
    const admin = await User.create({
      phone: '9876543210',
      name: 'Admin User',
      email: 'admin@autoparts.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created');
    console.log(`   Phone: 9876543210`);
    console.log(`   Password: admin123\n`);

    // Create categories
    const categories = [
      { name: 'Engine Parts', isActive: true },
      { name: 'Body Parts', isActive: true },
      { name: 'Electrical', isActive: true },
      { name: 'Brake System', isActive: true },
      { name: 'Filters', isActive: true },
      { name: 'Oils', isActive: true }
    ];

    await Category.insertMany(categories);
    console.log('✅ Categories created\n');

    // Create brands
    const brands = [
      { name: 'Bosch', isActive: true },
      { name: 'NGK', isActive: true },
      { name: 'Castrol', isActive: true },
      { name: 'Shell', isActive: true },
      { name: 'Denso', isActive: true }
    ];

    await Brand.insertMany(brands);
    console.log('✅ Brands created\n');

    // Create sample products
    const products = [
      {
        name: 'Engine Oil 5W-30',
        barcode: '1234567890123',
        category: 'Oils',
        brand: 'Castrol',
        purchasePrice: 350,
        sellingPrice: 450,
        mrp: 500,
        stock: 50,
        minStock: 10,
        unit: 'liter',
        gstDetails: { taxSlab: 18, hsnCode: '2710' },
        vehicleType: ['Car', 'Bike'],
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Oil Filter',
        barcode: '9876543210987',
        category: 'Filters',
        brand: 'Bosch',
        purchasePrice: 150,
        sellingPrice: 200,
        mrp: 250,
        stock: 100,
        minStock: 20,
        unit: 'piece',
        gstDetails: { taxSlab: 18, hsnCode: '8421' },
        vehicleType: ['Car'],
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Spark Plug',
        barcode: '5555666677778',
        category: 'Engine Parts',
        brand: 'NGK',
        purchasePrice: 100,
        sellingPrice: 150,
        mrp: 180,
        stock: 200,
        minStock: 30,
        unit: 'piece',
        gstDetails: { taxSlab: 18, hsnCode: '8511' },
        vehicleType: ['Car', 'Bike'],
        isActive: true,
        createdBy: admin._id
      }
    ];

    await Product.insertMany(products);
    console.log('✅ Sample products created\n');

    // Create settings
    await Settings.create({
      company: {
        name: process.env.COMPANY_NAME || 'AutoParts Pro',
        address: process.env.COMPANY_ADDRESS || 'Mumbai, India',
        phone: process.env.COMPANY_PHONE || '9876543210',
        email: process.env.COMPANY_EMAIL || 'info@autoparts.com',
        gst: process.env.COMPANY_GST || '27XXXXX1234X1ZX'
      },
      billing: {
        taxEnabled: true,
        defaultTax: 18
      }
    });

    console.log('✅ Settings created\n');

    console.log('🎉 Database seeded successfully!\n');
    console.log('📌 You can now login with:');
    console.log('   Phone: 9876543210');
    console.log('   Password: admin123\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
seedData();