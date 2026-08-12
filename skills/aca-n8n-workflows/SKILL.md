---
name: aca-n8n-workflows
version: 1.0.0
description: |
  Build n8n workflows that use the ACA node (n8n-nodes-aca) - contacts, lead lists,
  email sequences, enrollments, conversations and the ACA event trigger.
  Use when asked to "build an n8n workflow" involving ACA, "automate ACA", "sync ACA
  to X", "trigger on an ACA reply", "enroll leads from n8n", "pull contacts out of a
  lead list", or when a workflow needs an ACA credential.
  Also use when writing n8n workflow JSON that includes n8n-nodes-aca.aca or
  n8n-nodes-aca.acaTrigger, or when debugging one that returns nothing or errors.
---

# Building n8n workflows with the ACA node

ACA (Automated Client Acquisition) is a multi-tenant outbound platform: CRM
contacts, lead lists, email sequences, and a unified inbox across LinkedIn,
email, WhatsApp, Instagram, Telegram and SMS.

This skill covers `n8n-nodes-aca`. Read the semantics section before writing a
workflow - most ACA mistakes are not syntax errors, they are silent wrong
answers.

## Setup

The package is `n8n-nodes-aca`, installed via Settings > Community nodes.

Two node types:

| Type | Purpose |
| --- | --- |
| `n8n-nodes-aca.aca` | Read and write. `typeVersion: 1`. |
| `n8n-nodes-aca.acaTrigger` | Start on an ACA event. `typeVersion: 1`. |

Both use one credential, `acaApi`, holding an API token from ACA's
Settings > CLI Tokens. **A token is frozen to one organisation at issue time** -
automating several organisations means one token and one credential each.

The trigger needs ACA's servers to reach the n8n webhook URL. On localhost that
fails silently; use a public instance or `n8n start --tunnel`.

## Node reference

Parameter names below are exact - use them verbatim in workflow JSON.

### Contact

`resource: contact`, operations `get`, `getAll`, `create`, `update`, `delete`, `deleteMany`.

| Operation | Parameters |
| --- | --- |
| `get` | `contactId`, `simple` (bool, default true) |
| `getAll` | `returnAll` / `limit`, `simple`, `filters` |
| `create` | `contacts` (JSON array), `createOptions` |
| `update` | `contactId`, `updateFields`, `customFields` |
| `delete` | `contactId` |
| `deleteMany` | `contactIds` (comma-separated, max 100) |

`filters` for `getAll`: `email` (exact, case-insensitive), `tag`, `company`
(partial), `status`, `source`, `stage_id`, `owner_user_id`.

`updateFields` covers every updatable column: `display_name`, `first_name`,
`last_name`, `primary_email`, `primary_phone`, `primary_linkedin_url`, `company`,
`company_website`, `job_title`, `city`, `state`, `country`, `tags`, `status`,
`source`, `lead_score`, `stage_id`, `pipeline_id`, `owner_user_id`.

`customFields` is a fixedCollection of `{ fieldKey, value }` under key `field`.
Keys come from a dropdown of the organisation's definitions.

### Lead List

`resource: list`, operations `get`, `getAll`, `create`, `update` (archive),
`getMembers` (labelled **Get Contacts**), `addMembers`, `removeMembers`.

`getMembers` is the one to reach for when asked for "the contacts in a list". It
takes `listId` (resourceLocator), `returnAll` / `limit`, `simple` (default true,
flattens to a contact) and the full `filters` collection.

`addMembers` takes `addBy: contactIds | sourceList`. The second copies a filtered
subset of another list server-side via `sourceListId` + `sourceFilters`, which
avoids moving IDs through the workflow.

### Sequence, Enrollment

`resource: sequence` - `get`, `getAll`, read-only.

`resource: enrollment` - `get`, `getAll`, `create`. Create takes `sequenceId`
(resourceLocator) and `enrollBy: contactIds | listId | listIds`, plus
`enrollOptions` for `delayHours`, `allowConcurrent`, `customDataByContactId`.

### Conversation, Message

`resource: conversation` - `get`, `getAll`, `getMessages`.

`resource: message` - `send`, taking `conversation_id`, `content` and
`emailOptions`. **It can only reply into an existing conversation**; there is no
way to start one.

### Custom Field

`resource: customField` - `getAll`, `create`. Create takes `field_key`,
`display_name`, `field_type` and `options` for selects. Definitions can be
created but not edited or deleted over the API.

### Event Action

`resource: eventAction`, chosen by `action` rather than `operation`:
`add_tag`, `remove_tag`, `add_note`, `change_stage`, `update_score`,
`send_message`, `enroll_in_sequence`, `remove_from_sequence`, `set_ai_handling`,
`assign_to_user`.

Target with `targetBy: contact_id | contact_email | contact_phone | conversation_id`
and `target`.

**Prefer Event Action over Contact > Update for tags.** `add_tag` is additive;
`updateFields.tags` replaces the whole list.

### Trigger

`n8n-nodes-aca.acaTrigger` takes `events` (multiOptions) from:
`contact_created`, `contact_updated`, `stage_changed`, `score_changed`,
`message_received`, `message_sent`, `tag_added`, `tag_removed`,
`sequence_completed`, `lead_replied`, `handoff_requested`,
`list_member_added`, `list_member_removed`.

Output is flattened by default:

```json
{ "event": "lead_replied", "timestamp": "...", "deliveryId": "...",
  "organizationId": "...", "data": { } }
```

## Semantics that decide whether a workflow is correct

**Creating contacts silently skips duplicates.** With `dedupe_on_email` on (the
default), an existing email is counted in `skipped` and its ID is **not** in
`contact_ids`. A create-then-add-to-list chain therefore drops everyone who
already existed. Look them up by email afterwards if you need every ID.

**Emails may be unique per organisation.** Some organisations carry a partial
unique index on `lower(primary_email)`. Setting an address another contact holds
returns **409**, case-insensitively. There is no merge feature: free the address
on the other contact first, or update that contact instead.

**Custom fields merge, tags replace.** The node sends `custom_fields_patch`, so
listing one field leaves the others alone and an empty value removes a key.
`tags` replaces the entire list - use `add_tag` to add one.

**Smart lists have no stored members.** A smart list is a saved filter ACA
evaluates on demand, so `Get Contacts` returns nothing for one however full it
looks in the app. The picker labels them. Use a manual, imported or pool-built
list.

**Enrolling nothing is a normal outcome.** `enrollment: create` returns counts -
`enrolled`, `skipped`, `noEmail`, `suppressed`, `skippedActiveElsewhere` - and no
success flag. A lead already active in another sequence is skipped by default.
Branch on `enrolled`, never on the absence of an error.

**Trigger delivery is at-least-once.** Retried up to three times, roughly a
minute apart, reusing `deliveryId`. Deduplicate on it before doing anything that
must not happen twice.

**List membership events are per contact.** `list_member_added` fires once per
row, so a pool build adding 250,000 contacts queues 250,000 deliveries for any
subscriber. Nothing is queued when nobody subscribes.

**`contact_updated` is noisy.** It fires on every row change, so bulk edits and
enrichment runs produce bursts. Prefer `stage_changed` or `score_changed` for
meaningful transitions.

**Pagination is cursor-based.** No offset, no total count. `returnAll` walks it.
Be careful with `Contact > Get Many` + `returnAll` on a large organisation -
hundreds of thousands of contacts means thousands of API calls. Filter first, or
set `limit`.

**Rate limit: 120 requests per minute per token**, returning 429 with
`Retry-After`. Loops over many contacts should batch rather than iterate.

## Patterns

### React to a reply

```json
{
  "nodes": [
    { "parameters": { "events": ["lead_replied"] },
      "type": "n8n-nodes-aca.acaTrigger", "typeVersion": 1,
      "position": [0, 0], "id": "t", "name": "ACA Trigger" },
    { "parameters": { "resource": "eventAction", "action": "add_tag",
        "targetBy": "contact_id", "target": "={{ $json.data.contact_id }}",
        "tagName": "replied" },
      "type": "n8n-nodes-aca.aca", "typeVersion": 1,
      "position": [220, 0], "id": "a", "name": "Tag replied" }
  ],
  "connections": {
    "ACA Trigger": { "main": [[{ "node": "Tag replied", "type": "main", "index": 0 }]] }
  }
}
```

### Pull a filtered slice of a list

Use `list: getMembers` with filters rather than fetching everything and
filtering in the workflow - the filtering happens in ACA's engine.

```json
{ "resource": "list", "operation": "getMembers",
  "listId": { "__rl": true, "mode": "list", "value": "<uuid>" },
  "returnAll": true,
  "filters": { "hasLinkedin": true, "emailQuality": ["clean"] } }
```

### Enrol a whole list

```json
{ "resource": "enrollment", "operation": "create",
  "sequenceId": { "__rl": true, "mode": "list", "value": "<uuid>" },
  "enrollBy": "listId",
  "listId": { "__rl": true, "mode": "list", "value": "<uuid>" } }
```

Then read `enrolled` and the skip buckets from the single output item.

## Debugging

| Symptom | Cause |
| --- | --- |
| Get Contacts returns nothing | Smart list, or the list is genuinely empty |
| 409 on update | Email already held by another contact in the org |
| 429 | Over 120 req/min - back off for `Retry-After` seconds |
| Trigger never fires | ACA cannot reach the webhook URL (localhost without a tunnel) |
| Custom field value never appears | Key typed by hand rather than picked - it stored under a key nothing reads |
| Enrollment did nothing | Check the skip buckets, not the absence of an error |

## As an AI Agent tool

The `aca` node sets `usableAsTool`, so it attaches to an AI Agent directly.
Self-hosted n8n needs `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` or the node
will not appear in the tool list. The trigger is deliberately not a tool.
