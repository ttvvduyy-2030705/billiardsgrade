#!/usr/bin/env node
/*
 * Update the ScoreMenu API URL embedded into the React Native app before building APK.
 * Usage:
 *   node scripts/set-scoremenu-api-url.js https://api.yourdomain.com
 *   node scripts/set-scoremenu-api-url.js http://YOUR_VPS_IP
 */
const fs = require('fs');
const path = require('path');

const nextUrl = process.argv[2];
if (!nextUrl) {
  console.error('Missing API URL. Example: node scripts/set-scoremenu-api-url.js https://api.yourdomain.com');
  process.exit(1);
}

const normalized = String(nextUrl).trim().replace(/\/+$/, '');
if (!/^https?:\/\//i.test(normalized)) {
  console.error('API URL must start with http:// or https://');
  process.exit(1);
}

const configPath = path.join(process.cwd(), 'src', 'config', 'restaurantMenu.ts');
if (!fs.existsSync(configPath)) {
  console.error(`Cannot find ${configPath}. Run this command from the project root.`);
  process.exit(1);
}

let content = fs.readFileSync(configPath, 'utf8');
const pattern = /export const SCOREMENU_RENDER_API_BASE_URL = '([^']*)';/;
if (!pattern.test(content)) {
  console.error('Cannot find SCOREMENU_RENDER_API_BASE_URL in src/config/restaurantMenu.ts');
  process.exit(1);
}
content = content.replace(pattern, `export const SCOREMENU_RENDER_API_BASE_URL = '${normalized}';`);
content = content.replace(/Public API URL for the deployed ScoreMenu backend on Render\./, 'Public API URL for the deployed ScoreMenu backend.');
content = content.replace(/Keep this aligned with the Render service name in render\.yaml\.\n \* If Render assigns a different slug, replace this value and rebuild the app\./, 'Replace this value before building the APK when moving between Render/VPS/domain/IP.');
content = content.replace(/return 'Kết nối máy chủ Render';/, "return 'Kết nối máy chủ online';");
fs.writeFileSync(configPath, content);
console.log(`Updated ScoreMenu API URL to: ${normalized}`);
