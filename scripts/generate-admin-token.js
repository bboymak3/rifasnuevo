#!/usr/bin/env node
// scripts/generate-admin-token.js
// Generates a secure ADMIN_TOKEN value for use in Cloudflare Pages environment
import { randomBytes } from 'crypto';

const token = randomBytes(32).toString('hex');
console.log(token);

// Usage: node scripts/generate-admin-token.js > admin_token.txt
// Then set the value of admin_token.txt as ADMIN_TOKEN in your Pages environment variables.
