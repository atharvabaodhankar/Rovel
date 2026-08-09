const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the monorepo root .env or .env.production file
const fs = require('fs');
const envPath = fs.existsSync(path.resolve(__dirname, '../../.env.production'))
  ? path.resolve(__dirname, '../../.env.production')
  : path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['bullmq', 'ioredis'],
};

module.exports = nextConfig;
