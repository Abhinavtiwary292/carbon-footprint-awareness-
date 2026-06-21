// ECOSPHERE APP LOGIC & STATE MANAGEMENT

const EMISSION_FACTORS = {
  transport: {
    gasoline: 0.20,  // kg CO2 per km
    diesel: 0.22,    // kg CO2 per km
    hybrid: 0.10,    // kg CO2 per km
    electric: 0.05,  // kg CO2 per km
    motorcycle: 0.10,// kg CO2 per km
    transit: 0.04,   // kg CO2 per passenger km
    flightShort: 250,// kg CO2 per flight (short haul, domestic)
    flightLong: 1100 // kg CO2 per flight (long haul, international)
  },
  home: {
    electricityKwh: 0.40, // kg CO2 per kWh (grid average)
    naturalGas: 0.20,     // kg CO2 per kWh (approx)
    heatingOil: 2.50,     // kg CO2 per Litre
    waterLitre: 0.0003    // kg CO2 per Litre (0.3 kg per cubic meter)
  },
  food: {
    meatHeavy: 7.2,   // kg CO2 per day
    meatAverage: 5.6, // kg CO2 per day
    vegetarian: 3.8,  // kg CO2 per day
    vegan: 2.9,       // kg CO2 per day
    wasteLow: 1.05,   // +5% emissions
    wasteMedium: 1.12,// +12% emissions
    wasteHigh: 1.25   // +25% emissions
  },
  consumption: {
    clothingItem: 15.0,   // kg CO2 per new garment
    electronicsItem: 120.0,// kg CO2 per electronic device
    wasteBag: 3.5,        // kg CO2 per bag of landfill waste
    recyclePaperPct: 0.08,// -8% waste emissions
    recyclePlasticPct: 0.08,
    recycleGlassPct: 0.08,
    recycleCompostPct: 0.08
  }
};

const DEFAULT_STATE = {
  user: {
    level: 1,
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    badges: [],
    lifetimeCO2Saved: 0.0
  },
  calculator: {
    transport: {
      carType: 'gasoline',
      carDistance: 150,
      motorbikeDistance: 0,
      transitDistance: 50,
      flightsShort: 2,
      flightsLong: 0,
      total: 0.0
    },
    home: {
      residents: 3,
      electricity: 300,
      greenPct: 0,
      heatingType: 'gas',
      heatingVal: 150,
      water: 3000,
      total: 0.0
    },
    food: {
      dietType: 'meat-average',
      foodWaste: 'low',
      localBuy: false,
      total: 0.0
    },
    consumption: {
      clothing: 2,
      electronics: 1,
      waste: 2,
      recyclePaper: true,
      recyclePlastic: true,
      recycleGlass: true,
      recycleCompost: false,
      total: 0.0
    },
    grandTotal: 0.0
  },
  dailyHabits: {}, // Format: { "YYYY-MM-DD": ["bike", "meal"] }
  scenario: {
    carReduction: 0,
    foodMeals: 0,
    gridPct: 0,
    fashionItems: 0
  }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

// Helper: Get ISO Date String (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper: Get Yesterday Date String (YYYY-MM-DD)
function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Save State to LocalStorage
function saveState() {
  localStorage.setItem('ecosphere_state', JSON.stringify(state));
}

// Load State from LocalStorage
function loadState() {
  const stored = localStorage.getItem('ecosphere_state');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      state = { ...DEFAULT_STATE, ...parsed };
      state.user = { ...DEFAULT_STATE.user, ...parsed.user };
      state.calculator = { ...DEFAULT_STATE.calculator, ...parsed.calculator };
      state.dailyHabits = parsed.dailyHabits || {};
      state.scenario = { ...DEFAULT_STATE.scenario, ...parsed.scenario };
    } catch (e) {
      console.error('Failed to parse ecosphere state, resetting.', e);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }
  verifyStreak();
}

// Verify and Update Daily Active Streaks
function verifyStreak() {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const lastActive = state.user.lastActiveDate;

  if (lastActive === today) {
    // Already opened today, streak is safe
    return;
  } else if (lastActive === yesterday) {
    // Opened today, and yesterday was active -> streak continues when they do an action
  } else if (lastActive !== null) {
    // Gap of more than 1 day -> streak resets
    state.user.streak = 0;
  }
}

// Tab Switching Navigation Handler
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      if (targetTab === 'dashboard') {
        updateDashboardView();
      } else if (targetTab === 'scenario') {
        updateScenarioSim();
      }
    });
  });

  // Calculators Sub-tabs navigation
  const calcTabs = document.querySelectorAll('.calc-tab-btn');
  const calcPanels = document.querySelectorAll('.calc-panel');

  calcTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetCalc = tab.getAttribute('data-calc');

      calcTabs.forEach(t => t.classList.remove('active'));
      calcPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`calc-${targetCalc}`).classList.add('active');
    });
  });
}

/* --- CARBON CALCULATIONS --- */

function calculateTransport() {
  const data = state.calculator.transport;
  let carRate = 0.0;
  if (data.carType === 'gasoline') carRate = EMISSION_FACTORS.transport.gasoline;
  else if (data.carType === 'diesel') carRate = EMISSION_FACTORS.transport.diesel;
  else if (data.carType === 'hybrid') carRate = EMISSION_FACTORS.transport.hybrid;
  else if (data.carType === 'electric') carRate = EMISSION_FACTORS.transport.electric;

  const carAnnual = data.carDistance * 52 * carRate;
  const motorbikeAnnual = data.motorbikeDistance * 52 * EMISSION_FACTORS.transport.motorcycle;
  const transitAnnual = data.transitDistance * 52 * EMISSION_FACTORS.transport.transit;
  const shortFlightsAnnual = data.flightsShort * EMISSION_FACTORS.transport.flightShort;
  const longFlightsAnnual = data.flightsLong * EMISSION_FACTORS.transport.flightLong;

  data.total = (carAnnual + motorbikeAnnual + transitAnnual + shortFlightsAnnual + longFlightsAnnual) / 1000;
  return data.total;
}

function calculateHome() {
  const data = state.calculator.home;
  const residents = Math.max(1, data.residents);

  // Electricity
  const electricBase = data.electricity * 12 * EMISSION_FACTORS.home.electricityKwh;
  const electricReduction = electricBase * (data.greenPct / 100);
  const electricAnnual = electricBase - electricReduction;

  // Heating
  let heatingRate = 0;
  if (data.heatingType === 'gas') heatingRate = EMISSION_FACTORS.home.naturalGas;
  else if (data.heatingType === 'electricity') heatingRate = EMISSION_FACTORS.home.electricityKwh * (1 - data.greenPct / 100);
  else if (data.heatingType === 'oil') heatingRate = EMISSION_FACTORS.home.heatingOil;

  const heatingAnnual = data.heatingVal * 12 * heatingRate;

  // Water
  const waterAnnual = data.water * 12 * EMISSION_FACTORS.home.waterLitre;

  data.total = ((electricAnnual + heatingAnnual + waterAnnual) / residents) / 1000;
  return data.total;
}

function calculateFood() {
  const data = state.calculator.food;
  let baseRate = EMISSION_FACTORS.food.meatAverage;
  if (data.dietType === 'meat-heavy') baseRate = EMISSION_FACTORS.food.meatHeavy;
  else if (data.dietType === 'vegetarian') baseRate = EMISSION_FACTORS.food.vegetarian;
  else if (data.dietType === 'vegan') baseRate = EMISSION_FACTORS.food.vegan;

  let annualFood = baseRate * 365;

  // Waste multiplier
  if (data.foodWaste === 'low') annualFood *= EMISSION_FACTORS.food.wasteLow;
  else if (data.foodWaste === 'medium') annualFood *= EMISSION_FACTORS.food.wasteMedium;
  else if (data.foodWaste === 'high') annualFood *= EMISSION_FACTORS.food.wasteHigh;

  // Organic/Local discount (-10%)
  if (data.localBuy) {
    annualFood *= 0.90;
  }

  data.total = annualFood / 1000;
  return data.total;
}

function calculateConsumption() {
  const data = state.calculator.consumption;
  const clothesAnnual = data.clothing * 12 * EMISSION_FACTORS.consumption.clothingItem;
  const electronicsAnnual = data.electronics * EMISSION_FACTORS.consumption.electronicsItem;
  
  // Waste landfill
  const baseWasteAnnual = data.waste * 52 * EMISSION_FACTORS.consumption.wasteBag;
  
  // Recycling reduction
  let reduction = 0;
  if (data.recyclePaper) reduction += EMISSION_FACTORS.consumption.recyclePaperPct;
  if (data.recyclePlastic) reduction += EMISSION_FACTORS.consumption.recyclePlasticPct;
  if (data.recycleGlass) reduction += EMISSION_FACTORS.consumption.recycleGlassPct;
  if (data.recycleCompost) reduction += EMISSION_FACTORS.consumption.recycleCompostPct;

  const wasteAnnual = baseWasteAnnual * (1 - reduction);

  data.total = (clothesAnnual + electronicsAnnual + wasteAnnual) / 1000;
  return data.total;
}

function calculateGrandTotal() {
  const transport = calculateTransport();
  const home = calculateHome();
  const food = calculateFood();
  const consumption = calculateConsumption();

  state.calculator.grandTotal = transport + home + food + consumption;
  saveState();
  return state.calculator.grandTotal;
}

/* --- UI UPDATE WORKERS --- */

function updateHeaderStats() {
  document.getElementById('streak-val').textContent = `${state.user.streak} Days`;
  document.getElementById('total-accumulated-xp').textContent = `${state.user.xp} XP`;
  document.getElementById('total-lifetime-saved').textContent = `${state.user.lifetimeCO2Saved.toFixed(1)} kg`;

  // Level computation: Level = Math.floor(XP / 100) + 1
  const level = Math.floor(state.user.xp / 100) + 1;
  state.user.level = level;

  let levelName = 'Ranger';
  if (level >= 10) levelName = 'Eco-Guardian';
  else if (level >= 7) levelName = 'Eco-Champion';
  else if (level >= 4) levelName = 'Preservationist';
  else if (level >= 2) levelName = 'Conservationist';

  document.getElementById('level-label').textContent = `Level ${level} ${levelName}`;

  // XP Progress Bar
  const xpInCurrentLevel = state.user.xp % 100;
  const fillPct = xpInCurrentLevel;
  document.getElementById('xp-text').textContent = `${xpInCurrentLevel} / 100 XP`;
  document.getElementById('xp-fill').style.width = `${fillPct}%`;

  saveState();
}

function updateCalculatorUI() {
  // Transport inputs setup
  document.getElementById('car-type').value = state.calculator.transport.carType;
  document.getElementById('car-distance').value = state.calculator.transport.carDistance;
  document.getElementById('motorbike-distance').value = state.calculator.transport.motorbikeDistance;
  document.getElementById('transit-distance').value = state.calculator.transport.transitDistance;
  document.getElementById('flights-short').value = state.calculator.transport.flightsShort;
  document.getElementById('flights-long').value = state.calculator.transport.flightsLong;

  // Home inputs setup
  document.getElementById('home-residents').value = state.calculator.home.residents;
  document.getElementById('home-electricity').value = state.calculator.home.electricity;
  document.getElementById('home-green-pct').value = state.calculator.home.greenPct;
  document.getElementById('home-green-pct-val').textContent = state.calculator.home.greenPct;
  document.getElementById('home-heating-type').value = state.calculator.home.heatingType;
  document.getElementById('home-heating-val').value = state.calculator.home.heatingVal;
  document.getElementById('home-water').value = state.calculator.home.water;

  // Food inputs setup
  const dietRadios = document.getElementsByName('diet-type');
  dietRadios.forEach(radio => {
    if (radio.value === state.calculator.food.dietType) {
      radio.checked = true;
      radio.closest('.radio-card').classList.add('active');
    } else {
      radio.closest('.radio-card').classList.remove('active');
    }
  });
  document.getElementById('food-waste').value = state.calculator.food.foodWaste;
  document.getElementById('food-local-buy').checked = state.calculator.food.localBuy;

  // Consumption inputs setup
  document.getElementById('buy-clothing').value = state.calculator.consumption.clothing;
  document.getElementById('buy-electronics').value = state.calculator.consumption.electronics;
  document.getElementById('waste-bag').value = state.calculator.consumption.waste;
  document.getElementById('recycle-paper').checked = state.calculator.consumption.recyclePaper;
  document.getElementById('recycle-plastic').checked = state.calculator.consumption.recyclePlastic;
  document.getElementById('recycle-glass').checked = state.calculator.consumption.recycleGlass;
  document.getElementById('recycle-compost').checked = state.calculator.consumption.recycleCompost;

  // Trigger values rendering
  updateCalculatorSummaries();
}

function updateCalculatorSummaries() {
  // Recompute values
  calculateGrandTotal();

  const cTrans = state.calculator.transport.total;
  const cHome = state.calculator.home.total;
  const cFood = state.calculator.food.total;
  const cCons = state.calculator.consumption.total;

  document.getElementById('calc-val-transport').textContent = cTrans.toFixed(1);
  document.getElementById('calc-val-home').textContent = cHome.toFixed(1);
  document.getElementById('calc-val-food').textContent = cFood.toFixed(1);
  document.getElementById('calc-val-consumption').textContent = cCons.toFixed(1);

  // Trees offset calculation (1 tree absorbs ~22kg CO2/yr)
  document.getElementById('transport-trees-needed').textContent = Math.round((cTrans * 1000) / 22);
  document.getElementById('home-trees-needed').textContent = Math.round((cHome * 1000) / 22);
  document.getElementById('food-trees-needed').textContent = Math.round((cFood * 1000) / 22);
  document.getElementById('consumption-trees-needed').textContent = Math.round((cCons * 1000) / 22);

  checkBadges();
}

function updateDashboardView() {
  calculateGrandTotal();
  const total = state.calculator.grandTotal;

  // 1. Text display
  document.getElementById('dashboard-total-emissions').textContent = total.toFixed(1);
  document.getElementById('comp-current-val').textContent = `${total.toFixed(1)} T/yr`;
  
  // 2. Set Gauge circular fill
  const gaugeFill = document.getElementById('gauge-fill-ring');
  const circumference = 2 * Math.PI * 50; // 314.16
  
  // Cap gauge calculation at 15 Tons (which equals 100% full)
  const maxCap = 15;
  const fillPercentage = Math.min(1, total / maxCap);
  const offset = circumference - (fillPercentage * circumference);
  gaugeFill.style.strokeDashoffset = offset;

  // Set Gauge color class based on emissions status
  let statusTitle = '';
  let statusDesc = '';
  let colorVar = 'var(--color-low)';

  if (total === 0) {
    statusTitle = "Awaiting inputs";
    statusDesc = "Head over to the Calculators tab to start tracking your carbon footprint and unlock eco-goals!";
    gaugeFill.style.stroke = 'var(--text-muted)';
  } else if (total < 2.0) {
    statusTitle = "Excellent Eco-Score!";
    statusDesc = "Your emissions are below the sustainable 2.0 Ton target. You are leading the charge for a cooler planet!";
    colorVar = 'var(--color-low)';
    gaugeFill.style.stroke = 'var(--color-low)';
  } else if (total < 4.8) {
    statusTitle = "Good Progress";
    statusDesc = "You are below the global average of 4.8 Tons, but there is still room to optimize. Check the tips below.";
    colorVar = 'var(--color-low)';
    gaugeFill.style.stroke = 'var(--color-low)';
  } else if (total < 10.0) {
    statusTitle = "Moderate Impact";
    statusDesc = "Your carbon footprint is higher than the global baseline. Try making a few green modifications to drop it.";
    colorVar = 'var(--color-medium)';
    gaugeFill.style.stroke = 'var(--color-medium)';
  } else {
    statusTitle = "High Footprint";
    statusDesc = "Your emissions are significantly high, typical of high-waste/car-heavy lifestyles. Let's find adjustments.";
    colorVar = 'var(--color-high)';
    gaugeFill.style.stroke = 'var(--color-high)';
  }

  document.getElementById('emissions-status-title').textContent = statusTitle;
  document.getElementById('emissions-status-title').style.color = colorVar;
  document.getElementById('emissions-status-desc').textContent = statusDesc;

  // 3. Dynamic Donut Chart rendering
  renderDonutChart(total);

  // 4. Dynamic Bar Chart height updates
  // Cap visual bar height at 15 Tons
  const currentHeightPct = Math.min(100, (total / 15) * 100);
  document.getElementById('bar-current-fill').style.height = `${currentHeightPct}%`;

  // 5. Insights rendering
  renderInsights();

  // 6. Badges loading
  renderBadges();
}

/* --- SVG DONUT CHART DYNAMICS --- */

function renderDonutChart(grandTotal) {
  const wrapper = document.getElementById('donut-chart-wrapper');
  const svg = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');
  
  legend.innerHTML = '';
  
  if (grandTotal === 0) {
    svg.style.display = 'none';
    wrapper.classList.add('empty-donut');
    legend.innerHTML = `<div class="empty-placeholder">Fill calculators to view segment details.</div>`;
    return;
  }

  svg.style.display = 'block';
  wrapper.classList.remove('empty-donut');

  const categories = [
    { name: 'Transport', val: state.calculator.transport.total, color: 'var(--color-secondary)' },
    { name: 'Home Energy', val: state.calculator.home.total, color: 'var(--color-primary)' },
    { name: 'Food & Diet', val: state.calculator.food.total, color: '#f59e0b' },
    { name: 'Consumption', val: state.calculator.consumption.total, color: '#6366f1' }
  ];

  // Remove existing segments
  const existingCircles = svg.querySelectorAll('.donut-segment');
  existingCircles.forEach(c => c.remove());

  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.5
  let accumulatedPct = 0;

  categories.forEach(cat => {
    const pct = cat.val / grandTotal;
    const segmentLength = pct * circumference;
    const offset = -accumulatedPct * circumference;

    if (pct > 0) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'donut-segment');
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '50');
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', cat.color);
      circle.setAttribute('stroke-width', '12');
      circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', offset.toString());
      
      // Interactive hover
      circle.addEventListener('mouseenter', () => {
        document.getElementById('donut-center-label').textContent = cat.name;
        document.getElementById('donut-center-val').textContent = `${Math.round(pct * 100)}%`;
      });
      
      circle.addEventListener('mouseleave', () => {
        document.getElementById('donut-center-label').textContent = 'Total';
        document.getElementById('donut-center-val').textContent = `${grandTotal.toFixed(1)} T`;
      });

      svg.appendChild(circle);
    }

    accumulatedPct += pct;

    // Legend item insertion
    const pctText = pct > 0 ? `${Math.round(pct * 100)}%` : '0%';
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${cat.color}"></div>
      <span class="legend-name">${cat.name}</span>
      <span class="legend-pct">${pctText}</span>
    `;
    legend.appendChild(legendItem);
  });

  // Reset Center label text
  document.getElementById('donut-center-label').textContent = 'Total';
  document.getElementById('donut-center-val').textContent = `${grandTotal.toFixed(1)} T`;
}

/* --- DYNAMIC GENERATIVE TIPS & INSIGHTS --- */

function renderInsights() {
  const container = document.getElementById('insights-grid');
  container.innerHTML = '';

  const transport = state.calculator.transport.total;
  const home = state.calculator.home.total;
  const food = state.calculator.food.total;
  const consumption = state.calculator.consumption.total;
  const total = state.calculator.grandTotal;

  if (total === 0) {
    container.innerHTML = '<div class="empty-placeholder" style="grid-column: span 2">No insights yet. Complete your calculations first!</div>';
    return;
  }

  const insightsList = [];

  // Transport insights
  if (state.calculator.transport.carDistance > 200 && state.calculator.transport.carType === 'gasoline') {
    insightsList.push({
      title: 'High Mileage Petrol Vehicle',
      desc: 'Your car emits substantial carbon. Commuting via public transit or carpooling twice a week cuts transport load by 20%.',
      iconClass: 'yellow',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'
    });
  }

  // Energy insights
  if (state.calculator.home.electricity > 400 && state.calculator.home.greenPct < 50) {
    insightsList.push({
      title: 'Coal Grid Overload',
      desc: 'Your monthly home electricity triggers high coal usage. Switching to a community solar energy supplier immediately avoids this.',
      iconClass: 'yellow',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
    });
  }

  // Food insights
  if (state.calculator.food.dietType === 'meat-heavy') {
    insightsList.push({
      title: 'Livestock Agricultural Impact',
      desc: 'Red meat production is resource heavy. Swapping 3 dinners weekly to vegetarian equivalents plants 15 Virtual Trees annually.',
      iconClass: 'blue',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
    });
  }

  // Recycling/Consumption insights
  if (!state.calculator.consumption.recyclePlastic || !state.calculator.consumption.recycleCompost) {
    insightsList.push({
      title: 'Divert Landfill Waste',
      desc: 'Composting organic scraps and separating plastics prevents methane release, reducing household footprint by 15%.',
      iconClass: 'green',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>'
    });
  }

  // Base eco progress insights
  if (total < 3.0) {
    insightsList.push({
      title: 'Stellar Eco-Citizen Status',
      desc: 'Outstanding metrics! Your footprint aligns with global targets. Expand your actions to inspire local community clubs.',
      iconClass: 'green',
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
    });
  }

  // Show up to 2 insights
  const items = insightsList.slice(0, 2);
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-placeholder" style="grid-column: span 2">Your habits are outstanding! No warnings or insights generated. Keep it up!</div>';
    return;
  }

  items.forEach(ins => {
    const card = document.createElement('div');
    card.className = 'insight-card';
    card.innerHTML = `
      <div class="insight-icon ${ins.iconClass}">
        ${ins.iconSvg}
      </div>
      <div class="insight-body">
        <h4>${ins.title}</h4>
        <p>${ins.desc}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

/* --- GAMIFICATION & DAILY ECO-ACTION CHECKLIST --- */

function initHabitChecklist() {
  const cards = document.querySelectorAll('.habit-item-card');
  const today = getTodayString();
  
  if (!state.dailyHabits[today]) {
    state.dailyHabits[today] = [];
  }

  cards.forEach(card => {
    const chk = card.querySelector('.habit-checkbox');
    const habitId = chk.id.replace('chk-', '');

    // Restore state
    if (state.dailyHabits[today].includes(habitId)) {
      chk.checked = true;
      card.classList.add('checked');
    } else {
      chk.checked = false;
      card.classList.remove('checked');
    }

    // Toggle listener
    card.addEventListener('click', (e) => {
      // Prevent double trigger if clicking label/checkbox directly
      if (e.target !== chk) {
        chk.checked = !chk.checked;
      }
      
      const isChecked = chk.checked;
      const co2OffsetVal = parseFloat(card.getAttribute('data-offset'));
      const xpVal = parseInt(card.getAttribute('data-xp'));

      if (isChecked) {
        card.classList.add('checked');
        if (!state.dailyHabits[today].includes(habitId)) {
          state.dailyHabits[today].push(habitId);
          // Credit XP and offset
          state.user.xp += xpVal;
          state.user.lifetimeCO2Saved += co2OffsetVal;
          incrementStreak();
        }
      } else {
        card.classList.remove('checked');
        const index = state.dailyHabits[today].indexOf(habitId);
        if (index > -1) {
          state.dailyHabits[today].splice(index, 1);
          // Revert XP and offset
          state.user.xp = Math.max(0, state.user.xp - xpVal);
          state.user.lifetimeCO2Saved = Math.max(0, state.user.lifetimeCO2Saved - co2OffsetVal);
          // Don't reduce streak on uncheck (to keep engagement friendly)
        }
      }
      
      state.user.lastActiveDate = today;
      updateHeaderStats();
      updateHabitsFooter();
      saveState();
    });
  });

  updateHabitsFooter();
}

function incrementStreak() {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const lastActive = state.user.lastActiveDate;

  if (lastActive === yesterday) {
    state.user.streak += 1;
  } else if (lastActive === null || lastActive !== today) {
    state.user.streak = 1;
  }
}

function updateHabitsFooter() {
  const today = getTodayString();
  let co2Today = 0;
  
  if (state.dailyHabits[today]) {
    state.dailyHabits[today].forEach(hid => {
      const card = document.getElementById(`habit-${hid}`);
      if (card) {
        co2Today += parseFloat(card.getAttribute('data-offset'));
      }
    });
  }

  document.getElementById('daily-co2-saved').textContent = `${co2Today.toFixed(1)} kg`;
  document.getElementById('total-accumulated-xp').textContent = `${state.user.xp} XP`;
  document.getElementById('total-lifetime-saved').textContent = `${state.user.lifetimeCO2Saved.toFixed(1)} kg`;
}

// Reset daily habits checklist manually
function resetDailyHabits() {
  const today = getTodayString();
  state.dailyHabits[today] = [];
  
  const cards = document.querySelectorAll('.habit-item-card');
  cards.forEach(card => {
    const chk = card.querySelector('.habit-checkbox');
    chk.checked = false;
    card.classList.remove('checked');
  });

  updateHabitsFooter();
  saveState();
}

/* --- BADGES SYSTEM & ACHIEVEMENT LISTS --- */

const BADGES_CONFIG = [
  { id: 'starter', name: 'Eco-Novice', desc: 'Initialize calculations on EcoSphere', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { id: 'lowfoot', name: 'Green footprint', desc: 'Maintain carbon footprint under average global baseline (4.8T)', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2Z"/></svg>' },
  { id: 'ecostar', name: 'Climate Hero', desc: 'Drop carbon footprint below World Sustainability target (2.0T)', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>' },
  { id: 'habit_3', name: 'Eco-Builder', desc: 'Check off at least 3 green actions today', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' },
  { id: 'streak_3', name: 'Constant Care', desc: 'Reach a streak of 3 active days', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>' },
  { id: 'trees_10', name: 'Forest Guardian', desc: 'Grow 10 simulated trees inside the Scenario Planner', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22h20L12 2z"/></svg>' }
];

function checkBadges() {
  const currentBadges = state.user.badges;
  const total = state.calculator.grandTotal;
  const today = getTodayString();
  const activeHabitsCount = state.dailyHabits[today] ? state.dailyHabits[today].length : 0;

  // Starter
  if (total > 0 && !currentBadges.includes('starter')) {
    currentBadges.push('starter');
    state.user.xp += 30; // Level up bonus
  }

  // Lowfoot
  if (total > 0 && total < 4.8 && !currentBadges.includes('lowfoot')) {
    currentBadges.push('lowfoot');
    state.user.xp += 50;
  }

  // Climate Hero
  if (total > 0 && total < 2.0 && !currentBadges.includes('ecostar')) {
    currentBadges.push('ecostar');
    state.user.xp += 100;
  }

  // Eco-builder
  if (activeHabitsCount >= 3 && !currentBadges.includes('habit_3')) {
    currentBadges.push('habit_3');
    state.user.xp += 40;
  }

  // Constant Care
  if (state.user.streak >= 3 && !currentBadges.includes('streak_3')) {
    currentBadges.push('streak_3');
    state.user.xp += 60;
  }

  // Scenario check is done during simulation update
}

function renderBadges() {
  const container = document.getElementById('achievements-list');
  container.innerHTML = '';

  BADGES_CONFIG.forEach(badge => {
    const isUnlocked = state.user.badges.includes(badge.id);
    const badgeItem = document.createElement('div');
    badgeItem.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
    badgeItem.setAttribute('data-tooltip', isUnlocked ? `${badge.name}: ${badge.desc} (Unlocked!)` : `${badge.name} (Locked): ${badge.desc}`);
    badgeItem.innerHTML = `
      <div class="badge-graphic">
        ${badge.icon}
      </div>
      <span class="badge-name">${badge.name}</span>
    `;
    container.appendChild(badgeItem);
  });
}

/* --- SCENARIO PLANNING SIMULATOR --- */

function initScenarioPlanner() {
  const sliders = document.querySelectorAll('.sim-slider');

  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      const id = slider.id;
      const val = parseInt(slider.value);

      if (id === 'sim-car-reduction') {
        state.scenario.carReduction = val;
        document.getElementById('sim-car-val').textContent = `${val} km/wk cut`;
      } else if (id === 'sim-food-meals') {
        state.scenario.foodMeals = val;
        document.getElementById('sim-food-val').textContent = `${val} meals/wk`;
      } else if (id === 'sim-grid-pct') {
        state.scenario.gridPct = val;
        document.getElementById('sim-grid-val').textContent = `${val}% green`;
      } else if (id === 'sim-fashion-items') {
        state.scenario.fashionItems = val;
        document.getElementById('sim-fashion-val').textContent = `${val} items cut`;
      }

      updateScenarioSim();
    });
  });
}

function updateScenarioSim() {
  const baseline = state.calculator.grandTotal;

  if (baseline === 0) {
    document.getElementById('sim-total-saving').textContent = '0.00';
    document.getElementById('sim-reduction-pct').textContent = '0';
    document.getElementById('sim-percentage-cut').style.width = '0%';
    document.getElementById('sim-trees-count').textContent = '0';
    document.getElementById('forest-grid').innerHTML = '<div class="forest-placeholder-text">Complete calculators calculations to grow trees!</div>';
    return;
  }

  // 1. Car reduction savings (weekly distance * 52 * rate)
  let carRate = 0.20; // Default gasoline rate
  if (state.calculator.transport.carType !== 'none') {
    if (state.calculator.transport.carType === 'diesel') carRate = 0.22;
    else if (state.calculator.transport.carType === 'hybrid') carRate = 0.10;
    else if (state.calculator.transport.carType === 'electric') carRate = 0.05;
  }
  // Cap reduction at the current car distance to make it realistic
  const actualCarDistance = state.calculator.transport.carDistance;
  const reductionDistance = Math.min(actualCarDistance, state.scenario.carReduction);
  const carSavedKg = reductionDistance * 52 * carRate;

  // 2. Food meal reduction savings
  // Replacing average meat meals with vegan meals.
  // Vegan is ~2.9kg CO2/day, average diet is ~5.6kg CO2/day (diff = 2.7kg/day, or ~0.9kg per meal assuming 3 meals/day).
  const mealDiffKg = 0.90;
  const foodSavedKg = state.scenario.foodMeals * 52 * mealDiffKg;

  // 3. Grid Conversion savings
  // Savings = baseline electricity * multiplier
  const currentElectricity = state.calculator.home.electricity;
  const currentResidents = Math.max(1, state.calculator.home.residents);
  const currentGreenPct = state.calculator.home.greenPct;
  const electricBaseKg = currentElectricity * 12 * EMISSION_FACTORS.home.electricityKwh;
  
  // Potential extra conversion
  const extraGreenPct = Math.max(0, state.scenario.gridPct - currentGreenPct);
  const gridSavedKg = (electricBaseKg * (extraGreenPct / 100)) / currentResidents;

  // 4. Shopping clothing reduction savings (15kg CO2 per clothing item)
  const clothingSavedKg = state.scenario.fashionItems * 12 * EMISSION_FACTORS.consumption.clothingItem;

  // Compute Total Saved (kg/year)
  const totalSavedKg = carSavedKg + foodSavedKg + gridSavedKg + clothingSavedKg;
  const totalSavedTons = totalSavedKg / 1000;

  // Update UI Elements
  document.getElementById('sim-total-saving').textContent = totalSavedTons.toFixed(2);
  
  const percentageCut = Math.min(100, (totalSavedTons / baseline) * 100);
  document.getElementById('sim-reduction-pct').textContent = Math.round(percentageCut);
  document.getElementById('sim-percentage-cut').style.width = `${percentageCut}%`;

  // Update trees display (1 tree plants = 22kg CO2 absorption)
  const treesCount = Math.round(totalSavedKg / 22);
  document.getElementById('sim-trees-count').textContent = treesCount;

  // Check achievements for Scenario Planner
  if (treesCount >= 10 && !state.user.badges.includes('trees_10')) {
    state.user.badges.push('trees_10');
    state.user.xp += 80;
    updateHeaderStats();
    saveState();
  }

  // Draw simulated trees forest
  const forestGrid = document.getElementById('forest-grid');
  forestGrid.innerHTML = '';

  if (treesCount === 0) {
    forestGrid.innerHTML = '<div class="forest-placeholder-text">Adjust sliders to grow your virtual forest!</div>';
  } else {
    // Cap graphic count at 48 trees for performance and screen space
    const graphicCap = Math.min(48, treesCount);
    for (let i = 0; i < graphicCap; i++) {
      const treeSvg = document.createElement('div');
      treeSvg.className = 'tree-icon';
      // Little delay for growing wave effect
      treeSvg.style.animationDelay = `${i * 15}ms`;
      treeSvg.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 12h3v8h10v-8h3L12 2z" />
          <rect x="10" y="20" width="4" height="2" fill="#78350f" />
        </svg>
      `;
      forestGrid.appendChild(treeSvg);
    }
    if (treesCount > graphicCap) {
      const overflow = document.createElement('div');
      overflow.className = 'forest-placeholder-text';
      overflow.style.width = '100%';
      overflow.style.height = 'auto';
      overflow.style.padding = '0.5rem 0';
      overflow.textContent = `+ ${treesCount - graphicCap} more trees in your carbon sink!`;
      forestGrid.appendChild(overflow);
    }
  }
}

/* --- EVENT LIFECYCLE LISTENERS --- */

function initCalculatorsListeners() {
  // Transports
  document.getElementById('car-type').addEventListener('change', (e) => {
    state.calculator.transport.carType = e.target.value;
    updateCalculatorSummaries();
  });
  document.getElementById('car-distance').addEventListener('input', (e) => {
    state.calculator.transport.carDistance = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('motorbike-distance').addEventListener('input', (e) => {
    state.calculator.transport.motorbikeDistance = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('transit-distance').addEventListener('input', (e) => {
    state.calculator.transport.transitDistance = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('flights-short').addEventListener('input', (e) => {
    state.calculator.transport.flightsShort = Math.max(0, parseInt(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('flights-long').addEventListener('input', (e) => {
    state.calculator.transport.flightsLong = Math.max(0, parseInt(e.target.value) || 0);
    updateCalculatorSummaries();
  });

  // Home Energy
  document.getElementById('home-residents').addEventListener('input', (e) => {
    state.calculator.home.residents = Math.max(1, parseInt(e.target.value) || 1);
    updateCalculatorSummaries();
  });
  document.getElementById('home-electricity').addEventListener('input', (e) => {
    state.calculator.home.electricity = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  
  const greenSlider = document.getElementById('home-green-pct');
  greenSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    state.calculator.home.greenPct = val;
    document.getElementById('home-green-pct-val').textContent = val;
    updateCalculatorSummaries();
  });
  
  document.getElementById('home-heating-type').addEventListener('change', (e) => {
    state.calculator.home.heatingType = e.target.value;
    updateCalculatorSummaries();
  });
  document.getElementById('home-heating-val').addEventListener('input', (e) => {
    state.calculator.home.heatingVal = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('home-water').addEventListener('input', (e) => {
    state.calculator.home.water = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });

  // Food Diet
  const dietRadios = document.getElementsByName('diet-type');
  dietRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.calculator.food.dietType = e.target.value;
      
      // Update UI selection cards styling
      dietRadios.forEach(r => {
        if (r.checked) r.closest('.radio-card').classList.add('active');
        else r.closest('.radio-card').classList.remove('active');
      });

      updateCalculatorSummaries();
    });
  });
  document.getElementById('food-waste').addEventListener('change', (e) => {
    state.calculator.food.foodWaste = e.target.value;
    updateCalculatorSummaries();
  });
  document.getElementById('food-local-buy').addEventListener('change', (e) => {
    state.calculator.food.localBuy = e.target.checked;
    updateCalculatorSummaries();
  });

  // Consumption Waste
  document.getElementById('buy-clothing').addEventListener('input', (e) => {
    state.calculator.consumption.clothing = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('buy-electronics').addEventListener('input', (e) => {
    state.calculator.consumption.electronics = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('waste-bag').addEventListener('input', (e) => {
    state.calculator.consumption.waste = Math.max(0, parseFloat(e.target.value) || 0);
    updateCalculatorSummaries();
  });
  document.getElementById('recycle-paper').addEventListener('change', (e) => {
    state.calculator.consumption.recyclePaper = e.target.checked;
    updateCalculatorSummaries();
  });
  document.getElementById('recycle-plastic').addEventListener('change', (e) => {
    state.calculator.consumption.recyclePlastic = e.target.checked;
    updateCalculatorSummaries();
  });
  document.getElementById('recycle-glass').addEventListener('change', (e) => {
    state.calculator.consumption.recycleGlass = e.target.checked;
    updateCalculatorSummaries();
  });
  document.getElementById('recycle-compost').addEventListener('change', (e) => {
    state.calculator.consumption.recycleCompost = e.target.checked;
    updateCalculatorSummaries();
  });
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initTabs();
  initCalculatorsListeners();
  updateCalculatorUI();
  initHabitChecklist();
  initScenarioPlanner();

  // Load baseline values onto Dashboard
  updateDashboardView();
  updateHeaderStats();

  // Reset habits checklist trigger
  document.getElementById('reset-habits-btn').addEventListener('click', () => {
    resetDailyHabits();
  });

  // Smart suggestions refresh button
  document.getElementById('refresh-insights-btn').addEventListener('click', () => {
    renderInsights();
  });
});
