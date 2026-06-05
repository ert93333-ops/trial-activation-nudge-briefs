# Trial Activation Nudge Briefs

Static browser-local MVP for turning public-safe trial or onboarding notes into an activation nudge brief, missing-context checklist, and safer follow-up outline.

## Public pages

- Landing: `https://ert93333-ops.github.io/trial-activation-nudge-briefs/`
- Checklist: `https://ert93333-ops.github.io/trial-activation-nudge-briefs/trial-activation-email-template.html`
- Public Gist checklist: `https://gist.github.com/ert93333-ops/c366f37677a7b822499490637313a488`

## Scope

- No product analytics, lifecycle platform, CRM, email, or support-ticket integration.
- No product analytics export upload, CRM export upload, customer PII storage, private user-level event log storage, credential handling, external database, backend services, or customer communication sending.
- No fake urgency, dark patterns, unsupported claims, or creepy tracking copy.
- Shared marketing and notification credentials stay in the private root `.env` of the Hermes playbook, not in this public site directory.

## Verification

From the Hermes playbook root:

```powershell
npm run workflow:trial-activation-nudge
```
