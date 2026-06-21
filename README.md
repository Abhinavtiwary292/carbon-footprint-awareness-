# 🌎 EcoSphere — Carbon Footprint Tracker & Awareness Platform

EcoSphere is a sleek, framework-free, single-page web application designed to help individuals understand, track, and reduce their carbon footprint. Featuring glassmorphic design principles, custom interactive vector visualizations, and gamified daily habits, it allows users to take charge of their environmental impact with absolute privacy.

---

## ✨ Key Features

*   **📊 Interactive Dashboard & Analytics**:
    *   Dynamic circular carbon gauge tracking overall annualized emissions in Tons CO₂e/yr.
    *   Custom SVG Donut Chart showcasing segment emissions percentages (Transport, Home, Food, Consumption) with interactive legend highlights.
    *   Interactive Bar Chart comparing your footprint with global averages and regional benchmarks.
    *   Generative Smart Insights card offering personalized recommendations based on your highest emission categories.
*   **🧮 Comprehensive Multi-Category Calculators**:
    *   **Transportation**: Car engine profiles (gasoline, diesel, hybrid, electric), motorcycle distance, public transit usage, and short/long flight logs.
    *   **Home Energy**: Residents divisor, monthly electricity bill with green grid conversion scaling, heating fuel category (gas, electric heat, heating oil), and water usage.
    *   **Food & Diet**: general diet selector cards (Vegan to Meat-heavy), organic/local purchase offsets, and food waste percentages.
    *   **Consumption & Waste**: Monthly clothes and electronics purchases, trash bag volume, and detailed recycling checkboxes.
*   **⚡ Gamified Habit Checklist**:
    *   Daily checklist of low-carbon actions (commuting green, eating plant-based, shortening showers).
    *   Real-time XP updates and CO₂ offset trackers.
    *   Streak calculations and user Level-up progression (Level 1 Ranger to Guardian).
    *   Interactive Trophy Card mapping unlocked eco-badges.
*   **🌲 Scenario Planner (Lifestyle Simulator)**:
    *   Adjust interactive sliders (e.g., reduce driving miles, convert to green energy) to simulate future emissions reduction.
    *   **Simulated Forest Grid**: Instantly grows dynamic pine tree SVG icons representing the equivalent number of trees saved per year.

---

## 🛠️ Technology Stack

*   **Core**: HTML5 Semantic Markup
*   **Styling**: Modern Vanilla CSS3 (featuring HSL variables, custom slider tracks, custom checkbox toggles, grid layouts, and glassmorphic designs)
*   **Logic**: Modern Vanilla JavaScript (ES6+)
*   **Graphics**: Native SVG vector graphics (used for circular progress gauges, interactive donut charts, and growing tree icons)
*   **Data Store**: Browser `localStorage` (No external database, keeping 100% of user data private and locally saved)

---

## 🚀 Getting Started

Since EcoSphere has **zero dependencies** and requires **no build tools**, you can run it instantly:

### Method 1: Direct File Launch (No Server Needed)
Simply double-click the `index.html` file or drag it into any modern web browser (Chrome, Firefox, Safari, Edge).

### Method 2: Local Server Setup
If you want to host it locally using a simple Python server:
```bash
# Clone the repository
git clone https://github.com/your-username/ecosphere.git

# Navigate to directory
cd ecosphere

# Start HTTP server
python -m http.server 8080
```
Open `http://localhost:8080` in your web browser.

---

## 🔬 Scientific Coefficients Reference

The emission calculation factors are formulated using values from the Intergovernmental Panel on Climate Change (IPCC) and the EPA:
*   **Gasoline/Petrol Car**: `0.20 kg CO₂ / km`
*   **Diesel Car**: `0.22 kg CO₂ / km`
*   **Electric Car**: `0.05 kg CO₂ / km` (average grid load)
*   **Grid Electricity**: `0.40 kg CO₂ / kWh` (offset by green energy portion)
*   **Natural Gas**: `0.20 kg CO₂ / kWh`
*   **Vegan Diet Base**: `2.9 kg CO₂e / day` (vs Heavy Meat Eater: `7.2 kg CO₂e / day`)
*   **Tree Carbon Sink**: Average tree absorbs approximately `22 kg CO₂ / year`.
