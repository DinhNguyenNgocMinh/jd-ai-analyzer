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

const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8001";
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

function renderAnalysis(analysis) {
  document.getElementById("jobTitle").textContent = analysis.job_title;
  document.getElementById("roleSummary").textContent = analysis.summary;

  const tags = [analysis.experience_level, analysis.employment_type, analysis.work_arrangement].filter(Boolean);
  const roleMeta = document.getElementById("roleMeta");
  roleMeta.replaceChildren(...tags.map((tag) => element("span", "meta-pill", tag)));

  const toolsList = document.getElementById("toolsList");
  toolsList.replaceChildren(
    ...analysis.tools.map((tool) => {
      const toolRow = element("div", "tool-row");
      const heading = element("div", "tool-row__heading");
      heading.append(element("span", "tool-name", tool.name), element("span", "tool-score", `${tool.importance}%`));

      const track = element("div", "bar-track");
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-label", `${tool.name} relative importance`);
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", "100");
      track.setAttribute("aria-valuenow", String(tool.importance));
      const fill = element("div", "bar-fill");
      fill.style.width = `${Math.max(0, Math.min(100, Number(tool.importance) || 0))}%`;
      track.append(fill);
      toolRow.append(heading, track);
      return toolRow;
    })
  );

  const conceptList = document.getElementById("conceptList");
  conceptList.replaceChildren(...analysis.concepts.map((concept) => element("span", "concept-chip", concept)));

  const details = [
    analysis.experience_level && { label: "Experience", value: analysis.experience_level },
    analysis.employment_type && { label: "Employment", value: analysis.employment_type },
    analysis.work_arrangement && { label: "Work arrangement", value: analysis.work_arrangement },
    analysis.key_responsibilities?.length && { label: "Key responsibilities", value: analysis.key_responsibilities.join(" · ") }
  ].filter(Boolean);
  const detailsList = document.getElementById("detailsList");
  detailsList.replaceChildren(
    ...(details.length ? details : [{ label: "Role details", value: "No additional details were confidently identified." }]).map((detail) => {
      const row = element("div", "detail-row");
      row.append(element("dt", "", detail.label), element("dd", "", detail.value));
      return row;
    })
  );
}

function showDashboard(analysis) {
  renderAnalysis(analysis);
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
    showDashboard(await requestAnalysis(content));
  } catch (error) {
    formMessage.textContent = error.message || "The service is unavailable. Please try again shortly.";
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.querySelector("span").textContent = "Analyze description";
  }
});

newAnalysisButton.addEventListener("click", showInput);
renderAnalysis(mockAnalysis);
