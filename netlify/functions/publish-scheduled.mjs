// Runs on Netlify every 15 minutes. If a scheduled article's publish time has passed,
// it asks Netlify to rebuild the site, which publishes the article.
// One time setup: add a build hook in Netlify and save its link as the environment variable NETLIFY_BUILD_HOOK.
export default async () => {
  const site = process.env.URL || "https://www.cryochain.co";
  const hook = process.env.NETLIFY_BUILD_HOOK;
  if (!hook) { console.log("NETLIFY_BUILD_HOOK is not set, so scheduled articles cannot publish themselves yet."); return; }
  let times = [];
  try {
    const r = await fetch(`${site}/scheduled.json?t=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
    if (r.ok) times = (await r.json()).next || [];
  } catch (e) { console.log("Could not read scheduled.json:", e.message); return; }
  const due = times.filter((t) => Date.parse(t) <= Date.now());
  if (!due.length) { console.log(`Nothing due. ${times.length} article(s) scheduled.`); return; }
  const res = await fetch(hook, { method: "POST", body: "{}" });
  console.log(`${due.length} article(s) due. Rebuild requested: ${res.status}`);
};

export const config = { schedule: "*/15 * * * *" };
