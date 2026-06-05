const ANALYTICS_KEY = "trialactivationnudgebriefs_analytics_events";
const INTENTS_KEY = "trialactivationnudgebriefs_purchase_intents";
const ISSUE_BASE = "https://github.com/ert93333-ops/trial-activation-nudge-briefs/issues/new";

const fields = {
  trial: document.querySelector("#trial-notes"),
  user: document.querySelector("#user-context"),
  milestone: document.querySelector("#milestone-notes"),
  friction: document.querySelector("#friction-notes"),
  timing: document.querySelector("#timing-notes"),
  value: document.querySelector("#value-notes"),
  cta: document.querySelector("#cta-notes"),
  nudge: document.querySelector("#nudge-draft"),
};

const outputPanel = document.querySelector("#output-panel");
const briefOutput = document.querySelector("#brief-output");
const outputStatus = document.querySelector("#output-status");
const workflowError = document.querySelector("#workflow-error");
const copyButton = document.querySelector("#copy-brief");
const copyStatus = document.querySelector("#copy-status");
const sampleButton = document.querySelector("#sample-button");
const generateButton = document.querySelector("#generate-button");
const intentForm = document.querySelector("#intent-form");
const remoteIntent = document.querySelector("#remote-intent");
const remoteIntentLink = document.querySelector("#remote-intent-link");
const copyRemoteIntent = document.querySelector("#copy-remote-intent");
const remoteCopyStatus = document.querySelector("#remote-copy-status");
const intentStatus = document.querySelector("#intent-status");
let selectedPlan = "Starter";
let latestBriefText = "";
let latestRemoteText = "";

function track(event, detail = {}) {
  const params = new URLSearchParams(window.location.search);
  const payload = {
    event,
    detail,
    attribution: {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
    },
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
  const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]");
  events.push(payload);
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-200)));
}

function includesAny(text, terms) {
  return terms.some((term) => term.test(text));
}

function valueOf(field) {
  return field ? field.value.trim() : "";
}

function collectInput() {
  const input = {
    trial: valueOf(fields.trial),
    user: valueOf(fields.user),
    milestone: valueOf(fields.milestone),
    friction: valueOf(fields.friction),
    timing: valueOf(fields.timing),
    value: valueOf(fields.value),
    cta: valueOf(fields.cta),
    nudge: valueOf(fields.nudge),
  };
  input.all = Object.values(input).join("\n").toLowerCase();
  return input;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function addFinding(findings, title, message) {
  findings.push({ title, message });
}

function analyze(input) {
  const all = input.all;
  const findings = [];
  if (!includesAny(all, [/role|persona|segment|plan|tier|founder|admin|marketer|growth|sales|ops|source|signup source|utm|trial user|customer type|team/i])) {
    addFinding(findings, "missing user role, segment, plan, or signup source:", "Add who signed up and why their context changes the nudge.");
  }
  if (!includesAny(all, [/activation|milestone|first value|aha|setup|connect|import|publish|invite|create|complete|checklist|event|goal|workspace|report|dashboard/i])) {
    addFinding(findings, "missing activation milestone or first-value event:", "Name the concrete action that gets the trial user to first value.");
  }
  if (!includesAny(all, [/blocked|stuck|not completed|incomplete|failed|friction|drop|abandon|has not|hasn't|no data|setup issue|confused|missing|skipped|unfinished/i])) {
    addFinding(findings, "missing incomplete onboarding step or product friction:", "Capture what has not happened yet and what may be blocking progress.");
  }
  if (!includesAny(all, [/trial day|day \d|signup|signed up|hours ago|days ago|today|yesterday|time-to-value|ttv|within|trial ends|expires|week/i])) {
    addFinding(findings, "missing signup age, trial day, or time-to-value context:", "Add timing so the nudge matches the user's stage instead of sounding generic.");
  }
  if (!includesAny(all, [/value|job|workflow|outcome|save|reduce|report|dashboard|team needs|goal|pain|manual|spreadsheet|benefit|proof|why/i])) {
    addFinding(findings, "missing value proof or job-to-be-done:", "Tie the message to a useful outcome, not just product activity.");
  }
  if (!includesAny(all, [/cta|next action|next step|click|open|finish|connect|import|invite|book|reply|start|complete|guide|template|call/i])) {
    addFinding(findings, "missing next action and CTA:", "Make the next step specific, small, and easy to complete.");
  }
  if (!includesAny(all, [/help|support|owner|csm|growth|pm|docs|guide|resource|chat|call|onboarding|reply|contact|assist/i])) {
    addFinding(findings, "missing help path, owner, or support route:", "Show where the user can get help and who owns the follow-up.");
  }
  if (!includesAny(all, [/opt out|unsubscribe|not relevant|stop|no longer|preference|manage preferences|do not contact/i])) {
    addFinding(findings, "missing opt-out-safe wording:", "For outbound email or human follow-up, include a plain opt-out line.");
  }
  if (includesAny(all, [/tracked you|we saw everything|spying|last chance|final chance|only today|lose access|you must|guarantee|guaranteed|fake|urgent!!!|dark pattern|manipulate|pressure/i])) {
    addFinding(findings, "spammy, creepy, fake urgency, dark-pattern, or unsupported claim risk:", "Remove surveillance framing, fake urgency, and unsupported promises.");
  }
  if (includesAny(all, [/analytics export|amplitude export|mixpanel export|crm export|hubspot export|salesforce export|event log|personal email|full name|password|credential|api key|token|secret|private customer data|pii/i])) {
    addFinding(findings, "private customer data, product analytics export, CRM export, credentials, or PII risk:", "Do not paste private exports, user-level event logs, credentials, or PII into public tools.");
  }
  return findings;
}

function section(title, items) {
  if (!items.length) return "";
  return `<section class="brief-section"><h4>${title}</h4><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul></section>`;
}

function generateBrief() {
  const input = collectInput();
  const hasInput = ["trial", "user", "milestone", "friction", "timing", "value", "cta", "nudge"].some((key) => input[key]);
  if (!hasInput) {
    workflowError.textContent = "Paste trial activation notes before generating an activation brief.";
    track("brief_generation_failed", { reason: "empty_input" });
    return;
  }
  workflowError.textContent = "";
  const findings = analyze(input);
  const summary = [
    input.user ? `<strong>User context:</strong> ${escapeHtml(input.user)}` : "",
    input.milestone ? `<strong>Activation milestone:</strong> ${escapeHtml(input.milestone)}` : "",
    input.friction ? `<strong>Friction:</strong> ${escapeHtml(input.friction)}` : "",
    input.timing ? `<strong>Timing:</strong> ${escapeHtml(input.timing)}` : "",
    input.value ? `<strong>Value proof:</strong> ${escapeHtml(input.value)}` : "",
    input.cta ? `<strong>Next action/help path:</strong> ${escapeHtml(input.cta)}` : "",
    input.nudge ? `<strong>Nudge draft:</strong> ${escapeHtml(input.nudge)}` : "",
  ].filter(Boolean);
  const grouped = findings.length
    ? findings.map((finding) => `<strong>${finding.title}</strong> ${finding.message}`)
    : ["No blocking activation-nudge gaps detected in the public-safe notes."];
  const outline = [
    "Anchor the nudge in the user's role and the first-value milestone.",
    "Name one incomplete step or friction point without implying surveillance.",
    "Offer a small next action, guide, or help path.",
    "Use opt-out-safe wording for email or manual outreach.",
  ];
  const handoff = [
    "Assign lifecycle, growth, onboarding, or CS owner.",
    "Confirm whether this is an in-app prompt, email, or manual follow-up.",
    "Keep private event logs and CRM exports out of public tools.",
    "Measure activation outcome after the nudge before scaling the copy.",
  ];
  const reminders = [
    "This tool does not connect to product analytics, CRM, lifecycle tools, email systems, or customer data stores.",
    "Avoid creepy tracking copy, fake urgency, unsupported claims, and dark patterns.",
  ];
  briefOutput.innerHTML = [
    "<div class=\"brief-summary\"><h3>Trial activation nudge brief ready</h3><p>Use this before lifecycle, onboarding, or CS sends a follow-up.</p></div>",
    section("Parse summary", summary),
    section("Missing context and risk warnings", grouped),
    section("Safer nudge outline", outline),
    section("Growth/onboarding handoff", handoff),
    section("Safety reminders", reminders),
  ].join("");
  latestBriefText = [
    "Trial activation nudge brief",
    "",
    "Warnings:",
    ...findings.map((finding) => `- ${finding.title} ${finding.message}`),
    "",
    "Safer nudge outline:",
    ...outline.map((item) => `- ${item}`),
  ].join("\n");
  outputPanel.classList.add("has-brief", findings.length ? "status-warning" : "status-good");
  outputPanel.classList.remove(findings.length ? "status-good" : "status-warning");
  outputStatus.textContent = findings.length ? `${findings.length} warning checks ready` : "Activation brief ready";
  copyButton.disabled = false;
  track("brief_generated", { warnings: findings.length });
}

function loadSample() {
  fields.trial.value = "Marketing manager signed up from SEO, trial day 3, has not connected workspace or invited teammates.";
  fields.user.value = "Marketing manager on Pro trial, signed up from SEO landing page, team of 8.";
  fields.milestone.value = "First value is connecting the workspace and publishing the first weekly report dashboard.";
  fields.friction.value = "Workspace connection incomplete and no data source connected yet.";
  fields.timing.value = "Trial day 3, signed up 48 hours ago, trial ends in 11 days.";
  fields.value.value = "Goal is to reduce manual spreadsheet reporting for weekly campaign reviews.";
  fields.cta.value = "Open the 3-minute setup guide or reply to book a 15-minute onboarding call with CS owner Mina.";
  fields.nudge.value = "Want help getting your first report live? Here is the setup guide. If this is not relevant, reply opt out.";
  track("sample_loaded");
}

async function copyText(text, statusElement, successText) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  statusElement.textContent = successText;
}

function submitIntent(event) {
  event.preventDefault();
  const email = document.querySelector("#intent-email").value.trim();
  const role = document.querySelector("#intent-role").value.trim();
  const volume = document.querySelector("#trial-volume").value.trim();
  const process = document.querySelector("#current-process").value.trim();
  const plan = document.querySelector("#plan-interest").value;
  const willingness = document.querySelector("#willingness").value.trim();
  const intents = JSON.parse(localStorage.getItem(INTENTS_KEY) || "[]");
  intents.push({ role, volume, process, plan, willingness, selectedPlan, emailProvided: Boolean(email), timestamp: new Date().toISOString() });
  localStorage.setItem(INTENTS_KEY, JSON.stringify(intents.slice(-100)));
  latestRemoteText = [
    "Trial Activation Nudge Briefs early access request",
    "",
    `Role/team: ${role || "not provided"}`,
    `Trial volume: ${volume || "not provided"}`,
    `Current nudge process: ${process || "not provided"}`,
    `Plan interest: ${plan}`,
    `Willingness to pay: ${willingness || "not provided"}`,
    "",
    "Email intentionally excluded from this public issue body.",
  ].join("\n");
  const params = new URLSearchParams({
    template: "demo_request.md",
    labels: "early-access,purchase-intent,demo-request",
    title: "Early access request: Trial Activation Nudge Briefs",
    body: latestRemoteText,
  });
  remoteIntentLink.href = `${ISSUE_BASE}?${params.toString()}`;
  remoteIntent.hidden = false;
  intentStatus.textContent = "You are on the early access list. Use the public request if you want a remote handoff.";
  track("purchase_intent_submitted", { plan, selectedPlan, emailProvided: Boolean(email) });
  track("remote_intent_ready", { hasRole: Boolean(role), hasVolume: Boolean(volume) });
}

document.querySelectorAll("a[href='#workflow']").forEach((link) => link.addEventListener("click", () => track("cta_clicked", { triggerSource: "workflow_link" })));
document.querySelectorAll(".plan-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPlan = button.dataset.plan || "Starter";
    document.querySelector("#plan-interest").value = selectedPlan;
    document.querySelector("#intent-email").focus();
    track("plan_selected", { plan: selectedPlan });
    track("pricing_viewed", { plan: selectedPlan });
  });
});
sampleButton?.addEventListener("click", loadSample);
generateButton?.addEventListener("click", generateBrief);
copyButton?.addEventListener("click", async () => {
  await copyText(latestBriefText, copyStatus, "Copied activation brief");
  track("copy_brief_clicked");
});
intentForm?.addEventListener("submit", submitIntent);
copyRemoteIntent?.addEventListener("click", async () => {
  await copyText(latestRemoteText, remoteCopyStatus, "Copied request details");
  track("remote_intent_copied");
});
if (window.location.pathname.endsWith("trial-activation-email-template.html")) {
  track("template_opened");
}
track("page_view");
