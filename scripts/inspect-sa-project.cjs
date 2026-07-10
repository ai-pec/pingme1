const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.log("serviceAccountKey.json not found.");
  process.exit(0);
}

const serviceAccount = require(serviceAccountPath);
console.log(`Service account project ID: "${serviceAccount.project_id}"`);
