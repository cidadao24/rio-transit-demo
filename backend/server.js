import express from 'express';
import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
app.use(express.json());

// Setup SQLite database (in-memory for simplicity)
let db;
async function initDb() {
  db = await open({ filename: 'positions.db', driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem TEXT,
    linha TEXT,
    latitude REAL,
    longitude REAL,
    datahora TEXT,
    origem TEXT
  )`);
}

// Ingest route: fetch SPPO and BRT positions and save
app.post('/ingest', async (req, res) => {
  const sources = [
    { name: 'sppo', url: 'https://dados.mobilidade.rio/gps/sppo' },
    { name: 'brt', url: 'https://dados.mobilidade.rio/gps/brt' }
  ];
  let count = 0;
  for (const source of sources) {
    try {
      const resp = await fetch(source.url);
      const data = await resp.json();
      const insert = await db.prepare(`INSERT INTO positions (ordem, linha, latitude, longitude, datahora, origem) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const item of data) {
        const lat = parseFloat(item.latitude || item.lat);
        const lon = parseFloat(item.longitude || item.lon);
        const ordem = item.ordem || item.vehicle_id || null;
        const linha = item.linha || item.route || null;
        const datahora = item.datahora || item.timestamp || null;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          await insert.run(ordem, linha, lat, lon, datahora, source.name);
          count++;
        }
      }
      await insert.finalize();
    } catch (err) {
      console.error('Failed ingest', source.name, err);
    }
  }
  res.json({ ingested: count });
});

// Get latest positions (within last X minutes)
app.get('/api/vehicles', async (req, res) => {
  const minutes = parseInt(req.query.minutes) || 10;
  const line = req.query.line || null;
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  let sql = `SELECT * FROM positions WHERE datahora >= ?`;
  const params = [since];
  if (line) {
    sql += ' AND linha = ?';
    params.push(line);
  }
  const rows = await db.all(sql, params);
  res.json(rows);
});

// Placeholder for average speed computation
app.get('/api/speeds', async (req, res) => {
  res.json({ message: 'Average speeds not implemented in this demo' });
});

// Placeholder for predicted position
app.get('/api/predict', async (req, res) => {
  res.json({ message: 'Prediction not implemented in this demo' });
});

// Placeholder for heatmap aggregate
app.get('/api/heatmap', async (req, res) => {
  res.json({ message: 'Heatmap not implemented in this demo' });
});

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
