"use strict";

// Load environment variables BEFORE anything else
require("dotenv").config();

// Include the app.js file.
// This will run the code.
console.log("entrypoint");
const app = require("./app/app.js");