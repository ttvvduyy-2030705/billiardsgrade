'use strict';

const fs = require('fs');
const path = require('path');
const {createSeedDatabase} = require('../data/seed');

const dataFile = process.env.SCOREMENU_DB_FILE || path.join(__dirname, '..', 'data', 'db.json');
fs.mkdirSync(path.dirname(dataFile), {recursive: true});
fs.writeFileSync(dataFile, JSON.stringify(createSeedDatabase(), null, 2));
console.log(`[scoremenu-server] reset demo database: ${dataFile}`);
