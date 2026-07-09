# Future Model Training Approach

Bonus per the assignment — a proposal only, nothing here is implemented.
Today's feedback-driven behavior (excluding downvoted items, replacing a
rejected AI insight, dropping a downvoted coin) is hand-written rules, not
a trained model. This is how the same data could train one.

## What's already logged

- `feedback`: `(user_id, section_type, item_id, vote, created_at)` — one row
  per vote.
- `user_preferences`: assets, investor type, content types, risk level.

That's a user, an item, a label, and a timestamp — most of what a first
model needs.

## The one gap

Item *content* isn't stored. News/meme ids are stable catalog keys, but the
AI insight's id is a hash of text that's never saved. Training would need a
small `served_items` log: what was actually shown, to whom, before they
voted.

## Framing

Not one model — three related ranking problems, since the sections aren't
alike:

- **Market News / Meme / Coin Price** — binary classification: "will this
  user upvote this candidate item?" Score candidates, show the highest.
- **AI Insight** — feedback is better used to tune *prompt selection* than
  to train a generative model; a thumbs-up/down signal alone can't safely
  train an LLM from scratch.

## Model choice

Given realistic data volume (hundreds–low thousands of votes per active
user, not millions), a small gradient-boosted tree (LightGBM) or plain
logistic regression over engineered features beats a deep model — this is
sparse tabular data, not something that benefits from a large network.

**Features:** user (preferences, feedback history, upvote rate), item
(asset/category/source, live vs. fallback), interaction (seen before?,
historical rate on this asset/category).

**Cold start:** users under ~10 feedback events keep using today's rules;
the model only takes over per-user once there's enough signal.

## Evaluation

- **Offline:** time-based split (train on votes before date *T*, test
  after) — precision@k / AUC on held-out votes.
- **Online:** A/B the rule-based ranking against the model; compare upvote
  rate. Human spot-check before wider rollout, especially for the AI
  insight given the safety rules already enforced today.

## Where it plugs in

`integrations.py` already isolates all content-selection logic. A future
`ranking.py` would score candidates right before the response is built,
with today's hand-written rules kept as the fallback if the model is
unavailable — the same live → fallback pattern already used for
CoinGecko/CryptoPanic/OpenRouter.
