import { createServer } from "node:http";
// Deliberately flawed, synthetic application for reproducible local demonstrations.
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Northstar · Traceglass test fixture</title><style>body{background:#101917;color:#d8e8dc;font:16px/1.7 system-ui;max-width:700px;margin:70px auto;padding:25px}h1{font-size:42px;letter-spacing:-2px}button,select{font:inherit;padding:10px 16px;border-radius:7px;border:1px solid #51705b;margin:8px 5px 8px 0;background:#a2e7cd;color:#153424}pre{white-space:pre-wrap;padding:20px;background:#223b2c;border-radius:8px}small{color:#b2c4b7}</style></head><body><small>TRACEGLASS / CONTROLLED LOCAL FIXTURE</small><h1>Northstar checkout</h1><p>Record once on the baseline, then on the candidate. Both runs request a bundle, project list, notifications and checkout. The candidate deliberately adds failures and extra work.</p><label>Build <select id="mode"><option value="baseline">Baseline · v2.8.4</option><option value="candidate">Candidate · v2.9.0</option></select></label><button id="run">Run checkout journey</button><pre id="result" aria-live="polite">Ready. Start capture in Traceglass first.</pre><script>
async function request(url,options){const response=await fetch(url,options);await response.text();return response;}
document.getElementById('run').onclick=async()=>{const mode=document.getElementById('mode').value;const button=document.getElementById('run');button.disabled=true;const log=document.getElementById('result');log.textContent='Running '+mode+'…';try{await request('/assets/app.js?mode='+mode);await Promise.all(Array.from({length:3},()=>request('/api/projects?mode='+mode)));await Promise.all(Array.from({length:mode==='candidate'?12:3},()=>request('/api/notifications?mode='+mode)));const checkout=await request('/api/checkout?mode='+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({test:true,token:'FIXTURE_SECRET_MUST_NOT_SURVIVE'})});log.textContent='Journey complete. Checkout HTTP '+checkout.status+'. Stop and save in Traceglass.';}catch(e){log.textContent=String(e);}finally{button.disabled=false;}};
</script></body></html>`;
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  }
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const candidate = url.searchParams.get("mode") === "candidate";
  const status = url.pathname === "/api/checkout" && candidate ? 503 : 200;
  const delay = url.pathname === "/api/projects" ? (candidate ? 620 : 180) : 25;
  setTimeout(() => {
    res.statusCode = status;
    res.setHeader(
      "Content-Type",
      url.pathname.endsWith(".js")
        ? "application/javascript"
        : "application/json",
    );
    res.setHeader(
      "Set-Cookie",
      "fixture_secret=FIXTURE_SECRET_MUST_NOT_SURVIVE; SameSite=Strict",
    );
    res.end(
      url.pathname.endsWith(".js")
        ? "/*" + ".".repeat(candidate ? 486000 : 214000) + "*/"
        : JSON.stringify({
            ok: status === 200,
            items: [],
            private: "FIXTURE_SECRET_MUST_NOT_SURVIVE",
          }),
    );
  }, delay);
});
server.listen(
  Number(process.env.TRACEGLASS_FIXTURE_PORT || 4174),
  "127.0.0.1",
  () =>
    console.log("Synthetic fixture: http://127.0.0.1:" + server.address().port),
);
