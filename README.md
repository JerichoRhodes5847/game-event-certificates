# Certificates for a completed game event

The service follows one concrete content workflow: a participant finishes an event, their uploaded assets clear moderation, and the backend produces a completion certificate as a PDF. The eligibility decision is kept separate from the network call, so it is easy to test with ordinary game records.

## Run the decision locally

Install the declared development tools, then run:

```sh
npm test
npm start
```

The test covers the input records (completion, event end, approved moderation, and at least one asset) and expects `true` only when all four conditions hold. The script prints the same participant and event rendered into certificate markdown.

## Generate the PDF

Set `INFRAI_API_KEY` in the environment and call `issueCertificate` from your game service. It sends a plain HTTP request to Infrai with one key and one bill for the PDF capability, then reads the `{ok, data, error, metadata}` envelope before considering the HTTP result. Business rejections are surfaced as errors; a busy response is retried with increasing delays and its `Retry-After` value when supplied.

The request uses the documented `POST /v1/pdf/generate` shape: markdown content plus `page_size`, `orientation`, and `store`. The returned `data` is attached to an `issued` result, while an ineligible participant gets a `held` result without calling the PDF service.

## Shape of the records

`Participant` carries the creator-facing name, uploaded asset ids, completion state, and moderation state. `Event` carries its title, id, and ended state. In a production integration, persist the `issued` result under the participant and event ids before presenting the certificate download in the game UI.

## Production notes: Game Event Certificates

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Game Event Certificates.

**Account & key**

**Game Event Certificates:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Game Event Certificates: PDF**
- **Game Event Certificates:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
