// Step 2 of the admin login: swap GitHub's code for a token and hand it to the admin window.
export default async function handler(req, res) {
  const { code, state } = req.query;
  const saved = /(?:^|; )oauth_state=([^;]+)/.exec(req.headers.cookie || "")?.[1];
  if (!code || !state || state !== saved) return res.status(400).send("Login failed: invalid state. Close this window and try again.");

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await r.json();
  const ok = Boolean(data.access_token);
  const msg = ok
    ? "authorization:github:success:" + JSON.stringify({ token: data.access_token, provider: "github" })
    : "authorization:github:error:" + JSON.stringify(data);

  res.setHeader("Set-Cookie", "oauth_state=; Path=/api; Max-Age=0");
  res.setHeader("Content-Type", "text/html");
  // Decap's login handshake: the popup says "authorizing", the admin answers, the popup sends the result.
  res.send(`<!doctype html><script>
(function () {
  var msg = ${JSON.stringify(msg).replace(/</g, "\\u003c")};
  window.addEventListener("message", function (e) {
    window.opener.postMessage(msg, e.origin);
    window.close();
  }, { once: true });
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`);
}
