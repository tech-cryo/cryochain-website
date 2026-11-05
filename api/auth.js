// Step 1 of the admin login: send the editor to GitHub. The state cookie stops forged logins.
import crypto from "node:crypto";

export default function handler(req, res) {
  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader("Set-Cookie", `oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const q = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID, scope: "repo,user", state });
  res.redirect(302, `https://github.com/login/oauth/authorize?${q}`);
}
