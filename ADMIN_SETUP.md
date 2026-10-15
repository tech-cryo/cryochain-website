# CryoChain Insights admin: setup and everyday use

The site now has an admin dashboard at **cryochain.co/admin** for writing and
publishing Insights articles. Nobody needs to touch the website code to post an
article.

How it works, in one line: you write in the admin, the admin saves the article
to your GitHub account, and Netlify (the web host) rebuilds the site within a
minute or two. The build crops the photos, makes the article page, and updates
the Insights page and the home page.

---

## Part 1. One time setup (about 45 minutes)

You need two free accounts: **GitHub** (stores the site and the articles) and
**Netlify** (hosts the site). Netlify's free plan is enough to start.

### 1. Put the site on GitHub

1. Create a GitHub account at github.com, then a new **private** repository
   called `cryochain-site`.
2. Unzip `cryochain-site.zip` and upload everything inside the `cryochain-site`
   folder to the repository.
   - The hidden `.gitignore` file must be included. On a Mac, press Command,
     Shift and full stop in Finder to show it before you drag everything in.
3. Open `admin/config.yml` in GitHub, click the pencil, and change this line to
   your account and repository name: `repo: YOUR-GITHUB-ACCOUNT/cryochain-site`

### 2. Host it on Netlify

1. Sign in to netlify.com with your GitHub account.
2. Choose **Add new site**, then **Import an existing project**, then GitHub,
   then `cryochain-site`.
3. Netlify reads the build settings from `netlify.toml` by itself. Click
   **Deploy**.
4. Add your domain under **Domain management** and follow Netlify's steps to
   point cryochain.co at it.

### 2b. Activate the form emails

Forms are delivered with FormSubmit. General forms go to `fresh@cryochain.co`;
the investor enquiry form, and any form where someone picks "Partner or
investor", go to `ir@cryochain.co`. After deploying, send one test form for each
address and click the confirmation link FormSubmit emails to
`fresh@cryochain.co` and `ir@cryochain.co`. Until then forms fall back to
WhatsApp.

### 3. Turn on admin logins

1. In GitHub, go to **Settings**, **Developer settings**, **OAuth Apps**, **New
   OAuth App**.
   - Homepage URL: `https://www.cryochain.co`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Copy the **Client ID**, and create and copy a **Client secret**.
3. In Netlify, open your site, find the **OAuth** section under access control,
   choose **Install provider**, pick **GitHub**, and paste both values.
4. Go to cryochain.co/admin and click **Login with GitHub**.

### 4. Give your team access

Anyone who should write articles needs a free GitHub account. Add them to the
repository under **Settings**, **Collaborators**, with **Write** access. They
then log in at cryochain.co/admin.

### 5. Publish scheduled articles on time

1. In Netlify, open **Build hooks** in the build settings, add a hook called
   `Scheduled publish`, and copy its link.
2. In Netlify, open **Environment variables**, add a variable named
   `NETLIFY_BUILD_HOOK`, paste the link as its value, and redeploy once.

A small check on Netlify now runs every 15 minutes. When a scheduled article's
time has passed, it rebuilds the site, so the article goes live within about 15
minutes of the time you set. It only rebuilds when something is due, so it does
not use up build minutes. You can see it under **Functions**,
`publish-scheduled`, in Netlify.

---

## Part 2. Publishing a weekly article

1. Go to cryochain.co/admin and open **Insights articles**, then **New
   Article**.
2. Fill in:
   - **Title**, and a short **Web address**, for example `caterer-checklist`.
   - **Publish date and time**, as the clock time in the publishing time zone.
     Use the current time to publish now, or a future time to schedule it.
   - **Publishing time zone**. Leave it empty to use the default (Ghana time),
     or pick another, such as Chicago or London.
   - **Topic**, **Author**, a few **Tags**, and a one or two sentence
     **Summary**.
   - **Main image**, then click on the photo in **Image focus point** where the
     subject is. The small previews show exactly how it will be cropped.
   - **Image description**, for people using screen readers.
   - **Video** (optional): paste a YouTube link and choose **In place of the
     banner photo** or **Just below the banner photo**. You can set a title, a
     caption, the second the video starts at, and the moment the hover preview
     starts from.
   - **Article**: write normally. Use **Heading 2** for sections. A quote block
     becomes a large pull quote. You can drop extra photos into the text, and
     paste a YouTube link on its own line to add a video between paragraphs.
   - **Ending buttons**: which sign up buttons appear at the end.
3. The right side of the screen shows a live preview in the site's own design.
4. Click **Save**. The article is now a **Draft** on the **Workflow** screen.
5. When it is ready, move it to **In review** so someone can check it, then
   **Ready**, then click **Publish**.

The article page, the Insights page and the home page update within a couple of
minutes.

**Coming soon cards.** Tick **Show as a Coming soon card** to show an article
idea on the Insights page without a link. Untick it when the article is written.

**Hiding an article.** Tick **Hide from site** to take it down without deleting
it.

---

## Part 3. Time zones and scheduling

- The default publishing time zone is Ghana time. Change it in **Insights
  settings**, **Main article and home page**, **Default publishing time zone**.
- Any article can use its own time zone. For example, to publish at 9:00 in the
  morning in Chicago, set the time to `09:00` and the time zone to **US Central
  (Chicago)**. The site works out the exact moment, including daylight saving
  changes.
- The time you type is always the clock time in the chosen time zone, even if
  your own computer is set to a different one.
- The date shown on the article is the date in its own time zone, so an article
  published at 23:30 in Chicago shows that day's date, not the next day's.
- To change the time of a scheduled article, edit it and publish again. To
  publish it early, set the time to now.

## Part 4. Choosing the main article

By default, the newest article is the main article at the top of the Insights
page and in the home page section.

To pin a different one, open **Insights settings**, then **Main article and home
page**, choose the article under **Main article**, and publish. Clear the field
to go back to showing the newest.

The same screen also changes the headings, the Insights page introduction, and
how many articles show before **Load more**.

---

## Part 5. Videos

Articles can mix photos and YouTube videos.

- **On the article:** each video shows a still image with a play button. The
  still is saved on your own site when it builds, so readers do not contact
  YouTube just by opening the page.
- **On cards:** articles with a video show a **Video** badge. On computers,
  pointing at the card plays a few silent seconds as a preview. Previews never
  run on phones, for people who prefer less motion, or on data saver.
- **Consent:** previews and instant playback only happen for visitors who allow
  **Videos** in Cookie settings. Everyone else is asked before a video plays,
  with **Play this video**, **Always allow videos** or **Not now**.
- **YouTube's suggested videos:** YouTube no longer lets websites turn off its
  "watch next" suggestions completely. The site works around this. When a video
  ends, a CryoChain screen with **Watch again** and **More from Insights**
  covers the player. When it is paused, a cover with a resume button hides
  YouTube's "More videos" panel. Hover previews always stop before the end of
  the video, so they never reach YouTube's end screen.

These are controlled in **Insights settings**, **Site settings**, **Videos**:

| Setting                         | What it does                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Hover previews                  | Turns hover previews on or off                                                               |
| Preview length                  | How many seconds a preview plays, from 2 to 15                                               |
| Hide YouTube's suggested videos | Uses the CryoChain end and pause screens described above                                     |
| Privacy enhanced mode           | Plays videos from youtube-nocookie.com, so YouTube stores less about visitors. Keep this on. |

Video plays and finishes are counted in Google Analytics as `video_play` and
`video_complete`, when analytics is on.

## Part 6. Photos

Upload any landscape photo, ideally at least 1600 pixels wide. You do not need
to resize or crop anything. On every build the site:

- crops the photo around your focus point into four brand sizes: the article
  banner (16:9), the cards (3:2), the main article box (4:3) and the link
  preview shown on WhatsApp, LinkedIn, X and Facebook (1200 by 630);
- makes a lighter version of each for phones, in both JPG and WebP;
- removes hidden data such as camera and location details from every file.

If a photo is narrower than 1600 pixels, the build log notes it, because it may
look soft on large screens.

---

## Part 7. Topics and authors

- **Topics** controls the filter buttons on the Insights page. Each topic has a
  name, a color (green, blue, teal, orange or purple) and its place in the
  filter bar. A topic only appears once it has an article.
- **Authors** holds names, roles, photos and short bios. They appear in the box
  at the end of each article. Articles default to "CryoChain team".

---

## Part 8. What readers get

- A main article at the top of the Insights page, plus the same article in the
  home page section
- Topic filters, search, and a **Load more** button
- On each article: topic tag, author, date, read time (worked out by itself),
  banner photo with caption, tags, sharing to WhatsApp, LinkedIn, X and
  Facebook, a copy link button, the author box, older and newer articles,
  related articles, and the monthly email signup
- An RSS feed at `insights-feed.xml`, a sitemap at `sitemap.xml`, and proper
  link previews when articles are shared

---

## Part 9. Cookie notice, videos and Google Analytics

Every visitor sees a cookie notice until they choose **Accept all**, **Reject
non essential**, or **Manage choices**. Their choice is remembered in their
browser, and anyone can change it later with **Cookie settings** in the footer.
The choices are:

- **Necessary**: always on. Remembers the cookie choice and keeps forms working.
- **Analytics**: Google Analytics, once you add your Measurement ID.
- **Videos**: YouTube videos and hover previews without asking first.

Visitors who chose before the Videos option existed are asked once more, so
everyone makes a choice that includes it.

### Turning on Google Analytics

1. Create a free Google Analytics account at analytics.google.com and add a
   **web data stream** for www.cryochain.co.
2. Copy the stream's **Measurement ID**. It starts with `G-`.
3. In the admin, open **Insights settings**, then **Site settings**, paste the
   ID into **Measurement ID**, and publish.

The site rebuilds and analytics is live within a couple of minutes. To switch it
off, clear the ID or untick **Turn on Google Analytics**.

### How it respects visitors

- Google Analytics only loads for visitors who accept analytics cookies. Nothing
  is sent for anyone who rejects them or has not chosen yet.
- If a visitor turns analytics off later in **Cookie settings**, tracking stops
  and Google Analytics cookies are removed from their browser.
- The admin pages never load analytics.

### What you will see in Google Analytics

Page views and visitors, plus these actions under **Events** (when **Track key
actions** is ticked):

| Event             | When it happens                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `generate_lead`   | Someone sends a form (farmer sign up, buyer access, truck booking, newsletter, contact, app reminder). The form name is included. |
| `whatsapp_click`  | Someone taps a WhatsApp button                                                                                                    |
| `app_store_click` | Someone taps the Google Play or App Store button                                                                                  |
| `book_call_click` | Someone taps Book a call with the founders                                                                                        |
| `select_content`  | Someone opens an Insights article from a card                                                                                     |
| `share`           | Someone shares an article or copies its link                                                                                      |
| `filter_topic`    | Someone filters Insights by topic                                                                                                 |

To see form sign ups as conversions, open **Admin**, **Events** in Google
Analytics and mark `generate_lead` as a key event.

### Before switching it on

- The Privacy Policy now names Google Analytics and YouTube (section 1(c) and
  section 10), and the Terms of Use cover third party video (section 9). Ask
  your lawyer to review these updates against Ghana's Data Protection Act.
- If the cookie policy changes later, raise the `version` number at the top of
  the cookie section in `assets/site.js`, so every visitor is asked again.

## Trying the admin on your own computer (optional)

With Node.js installed, open a terminal in the site folder and run
`npm install`, then `npx decap-server@3.11.3`. In a second terminal, run
`python3 -m http.server 8080` and open `http://localhost:8080/admin/`. Changes
save straight to the files on your computer. Run `npm run build` to see the
finished site in the `dist` folder.
