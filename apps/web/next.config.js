const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the monorepo root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['bullmq', 'ioredis'],
};

module.exports = nextConfig;
