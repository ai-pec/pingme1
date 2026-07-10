const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: Missing service account file at scripts/serviceAccountKey.json");
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
admin.initializeApp();

const { getAuth } = require("firebase-admin/auth");

async function run() {
  const uid = "7zCv95yVFYabOdFuNZkadIjjL4N2";
  const apiKey = "AIzaSyBPD0pB1oCH_8gUdvWtzHryBrY0X-YNv54";

  console.log(`Generating custom token for UID: ${uid}...`);
  const auth = getAuth();
  const customToken = await auth.createCustomToken(uid);

  console.log("Exchanging custom token for ID token...");
  const exchangeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  
  const response = await fetch(exchangeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange token: ${errorText}`);
  }

  const tokenData = await response.json();
  const idToken = tokenData.idToken;
  console.log("Token exchanged successfully. Calling live getNfcVisitAnalytics API...");

  const apiUrl = "https://getnfcvisitanalytics-q5eqilhrvq-el.a.run.app/";
  
  const apiRes = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${idToken}`
    }
  });

  console.log(`\nHTTP Response Status: ${apiRes.status}`);
  const responseText = await apiRes.text();
  console.log("HTTP Response Body:");
  try {
    console.log(JSON.stringify(JSON.parse(responseText), null, 2));
  } catch {
    console.log(responseText);
  }
}

run().catch(err => {
  console.error("Integration test failed:", err);
});
