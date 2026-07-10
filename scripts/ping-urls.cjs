async function run() {
  const urls = [
    "https://asia-south1-plzping-me.cloudfunctions.net/getNfcVisitAnalytics",
    "https://getnfcvisitanalytics-q5eqilhrvq-el.a.run.app/"
  ];

  for (const url of urls) {
    console.log(`\nPinging URL: ${url}`);
    try {
      const res = await fetch(url, { method: "GET" });
      console.log(`Response Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response Body: ${text.slice(0, 200)}`);
    } catch (err) {
      console.log(`Error pinging: ${err.message}`);
    }
  }
}

run();
