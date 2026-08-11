# n8n-nodes-aca

An [n8n](https://n8n.io) community node for [ACA](https://www.automatedclientacquisition.com) - Automated Client Acquisition.

ACA is a multi-tenant outbound platform: CRM contacts, lead lists, email sequences, and a unified inbox across LinkedIn, email, WhatsApp, Instagram, Telegram and SMS. This package gives you two nodes:

- **ACA** - read and write contacts, lists, sequences, enrollments and conversations, and act on them.
- **ACA Trigger** - start a workflow when something happens in ACA, with signature verification.

[Installation](#installation) | [Credentials](#credentials) | [ACA node](#aca-node) | [ACA Trigger](#aca-trigger) | [Example workflow](#example-workflow) | [Things worth knowing](#things-worth-knowing)

## Installation

**n8n Cloud** - Settings > Community nodes > Install, then enter `n8n-nodes-aca`.

**Self-hosted** - the same screen, or from the command line:

```bash
npm install n8n-nodes-aca
```

Restart n8n afterwards if you installed manually.

## Credentials

The node authenticates with an ACA API token.

1. In ACA, open **Settings > CLI Tokens**.
2. Create a token. It is shown once - copy it then.
3. In n8n, add an **ACA API** credential and paste it into **API Token**.
4. Click **Test**. A green check means the token is valid and reaches your organisation.

A token is tied to one organisation at the moment you issue it. Switching organisations in the ACA app later does not change what an existing token can see, so if you automate more than one organisation, create one token per organisation and one n8n credential per token.

Tokens are stored as a hash and cannot be recovered. If you lose one, revoke it and issue another.

**Rate limit:** 120 requests per minute per token. Every response carries `X-RateLimit-Remaining`; exceeding it returns `429` with a `Retry-After`.

## ACA node

| Resource | Operations |
| --- | --- |
| **Contact** | Get, Get Many, Create, Update, Delete, Delete Many |
| **Lead List** | Get, Get Many, Create, Archive, Get Members, Add Members, Remove Members |
| **Sequence** | Get, Get Many |
| **Enrollment** | Get, Get Many, Create (enroll contacts or whole lists) |
| **Conversation** | Get, Get Many, Get Messages |
| **Message** | Send (reply into an existing conversation) |
| **Custom Field** | Get Many (which custom field keys exist, and their types) |
| **Event Action** | Add Tag, Remove Tag, Add Note, Change Stage, Update Score, Send Message, Enroll in Sequence, Remove From Sequence, Set AI Handling, Assign to User |

**Get Many** operations support **Return All**, which follows ACA's cursor pagination for you, and a **Filters** collection that maps to the API's own filters.

### Event Action vs the REST resources

They overlap on purpose, and the difference matters:

- **Add Tag** under Event Action is *additive*. `Contact > Update` replaces the entire tag list, so adding one tag that way means reading the contact first and writing every tag back.
- Event Action can target a contact by **email or phone**, not only by ID - useful when the workflow's trigger gave you an address and nothing else.
- Add Note, Set AI Handling and Assign to User have no REST equivalent at all.

## ACA Trigger

Pick the events you care about and activate the workflow. The node registers its own webhook subscription with ACA, and removes it when the workflow is deactivated - there is nothing to paste into ACA's settings.

### Events

| Event | Fires when |
| --- | --- |
| `contact_created` | A contact is created |
| `contact_updated` | Any field on a contact changes |
| `stage_changed` | A contact moves to a different pipeline stage |
| `score_changed` | A contact's lead score changes |
| `message_received` | An inbound message arrives, on any channel |
| `message_sent` | An outbound message goes out |
| `tag_added` / `tag_removed` | A tag is added to or removed from a contact |
| `sequence_completed` | A lead reaches the end of an email sequence |
| `lead_replied` | An enrolled lead replies, and the sequence stops for them |
| `handoff_requested` | A human takes over a conversation from the AI |

### Output

By default the node emits a flattened shape:

```json
{
  "event": "lead_replied",
  "timestamp": "2026-08-11T12:56:42.801Z",
  "deliveryId": "6b1f0c2a-9d3e-4f58-a71b-2c8d4e5f6a7b",
  "organizationId": "afb808d4-0000-0000-0000-000000000000",
  "data": { "...": "event-specific" }
}
```

Turn on **Options > Raw Envelope** to get ACA's delivery body verbatim instead.

### Delivery guarantees

Delivery is **at-least-once**. ACA retries a failed delivery up to three times, roughly a minute apart, reusing the same `X-Webhook-ID` - surfaced as `deliveryId`. If your workflow does anything that must not happen twice, deduplicate on that value.

Every delivery is signed. The node verifies `X-Webhook-Signature` (HMAC-SHA256 of the raw body) against the secret ACA issued when the subscription was created, and rejects anything that does not match with a `401`. An event you did not select is acknowledged with a `200` and starts nothing, so ACA does not retry it.

## Example workflow

Reply to warm leads and tag them, then hand the conversation to a human.

```json
{
  "name": "ACA - handle replies",
  "nodes": [
    {
      "parameters": { "events": ["lead_replied"] },
      "type": "n8n-nodes-aca.acaTrigger",
      "typeVersion": 1,
      "position": [0, 0],
      "id": "trigger",
      "name": "ACA Trigger",
      "credentials": { "acaApi": { "id": "1", "name": "ACA account" } }
    },
    {
      "parameters": {
        "resource": "eventAction",
        "action": "add_tag",
        "targetBy": "contact_id",
        "target": "={{ $json.data.contact_id }}",
        "tagName": "replied"
      },
      "type": "n8n-nodes-aca.aca",
      "typeVersion": 1,
      "position": [220, 0],
      "id": "tag",
      "name": "Tag as replied",
      "credentials": { "acaApi": { "id": "1", "name": "ACA account" } }
    },
    {
      "parameters": {
        "resource": "eventAction",
        "action": "add_note",
        "targetBy": "contact_id",
        "target": "={{ $json.data.contact_id }}",
        "noteContent": "={{ 'Replied to ' + $('ACA Trigger').item.json.data.sequence_name }}"
      },
      "type": "n8n-nodes-aca.aca",
      "typeVersion": 1,
      "position": [440, 0],
      "id": "note",
      "name": "Log the reply",
      "credentials": { "acaApi": { "id": "1", "name": "ACA account" } }
    }
  ],
  "connections": {
    "ACA Trigger": { "main": [[{ "node": "Tag as replied", "type": "main", "index": 0 }]] },
    "Tag as replied": { "main": [[{ "node": "Log the reply", "type": "main", "index": 0 }]] }
  }
}
```

## Things worth knowing

These are ACA API behaviours that will bite you if you assume otherwise. The node surfaces each of them as inline help too.

**Creating contacts skips duplicates silently.** With **Dedupe on Email** on (the default), an existing email is counted in `skipped` and its ID is *not* in `contact_ids`. A "create then add to list" chain therefore drops everyone who already existed. Look contacts up by email afterwards if you need every ID.

**Updating a contact replaces `tags` and `custom_fields` wholesale.** They are not merged. Use **Event Action > Add Tag** to add one tag without disturbing the others.

**Lead lists cannot be deleted over the API.** Use **Archive** instead. This is deliberate on ACA's side - a deleted list would orphan enrollments that reference it.

**Enrolling nothing is a normal outcome.** `Enrollment > Create` returns counts, not a success flag: `enrolled`, `skipped`, `noEmail`, `suppressed` and `skippedActiveElsewhere`. A lead already active in another sequence is skipped by default, because ACA will not let two sequences email the same person at once. Branch on `enrolled`, not on the absence of an error.

**`contact_updated` is noisy.** It fires on every row change, so a bulk edit or an enrichment run produces a large burst. If you want meaningful transitions, subscribe to `stage_changed` or `score_changed`.

**Pagination is cursor-based and unordered by date.** There is no offset and no total count - the underlying tables run to millions of rows. **Return All** walks the cursors for you.

**A failed Event Action returns 400.** An unknown contact, an enrollment that matched nothing, a missing field - all `400` with a message saying which. Only a completed action returns `200`.

## Compatibility

Tested against n8n 1.x with `n8n-workflow` 2.x. No runtime dependencies.

## Resources

- [ACA API reference](https://www.automatedclientacquisition.com/developers)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
