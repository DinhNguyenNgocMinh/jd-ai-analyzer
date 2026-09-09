const mockAnalysis = {
  jobTitle: "Data Engineer",
  summary: "Build and maintain reliable data products that support business decisions.",
  tags: ["Mid–Senior level", "Full-time", "Data platform"],
  tools: [
    { name: "SQL", importance: 90 },
    { name: "Python", importance: 84 },
    { name: "Apache Spark", importance: 68 },
    { name: "AWS", importance: 61 },
    { name: "Airflow", importance: 54 },
    { name: "Docker", importance: 42 }
  ],
  concepts: [
    "Data modeling",
    "ETL / ELT",
    "Data warehousing",
    "Distributed systems",
    "Data quality",
    "Pipeline orchestration"
  ],
  details: [
    { label: "Experience", value: "3+ years in data engineering or a related role" },
    { label: "Primary focus", value: "Scalable data pipelines and trustworthy datasets" },
    { label: "Collaboration", value: "Partner with analytics, product, and engineering teams" }
  ]
};

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

function renderAnalysis(analysis) {
  document.getElementById("jobTitle").textContent = analysis.jobTitle;
  document.getElementById("roleSummary").textContent = analysis.summary;

  document.getElementById("roleMeta").innerHTML = analysis.tags
    .map((tag) => `<span class="meta-pill">${tag}</span>`)
    .join("");

  document.getElementById("toolsList").innerHTML = analysis.tools
    .map(
      (tool) => `
        <div class="tool-row">
          <div class="tool-row__heading">
            <span class="tool-name">${tool.name}</span>
            <span class="tool-score">${tool.importance}%</span>
          </div>
          <div class="bar-track" role="progressbar" aria-label="${tool.name} relative importance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${tool.importance}">
            <div class="bar-fill" style="width: ${tool.importance}%"></div>
          </div>
        </div>`
    )
    .join("");

  document.getElementById("conceptList").innerHTML = analysis.concepts
    .map((concept) => `<span class="concept-chip">${concept}</span>`)
    .join("");

  document.getElementById("detailsList").innerHTML = analysis.details
    .map(
      (detail) => `
        <div class="detail-row">
          <dt>${detail.label}</dt>
          <dd>${detail.value}</dd>
        </div>`
    )
    .join("");
}

function showDashboard() {
  renderAnalysis(mockAnalysis);
  inputView.hidden = true;
  dashboardView.hidden = false;
  dashboardView.querySelector("h1").focus?.();
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

menuButton.addEventListener("click", togglePanel);
homeLink.addEventListener("click", (event) => {
  event.preventDefault();
  showInput();
});

analysisForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = jobDescription.value.trim();

  if (content.length < 20) {
    formMessage.textContent = "Please paste a job description or a public job-description URL.";
    jobDescription.focus();
    return;
  }

  formMessage.textContent = "";
  analyzeButton.disabled = true;
  analyzeButton.querySelector("span").textContent = "Analyzing…";

  // The next approved stage replaces this mock delay and result with the FastAPI request.
  window.setTimeout(() => {
    analyzeButton.disabled = false;
    analyzeButton.querySelector("span").textContent = "Analyze description";
    showDashboard();
  }, 700);
});

newAnalysisButton.addEventListener("click", showInput);

renderAnalysis(mockAnalysis);
