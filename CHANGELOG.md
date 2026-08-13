# Changelog

All notable changes to `n8n-nodes-aca`. Versions follow [semantic versioning](https://semver.org/spec/v2.0.0.html), and each one is published to npm from a tag by [`publish.yml`](.github/workflows/publish.yml) with provenance.

Reconstructed from the commit history on 2026-08-13, so entries before 0.5.0 describe what shipped rather than what was written down at the time.

## 0.5.0 — 2026-08-13

### Added

- **ACA Signal Trigger**, a third node. Starts a workflow when a buying signal puts a lead on a lead list, with the signal's context flattened onto the payload and a signal-type filter. The underlying `signal_lead_added` event is offered on the general trigger too, so one node can mix it with other events.
- **Lead list filter on the ACA Trigger.** Selecting `list_member_added` or `list_member_removed` reveals a lead list picker. The selection is registered with ACA as the subscription's filter rather than applied in n8n, so adds to lists you did not pick are never queued and never delivered. Leave it empty for every list.

### Changed

- `checkExists` now compares the registered filter as well as the events, so editing the picker re-registers the subscription instead of leaving the old filter live.

## 0.4.1 — 2026-08-12

### Fixed

- Use the documented codex category, Marketing & Content, so the nodes appear where n8n expects them.

## 0.4.0 — 2026-08-12

### Added

- `list_member_added` and `list_member_removed` events on the ACA Trigger — a contact joining or leaving a lead list. Both are per contact, so a bulk add produces one delivery each.

## 0.3.2 — 2026-08-12

### Fixed

- `Contact > Create` sent the Contacts JSON unparsed and never worked. It does now.

## 0.3.1 — 2026-08-12

### Added

- A skill for building workflows with the node.

### Changed

- Fuller descriptions and hints throughout the node's parameters.

## 0.3.0 — 2026-08-11

### Added

- `Contact > Update` covers any contact field.

### Changed

- Custom fields merge instead of replacing the whole set.

## 0.2.0 — 2026-08-11

### Added

- **Field Conditions** on `Lead List > Get Contacts`: filter a list on any contact field being filled, empty, equal to or containing a value. Runs through the same Advanced Filters engine as the ACA app.

## 0.1.2 — 2026-08-11

### Fixed

- Reading a lead list returned no contacts.

## 0.1.1 — 2026-08-11

### Changed

- First release published from CI with an npm provenance statement. 0.1.0 has none, so any Creator Portal submission must name 0.1.1 or later.

## 0.1.0 — 2026-08-11

### Added

- The **ACA** node: contacts, lead lists, sequences, enrollments, conversations, messages, custom fields and event actions.
- The **ACA Trigger** node: self-registering webhook subscription with HMAC-SHA256 signature verification.
