const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the monorepo root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any standard Next.js configurations here if needed in the future
  reactStrictMode: true,
};

module.exports = nextConfig;
