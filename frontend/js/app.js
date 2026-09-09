const mockAnalysis = {
  job_title: "Data Engineer",
  summary: "Build and maintain reliable data products that support business decisions.",
  experience_level: "Mid–Senior level",
  employment_type: "Full-time",
  work_arrangement: "Data platform",
  tools: [
    { name: "SQL", importance: 90 },
    { name: "Python", importance: 84 },
    { name: "Apache Spark", importance: 68 },
    { name: "AWS", importance: 61 },
    { name: "Airflow", importance: 54 },
    { name: "Docker", importance: 42 }
  ],
  concepts: ["Data modeling", "ETL / ELT", "Data warehousing", "Distributed systems", "Data quality", "Pipeline orchestration"],
  key_responsibilities: ["Build scalable data pipelines", "Maintain trustworthy datasets", "Collaborate with analytics and product teams"]
};

const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8001";
const appShell = document.querySelector(".app-shell");
const sidePanel = document.getElementById("sidePanel");
const menuButton = document.getElementById("menuButton");
const homeLink = document.getElementById("homeLink");
const analysisForm = document.getElementById("analysisForm");
const jobDescription = document.getElementById("jobDescription");
const formMessage = document.getElementById("formMessage");
const analyzeButton = document.getElementById("analyzeButton");
const inputView = document.getElementById("inputView");
const dashboardView = document.getElementById("dashboardView");
const newAnalysisButton = document.getElementById("newAnalysisButton");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setVisible(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueText(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).reduce((cleaned, item) => {
    const text = cleanText(typeof item === "string" ? item : item?.name);
    const key = text.toLocaleLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      cleaned.push(text);
    }
    return cleaned;
  }, []);
}

function toolNames(tools) {
  return uniqueText(tools);
}

// API importance is deliberately not rendered: it is a qualitative extraction/relevance hint,
// not a validated proficiency level or user-facing ranking. Unknown tools remain visible.
const technologyMatchers = [
  { label: "Programming", pattern: /\b(python|java|javascript|typescript|scala|kotlin|rust|golang|go|ruby|php|perl|r\b|c\+\+|c#|\.net|swift|matlab|sas)\b/i },
  { label: "Data platforms & streaming", pattern: /\b(spark|hadoop|flink|kafka|airflow|databricks|snowflake|dbt|beam|arrow|hive|presto|trino|redshift|bigquery|dataflow|informatica|talend)\b/i },
  { label: "Databases", pattern: /\b(sql|nosql|postgres|postgresql|mysql|mariadb|oracle|mongodb|dynamodb|cassandra|redis|elasticsearch|neo4j|graph database|database)\b/i },
  { label: "Cloud & infrastructure", pattern: /\b(aws|azure|gcp|google cloud|docker|kubernetes|terraform|ansible|linux|unix|ci\/cd|jenkins|github actions|cloudformation)\b/i },
  { label: "Analytics & BI", pattern: /\b(tableau|power ?bi|looker|qlik|microstrategy|spotfire|excel|analytics)\b/i },
  { label: "Architecture & engineering", pattern: /\b(etl|elt|data warehouse|data lake|lakehouse|microservices|api|rest|graphql|dimensional modell?ing|event[- ]driven)\b/i }
];

function groupTechnologies(tools) {
  const groups = new Map();
  toolNames(tools).forEach((tool) => {
    const group = technologyMatchers.find(({ pattern }) => pattern.test(tool))?.label || "Other technologies";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(tool);
  });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

// Generic, count-based thresholds: low = up to two named technologies; moderate = 3–9;
// high = 10+ names, or at least seven names spanning four groups.
function technologyDiversity(technologyGroups) {
  const technologies = technologyGroups.reduce((total, group) => total + group.items.length, 0);
  const domains = technologyGroups.length;
  let label = "Low";
  if (technologies >= 10 || (technologies >= 7 && domains >= 4)) label = "High";
  else if (technologies >= 3) label = "Moderate";
  return { label, technologies, domains };
}

function normalizeResponsibilityGroups(analysis) {
  const categorized = analysis.responsibility_groups || analysis.responsibilities_by_category || analysis.responsibilities;
  const groups = [];

  if (Array.isArray(categorized)) {
    categorized.forEach((group) => {
      if (typeof group === "object" && !Array.isArray(group)) {
        const items = uniqueText(group.items || group.responsibilities || group.points);
        const label = cleanText(group.title || group.category || group.name);
        if (label && items.length) groups.push({ label, items });
      }
    });
  } else if (categorized && typeof categorized === "object") {
    Object.entries(categorized).forEach(([label, items]) => {
      const cleaned = uniqueText(items);
      if (cleaned.length) groups.push({ label, items: cleaned });
    });
  }

  if (groups.length) return groups;
  const items = uniqueText(analysis.key_responsibilities);
  return items.length ? [{ label: "Core responsibilities", items }] : [];
}

function leadershipSignals(analysis) {
  const candidates = [...uniqueText(analysis.concepts), ...uniqueText(analysis.key_responsibilities)];
  const managementPattern = /\b(manag(?:e|ement|er|ing)|leadership|people management|coach(?:ing)?|mentor(?:ing)?|hiring|hire|performance management|talent development)\b/i;
  return uniqueText(candidates.filter((item) => managementPattern.test(item)));
}

function createChip(text, className = "chip") {
  return element("span", className, text);
}

function createGlanceCard(label, value, detail) {
  const card = element("article", "glance-card");
  card.append(element("p", "glance-card__label", label), element("p", "glance-card__value", value));
  if (detail) card.append(element("p", "glance-card__detail", detail));
  return card;
}

function renderRoleIdentity(analysis) {
  document.getElementById("jobTitle").textContent = cleanText(analysis.job_title) || "Untitled role";
  document.getElementById("roleSummary").textContent = cleanText(analysis.summary) || "No concise role summary was identified.";
  const meta = [analysis.experience_level, analysis.employment_type, analysis.work_arrangement].map(cleanText).filter(Boolean);
  document.getElementById("roleMeta").replaceChildren(...meta.map((item) => createChip(item, "meta-pill")));
}

function renderGlance(analysis, technologyGroups, responsibilityGroups, leadership) {
  const cards = [];
  const concepts = uniqueText(analysis.concepts);
  const diversity = technologyDiversity(technologyGroups);
  if (responsibilityGroups.length) {
    const responsibilities = responsibilityGroups.flatMap((group) => group.items);
    cards.push(createGlanceCard("Core focus", responsibilities.length === 1 ? responsibilities[0] : `${responsibilities.length} responsibilities`, responsibilityGroups.map((group) => group.label).join(" · ")));
  }
  if (analysis.experience_level) cards.push(createGlanceCard("Seniority / experience", cleanText(analysis.experience_level)));
  if (technologyGroups.length) cards.push(createGlanceCard("Technology diversity", diversity.label, `${diversity.technologies} named ${diversity.technologies === 1 ? "technology" : "technologies"} across ${diversity.domains} ${diversity.domains === 1 ? "group" : "groups"}`));
  if (concepts.length) cards.push(createGlanceCard("Capability areas", `${concepts.length} identified`, concepts.slice(0, 3).join(" · ")));
  if (leadership.length) cards.push(createGlanceCard("Management signals", `${leadership.length} identified`, leadership.slice(0, 3).join(" · ")));
  document.getElementById("glanceGrid").replaceChildren(...cards);
  setVisible("glanceSection", cards.length > 0);
}

function renderResponsibilities(groups) {
  const grid = document.getElementById("responsibilityGrid");
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  document.getElementById("responsibilitiesCount").textContent = `${total} ${total === 1 ? "item" : "items"}`;
  grid.replaceChildren(...groups.map((group) => {
    const card = element("article", "responsibility-card");
    card.append(element("h3", "responsibility-card__title", group.label));
    const list = element("ul", "responsibility-list");
    group.items.forEach((item, index) => {
      const entry = element("li", index >= 3 ? "is-extra" : "", item);
      if (index >= 3) entry.hidden = true;
      list.append(entry);
    });
    card.append(list);
    if (group.items.length > 3) {
      const button = element("button", "text-button", `Show ${group.items.length - 3} more`);
      button.type = "button";
      button.dataset.expandItems = "true";
      button.setAttribute("aria-expanded", "false");
      card.append(button);
    }
    return card;
  }));
  setVisible("responsibilitiesSection", groups.length > 0);
}

function renderTechnologies(groups) {
  const groupsContainer = document.getElementById("technologyGroups");
  const emptyState = document.getElementById("technologyEmpty");
  const summary = document.getElementById("technologySummary");
  const diversity = technologyDiversity(groups);
  if (!groups.length) {
    groupsContainer.replaceChildren();
    summary.replaceChildren();
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  const diversityBadge = element("span", `diversity-badge diversity-badge--${diversity.label.toLowerCase()}`, `Diversity: ${diversity.label}`);
  const count = element("span", "technology-count", `${diversity.technologies} ${diversity.technologies === 1 ? "technology" : "technologies"} · ${diversity.domains} ${diversity.domains === 1 ? "group" : "groups"}`);
  summary.replaceChildren(diversityBadge, count);
  groupsContainer.replaceChildren(...groups.map((group) => {
    const card = element("article", "technology-card");
    const header = element("div", "technology-card__header");
    header.append(element("h3", "technology-card__title", group.label), element("span", "technology-card__count", String(group.items.length)));
    const chips = element("div", "chip-list");
    chips.append(...group.items.map((item) => createChip(item, "technology-chip")));
    card.append(header, chips);
    return card;
  }));
}

function renderCompetencies(concepts) {
  document.getElementById("competenciesCount").textContent = `${concepts.length} ${concepts.length === 1 ? "area" : "areas"}`;
  document.getElementById("competencyList").replaceChildren(...concepts.map((concept) => createChip(concept, "competency-chip")));
  setVisible("competenciesSection", concepts.length > 0);
}

function renderRequirements(analysis) {
  const signals = [["Experience / seniority", cleanText(analysis.experience_level)], ["Employment type", cleanText(analysis.employment_type)], ["Work arrangement", cleanText(analysis.work_arrangement)]].filter(([, value]) => value);
  const grid = document.getElementById("requirementsGrid");
  grid.replaceChildren(...signals.map(([label, value]) => {
    const card = element("div", "signal-card");
    card.append(element("dt", "signal-card__label", label), element("dd", "signal-card__value", value));
    return card;
  }));
  setVisible("requirementsSection", signals.length > 0);
}

function renderLeadership(signals) {
  document.getElementById("leadershipList").replaceChildren(...signals.map((item) => createChip(item, "leadership-chip")));
  setVisible("leadershipSection", signals.length > 0);
}

function safeSourceUrl(content) {
  try {
    const url = new URL(content);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderOriginalDescription(content) {
  const section = document.getElementById("originalSection");
  const details = document.getElementById("originalDetails");
  const source = cleanText(content);
  const url = safeSourceUrl(source);
  const contentContainer = document.getElementById("originalContent");
  details.open = false;
  if (!source) {
    section.hidden = true;
    return;
  }
  if (url) {
    const note = element("p", "source-note", "This analysis was submitted from a public job-description URL.");
    const link = element("a", "source-link", "Open submitted source");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    contentContainer.replaceChildren(note, link);
    details.querySelector("summary").textContent = "View source link";
  } else {
    contentContainer.replaceChildren(element("pre", "original-jd__text", source));
    details.querySelector("summary").textContent = "Open submitted job description";
  }
  section.hidden = false;
}

function renderAnalysis(analysis, sourceContent = "") {
  const technologyGroups = groupTechnologies(analysis.tools);
  const responsibilityGroups = normalizeResponsibilityGroups(analysis);
  const concepts = uniqueText(analysis.concepts);
  const leadership = leadershipSignals(analysis);
  renderRoleIdentity(analysis);
  renderGlance(analysis, technologyGroups, responsibilityGroups, leadership);
  renderResponsibilities(responsibilityGroups);
  renderTechnologies(technologyGroups);
  renderCompetencies(concepts);
  renderRequirements(analysis);
  renderLeadership(leadership);
  renderOriginalDescription(sourceContent);
}

function showDashboard(analysis, sourceContent) {
  renderAnalysis(analysis, sourceContent);
  inputView.hidden = true;
  dashboardView.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showInput() {
  dashboardView.hidden = true;
  inputView.hidden = false;
  formMessage.textContent = "";
  jobDescription.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function togglePanel() {
  const isCollapsed = appShell.classList.toggle("panel-collapsed");
  menuButton.setAttribute("aria-expanded", String(!isCollapsed));
  menuButton.setAttribute("aria-label", isCollapsed ? "Open workspace panel" : "Collapse workspace panel");
  sidePanel.setAttribute("aria-hidden", String(isCollapsed));
}

async function requestAnalysis(content) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "We could not analyze that description. Please try again.");
  if (!data.is_job_description) throw new Error(data.reason_not_job_description || "This does not appear to be a job description.");
  return data;
}

menuButton.addEventListener("click", togglePanel);
homeLink.addEventListener("click", (event) => {
  event.preventDefault();
  showInput();
});
document.getElementById("responsibilityGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-expand-items]");
  if (!button) return;
  const expanded = button.getAttribute("aria-expanded") === "true";
  const items = button.closest(".responsibility-card").querySelectorAll(".is-extra");
  items.forEach((item) => { item.hidden = expanded; });
  button.setAttribute("aria-expanded", String(!expanded));
  button.textContent = expanded ? `Show ${items.length} more` : "Show less";
});
analysisForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = jobDescription.value.trim();
  if (content.length < 10) {
    formMessage.textContent = "Please paste a job description or a public job-description URL.";
    jobDescription.focus();
    return;
  }
  formMessage.textContent = "";
  analyzeButton.disabled = true;
  analyzeButton.querySelector("span").textContent = "Analyzing…";
  try {
    showDashboard(await requestAnalysis(content), content);
  } catch (error) {
    formMessage.textContent = error.message || "The service is unavailable. Please try again shortly.";
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.querySelector("span").textContent = "Analyze description";
  }
});
newAnalysisButton.addEventListener("click", showInput);
const compactViewport = window.matchMedia("(max-width: 620px)");
function collapsePanelForCompactViewport() {
  if (!compactViewport.matches) return;
  appShell.classList.add("panel-collapsed");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open workspace panel");
  sidePanel.setAttribute("aria-hidden", "true");
}
compactViewport.addEventListener("change", collapsePanelForCompactViewport);
collapsePanelForCompactViewport();
renderAnalysis(mockAnalysis);
