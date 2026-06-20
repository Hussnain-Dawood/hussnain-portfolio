---
title: Why My Booking System Almost Double-Booked Itself (And How I Fixed It)
date: 2026-06-21T00:10
author: Hussnain Dawood
category: Tech
tags: []
featuredImage: /images/uploads/pasted-image-1781983205611.png
excerpt: ''
metaTitle: ''
metaDescription: ''
draft: false
---

When I built the[ Online Appointment System](https://hussnaindawood.pages.dev/#projects), the pitch was simple: replace a manual booking process with something automated, with real-time availability and JWT-based login. The 40% efficiency gain looks good on a portfolio card. What it doesn't show is the afternoon I spent staring at duplicate-key errors trying to figure out why two users could book the exact same slot if they clicked confirm within about 200 milliseconds of each other.

That bug, and the decisions I made fixing it, taught me more about backend design than any tutorial did. Here's the actual breakdown.

## **Why I Didn't Just Drop In a Calendar Library**

The first instinct with a scheduling feature is to grab a calendar package off npm and wire up some props. I tried that route for about a day before ripping it out. The problem wasn't the UI — it was that every booking library I looked at assumed the conflict logic lived on the client, and I needed conflict checks to happen on the server no matter what the frontend showed. A user could have two tabs open, or the cached availability grid could be 30 seconds stale. If I trusted the client to know what's free, I'd be trusting a snapshot that's already wrong by the time someone clicks "confirm."

So I treated the calendar UI as a thin rendering layer and pushed all the actual business logic — slot duration, resource availability, conflict detection — into the API. The frontend just displays whatever the server says is true at request time. That decision shaped everything downstream.

## **Designing the Data Model Before Writing a Single Route**

I started with the schema, not the routes, because the schema is what determines whether your conflict checks are fast or slow.

`const appointmentSchema = new mongoose.Schema({`

  `resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },`

  `userId: { type: mongoose.Schema.Types.ObjectId, required: true },`

  `startTime: { type: Date, required: true },`

  `endTime: { type: Date, required: true },`

  `status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },`

`}, { timestamps: true });`

`appointmentSchema.index({ resourceId: 1, startTime: 1 }, { unique: true });`

A few choices here matter more than they look:

- I store both startTime and endTime instead of just a duration, because every conflict query needs a range comparison, and computing the range from a stored duration on every request is wasted CPU for no benefit.
- The compound unique index on resourceId + startTime isn't just for query speed. It's the actual mechanism that prevents double bookings, which I'll get to in a second.
- I denormalized service duration directly onto the appointment document rather than joining against a services collection on every read, because availability checks run far more often than service details change.

## **Stopping Double Bookings Without Locking the Whole Database**

Here's the bug. My first version of the booking endpoint did the obvious thing: query for existing appointments in that time slot, and if none exist, insert a new one.

const conflict = await Appointment.findOne({ resourceId, startTime });

if (conflict) return res.status(409).json({ error: 'Slot taken' });

await Appointment.create({ resourceId, startTime, endTime, userId });

That works fine until two requests hit the server close enough together that both findOne calls run before either create finishes. Both see an empty result. Both insert. Now you've got two confirmed appointments for one slot, and the business logic that "knows" a slot is unique is a lie.

The fix wasn't a lock. I didn't want every booking request queuing behind a mutex — that kills throughput for no reason, since 99% of requests aren't actually colliding with each other. Instead, I leaned on the unique index I'd already put on the schema and let MongoDB enforce the constraint atomically:

`try {`

  `await Appointment.create({ resourceId, startTime, endTime, userId });`

`} catch (err) {`

  `if (err.code === 11000) {`

    `return res.status(409).json({ error: 'This slot was just booked. Pick another.' });`

  `}`

  `throw err;`

`}`

This is optimistic concurrency instead of pessimistic locking. Both requests can attempt the insert simultaneously — the database itself rejects whichever one loses the race, because the unique index makes a duplicate physically impossible to write. No application-level lock, no waiting, and it scales fine because conflicts are rare in practice. The trade-off is that this only works if every write path goes through this exact insert. If I'd added a second route later that updated appointments directly — say, an admin reschedule feature — and forgot to route it through the same check, the guarantee silently breaks. That's a real limitation I'd flag to anyone extending this code: the safety lives in discipline around one write path, not in the schema alone.

## **JWT Auth: The Part Most Write-Ups Skip**

The login system uses access and refresh tokens, and the part that actually took thought wasn't generating the JWT — that's a one-liner. It was deciding where to put the refresh token and how long to trust the access token.

I kept the access token short, 15 minutes, and stored it in memory on the client rather than localStorage, because localStorage is readable by any script running on the page and I didn't want a successful XSS turning into a stolen session that lasts indefinitely. The refresh token goes in an httpOnly cookie instead, so client-side JavaScript can't touch it at all even if something does get injected.

The harder problem was logout. A JWT is stateless by design, which means once it's issued, the server can't "cancel" it before expiry unless you build that capability yourself. I store a hashed version of each issued refresh token in a small collection, and logout deletes that record. On refresh, I check the incoming token against the stored hash before issuing a new access token. It adds a database read to every refresh request, which costs a little performance, but it means I can actually invalidate a session instead of just hoping the 15-minute window runs out fast enough.

## **Faking Real-Time Without Standing Up a WebSocket Server**

"Real-time availability" sounds like it requires sockets. For this project, it didn't, and adding a persistent connection layer would have been over-engineering for the actual traffic this system sees.

I went with short-interval polling instead — the client re-fetches availability for the visible time range every few seconds while the booking screen is open. The reason this stays cheap is the same compound index from earlier: a query for "what's booked for this resource between X and Y" hits the index directly instead of scanning. Polling only gets expensive when each poll is doing expensive work, and an indexed range query on a few thousand documents isn't expensive work. If this were a multi-tenant platform with thousands of concurrent viewers per resource, I'd reach for WebSockets or server-sent events instead, because polling load scales linearly with viewers in a way push-based updates don't. For the scale this actually runs at, polling was the boring, correct choice.

## **What Broke During the Demo**

Two things surfaced once real people started clicking around instead of me testing alone.

First, the duplicate-key error from MongoDB was leaking straight to the frontend as a raw 500 with a Mongo error message in it, because I'd only wrapped the happy path in a try/catch and not the conflict path specifically. Easy fix once I saw it, but it's a good reminder that error handling needs to be designed, not bolted on after the fact — checking err.code === 11000 explicitly instead of catching everything generically was what let me turn a server crash into a clean "someone else booked this" message.

Second was a timezone bug that took longer to track down. I stored every timestamp in UTC, which is correct, but one comparison in the conflict-check logic was built against a Date object constructed from a client-submitted string without normalizing it first. A user in a different timezone than my test environment would see slots that looked free but actually overlapped existing bookings by a few hours once normalized. The fix was making sure every single comparison — not just storage — happened in UTC, with timezone conversion pushed entirely to the display layer. Mixing storage format and comparison format is one of those bugs that passes every test you write in your own timezone and fails silently for anyone else.

## **What I'd Change With More Time**

The honest limitations: the admin panel can still edit appointment status directly, which bypasses the conflict-safe insert path entirely — fine for a small internal tool, not something I'd ship to a larger team without locking that down too. And optimistic concurrency assumes conflicts are rare; if this system needed to handle flash-sale-style demand on specific slots, I'd move toward a short-lived reservation hold (claim a slot for 60 seconds while payment or confirmation completes) instead of a single atomic insert, since a bare unique-index approach doesn't give you a graceful "hold while you decide" state.

None of this is exotic engineering. It's the kind of decision-making that shows up on every real backend project: pick the index that makes your hot path fast, let the database enforce the guarantee it's actually good at enforcing, and design your error handling before someone else finds the gap for you.
