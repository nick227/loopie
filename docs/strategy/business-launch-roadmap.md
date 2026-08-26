# LOOPIE 90-Day Launch Plan

**26 August 2026 – 24 November 2026**  
Midnight Creative · LOOPIE · **$299/month**

LOOPIE is one login for **ads, contacts, email, lead status, and recording a sale**. Midnight Creative sells LOOPIE **from inside LOOPIE** — no side spreadsheet, no personal inbox, no ad-spend sheet that is not a Campaign. If a step is not possible in LOOPIE yet, do it by hand, write that on the contact or campaign, and tag it `gap`.

Ad **buying** happens on Meta, Google, and the like. LOOPIE is the book: campaign, creative, budget, destination, spend, and the lead that came back. Live platform sync is not this quarter — type spend in. Do not take a LOOPIE card until a stranger can register, import contacts, send a real email, and see it. The 20-minute demo **does** show one ad → one person → one follow-up. It does not promise that Facebook types the numbers in for us, or texts, or posting to their social.

---

## 90 days

| Week | Product | Marketing | Ads (buying) | Sales | Customer |
| --- | --- | --- | --- | --- | --- |
| **1–2** · by 4 Sep | Screens in progress | Page, booking, emails 1–8 live | Ad accounts listed; no spend | Booking calendar on | — |
| **3** · by 11 Sep | **M1** QA pass + demo + **our** workspace | Kit + templates; profiles + 3 posts | Our two Campaigns in LOOPIE, $0 spend, destinations set | First outbound **from LOOPIE** | CSV + 7-step list |
| **4** · by 18 Sep | **M2** real email | Screenshots if UI is clean; posts 3×/week | Tracked click → page → contact on demo data | Demos include ad → person → follow-up | Practice 7 steps on Riverside |
| **5** · by 25 Sep | **M3** live site | Page still matches live | Live tracked URLs; spend still typed in | Same 20-minute demo | Login + import on live |
| **6** · by 2 Oct | **M4** billing | Payment + welcome | Our ads only if GM wrote a cap. Client ads only if quoted. | First cards. No discount. | **Managed start** (email). Ads handoff if quoted. |
| **7–10** · to 30 Oct | Fix send + ad→lead breaks | Proof + referral after two shops send | Daily spend log in LOOPIE. Pause losers. | Same kit every day | Live in 14 days; they send email #2 |
| **11–13** · to 24 Nov | **M5** first-customer bugs + proven `gap`s | Page, posts, claims still true | Self-run clients enter their own spend. We buy only on quoted accounts. | New hire trains, then demos | Most **self-run**. Managed ads only if GM quoted. |

---

## Engineering milestones — QA acceptance

A milestone is not done when the code is merged. It is done when someone who did **not** build it runs the tests below and they all pass. Fail = not shipped.

### M1 · Screens and demo data · 11 Sep

**Build:** Contacts, lists, write-and-send email, leads, sales, home, **campaigns** (name, platform, budget, dates, destination, typed spend). Load demo business **Riverside Mechanical** with contact **Jordan Hale** (Quoted, last note “Can you do next Tuesday?”, no follow-up sent) **and** one Campaign whose lead is Jordan Hale.

**QA — pass only if all true:**

1. New user registers, logs out, logs in. Sees only their own data.
2. Import a 40-row CSV. Search finds Jordan Hale. Duplicate email does not create a second person.
3. Open Jordan Hale. Change lead status. Record a sale. Both show on that contact.
4. Compose an email to a small list (send may still be fake). Preview shows the real body they typed.
5. Home is not a JSON dump. At least one contact or lead is visible.
6. A second person can run the 20-minute demo without asking engineering where to click.
7. On the **Midnight Creative** account (not Riverside): add 8 contacts, put them in an audience, send template “Email 1”, set each lead to Contacted, add a note. That is the sales workspace QA.
8. Open Riverside’s Campaign. See budget, destination, and a spend number (even $0). Open Jordan Hale and see that person is tied to that campaign — not a separate “ad lead” pile.

### M2 · Real email · 18 Sep

**Build:** Mail actually leaves LOOPIE.

**QA:**

1. Send one test to the QA inbox. It arrives within 5 minutes. From-name is LOOPIE or the demo business, not a raw server address.
2. Send to a list of 5. All 5 arrive. LOOPIE shows sent, not stuck.
3. A failed address is marked failed on the message, not silent.
4. Jordan Hale’s contact still shows the send.

**Ads check (same week if the click path is already on the server):** click the tracked campaign link, land on the page, submit the form (or book). A contact exists with source = that campaign. If this fails, tag `gap` — Ads still logs spend by hand; they do not wait to buy.

### M3 · Live site · 25 Sep

**Build:** Public app on the internet. HTTPS. Backups. Privacy and terms links in the footer.

**QA:**

1. From a phone on cellular (not office wifi): open the URL, register, log in.
2. Repeat M1 tests 1–5 and 8 and M2 tests 1–2 on that live URL. Repeat the M2 ads click check on live.
3. Kill the tab, come back next day, still logged in or can log in.
4. Privacy and terms open. Support email is real.

### M4 · Take payment · 2 Oct

**Build:** Charge $299, refund, cancel.

**QA:**

1. Pay with a real test card. Login still works. Receipt email arrives.
2. Refund that payment. Record shows refunded.
3. Cancel. Next month does not charge.
4. A second account cannot see the first account’s contacts.
5. One full path on live: register → pay → import → send email → see it. Run by QA, not the author. If a campaign exists, also: click tracked ad link → contact in LOOPIE.

**Do not collect a customer card until M4 passes.**

### M5 · First customers · 24 Nov

**Build:** Only bugs that stopped a paid user from importing or sending.

**QA:** Each reported blocker has a ticket, a fix, and a re-test by the person who hit it (or QA if they cannot). No new product areas except `gap` tags that blocked a demo, a payment, a first email, **or an ad click that never became a contact**.

---

## Marketing materials (30)

Put every file in `LOOPIE-sales-kit/` **and** in LOOPIE (templates for anything we send, notes for anything we say). Sales should not write from scratch. If it is not a LOOPIE template or on the contact, it does not exist.

| # | File | Sales uses it | Due |
| --- | --- | --- | --- |
| 1 | Public page (one URL, book button, price $299) | Send instead of a pitch deck | **4 Sep** |
| 2 | One-pager PDF | Attach to email 1; leave after demo | **4 Sep** |
| 3 | Email 1 — first touch | Day 0 outbound | **4 Sep** |
| 4 | Email 2 — bump | Day 3, same thread | **4 Sep** |
| 5 | Email 3 — last note | Day 7, then stop | **4 Sep** |
| 6 | Instagram / Facebook DM | When that is how they market | **4 Sep** |
| 7 | Voicemail (15 seconds) | After a no-answer call | **4 Sep** |
| 8 | Phone opener (20 seconds) | Live pickup | **4 Sep** |
| 9 | Email signature + booking link | Every outbound | **4 Sep** |
| 10 | Calendar booking + invite text | “Book 20 minutes” | **4 Sep** |
| 11 | Demo confirmation + “bring this” | Auto on book | **11 Sep** |
| 12 | No-show email (two new times) | Same day they miss | **11 Sep** |
| 13 | Same-day after-demo email (yes / not now / lost) | Before they leave the call | **11 Sep** |
| 14 | 20-minute demo script | Every demo, same clicks | **11 Sep** |
| 15 | Price sheet (in / out / how to pay) | Minute 12 of the demo | **11 Sep** |
| 16 | Objection card (five nos) | On the call | **11 Sep** |
| 17 | Contact import CSV | They fill it; we import | **11 Sep** |
| 18 | First-send checklist (7 steps) | Hand to them at close | **11 Sep** |
| 19 | 4 screenshots: Jordan Hale, send, lead, sale | Only after M1 QA says the UI is fit. Until then, no shots. | **18 Sep** |
| 20 | Pay-now email (card link, $299, cancel anytime) | When they say yes | **2 Oct** |
| 21 | Welcome + “send your CSV” | Same day they pay | **2 Oct** |
| 22 | Proof sentence + referral ask | After **two** customers have sent a real email and said yes in writing | **14 Oct** or skip |
| 23 | Three social posts (reuse) | Every post ends at the booking URL | **11 Sep**, then 3×/week |
| 24 | Profile bios (Instagram, Facebook, LinkedIn) | Bio = one sentence + book link | **11 Sep** |
| 25 | Share image for the public page | Link previews do not look empty | **11 Sep** |
| 26 | Source cheat-sheet | Sales/marketing/ads tag the same way | **11 Sep** |
| 27 | Ads one-pager (what $299 includes vs buying ads) | Sales leaves this when they ask “do you run Facebook?” | **11 Sep** |
| 28 | Ad creative brief + approval line | Ads does not buy until they sign the words/image | **11 Sep** |
| 29 | Daily spend log (platform → LOOPIE) | Ads types yesterday’s spend into the Campaign | **11 Sep** |
| 30 | Pause / kill rule (one page) | Stop a campaign at cap or when cost-per-book blows the cap | **11 Sep** |

**How to use, in order:** 3 → 4 → 5 (or 6/7/8) → 10 → 11 → 14 with 15–16 and **27** if they ask about ads → 13 → 20 → 21 → 18. Item 2 goes with 3 and at the end of 14. Item 19 only on the call or in 13, never in cold email until M1 passes. Item 22 only in the next wave of 3. Items 23–25 are marketing’s public face; 26 is how inbound is saved. Items **28–30** are Ads’ daily kit.

Do not add a brand book, investor deck, video, or blog. **Paid ads are a job this quarter** (see Ads team). Do not buy until GM writes a cap (our money) or the client quotes ads (their money).

---

## Our LOOPIE workspace (set up by 11 Sep)

One business in LOOPIE: **Midnight Creative**. This is the real sales book, not a demo. Riverside Mechanical stays a demo-only account.

**Lead stages we use (as they exist today):**

| Stage in LOOPIE | Means for us |
| --- | --- |
| New | Saved, not reached |
| Contacted | Email 1 or call done |
| Qualified | Demo is on the calendar |
| Quoted | Demo done, asked for $299 |
| Won | Card taken. Also record a **Sale $299**. |
| Lost | No, too expensive, or silent after email 3. Keep the contact. |

**Audiences to save:** Added this week · Silent 3 days · Silent 7 days · Demo this week · Quoted not paid · Won, no CSV · Check next month · Saw their ads · Inbound website · Inbound social.

**Templates to save (kit copy, not new writing):** Email 1, 2, 3 · Demo confirm · No-show · After-demo · Pay-now · Welcome + CSV · Referral ask.

**Tags:** `next:day3` `next:day7` `next:demo` `next:pay` `next:csv` `next:month` `gap` (left LOOPIE to finish the step) plus source: `google` `facebook-ads` `walk-in` `street` `referral` `website` `social` `outbound`.

**Campaigns (required, not optional):**

| Campaign | Whose money | Destination | Job |
| --- | --- | --- | --- |
| LOOPIE runs LOOPIE | Ours (only after GM cap) | Public page / book 20 min | Book demos from people who already want a simpler follow-up |
| Where did the lead go? | Ours (only after GM cap) | Same | Book demos from shops already running ads |
| *(client name) — (concept)* | **Theirs**, on their ad account | Their LOOPIE landing page or tracked URL | New leads into **their** Contacts — never into Midnight Creative’s book |

Every dollar spent is typed onto that Campaign (spend, dates, platform). Client spend is never LOOPIE revenue. Our buying hours are a quoted line, not $299.

**Home** is the morning list: new leads (including ad leads), people with `next:*` due, failed sends, **campaigns over cap or with $0 activity**. If Home cannot show a hot campaign, that is a `gap`.

---

## Sales team — daily work

Do these **in LOOPIE**. One item done properly is a new contact **or** a $299 sale on the record. If the list is finished before the day ends, start again at 1. Send only saved templates.

**Every weekday, in order:**

1. **Contacts:** add **8** shops you did not already have. Name, phone, email, company, source (Google / Facebook / walk-in). Create a lead at **New**. Do not send until they are saved.
2. **Messages:** send template Email 1 to those 8 (audience “Added this week”). Put the booking URL in the template. If you cannot attach the one-pager, paste the public-page link and tag `gap`.
3. **Call**, then on the contact log **Call** (or a note if Call is missing — `gap`). Pickup: stay until a demo time exists **or** they say no. Set stage **Qualified** or **Lost**. Write why.
4. No answer: voicemail, then send the booking link from LOOPIE (Email 1 or a one-line follow-up template). Log the call.
5. Instagram/Facebook DM after the call. Paste a copy of the DM into a **note** on the contact. If LOOPIE cannot send or store DMs, that is a `gap` — still save the text.
6. “Email me something”: send Email 1 + public page **from LOOPIE** that hour. Tag `next:day3`. Do not wait for them to book.
7. Open audience **Silent 3 days** (or tag `next:day3`). Send Email 2. Call once. Log both.
8. Open **Silent 7 days**. Send Email 3. Stage **Lost**. Tag `next:month`. Stop poking.
9. Every reply — type it as **Reply** or a note the same hour. “Not interested” → **Lost**, do not delete.
10. Demo booked: stage **Qualified**, tag `next:demo`. Send Demo confirm from LOOPIE. Add partner/office manager as a **second contact** at the same company.
11. Morning: Home + audience **Demo this week**. Confirm the time. Cancel → two new times, keep **Qualified**.
12. No-show: send No-show template, call once, log it. Rebook → stay Qualified. No rebook → **Quoted** or **Lost** with reason (pick Lost if they went cold).
13. Demo: script 14. Show Jordan Hale **and** the Campaign that produced them (ad → person → follow-up). Minute 12 is price **$299 software**. Ads we buy for them are a **separate quote** (kit 27). Ask “Do you want to start this week?” before you hang up.
14. **Yes** and M4 passed: send Pay-now from LOOPIE while they are still on the call. When the card clears: stage **Won**, **Sale $299**, send Welcome + CSV. Say out loud: **we get the first email out with you; after that you run LOOPIE unless we quoted managed. Buying ads is extra — Ads will quote if you want that.** Hand to Customer the same day. If they want ads, tag `ads:quote` and ping Ads — do not say “we’ll just turn Facebook on.”
15. “I’ll pay later”: tag `next:pay`, keep **Quoted**, 15-minute pay call today or tomorrow on the contact note. Miss that call → not a sale.
16. “Think about it”: note the real objection. If it is “I need you to run my ads,” that is kit 27 + Ads quote, not a discount on $299. Texts are not in this launch. Rebook this week or **Lost**. Send After-demo template.
17. “Too expensive”: **Lost**, note “price”, do not discount. No new bargain email.
18. “Send a deck”: Email 1 + public page from LOOPIE. New contact for the partner if you get a name. Offer a second 20 minutes with both.
19. After **Won**: ask for one intro. New names → new contacts, source `referral`, send Email 1. Referral template when you have written permission.
20. Audience **Won, no CSV**: call, log it, get a CSV date, tag `next:csv`.
21. First of the month: audience **Check next month**. Set back to **New** or **Contacted**, send Email 1 or call.
22. Street or Google list: 10 shops → 10 contacts before lunch, then steps 2–4.
23. Shop running ads: contact that day, source `facebook-ads` or `google`, Email 1 with that fact in the first line (`{Company}`). Tell Ads if they look like a buying client (already spending, messy follow-up).
24. Accountant / insurer / web person: three owner names → three contacts, source `referral`, before you leave the conversation.
25. **4:00 p.m. — Home:** every Midnight Creative lead with no tag `next:*` and not Won/Lost gets a next step or **Lost** with reason. If Home cannot list those people, filter by stage and tag `gap`.

**Do not count as work:** rewriting templates, a personal Gmail thread, a spreadsheet of names, LinkedIn with no LOOPIE save.

**Day is a win if:** 8 new contacts are in LOOPIE, or 1 Sale $299 is recorded, or both.

---

## When LOOPIE cannot do it yet

Finish the step anyway (phone, Calendly, Stripe, Instagram, **Ads Manager**). Then on that contact **or Campaign**:

1. Note one line: what you did **outside** LOOPIE.
2. Tag `gap`.
3. Do not move the lead forward unless the contact record is updated (stage, note, or send).

**Friday:** engineering opens every `gap` from this week. Duplicate asks collapse to one. Anything that blocked a demo or a payment can enter **M5**. Anything else waits. Do not build a second CRM while these sit.

**Already expected (log them when they bite, so we have proof):**

| We will hit this | Workaround now | What LOOPIE would need |
| --- | --- | --- |
| Day 3 / day 7 follow-up does not send itself | Sales sends Email 2/3 by audience | Follow-up that actually runs |
| No “next action” date on a contact | Tags `next:day3` etc. | Next action + date on Home |
| Booking lives in Calendly | Paste the time in a note | Book 20 minutes from the contact |
| Pay lives in Stripe | Human records Sale $299 after the card | Paid → Won + Sale without a second typing |
| Cannot attach the one-pager | Link the public page | File on the email |
| Calls and Instagram DMs | Note / Call log | Log a call or paste a DM without leaving |
| Home does not show “no next step” | 4 p.m. manual filter | Home queue for our own pipeline |
| Stages are New…Lost, not “demo booked” | Qualified = demo booked | Fine if the table above stays taught; change only if sales keeps mis-clicking |
| Social posts are not in LOOPIE | Paste post URL on the Campaign | Save a social post against a campaign |
| Calendly books do not create contacts | Marketing/sales add them same day | Booking → contact + Qualified |
| Friday counts are a handwritten note | Pinned “Weekly numbers” contact | Home: contacts / books / Won by source |
| Our staff has no “work as the client” login | Second user on their business (our email) with their OK | Staff access that is not a shared password |
| Meta/Google do not type spend into LOOPIE | Ads types yesterday’s numbers on the Campaign | Live spend sync (V2 — do not promise a date) |
| Buying still happens in Ads Manager | Create the Campaign in LOOPIE **before** the first dollar | Push budget/creative from LOOPIE to the platform |
| Ad click does not create a LOOPIE contact | Use tracked URL / landing page; fix or `gap` | Click → session → form/book → Contact + Lead |
| Client ad spend mixed with our SaaS | Separate: their platform bill vs $299 vs our buying fee | Clear three-line invoice |

This list grows from real `gap` tags. Do not add features from imagination.

---

## Online marketing team

Marketing’s job: a stranger understands LOOPIE, sees $299, and books 20 minutes. Sales runs the demo and takes the card. Marketing does not invent a second pitch.

**One line we use everywhere (page, posts, bios):** Keep every lead and follow-up in one place. Book a 20-minute walkthrough. $299/month.

**We may say:** contacts, email they can see, lead status, record a sale, **ad leads land in the same login**, they approve what goes out and what we buy.  
**We may not say:** LOOPIE types Facebook/Google numbers in by itself, we send texts, we post to their social, we will make them more revenue.

Marketing owns the page, posts, and organic inbound. **Ads owns paid media** (our dollars and client dollars). Marketing does not log into Ads Manager.

### Goals (by 24 Nov)

| Goal | Done when |
| --- | --- |
| Page books meetings | URL live **4 Sep**. Button puts 20 minutes on the sales calendar. |
| Sales never writes copy | Kit 1–26 in the folder **and** as LOOPIE templates **11 Sep**. |
| People can find us | Bios + 3 posts live **11 Sep**. Then **3 posts every week**, each with the book link. |
| Inbound is in LOOPIE | Same day someone books or comments, they are a contact with source `website` or `social`. |
| We know what worked | Friday: count new contacts, books, demos, and Won by source. `unknown` is fine. |
| Inbound pulls its weight | **10 completed demos** in 90 days whose first touch was the page or a post (not sales outbound). If not, change the page or posts — not the price. |
| Proof without lying | Item 22 only after two shops sent a real email and said yes in writing. |
| Paid vs organic | Marketing does not spend. Ads spends only with a GM cap. Friday counts split `website` / `social` / **campaign** / `outbound`. |

### Responsibilities

| Marketing owns | Ads owns | Sales owns | GM owns | Engineering owns |
| --- | --- | --- | --- | --- |
| Public page, bios, posts, kit copy | Buying, spend log, pause/kill, tracked destinations | Outbound 8/day, demos, close | Price, claims, **our** ad cap, client ad quotes | App, demo account, live site, billing, tracked links |
| Organic inbound contacts | Campaign + source on paid inbound | Outbound contacts | Refunds | `gap` on send **or** click→contact |
| Friday organic counts | Friday spend and cost-per-book | Lost reasons | Opening our spend | Screenshots date (M1) |

Marketing does **not** discount, run a custom demo, promise texts, start a blog, or **buy ads**.

### Requirements (what marketing needs)

| Need | From | By |
| --- | --- | --- |
| Price $299 and the claims list above, in writing | GM | **4 Sep** |
| Booking URL on the sales calendar (20 min, 10 min buffer) | Sales | **4 Sep** |
| LOOPIE login on Midnight Creative, permission to edit templates and campaigns | Engineering | **11 Sep** |
| “UI is fit” for screenshots | Engineering (M1 QA) | **11 Sep** / shots **18 Sep** |
| Privacy + terms URLs for the page footer | Engineering | **25 Sep** (M3) |
| Every Calendly book named so we can match a contact | Sales | ongoing |
| Lost reasons added to the objection card | Sales | Fridays |
| Written OK to name a customer | Sales / the customer | before item 22 |

If a need is late, marketing ships without it (text posts, no screenshots) and tags `gap` — they do not wait in a doc forever.

### Deliverables

**Once (dates in the kit table):** items 1–2, 9–10, 23–26, plus loading all sendable copy as LOOPIE templates.

**Every week after 11 Sep:**

1. Three posts (rotate the same three stories until one clearly books demos).
2. Page still matches the product (channels, price, what is not included).
3. Every new booker / commenter is in LOOPIE with a source.
4. Friday numbers: contacts created, books, demos completed, Won — split `website` / `social` / `outbound` / `referral` / `unknown`.

**When allowed:** item 22 (proof). Paid creative and spend are **Ads**, not this list.

### Daily work (in LOOPIE and on the public channels)

If the list is done, start again at 1. Creating a contact or a booked demo counts; “designing” does not.

1. Open Home. Failed sends and new inbound leads first.
2. Anyone who booked since yesterday and is missing from LOOPIE: add them, source `website` or `social`, stage **Qualified**, tag `next:demo`.
3. Anyone who commented, DMed, or emailed the public address: add as a contact the same day. Do not leave them in the social inbox.
4. Reply to comments/DMs with the book link only (kit 6 / page). Paste the reply into a note.
5. If it is a post day: publish the next of the three posts. Put the post URL in a note on Campaign **LOOPIE runs LOOPIE** (or **Where did the lead go?** if the post is about missed leads). If LOOPIE cannot store a social post, tag `gap` and still save the URL on that campaign.
6. Check the public page: price, book button, “not included.” Fix the same day if engineering shipped a change (e.g. email went live, or slipped).
7. Add **5** local shops from Instagram/Facebook who are running ads or posting for work. Contacts, source `social` or `facebook-ads`, audience **Saw their ads**. Sales may email them; marketing’s job is they exist in LOOPIE.
8. Send nothing from a personal account. If a stranger must be emailed, use a LOOPIE template.
9. Match Calendly names to contacts. Missing email? Get it from sales that day.
10. Tag every new contact with exactly one source from the cheat-sheet. Two sources = pick the first touch.
11. Audience **Inbound website** and **Inbound social**: anyone sitting at New with no next tag gets Email 1 or a book-link note today.
12. Draft nothing new unless Friday numbers say a post or the page is not booking. One change at a time.
13. After two Live customers and written OK: ship item 22 into Email 1 and one post. Not before.
14. Record nothing as “ad spend” on a social post. That is Ads’ Campaign. If a post is boosted, Ads owns it — marketing only wrote the words.
15. 4:00 p.m.: every inbound lead from this week is either Qualified (booked), Contacted, or Lost. No anonymous “leads” in a social app.
16. Friday: write the four counts (contacts / books / demos / Won by source) in a LOOPIE note on a pinned contact named “Weekly numbers” if Home cannot show this. Tag `gap` if we cannot see it on Home.

**Week is a win if:** the page still books, 3 posts went out, and every inbound name is a LOOPIE contact with a source.

---

## Ads team — buying

Ads’ job: **turn money into contacts we can follow up.** Buying is on Meta/Google (or LOOPIE’s own ad server). The record is a Campaign in LOOPIE. If spend is not on the Campaign, it did not happen.

Budgets, kill lines, SLAs, and the two campaign strategies: [Ad budgets, metrics, SLAs, and strategies](ad-budgets-metrics-slas.md).

Two books, never mixed:

1. **Our money** — Midnight Creative buying to book LOOPIE demos. GM writes a dollar cap first. Stop at the cap (kit 30).
2. **Their money** — the client’s ad account. We may click buy **only** when GM quoted buying. Leads land in **their** LOOPIE. Their media bill is not our $299.

### Goals (by 24 Nov)

| Goal | Done when |
| --- | --- |
| Nothing spends in the dark | Every live buy has a Campaign, creative, platform, budget, dates, destination **before** the first dollar |
| Clicks become people | Tracked URL or landing page. New person is a Contact + Lead on that campaign |
| Spend is in LOOPIE by noon | Yesterday’s platform numbers are typed on the Campaign (kit 29). Sync is not required |
| We know when to kill it | Kit 30: cap hit or cost-per-book / cost-per-lead over the written number → pause the same day |
| Our own ads | LOOPIE runs LOOPIE and Where did the lead go? exist **11 Sep** at $0. Spend only with a GM cap |
| Client ads | No buy on a $299-only account. Quoted accounts: first campaign live in 7 days after access to their ad account |
| Self-run ads | Client can see the Campaign and type spend (or we type it). They approve creative (kit 28) even when we buy |

### Responsibilities

Ads owns: platform accounts, budgets, pause/resume, creative traffic, spend log, tracked destinations, cost-per-book.  
Sales owns: whether ads are quoted (tag `ads:quote`).  
Customer owns: email Live path — not media.  
Marketing owns: page and organic posts; hands Ads the book-link URL.  
GM owns: our cap and client buying quotes.  
Engineering owns: campaign screens, tracked click, landing page / form → contact.

Ads does **not** discount LOOPIE, send their customer emails, or run spend without a Campaign row.

### Requirements

| Need | From | By |
| --- | --- | --- |
| Campaign screens + demo campaign on Riverside | Engineering (M1) | **11 Sep** |
| Tracked click → contact (or a written `gap`) | Engineering | **18 Sep** |
| Public page / book URL as a destination | Marketing | **4 Sep** |
| GM cap (our money) or written “$0” | GM | before any Midnight Creative dollar |
| Client ad-account access + creative approval | Customer / client | before we buy for them |
| Quote amount and what “managed ads” includes | GM | before Sales says we will buy |
| Kit 27–30 | Marketing writes, Ads uses | **11 Sep** |

### Daily work (in LOOPIE, then in the platform)

Creating a Campaign, logging spend, or a new attributed contact counts. “Tweaking in Ads Manager” with no LOOPIE row does not.

1. Open Home, then every **Active** Campaign. Pause anything over cap or with no destination.
2. Type **yesterday’s spend, impressions, clicks** on each Campaign. $0 is a number. Blank is a failure.
3. New leads from ads: confirm they are Contacts on the **right business** (ours vs theirs) with source = that campaign. Wrong book → fix the same hour, tag `gap` if the tracker did it.
4. **Our** campaigns: if GM cap is $0, do not turn the platform on. If cap exists, stay under it. Cost-per-book over the kill rule → pause, note on the Campaign, tell Sales.
5. **Client** campaigns: buy only if quoted. Check their approval (kit 28) is still the live creative. Changed copy without approval → pause.
6. Before any new spend: Campaign exists in LOOPIE with budget, dates, destination (their landing page or tracked URL — not a naked Facebook lead form that never hits LOOPIE, unless that form is piped in; if it is not, `gap` and fix destination).
7. Upload/change creative on the platform only after a new creative version in LOOPIE. Do not overwrite history.
8. Landing page or `/r/` link: click it yourself every morning. If it 404s or drops the session, pause ads, ping engineering, tag `gap`.
9. Sales tag `ads:quote`: same day, write a one-line scope (platforms, monthly media, our fee) to GM. Do not start buying.
10. New quoted client: get ad-account access. Build their first Campaign in **their** LOOPIE within 7 days. Second user on their business if we click.
11. Self-run clients who buy their own ads: teach them the spend-log (kit 29). If they will not type numbers, we type them only on quoted managed ads.
12. Never pay client media from Midnight Creative’s card. Their card on their account.
13. Never pay our LOOPIE ads from a client account.
14. Audience **Saw their ads** / shops Sales flagged: one note on whether they are a buying prospect. Do not spam; Sales emails.
15. First-party LOOPIE ads (`AdUnit`) if we use them: same rules — Campaign, destination, log impressions/clicks. No orphan units.
16. 4:00 p.m.: every Active campaign has today’s check. Draft campaigns with a start date of tomorrow still have destination + approval.
17. Friday: spend vs cap, clicks, contacts created, books, cost-per-book — per Campaign, in LOOPIE. `unknown` source on a paid click is a `gap`.

**Day is a win if:** every dollar that ran has a Campaign row with yesterday’s spend, and every ad lead sits on the correct account.

---

## Self-run vs managed

LOOPIE is one product. The difference is **who clicks**. The customer always approves anything their customers will see **and** any ad creative we run. We never send a first blast or turn on a buy without that yes.

**Where we are going:** almost every account runs itself — including typing spend and pausing ads. Our people should not be the way LOOPIE works.

**Where we are now:** the first shops will not get Live if we only email them a login. So we do the first **email** with them. Ads we **buy** only when quoted.

| | **$299 self-run** (the offer) | **Managed start** (every new paid account, ~14 days) | **Managed ongoing** (not in $299) |
| --- | --- | --- | --- |
| Who it is for | Owner will log in after they have seen one send | Everyone we just charged | Big or busy accounts who will not run it — **GM quotes a price** |
| Import / clean list | Them, we help once | Us | Us |
| Draft the email | Them | Us | Us |
| Approve the exact words | Them | Them | Them |
| Send | Them | Us, they watch on screen | Us |
| Replies and lead status | Them | We show Home; they answer their customers | We flag Home; they still answer unless GM sold reply-handling |
| Next email after Live | Them | Them. We sit in on send #2 once if they freeze. | Us, on a written cadence |
| Ads in LOOPIE (record campaign, type spend) | Them | We set up the first Campaign if they already buy ads | Us, on quoted accounts |
| Ads we **buy** on Meta/Google | Not included | Not included | **GM quote.** Their media bill + our buying fee. Not $299 |
| Texts / social publish to networks | Not sold | Not sold | Not sold unless GM wrote it |

**Big account** here means they will not log in, they have a large list, or they asked us to run it. Size alone is not a reason to work for free. Managed ongoing is hours we sell, recorded as its own money — not hidden inside the $299 SaaS.

**Sales may say:** “Included: login, ads and emails in one place, and we get your first follow-up email out this week. You approve the words. After that you send from LOOPIE. If you want us to buy Facebook/Google for you, that is a separate quote.”  
**Sales may not say:** “We will run your ads every week” or “spend syncs live” unless GM wrote it.

**In LOOPIE (90 days):** their business is their workspace. For managed start, add a **second user** on that business with a Midnight Creative email, with their permission. Do not share their password. If we need a real staff-on-behalf login, tag `gap` — do not build an agency portal this quarter.

**Graduate:** Live = first approved **email** visible (kit 18 step 6). **Self-run** = they sent a **second** message we did not draft. Self-run **ads** = they (or we on quote) log spend on their Campaigns. If they will not send #2, quote managed ongoing or accept they may churn — do not quietly keep doing their job on the $299 plan. Do not quietly keep buying ads on $299.

---

## Customer team (after they pay)

Job: first send in 14 days, then they can repeat it without us.

### Goals (by 24 Nov)

| Goal | Done when |
| --- | --- |
| Same-day handoff | Every Won has a login, a CSV request, and a named Customer owner the day the card clears |
| Live in 14 days | Kit 18 steps 1–6 done. Not “they paid.” |
| They keep the account | Second send is **theirs** (self-run) unless GM quoted managed |
| Proof is real | Two Live shops + written OK before marketing uses names |
| We know the mode | Contact/business tagged `self-run` or `managed` — never unclear |

### Responsibilities

Customer owns the 7 steps, the day-7 call, and tagging the mode. Sales owns the close sentence (managed start, not forever) and `ads:quote`. **Ads owns buying.** Engineering owns import/send and click→contact. GM owns managed quotes and ad caps. Marketing does not onboard or buy.

### Requirements

Welcome email and CSV (kit 17, 21), a working import and send (M2+), their approval in writing or on the call before send, and a second user on their LOOPIE if we are clicking for them.

### Daily work (their LOOPIE, not only ours)

1. Open **Won, no CSV**. Chase the list. No CSV by day 3 → call, log it.
2. Import. Pull duplicates and obvious opt-outs. Audience: quoted-and-quiet **or** past-6-months — pick one with them.
3. Draft the first email. Send the exact text for approval. Do not send without it.
4. Send to ≤50. Show them the send in LOOPIE. That is Live. Tag `self-run` after you book send #2 on their calendar, or `managed` only if GM quoted.
5. Day 7: 15-minute check. They click. If they cannot, sit with them for send #2 once.
6. Home on their account: failed sends, unreplied mail. They own replies to their customers. We do not become their front desk.
7. If they ask “just keep doing it” (email **or** ads): write the hours, send to GM, do not say yes on the call. Tag `ads:quote` if the ask is media.
8. Friday: count Live, self-run (sent #2), still-managed-start, quoted managed, **quoted ads**. Tag `gap` on import/send failures. Ping Ads if `ads:quote` is stale.

**Week is a win if:** every new payer is inside the 14-day path, and no $299 account has us silently sending for them past send #2.

---

## New salesperson (after M4)

Train in the **Midnight Creative** LOOPIE account (real pipeline) and demo on **Riverside Mechanical** (fake customer).

**Week 1** — Read 15, 16, and **27**. Watch two demos. Run 14 on Riverside (Jordan Hale **and** the Campaign). Add 8 real contacts and send Email 1 from LOOPIE. Pass = demo + $299 + “ads are a quote” with no notes, and those 8 exist in LOOPIE.

**Week 2** — Send only Email 1–3 from LOOPIE. Someone sits in on every demo. Every call logged on the contact.

**Week 3** — Solo. Won deals: Pay-now + Welcome from LOOPIE, Sale $299 the same day. Close line: first email with us, then they run it unless GM quoted managed. Buying ads is extra.

They sell one login for ads, contacts, email, leads, and sales. They do not promise live spend sync, texts, or a lower price. They do not promise we will buy ads unless GM quoted.
