// Add the deployed Apps Script Web App URL here (the address ending in /exec).
const VOTE_API_URL = "https://script.google.com/macros/s/AKfycbwC4-4Rz7FtEbPq_sT4qRSC_5G5WykMxGQl4ytAfg5Csq5iPMT_Bo6TD6OQBgWiGius/exec";
const VOTE_STORAGE_KEY = "epoch-in-code-voter-v1";

const tableBody = document.querySelector("#project-grid");
const search = document.querySelector("#search");
const count = document.querySelector("#work-count");
const emptyState = document.querySelector("#empty-state");
let localChoice = localStorage.getItem(VOTE_STORAGE_KEY) || "";
const rows = Array.from(tableBody.querySelectorAll(".project-row"));

function updateChoice() {
  rows.forEach(row => {
    const id = row.dataset.projectId;
    const selected = id === localChoice;
    const button = row.querySelector(".like-button");
    row.classList.toggle("is-liked", selected);
    button.classList.toggle("liked", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector(".heart").textContent = selected ? "♥" : "♡";
    button.disabled = !VOTE_API_URL;
  });
}
function filterRows() {
  const query = search.value.trim().toLocaleLowerCase("ru");
  let visible = 0;
  rows.forEach(row => {
    const match = row.dataset.search.toLocaleLowerCase("ru").includes(query);
    row.hidden = !match;
    if (match) visible++;
  });
  count.textContent = String(visible).padStart(2, "0");
  emptyState.hidden = visible !== 0;
}
function getVoterToken() {
  const tokenKey = VOTE_STORAGE_KEY + "-token";
  let token = localStorage.getItem(tokenKey);
  if (!token) {
    token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(tokenKey, token);
  }
  return token;
}
function postVote(projectId, action) {
  fetch(VOTE_API_URL, {
    method: "POST",
    mode: "no-cors",
    cache: "no-store",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ voter_token: getVoterToken(), project_id: projectId, action })
  }).catch(() => {});
}
function loadCounts() {
  if (!VOTE_API_URL) return;
  const callback = `__epochVotes_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const script = document.createElement("script");
  window[callback] = result => {
    rows.forEach(row => {
      const value = Number(result?.counts?.[row.dataset.projectId] || 0);
      row.querySelector(".like-count").textContent = String(value);
    });
    script.remove();
    delete window[callback];
  };
  script.onerror = () => { script.remove(); delete window[callback]; };
  const separator = VOTE_API_URL.includes("?") ? "&" : "?";
  script.src = `${VOTE_API_URL}${separator}callback=${callback}&t=${Date.now()}`;
  document.head.append(script);
}

search.addEventListener("input", filterRows);
tableBody.addEventListener("click", event => {
  const button = event.target.closest("[data-vote]");
  if (!button || button.disabled || !VOTE_API_URL) return;
  const projectId = button.dataset.vote;
  const action = localChoice === projectId ? "remove" : "vote";
  localChoice = action === "remove" ? "" : projectId;
  if (localChoice) localStorage.setItem(VOTE_STORAGE_KEY, localChoice);
  else localStorage.removeItem(VOTE_STORAGE_KEY);
  updateChoice();
  postVote(projectId, action);
  setTimeout(loadCounts, 700);
});

updateChoice();
filterRows();
if (VOTE_API_URL) loadCounts();
