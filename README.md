🥛 MilkoTrack Dashboard

A real-time, web-based monitoring system for milk quality. This dashboard connects to hardware sensors via Bluetooth/Serial to track purity, shelf life, and location.

🚀 How it Works

This project uses the **Web Serial API** to talk directly to an Arduino/ESP32.

1. **Hardware** (ECE side) collects data from pH, Temperature, Fat, and Turbidity sensors.
2. **Bluetooth** sends that data as a JSON string.
3. **MilkoTrack** (This Dashboard) parses that data to calculate a **Purity Score** and **Estimated Shelf Life** in real-time.

 ✨ Features

* Live Sensor Feed: Real-time progress bars for pH, Temperature, TDS, Fat, and SNF.
* Purity Meter: A dynamic arc that changes color based on the milk quality.
* Smart Alerts: Instant "Contaminated" warning if the adulteration sensor is triggered.
* GPS Tracking: Integrated Leaflet.js map to track the milk container during transport.
* Zero Install: Runs entirely in the browser—no drivers needed.

🛠️ Tech Stack

* Frontend: HTML5, CSS3 (Modern UI with Glassmorphism)
* Logic:Vanilla JavaScript (ES6+)
* Connectivity: Web Serial API
* Mapping: Leaflet.js (OpenStreetMap)



📡 Data Format

The dashboard expects a JSON string over serial at **9600 Baud** in this format:

```json
{
  "temperature": 24.5,
  "ph": 6.7,
  "tds": 450,
  "turbidity": 200,
  "fat": 4.2,
  "snf": 8.5,
  "adulterated": 0,
  "latitude": 20.5937,
  "longitude": 78.9629
}
