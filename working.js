let port;
let reader;
let inputDone;
let inputStream;
let buffer = "";
let alertShown = false;
let isConnected = false;

const connectBtn = document.getElementById("connectBtn");
const connectionBadge = document.getElementById("connectionBadge");
const alertBox = document.getElementById("alertBox");
const shelfLifeCard = document.getElementById("shelfLifeCard");
const shelfSafe = document.getElementById("shelfLifeSafe");
const shelfDanger = document.getElementById("shelfLifeDanger");

const el = {
  temp: document.getElementById("temperature"),
  ph: document.getElementById("ph"),
  tds: document.getElementById("tds"),
  turb: document.getElementById("turbidity"),
  fat: document.getElementById("fat"),
  snf: document.getElementById("snf"),

  checkPh: document.getElementById("check-ph"),
  checkTds: document.getElementById("check-tds"),
  checkTemp: document.getElementById("check-temp"),
  checkTurb: document.getElementById("check-turb"),
  checkFat: document.getElementById("check-fat"),
  checkSnf: document.getElementById("check-snf"),

  purityValue: document.getElementById("purityValue"),
  purityArc: document.getElementById("purityArc"),
  purityStatus: document.getElementById("purityStatus"),

  barTemp: document.getElementById("bar-temp"),
  barPh: document.getElementById("bar-ph"),
  barTds: document.getElementById("bar-tds"),
  barTurb: document.getElementById("bar-turb"),
  barFat: document.getElementById("bar-fat"),
  barSnf: document.getElementById("bar-snf")
};

function safeValue(val, format = "float") {
  const num = Number(val);
  if (!val || isNaN(num) || num <= 0) return "--";

  if (format === "int") return Math.round(num);
  return num.toFixed(1);
}

function updateBar(element, value, max) {
  if (!element) {
    console.warn("❌ Bar element not found");
    return;
  }

  const num = Number(value);

  if (isNaN(num) || num <= 0) {
    element.style.width = "0%";
    console.log(`📊 ${element.id}: 0% (invalid: ${value})`);
    return;
  }

  const percentage = Math.min((num / max) * 100, 100);
  
  element.style.display = "block";
  element.style.width = percentage + "%";
  
  void element.offsetWidth;
  
  console.log(`📊 ${element.id}: ${percentage.toFixed(1)}% (${num}/${max})`);
}

function updateCheck(element, value) {
  if (!element) return;

  const num = Number(value);

  if (!isNaN(num) && num > 0) {
    element.innerHTML = '✔';
    element.className = 'status-icon tick-green';
  } else {
    element.innerHTML = '✖';
    element.className = 'status-icon cross-red';
  }
}

const map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);
const marker = L.marker([20.5937, 78.9629]).addTo(map).bindPopup("🐮CONTAINER🥛").openPopup();

connectBtn.addEventListener("click", toggleConnection);

async function toggleConnection() {
  if (isConnected) await disconnect();
  else await connect();
}

async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    isConnected = true;
    updateStatusUI(true);
    const textDecoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(textDecoder.writable);
    inputStream = textDecoder.readable;
    reader = inputStream.getReader();
    readLoop();
  } catch (error) {
    console.error("Connection error:", error);
    updateStatusUI(false);
    await resetState();
  }
}

async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
  }
  if (port) {
    await port.close();
    port = null;
  }
  isConnected = false;
  updateStatusUI(false);
  alertShown = false;
}

async function resetState() {
  if (port && port.readable) {
    try {
      if (reader) await reader.cancel();
    } catch (e) {
      console.error("Reset error:", e);
    }
  }
  isConnected = false;
  updateStatusUI(false);
  port = null;
  reader = null;
  alertShown = false;
}

async function readLoop() {
  while (true) {
    try {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;

      let start, end;

      while ((start = buffer.indexOf("{")) !== -1 &&
             (end = buffer.indexOf("}", start)) !== -1) {

        const jsonStr = buffer.slice(start, end + 1);
        buffer = buffer.slice(end + 1);

        try {
          const data = JSON.parse(jsonStr);
          updateUI(data);
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      }

    } catch (error) {
      console.error("Read loop error:", error);
      await resetState();
      break;
    }
  }
}

function updateStatusUI(connected) {
  if (connected) {
    connectionBadge.innerHTML = `<span class="dot"></span> CONNECTED`;
    connectionBadge.classList.add('connected');
    connectBtn.textContent = "Disconnect";
    connectBtn.style.backgroundColor = "#E31A1A";
  } else {
    connectionBadge.innerHTML = `<span class="dot"></span> DISCONNECTED`;
    connectionBadge.classList.remove('connected');
    connectBtn.textContent = "Connect";
    connectBtn.style.backgroundColor = "#111C44";
  }
}

function updateUI(data) {
  console.log("📡 DATA RECEIVED:", data);

  el.temp.textContent = safeValue(data.temperature);
  el.ph.textContent = safeValue(data.ph);
  el.tds.textContent = safeValue(data.tds, "int");
  el.turb.textContent = safeValue(data.turbidity, "int");
  el.fat.textContent = safeValue(data.fat);
  el.snf.textContent = safeValue(data.snf);

  console.log("🔄 Updating progress bars...");
  updateBar(el.barTemp, data.temperature, 50);
  updateBar(el.barPh, data.ph, 14);
  updateBar(el.barTds, data.tds, 1000);
  updateBar(el.barTurb, data.turbidity, 1000);
  updateBar(el.barFat, data.fat, 10);
  updateBar(el.barSnf, data.snf, 15);

  updateCheck(el.checkPh, data.ph);
  updateCheck(el.checkTds, data.tds);
  updateCheck(el.checkTemp, data.temperature);
  updateCheck(el.checkTurb, data.turbidity);
  updateCheck(el.checkFat, data.fat);
  updateCheck(el.checkSnf, data.snf);

  if (data.latitude !== undefined && data.longitude !== undefined) {
    const newLatLng = new L.LatLng(data.latitude, data.longitude);
    marker.setLatLng(newLatLng);
    map.panTo(newLatLng);
  }

  let score = 0;

  if (data.fat != null) {
    const fat = Number(data.fat);

    if (fat <= 0) score = 0;
    else if (fat <= 1.5) score = 37;
    else if (fat < 2.5) score = 51;
    else if (fat < 3.5) score = 68;
    else if (fat < 5) score = 76;
    else score = 91;
  }

  const allReadingsAvailable =
    ['temperature', 'ph', 'tds', 'fat', 'snf', 'turbidity']
      .every(k => Number(data[k]) > 0);

  if (data.adulterated === 1) {

    el.purityArc.style.stroke = "#E31A1A";
    el.purityStatus.textContent = "Contaminated";
    el.purityStatus.style.color = "#E31A1A";
    el.purityValue.textContent = 0;

    const maxDash = 126;
    el.purityArc.style.strokeDashoffset = maxDash - 126;

    shelfLifeCard.classList.remove('card-green');
    shelfLifeCard.classList.add('card-red');
    shelfSafe.classList.add('hidden');
    shelfDanger.classList.remove('hidden');

    if (!alertShown) {
      alertBox.classList.remove("hidden");
      alertShown = true;
    }

  }

  else {

    const maxDash = 126;
    el.purityArc.style.stroke = "#05CD99";
    shelfLifeCard.classList.remove('card-red');
    shelfLifeCard.classList.add('card-green');
    shelfSafe.classList.remove('hidden');
    shelfDanger.classList.add('hidden');

    alertShown = false;
    alertBox.classList.add("hidden");

    if (!allReadingsAvailable) {

      el.purityArc.style.stroke = "#000000";
      el.purityStatus.textContent = "Not All Readings";
      el.purityStatus.style.color = "#030a0ac0";
      el.purityValue.textContent = "--";
      el.purityArc.style.strokeDashoffset = 0;

      document.getElementById("shelfHours").textContent = "--";
      document.getElementById("shelfMins").textContent = "--";
    }

    else {

      el.purityValue.textContent = score;

      el.purityArc.style.strokeDashoffset =
        maxDash - (score / 100 * maxDash);

      const fatVal = Number(data.fat || 0);
      let shelfHours = 0;

      if (fatVal <= 1.5) shelfHours = 6;
      else if (fatVal < 2.5) shelfHours = 10;
      else if (fatVal < 3.5) shelfHours = 14;
      else if (fatVal < 5) shelfHours = 16;
      else shelfHours = 18;

      document.getElementById("shelfHours").textContent = shelfHours;
      document.getElementById("shelfMins").textContent = 30;

      if (score < 50) {
        el.purityArc.style.stroke = "#f37125";
        el.purityStatus.textContent = "OK";
        el.purityStatus.style.color = "#f37125";
      }
      else if (score < 75) {
        el.purityArc.style.stroke = "#12cac1c0";
        el.purityStatus.textContent = "Good";
        el.purityStatus.style.color = "#12cac1c0";
      }
      else if (score < 90) {
        el.purityArc.style.stroke = "#15e8f7";
        el.purityStatus.textContent = "Nice";
        el.purityStatus.style.color = "#12d0e9";
      }
      else {
        el.purityArc.style.stroke = "#05CD99";
        el.purityStatus.textContent = "Great!";
        el.purityStatus.style.color = "#05CD99";
      }
    }
  }
}

if (navigator.serial) {
  navigator.serial.addEventListener("disconnect", () => resetState());
}

window.addEventListener('DOMContentLoaded', () => {
  console.log("🔍 Checking bar elements on load:");
  console.log("bar-temp:", el.barTemp);
  console.log("bar-ph:", el.barPh);
  console.log("bar-tds:", el.barTds);
  console.log("bar-turb:", el.barTurb);
  console.log("bar-fat:", el.barFat);
  console.log("bar-snf:", el.barSnf);
  
  console.log("🧪 Testing bars with dummy data...");
  setTimeout(() => {
    updateBar(el.barTemp, 25, 50);
    updateBar(el.barPh, 6.5, 14);
    updateBar(el.barTds, 500, 1000);
    updateBar(el.barTurb, 400, 1000);
    updateBar(el.barFat, 3.5, 10);
    updateBar(el.barSnf, 8.5, 15);
  }, 1000);
});
