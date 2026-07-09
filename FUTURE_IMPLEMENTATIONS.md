# Future Implementations

## 1. Sharp price-move alerts

Store each tracked coin's opening price once a day, then poll current prices
on a schedule (every 30–60 min via APScheduler or a simple cron job).
If a coin a user follows moves past a threshold chosen since the day
open, surface an notification, optionally emailed too. Scoped to each
user's own selected assets.

## 2. Feedback-driven ranking model

The full proposal for this already lives in `README.md` under "Suggested
approach to future model training" (what's already logged, feature ideas,
model choice, evaluation). Short version: once a user has ~10+ feedback
events, a lightweight model (logistic regression / gradient-boosted trees
over user + item + interaction features) replaces today's hand-written
exclusion rules for ranking News/Meme/Coin candidates.

## 3. Behavior-based preference adaptation

Today, a downvote on a coin immediately removes it from preferences —
explicit and instant. A softer version: track *patterns* (e.g. 3 downvotes
on the same content type or source within a week) and quietly deprioritize
rather than remove, so preferences drift with actual behavior without the
user having to consciously re-curate every time.

## 4. Portfolio-aware context

Let users optionally log a rough position (asset + amount or cost basis),
so coin cards and the AI insight can reference *their* numbers — "your BTC
position is up 12% since you added it" — instead of only the asset's
general market move. Still informational only, never advice, consistent
with the app's existing safety stance.

## 5. Aggregate "crowd sentiment" signal

Reuse the existing `feedback` table to surface anonymized aggregates
alongside personal content — "74% of Cryptalks users found today's BTC news
useful." Zero new infrastructure, just a read-side aggregation query; adds
a lightweight social-proof layer without exposing any individual's votes.

## 6. Weekly personalized digest

A scheduled job recaps the week using data already being stored: biggest
moves among the user's assets, and which content types/sources got the most
positive feedback from them. Delivered by email or as an in-app card.

---

**Suggested build order:** (1) price alerts and (6) weekly digest are the
most user-visible for the least new complexity (both are "schedule a job,
query existing data"). (3) preference adaptation is a small extension of
logic that already exists. (2) the ranking model and (4) portfolio tracking
are the largest lifts — new data model, more surface area to keep safe. (5)
crowd sentiment is the cheapest to try and worth doing early as a quick win.
