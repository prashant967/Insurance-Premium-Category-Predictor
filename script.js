"use strict";

const API_BASE_URL = "https://insurance-premium-category-predictor-605u.onrender.com";
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------
   CONFIG – edit these if your FastAPI schema differs
------------------------------------------------------------------ */

/* Request mapping: the object sent to POST /predict.
   Matches your UserInput schema. bmi, age_group, lifestyle_risk and city_tier
   are computed_field values on the backend, so they are NOT sent.
   NOTE: the backend expects height in METERS (lt=2.5), the form collects cm. */
function buildPayload(f) {
  return {
    age: f.age,
    weight: f.weight,
    height: f.height / 100,      // cm -> m
    income_lpa: f.income_lpa,
    smoker: f.smoker,            // boolean
    city: f.city,                // backend normalizes with .title()
    occupation: f.occupation,    // literal, e.g. "private_job"
  };
}

/* Response mapping: the ONLY place that reads backend property names.
   Tolerates: {"predicted_category": "High"}, {"response": {...}},
   and nested objects with confidence / class_probabilities. */
function mapResponse(data) {
  console.log("Raw /predict response:", data);
  const pick = (o, keys) => {
    if (!o || typeof o !== "object") return null;
    for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
    return null;
  };
  const PRED_KEYS = ["predicted_category", "prediction", "category", "label", "class", "result"];

  let r = data;
  if (r && typeof r === "object" && r.response !== undefined) r = r.response;

  // Unwrap nested objects until we reach a primitive prediction
  let holder = r, prediction = typeof r === "string" ? r : null;
  for (let i = 0; i < 3 && prediction === null && holder && typeof holder === "object"; i++) {
    const v = pick(holder, PRED_KEYS);
    if (v !== null && typeof v === "object") { holder = v; continue; }
    prediction = v;
  }
  if (Array.isArray(prediction)) prediction = prediction[0];

  const probabilities = pick(holder, ["probabilities", "class_probabilities", "probs"]) ?? pick(r, ["probabilities", "class_probabilities", "probs"]);
  let confidence = pick(holder, ["confidence_score", "confidence"]) ?? pick(r, ["confidence_score", "confidence"]);
  if (confidence === null && probabilities && prediction in probabilities) confidence = probabilities[prediction];
  return { prediction: prediction !== null ? String(prediction) : null, confidence, probabilities };
}

/* ------------------------------------------------------------------
   Backend status
------------------------------------------------------------------ */
function setPill(el, state, text) {
  el.classList.remove("ok", "bad");
  el.classList.add(state);
  el.querySelector("span").textContent = text;
}

async function checkBackendStatus() {
  const pill = $("navStatus");
  try {
    const res = await fetch(`${API_BASE_URL}/`);
    if (!res.ok) throw new Error("bad status");
    setPill(pill, "ok", "Backend Connected");
    setPill($("stApi"), "ok", "Connected");
    return true;
  } catch {
    setPill(pill, "bad", "Backend Offline");
    setPill($("stApi"), "bad", "Offline");
    return false;
  }
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    const data = await res.json();
    const healthy = res.ok && data.status === "healthy";
    setPill($("stModel"), healthy ? "ok" : "bad", healthy ? "Available" : "Unavailable");
    $("versionText").textContent = healthy && data.version ? `Model version: ${data.version}` : "";
  } catch {
    setPill($("stModel"), "bad", "Unavailable");
    $("versionText").textContent = "";
  }
}

/* ------------------------------------------------------------------
   Form helpers
------------------------------------------------------------------ */
function calculateBMI() {
  const w = parseFloat($("weight").value), h = parseFloat($("height").value);
  if (w > 0 && h > 0) {
    const bmi = w / Math.pow(h / 100, 2);
    $("bmiValue").textContent = bmi.toFixed(1);
    $("bmiLabel").textContent = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    return bmi;
  }
  $("bmiValue").textContent = "--";
  $("bmiLabel").textContent = "Enter weight and height";
  return null;
}

function setError(id, msg) {
  $("err-" + id).textContent = msg || "";
  $(id).setAttribute("aria-invalid", msg ? "true" : "false");
}

function validateForm() {
  let ok = true;
  const check = (id, valid, msg) => { setError(id, valid ? "" : msg); if (!valid) ok = false; };
  const num = (id) => ($(id).value.trim() === "" ? NaN : Number($(id).value));

  const age = num("age"), weight = num("weight"), height = num("height"), income = num("income_lpa");
  check("age", Number.isFinite(age) && age >= 1 && age <= 100, "Please enter a valid age between 1 and 100.");
  check("weight", Number.isFinite(weight) && weight > 0, "Please enter a valid weight in kg.");
  check("height", Number.isFinite(height) && height > 0, "Please enter a valid height in cm.");
  check("income_lpa", Number.isFinite(income) && income > 0, "Please enter a valid annual income greater than 0.");
  check("city", /^[A-Za-z][A-Za-z .'-]{1,}$/.test($("city").value.trim()), "Please enter your city.");
  check("occupation", $("occupation").value !== "", "Please select your occupation.");
  return ok;
}

function titleCase(s) {
  return s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFormData() {
  const age = Number($("age").value), weight = Number($("weight").value), height = Number($("height").value);
  const smoker = document.querySelector('input[name="smoker"]:checked').value === "true";
  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 100) / 100;
  const city = titleCase($("city").value);

  return {
    age, weight, height, bmi, smoker, city,
    income_lpa: Number($("income_lpa").value),
    occupation: $("occupation").value,
    occupationLabel: $("occupation").selectedOptions[0].textContent,
  };
}

/* ------------------------------------------------------------------
   UI state
------------------------------------------------------------------ */
function showLoading(on) {
  const btn = $("predictBtn");
  btn.disabled = on;
  btn.classList.toggle("loading", on);
  $("btnText").textContent = on ? "Analyzing your profile..." : "Predict Premium Category";
}

function showError(msg) {
  const box = $("errorBox");
  box.textContent = msg || "";
  box.hidden = !msg;
}

/* ------------------------------------------------------------------
   Prediction
------------------------------------------------------------------ */
async function predictPremium(event) {
  event.preventDefault();
  showError("");
  if (!validateForm()) return;

  const form = getFormData();
  showLoading(true);
  try {
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
    } catch {
      checkBackendStatus();
      throw new Error("Unable to connect to the prediction server.\nPlease make sure the FastAPI backend is running on port 8000.");
    }

    let data;
    try { data = await res.json(); }
    catch { throw new Error(res.ok ? "The server returned an unreadable response." : `The server returned an error (HTTP ${res.status}).`); }

    if (!res.ok) throw new Error(extractError(data, res.status));

    const result = mapResponse(data);
    if (!result.prediction) throw new Error("The server response did not contain a prediction. Open the browser console (F12) to see the raw response.");
    displayPrediction(result, form);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function extractError(data, status) {
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {   // FastAPI validation errors (422)
    return data.detail.map((d) => `${(d.loc || []).slice(1).join(".") || "input"}: ${d.msg}`).join("\n");
  }
  return `The server returned an error (HTTP ${status}).`;
}

// Your predict.py already returns percentages (0-100). Set false if it returns 0-1 fractions.
const BACKEND_RETURNS_PERCENT = true;

function toPercent(v) {
  if (v === null || v === undefined || v === "") return null;
  v = Number(v);
  if (isNaN(v)) return null;
  const p = BACKEND_RETURNS_PERCENT ? v : v * 100;
  return Math.round(p * 100) / 100;
}

function displayPrediction(result, form) {
  const key = result.prediction.toLowerCase();
  const category = ["low", "medium", "high"].includes(key) ? key : "";

  const card = $("predCard");
  card.className = "card pred-card";
  $("result").dataset.cat = category;
  $("predText").textContent = result.prediction;
  $("predBadge").setAttribute("aria-label", `Predicted premium category: ${result.prediction}`);

  // confidence ring
  const conf = toPercent(result.confidence);
  $("ringWrap").hidden = conf === null;
  $("ringBar").style.strokeDashoffset = 326.7;
  $("confText").textContent = conf === null ? "" : `${conf}%`;

  displayProbabilities(result);
  $("summary").innerHTML = "";
  [
    ["Age", form.age],
    ["BMI", form.bmi.toFixed(1)],
    ["Income", `₹${form.income_lpa} LPA`],
    ["Smoking", form.smoker ? "Smoker" : "Non-Smoker"],
    ["City", form.city],
    ["Occupation", form.occupationLabel],
  ].forEach(([k, v]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v;
    row.append(dt, dd);
    $("summary").appendChild(row);
  });

  $("result").hidden = false;
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (conf !== null) $("ringBar").style.strokeDashoffset = 326.7 * (1 - Math.min(conf, 100) / 100);
    document.querySelectorAll(".prob-fill").forEach((el) => (el.style.width = el.dataset.w + "%"));
  }));
}

function displayProbabilities(result) {
  const box = $("probs");
  box.innerHTML = "";
  const probs = result.probabilities;
  $("probNote").hidden = !!probs;
  if (!probs) return;

  const order = ["Low", "Medium", "High"];
  const keys = Object.keys(probs).sort((a, b) => {
    const ia = order.findIndex((o) => o.toLowerCase() === a.toLowerCase());
    const ib = order.findIndex((o) => o.toLowerCase() === b.toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  keys.forEach((k) => {
    const pct = toPercent(probs[k]) ?? 0;
    const top = k.toLowerCase() === result.prediction.toLowerCase();
    const row = document.createElement("div");
    row.className = "prob-row" + (top ? " top" : "");
    row.innerHTML = '<b></b><div class="prob-track"><div class="prob-fill"></div></div><span></span>';
    row.querySelector("b").textContent = k;
    row.querySelector("span").textContent = `${pct}%`;
    const fill = row.querySelector(".prob-fill");
    fill.dataset.w = Math.min(pct, 100);
    box.appendChild(row);
  });
}

function resetForm() {
  $("predictForm").reset();
  ["age", "weight", "height", "income_lpa", "city", "occupation"].forEach((id) => setError(id, ""));
  calculateBMI();
  showError("");
  $("result").hidden = true;
  $("predict").scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------
   Init
------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  $("weight").addEventListener("input", calculateBMI);
  $("height").addEventListener("input", calculateBMI);
  $("predictForm").addEventListener("submit", predictPremium);
  $("resetBtn").addEventListener("click", resetForm);

  const menuBtn = $("menuBtn"), nav = $("nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  checkBackendStatus();
  checkHealth();
  setInterval(() => { checkBackendStatus(); checkHealth(); }, 30000);
});
