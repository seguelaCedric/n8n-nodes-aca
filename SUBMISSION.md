# Publishing and submitting `n8n-nodes-aca`

Everything that can be done without your credentials is done. What is left needs
your npm and GitHub accounts.

## Status

| Requirement | State |
| --- | --- |
| Package name starts with `n8n-nodes-` | ✅ `n8n-nodes-aca` — verified available on npm |
| `n8n-community-node-package` keyword | ✅ |
| `n8n` attribute with `dist/`-prefixed paths | ✅ two nodes, one credential |
| MIT license, `LICENSE` file present | ✅ (the scaffolder does not generate one — this is the most-missed item) |
| `homepage`, `repository`, `author` filled in | ✅ pointed at `github.com/seguelaCedric/n8n-nodes-aca` |
| Zero runtime dependencies | ✅ no `dependencies` key; `n8n-workflow` peer only |
| No `process`, no file I/O | ✅ base URL is a constant; `node:crypto` is on n8n's import allowlist |
| TypeScript, English only | ✅ |
| Scaffolded with the `n8n-node` CLI | ✅ `declarative/github-issues` template, then rewritten |
| `npm run lint` | ✅ clean |
| `npm run build` | ✅ clean |
| `@n8n/scan-community-package` | ✅ passes, run against the packed tarball |
| README with credentials, operations, example workflow | ✅ |
| UX guidelines | ✅ — see below |
| Published to npm via GitHub Actions with provenance | ⬜ **needs you** |
| Submitted at creators.n8n.io | ⬜ **needs you** |

### UX guidelines

Audited against `reference/ux-guidelines.md`. Title Case for node, resource and
parameter names; sentence case for actions, descriptions and hints; action fields
omit articles and repeat the resource; `Get Many` naming; resource locators
default to **From List**; placeholders carry an `e.g.` prefix; boolean
descriptions start with "Whether"; the API token is a password field; a single
delete returns `{ "deleted": true }`; Contact carries a **Simplify** toggle,
defaulted on, because the raw row is 25 columns.

Three guidelines are deliberately not met, because the API cannot honour them:

- **No sorting collection on Get Many.** ACA's pagination is keyset on `id` and
  exposes no sort parameter. A sort control that silently did nothing would be
  worse than none.
- **No OAuth credential.** ACA issues API tokens only; there is no OAuth flow to
  offer.
- **Delete Many keeps its counts** rather than returning `{ "deleted": true }`.
  It reports `deleted` and `requested`, and the gap between them is the whole
  point of a bulk call.

## What you need to do

### 1. Create the GitHub repository

It must be **public**, and the author and maintainer must match between npm and
GitHub — n8n checks this.

```bash
cd ~/Documents/code/n8n-nodes-aca
git add -A && git commit -m "Add ACA node and ACA Trigger node"
gh repo create seguelaCedric/n8n-nodes-aca --public --source=. --remote=origin --push
```

### 2. First publish

npm Trusted Publishing cannot be attached to a package that does not exist yet,
so the first release needs a token. Create a granular access token on npmjs.com
scoped to this package with read-and-write publish permission, add it as the
`NPM_TOKEN` repository secret, then:

```bash
npm run release
```

That lints, builds, prompts for the version, updates the changelog, commits,
tags and pushes. The tag push triggers `.github/workflows/publish.yml`, which
publishes with `NPM_CONFIG_PROVENANCE=true`.

Confirm the provenance badge appears on <https://www.npmjs.com/package/n8n-nodes-aca>.

### 3. Switch to Trusted Publishing

Once the package exists: npmjs.com → package settings → Publish access →
Trusted Publishers → Add. Owner `seguelaCedric`, repository `n8n-nodes-aca`,
workflow `publish.yml`, environment blank. Then delete the `NPM_TOKEN` secret —
subsequent releases use GitHub's OIDC token and no long-lived secret exists
anywhere.

Publishing from a laptop has been rejected for verification since 1 May 2026.
The `prepublishOnly` guard in `package.json` already blocks a bare `npm publish`.

### 4. Submit for verification

<https://creators.n8n.io/nodes> — create an account or log in, and submit
`n8n-nodes-aca`.

The two things reviewers reject most often are both satisfied: the package has
no runtime dependencies, and it integrates exactly one third-party service. A
trigger node alongside the main node is explicitly allowed.

## Before you publish, if you want a live check

The node has been verified against the real ACA API at the HTTP level, and the
signature verification has been cross-checked against ACA's own signer. What has
not been exercised is the node running inside n8n against a live token:

```bash
cd ~/Documents/code/n8n-nodes-aca
npm run dev          # boots n8n with this package linked, on localhost:5678
```

Then, in the editor:

1. Add an **ACA API** credential with a token from Settings → CLI Tokens, and
   press **Test** — it should go green.
2. Add an **ACA** node, `Contact → Get Many`, turn on **Return All**, and add an
   email or tag filter. Confirm page two still honours the filter — that is the
   one bug this node's pagination is specifically written to avoid.
3. Add an **ACA Trigger**, pick an event, press **Listen for test event**, and
   confirm a subscription appears under ACA's Settings → Webhooks → Connected
   Integrations, then disappears when the listen window closes.
4. Activate the workflow and confirm the registered `target_url` is the
   production `/webhook/...` URL, not the `/webhook-test/...` one.
