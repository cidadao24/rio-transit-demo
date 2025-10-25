// Basic Leaflet map initialization
const map = L.map('map').setView([-22.9068, -43.1729], 12); // Coordinates of Rio de Janeiro

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);

const lineFilterInput = document.getElementById('lineFilter');
const refreshBtn = document.getElementById('refreshBtn');

async function fetchPositions() {
  // Fetch real-time bus positions from DataRio (SPPO)
  const url = 'https://dados.mobilidade.rio/gps/sppo';
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Erro ao buscar posições:', err);
    return [];
  }
}

function updateMap(data) {
  markersLayer.clearLayers();
  const filterLine = lineFilterInput.value.trim();
  data.forEach(item => {
    // Each item may have properties: ordem, linha, latitude, longitude, datahora
    const lat = parseFloat(item.latitude || item.lat);
    const lon = parseFloat(item.longitude || item.lon);
    const linha = item.linha || item.route || '';
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      if (!filterLine || linha.startsWith(filterLine)) {
        const marker = L.marker([lat, lon]);
        marker.bindPopup(`Veículo: ${item.ordem || '-'}<br>Linha: ${linha}<br>Hora: ${item.datahora || '-'}`);
        markersLayer.addLayer(marker);
      }
    }
  });
}

async function refresh() {
  const positions = await fetchPositions();
  updateMap(positions);
}

refreshBtn.addEventListener('click', refresh);

// initial load
refresh();
