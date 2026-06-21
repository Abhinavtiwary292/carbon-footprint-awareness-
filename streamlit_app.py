"""
🌎 EcoSphere — Carbon Footprint Tracker & Awareness Platform
A Streamlit port of the EcoSphere static web app.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import math

# ─────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="EcoSphere — Carbon Footprint Tracker",
    page_icon="🌎",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────
# CUSTOM CSS — dark glassmorphic theme
# ─────────────────────────────────────────────
st.markdown("""
<style>
/* ── Google Font ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* ── App background ── */
.stApp {
    background: linear-gradient(135deg, #0d1117 0%, #0f2027 50%, #0d1117 100%);
    color: #e2e8f0;
}

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: rgba(15,32,39,0.95) !important;
    border-right: 1px solid rgba(34,197,94,0.15);
}

/* ── Metric cards ── */
[data-testid="metric-container"] {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(34,197,94,0.2);
    border-radius: 12px;
    padding: 1rem;
    backdrop-filter: blur(10px);
}

/* ── Selectbox / Number Input ── */
[data-testid="stSelectbox"], [data-testid="stNumberInput"] {
    border-radius: 8px;
}

/* ── Section headers ── */
h1 { color: #4ade80 !important; }
h2 { color: #86efac !important; }
h3 { color: #bbf7d0 !important; }

/* ── Tabs ── */
.stTabs [data-baseweb="tab"] {
    background: rgba(255,255,255,0.05);
    border-radius: 8px 8px 0 0;
    color: #86efac;
    font-weight: 500;
    padding: 0.5rem 1.5rem;
}
.stTabs [aria-selected="true"] {
    background: rgba(34,197,94,0.2) !important;
    border-bottom: 2px solid #4ade80 !important;
    color: #4ade80 !important;
}

/* ── Info / success boxes ── */
.eco-card {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
}
.eco-card h4 { color: #4ade80; margin: 0 0 0.4rem 0; font-size: 0.95rem; }
.eco-card p  { color: #94a3b8; margin: 0; font-size: 0.85rem; line-height: 1.5; }

/* ── Divider ── */
hr { border-color: rgba(34,197,94,0.15) !important; }

/* ── Slider label ── */
label { color: #94a3b8 !important; font-size: 0.85rem !important; }

/* ── Button ── */
.stButton > button {
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    padding: 0.5rem 1.5rem;
    transition: opacity 0.2s;
}
.stButton > button:hover { opacity: 0.85; }

/* ── Checkbox ── */
[data-testid="stCheckbox"] label { color: #cbd5e1 !important; }

/* ── Footer badge ── */
.badge-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
}
.badge {
    background: rgba(34,197,94,0.15);
    border: 1px solid rgba(34,197,94,0.35);
    border-radius: 20px;
    padding: 0.25rem 0.75rem;
    font-size: 0.78rem;
    color: #4ade80;
}
.badge.locked {
    background: rgba(100,100,100,0.1);
    border-color: rgba(100,100,100,0.3);
    color: #64748b;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# EMISSION FACTORS  (identical to JS constants)
# ─────────────────────────────────────────────
EF = {
    "transport": {
        "gasoline": 0.20,
        "diesel":   0.22,
        "hybrid":   0.10,
        "electric": 0.05,
        "motorcycle": 0.10,
        "transit":   0.04,
        "flightShort": 250,
        "flightLong":  1100,
    },
    "home": {
        "electricityKwh": 0.40,
        "naturalGas":     0.20,
        "heatingOil":     2.50,
        "waterLitre":     0.0003,
    },
    "food": {
        "meat-heavy":    7.2,
        "meat-average":  5.6,
        "vegetarian":    3.8,
        "vegan":         2.9,
        "wasteLow":   1.05,
        "wasteMedium":1.12,
        "wasteHigh":  1.25,
    },
    "consumption": {
        "clothingItem":     15.0,
        "electronicsItem":  120.0,
        "wasteBag":          3.5,
        "recyclePaper":      0.08,
        "recyclePlastic":    0.08,
        "recycleGlass":      0.08,
        "recycleCompost":    0.08,
    },
}

# ─────────────────────────────────────────────
# CALCULATION FUNCTIONS
# ─────────────────────────────────────────────
def calc_transport(car_type, car_dist, motorbike_dist, transit_dist, flights_short, flights_long):
    car_rate = EF["transport"].get(car_type, 0.20)
    car_annual      = car_dist      * 52 * car_rate
    moto_annual     = motorbike_dist * 52 * EF["transport"]["motorcycle"]
    transit_annual  = transit_dist  * 52 * EF["transport"]["transit"]
    short_annual    = flights_short * EF["transport"]["flightShort"]
    long_annual     = flights_long  * EF["transport"]["flightLong"]
    return (car_annual + moto_annual + transit_annual + short_annual + long_annual) / 1000


def calc_home(residents, electricity, green_pct, heating_type, heating_val, water):
    residents = max(1, residents)
    elec_base = electricity * 12 * EF["home"]["electricityKwh"]
    elec_annual = elec_base - elec_base * (green_pct / 100)

    if heating_type == "gas":
        heat_rate = EF["home"]["naturalGas"]
    elif heating_type == "electricity":
        heat_rate = EF["home"]["electricityKwh"] * (1 - green_pct / 100)
    else:
        heat_rate = EF["home"]["heatingOil"]

    heat_annual  = heating_val * 12 * heat_rate
    water_annual = water * 12 * EF["home"]["waterLitre"]
    return ((elec_annual + heat_annual + water_annual) / residents) / 1000


def calc_food(diet_type, food_waste, local_buy):
    base_rate  = EF["food"].get(diet_type, EF["food"]["meat-average"])
    annual     = base_rate * 365
    waste_key  = {"low": "wasteLow", "medium": "wasteMedium", "high": "wasteHigh"}.get(food_waste, "wasteLow")
    annual    *= EF["food"][waste_key]
    if local_buy:
        annual *= 0.90
    return annual / 1000


def calc_consumption(clothing, electronics, waste_bags, recycle_paper, recycle_plastic, recycle_glass, recycle_compost):
    clothes_annual = clothing     * 12 * EF["consumption"]["clothingItem"]
    elec_annual    = electronics  *      EF["consumption"]["electronicsItem"]
    base_waste     = waste_bags   * 52 * EF["consumption"]["wasteBag"]

    reduction = 0.0
    if recycle_paper:   reduction += EF["consumption"]["recyclePaper"]
    if recycle_plastic: reduction += EF["consumption"]["recyclePlastic"]
    if recycle_glass:   reduction += EF["consumption"]["recycleGlass"]
    if recycle_compost: reduction += EF["consumption"]["recycleCompost"]

    waste_annual = base_waste * (1 - reduction)
    return (clothes_annual + elec_annual + waste_annual) / 1000


def get_level_info(xp):
    level     = math.floor(xp / 100) + 1
    xp_in_lvl = xp % 100
    if level >= 10:
        name = "Eco-Guardian"
    elif level >= 7:
        name = "Eco-Champion"
    elif level >= 4:
        name = "Preservationist"
    elif level >= 2:
        name = "Conservationist"
    else:
        name = "Ranger"
    return level, name, xp_in_lvl


# ─────────────────────────────────────────────
# SESSION STATE DEFAULTS
# ─────────────────────────────────────────────
def init_state():
    defaults = {
        # Transport
        "car_type":       "gasoline",
        "car_dist":       150,
        "motorbike_dist": 0,
        "transit_dist":   50,
        "flights_short":  2,
        "flights_long":   0,
        # Home
        "residents":    3,
        "electricity":  300.0,
        "green_pct":    0,
        "heating_type": "gas",
        "heating_val":  150.0,
        "water":        3000.0,
        # Food
        "diet_type":  "meat-average",
        "food_waste": "low",
        "local_buy":  False,
        # Consumption
        "clothing":        2,
        "electronics_buy": 1,
        "waste_bags":      2,
        "recycle_paper":   True,
        "recycle_plastic": True,
        "recycle_glass":   True,
        "recycle_compost": False,
        # Gamification
        "xp":              0,
        "streak":          0,
        "lifetime_saved":  0.0,
        "badges":          [],
        # Daily habits
        "habits_done": [],
        # Scenario
        "sim_car_reduction":   0,
        "sim_food_meals":      0,
        "sim_grid_pct":        0,
        "sim_fashion_items":   0,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val

init_state()

# ─────────────────────────────────────────────
# COMPUTE ALL TOTALS
# ─────────────────────────────────────────────
t_transport = calc_transport(
    st.session_state.car_type,
    st.session_state.car_dist,
    st.session_state.motorbike_dist,
    st.session_state.transit_dist,
    st.session_state.flights_short,
    st.session_state.flights_long,
)
t_home = calc_home(
    st.session_state.residents,
    st.session_state.electricity,
    st.session_state.green_pct,
    st.session_state.heating_type,
    st.session_state.heating_val,
    st.session_state.water,
)
t_food = calc_food(
    st.session_state.diet_type,
    st.session_state.food_waste,
    st.session_state.local_buy,
)
t_consumption = calc_consumption(
    st.session_state.clothing,
    st.session_state.electronics_buy,
    st.session_state.waste_bags,
    st.session_state.recycle_paper,
    st.session_state.recycle_plastic,
    st.session_state.recycle_glass,
    st.session_state.recycle_compost,
)
grand_total = t_transport + t_home + t_food + t_consumption

# Badge logic (auto award)
def award_badge(badge_id, xp_bonus):
    if badge_id not in st.session_state.badges:
        st.session_state.badges.append(badge_id)
        st.session_state.xp = st.session_state.get("xp", 0) + xp_bonus

if grand_total > 0:
    award_badge("starter", 30)
if 0 < grand_total < 4.8:
    award_badge("lowfoot", 50)
if 0 < grand_total < 2.0:
    award_badge("ecostar", 100)
if len(st.session_state.habits_done) >= 3:
    award_badge("habit_3", 40)
if st.session_state.streak >= 3:
    award_badge("streak_3", 60)

level, level_name, xp_in_level = get_level_info(st.session_state.xp)

# ─────────────────────────────────────────────
# SIDEBAR — global user stats
# ─────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🌎 EcoSphere")
    st.markdown("*Carbon Footprint Tracker*")
    st.divider()

    if grand_total == 0:
        status_color = "#64748b"
        status_icon  = "⚪"
        status_msg   = "Awaiting inputs — fill calculators"
    elif grand_total < 2.0:
        status_color = "#4ade80"
        status_icon  = "🟢"
        status_msg   = "Excellent Eco-Score!"
    elif grand_total < 4.8:
        status_color = "#86efac"
        status_icon  = "🟡"
        status_msg   = "Good Progress"
    elif grand_total < 10.0:
        status_color = "#fb923c"
        status_icon  = "🟠"
        status_msg   = "Moderate Impact"
    else:
        status_color = "#f87171"
        status_icon  = "🔴"
        status_msg   = "High Footprint"

    st.markdown(f"""
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);
                border-radius:12px;padding:1rem;text-align:center;margin-bottom:1rem;">
        <div style="font-size:2.5rem;font-weight:700;color:{status_color};">{grand_total:.1f}</div>
        <div style="color:#94a3b8;font-size:0.8rem;">Tons CO₂e / year</div>
        <div style="color:{status_color};font-size:0.85rem;margin-top:0.3rem;">{status_icon} {status_msg}</div>
    </div>
    """, unsafe_allow_html=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.metric("🔥 Streak",   f"{st.session_state.streak} days")
        st.metric("⚡ XP",       f"{st.session_state.xp}")
    with col_b:
        st.metric("🏅 Level",    f"Lv.{level}")
        st.metric("🌿 Saved",    f"{st.session_state.lifetime_saved:.1f} kg")

    st.markdown(f"**{level_name}** — `{xp_in_level}/100 XP`")
    st.progress(xp_in_level / 100)

    st.divider()
    st.caption("📊 Emission factors based on IPCC & EPA data")
    st.caption("🔒 All data stays in your session — no tracking")

# ─────────────────────────────────────────────
# MAIN CONTENT — Tabs
# ─────────────────────────────────────────────
st.title("🌎 EcoSphere — Carbon Footprint Tracker")
st.caption("Understand, track and reduce your environmental impact")

tab_dash, tab_calc, tab_habits, tab_scenario = st.tabs([
    "📊 Dashboard",
    "🧮 Calculators",
    "⚡ Daily Habits",
    "🌲 Scenario Planner",
])

# ═════════════════════════════════════════════
# TAB 1 — DASHBOARD
# ═════════════════════════════════════════════
with tab_dash:
    st.header("📊 Your Carbon Dashboard")

    # ── Top KPI row ──────────────────────────
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("🚗 Transport",  f"{t_transport:.1f} T/yr",  help="Annual transport emissions")
    c2.metric("🏠 Home",       f"{t_home:.1f} T/yr",       help="Annual home energy emissions")
    c3.metric("🥗 Food",       f"{t_food:.1f} T/yr",       help="Annual food & diet emissions")
    c4.metric("🛍️ Shopping",   f"{t_consumption:.1f} T/yr", help="Annual consumption emissions")
    c5.metric("🌍 TOTAL",      f"{grand_total:.1f} T/yr",  help="Total annual carbon footprint")

    st.divider()

    col_left, col_right = st.columns([1, 1], gap="large")

    # ── Donut Chart ───────────────────────────
    with col_left:
        st.subheader("Emissions Breakdown")
        if grand_total > 0:
            labels  = ["🚗 Transport", "🏠 Home Energy", "🥗 Food & Diet", "🛍️ Consumption"]
            values  = [t_transport, t_home, t_food, t_consumption]
            colors  = ["#22d3ee", "#4ade80", "#fbbf24", "#818cf8"]

            fig_donut = go.Figure(go.Pie(
                labels=labels,
                values=values,
                hole=0.55,
                marker=dict(colors=colors, line=dict(color="#0d1117", width=2)),
                textinfo="label+percent",
                textfont=dict(color="white", size=12),
                hovertemplate="%{label}<br>%{value:.2f} T CO₂e<br>%{percent}<extra></extra>",
            ))
            fig_donut.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                showlegend=False,
                margin=dict(t=20, b=20, l=20, r=20),
                height=300,
                annotations=[dict(
                    text=f"<b>{grand_total:.1f} T</b>",
                    x=0.5, y=0.5,
                    font=dict(size=18, color="#4ade80"),
                    showarrow=False,
                )],
            )
            st.plotly_chart(fig_donut, use_container_width=True)
        else:
            st.info("Fill in the Calculators tab to see your breakdown here.")

    # ── Gauge + Bar comparison ────────────────
    with col_right:
        st.subheader("Global Benchmarks Comparison")

        benchmarks = {
            "You":          grand_total,
            "World Avg":    4.8,
            "US Avg":       14.2,
            "EU Avg":       6.8,
            "Sustainable":  2.0,
        }
        b_labels = list(benchmarks.keys())
        b_values = list(benchmarks.values())
        b_colors = ["#4ade80" if grand_total <= 4.8 else "#f87171" if grand_total >= 10 else "#fb923c",
                    "#64748b", "#64748b", "#64748b", "#22d3ee"]

        fig_bar = go.Figure(go.Bar(
            x=b_labels,
            y=b_values,
            marker=dict(color=b_colors, line=dict(color="rgba(0,0,0,0)")),
            hovertemplate="%{x}: %{y:.1f} T CO₂e/yr<extra></extra>",
        ))
        fig_bar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#94a3b8"),
            yaxis=dict(
                title="Tons CO₂e / year",
                gridcolor="rgba(255,255,255,0.07)",
                color="#94a3b8",
            ),
            xaxis=dict(color="#94a3b8"),
            margin=dict(t=10, b=10, l=10, r=10),
            height=300,
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.divider()

    # ── Smart Insights ────────────────────────
    st.subheader("💡 Smart Insights")

    if grand_total == 0:
        st.info("Complete the Calculators to unlock personalised insights.")
    else:
        insights = []
        if st.session_state.car_dist > 200 and st.session_state.car_type == "gasoline":
            insights.append(("🚗 High Mileage Petrol Vehicle",
                             "Your car emits substantial carbon. Commuting via public transit or carpooling twice a week cuts transport load by ~20%."))
        if st.session_state.electricity > 400 and st.session_state.green_pct < 50:
            insights.append(("⚡ Coal Grid Overload",
                             "High monthly electricity on a non-green grid. Switching to a community solar supplier immediately avoids this burden."))
        if st.session_state.diet_type == "meat-heavy":
            insights.append(("🥩 Livestock Agricultural Impact",
                             "Red meat production is resource-heavy. Swapping 3 dinners weekly to vegetarian equivalents plants 15 virtual trees annually."))
        if not st.session_state.recycle_plastic or not st.session_state.recycle_compost:
            insights.append(("♻️ Divert Landfill Waste",
                             "Composting organic scraps and separating plastics prevents methane release, reducing household footprint by ~15%."))
        if grand_total < 3.0:
            insights.append(("🏆 Stellar Eco-Citizen Status",
                             "Outstanding! Your footprint aligns with global targets. Expand your actions to inspire your local community."))

        if not insights:
            st.success("✅ Your habits are outstanding — no warnings generated. Keep it up!")
        else:
            cols = st.columns(min(len(insights), 2))
            for i, (title, desc) in enumerate(insights[:4]):
                with cols[i % 2]:
                    st.markdown(f"""
                    <div class="eco-card">
                        <h4>{title}</h4>
                        <p>{desc}</p>
                    </div>
                    """, unsafe_allow_html=True)

    st.divider()

    # ── Badges ────────────────────────────────
    st.subheader("🏅 Achievements")

    BADGES = [
        ("starter",  "🌱 Eco-Novice",       "Initialise calculations on EcoSphere"),
        ("lowfoot",  "🍃 Green Footprint",   "Footprint below global average (4.8T)"),
        ("ecostar",  "⭐ Climate Hero",       "Footprint below 2.0T sustainability target"),
        ("habit_3",  "✅ Eco-Builder",        "Check off at least 3 green actions today"),
        ("streak_3", "🔥 Constant Care",      "Reach a streak of 3 active days"),
        ("trees_10", "🌲 Forest Guardian",    "Grow 10 simulated trees in Scenario Planner"),
    ]

    badge_html = '<div class="badge-row">'
    for bid, bname, bdesc in BADGES:
        unlocked = bid in st.session_state.badges
        css_cls  = "badge" if unlocked else "badge locked"
        icon     = "🔓" if unlocked else "🔒"
        badge_html += f'<span class="{css_cls}" title="{bdesc}">{icon} {bname}</span>'
    badge_html += "</div>"
    st.markdown(badge_html, unsafe_allow_html=True)


# ═════════════════════════════════════════════
# TAB 2 — CALCULATORS
# ═════════════════════════════════════════════
with tab_calc:
    st.header("🧮 Carbon Calculators")

    sub_tabs = st.tabs(["🚗 Transport", "🏠 Home Energy", "🥗 Food & Diet", "🛍️ Consumption"])

    # ── Transport ─────────────────────────────
    with sub_tabs[0]:
        st.subheader("🚗 Transportation")
        col1, col2 = st.columns(2)
        with col1:
            st.session_state.car_type = st.selectbox(
                "Car engine type",
                ["gasoline", "diesel", "hybrid", "electric"],
                index=["gasoline","diesel","hybrid","electric"].index(st.session_state.car_type),
                key="sel_car_type",
            )
            st.session_state.car_dist = st.number_input(
                "Weekly car distance (km/week)", min_value=0, value=st.session_state.car_dist, step=10, key="ni_car_dist"
            )
            st.session_state.motorbike_dist = st.number_input(
                "Weekly motorbike distance (km/week)", min_value=0, value=st.session_state.motorbike_dist, step=5, key="ni_motorbike"
            )
        with col2:
            st.session_state.transit_dist = st.number_input(
                "Weekly public transit (km/week)", min_value=0, value=st.session_state.transit_dist, step=5, key="ni_transit"
            )
            st.session_state.flights_short = st.number_input(
                "Short-haul flights per year", min_value=0, value=st.session_state.flights_short, step=1, key="ni_fshort"
            )
            st.session_state.flights_long = st.number_input(
                "Long-haul flights per year", min_value=0, value=st.session_state.flights_long, step=1, key="ni_flong"
            )

        transport_now = calc_transport(
            st.session_state.car_type, st.session_state.car_dist,
            st.session_state.motorbike_dist, st.session_state.transit_dist,
            st.session_state.flights_short, st.session_state.flights_long,
        )
        st.success(f"🚗 **Transport total: {transport_now:.2f} Tons CO₂e/yr** — equivalent to planting **{math.ceil(transport_now*1000/22)} trees/yr** to offset")

    # ── Home Energy ───────────────────────────
    with sub_tabs[1]:
        st.subheader("🏠 Home Energy")
        col1, col2 = st.columns(2)
        with col1:
            st.session_state.residents = st.number_input(
                "Number of residents", min_value=1, value=st.session_state.residents, step=1, key="ni_residents"
            )
            st.session_state.electricity = st.number_input(
                "Monthly electricity (kWh/month)", min_value=0.0, value=float(st.session_state.electricity), step=10.0, key="ni_elec"
            )
            st.session_state.green_pct = st.slider(
                "Green / renewable energy %", min_value=0, max_value=100, value=st.session_state.green_pct, key="sl_green"
            )
        with col2:
            st.session_state.heating_type = st.selectbox(
                "Heating fuel type",
                ["gas", "electricity", "oil"],
                index=["gas","electricity","oil"].index(st.session_state.heating_type),
                key="sel_heat",
            )
            st.session_state.heating_val = st.number_input(
                "Monthly heating usage (kWh or L)", min_value=0.0, value=float(st.session_state.heating_val), step=10.0, key="ni_heat"
            )
            st.session_state.water = st.number_input(
                "Monthly water usage (litres/month)", min_value=0.0, value=float(st.session_state.water), step=100.0, key="ni_water"
            )

        home_now = calc_home(
            st.session_state.residents, st.session_state.electricity,
            st.session_state.green_pct, st.session_state.heating_type,
            st.session_state.heating_val, st.session_state.water,
        )
        st.success(f"🏠 **Home total: {home_now:.2f} Tons CO₂e/yr** — equivalent to planting **{math.ceil(home_now*1000/22)} trees/yr** to offset")

    # ── Food & Diet ───────────────────────────
    with sub_tabs[2]:
        st.subheader("🥗 Food & Diet")

        diet_labels = {
            "meat-heavy":   "🥩 Heavy Meat Eater (7.2 kg CO₂/day)",
            "meat-average": "🍗 Average Meat Eater (5.6 kg CO₂/day)",
            "vegetarian":   "🥦 Vegetarian (3.8 kg CO₂/day)",
            "vegan":        "🌱 Vegan (2.9 kg CO₂/day)",
        }
        diet_options = list(diet_labels.keys())
        st.session_state.diet_type = diet_options[
            st.radio(
                "Select your primary diet",
                options=range(len(diet_options)),
                format_func=lambda i: diet_labels[diet_options[i]],
                index=diet_options.index(st.session_state.diet_type),
                horizontal=True,
                key="radio_diet",
            )
        ]

        col1, col2 = st.columns(2)
        with col1:
            waste_map = {"low": 0, "medium": 1, "high": 2}
            waste_rev = {0: "low", 1: "medium", 2: "high"}
            waste_idx = st.selectbox(
                "Food waste level",
                [0, 1, 2],
                format_func=lambda i: ["Low (+5%)", "Medium (+12%)", "High (+25%)"][i],
                index=waste_map.get(st.session_state.food_waste, 0),
                key="sel_waste",
            )
            st.session_state.food_waste = waste_rev[waste_idx]
        with col2:
            st.session_state.local_buy = st.checkbox(
                "🌿 Buy organic / locally sourced food (–10%)",
                value=st.session_state.local_buy,
                key="chk_local",
            )

        food_now = calc_food(st.session_state.diet_type, st.session_state.food_waste, st.session_state.local_buy)
        st.success(f"🥗 **Food total: {food_now:.2f} Tons CO₂e/yr** — equivalent to planting **{math.ceil(food_now*1000/22)} trees/yr** to offset")

    # ── Consumption ───────────────────────────
    with sub_tabs[3]:
        st.subheader("🛍️ Consumption & Waste")
        col1, col2 = st.columns(2)
        with col1:
            st.session_state.clothing = st.number_input(
                "New clothing items bought/month", min_value=0, value=st.session_state.clothing, step=1, key="ni_cloth"
            )
            st.session_state.electronics_buy = st.number_input(
                "New electronic devices bought/year", min_value=0, value=st.session_state.electronics_buy, step=1, key="ni_elec2"
            )
            st.session_state.waste_bags = st.number_input(
                "Landfill waste bags/week", min_value=0, value=st.session_state.waste_bags, step=1, key="ni_waste"
            )
        with col2:
            st.markdown("**♻️ Recycling habits**")
            st.session_state.recycle_paper   = st.checkbox("Paper / Cardboard",   value=st.session_state.recycle_paper,   key="chk_paper")
            st.session_state.recycle_plastic = st.checkbox("Plastic",             value=st.session_state.recycle_plastic, key="chk_plastic")
            st.session_state.recycle_glass   = st.checkbox("Glass",               value=st.session_state.recycle_glass,   key="chk_glass")
            st.session_state.recycle_compost = st.checkbox("Compost / Organics",  value=st.session_state.recycle_compost, key="chk_compost")

        cons_now = calc_consumption(
            st.session_state.clothing, st.session_state.electronics_buy,
            st.session_state.waste_bags, st.session_state.recycle_paper,
            st.session_state.recycle_plastic, st.session_state.recycle_glass,
            st.session_state.recycle_compost,
        )
        st.success(f"🛍️ **Consumption total: {cons_now:.2f} Tons CO₂e/yr** — equivalent to planting **{math.ceil(cons_now*1000/22)} trees/yr** to offset")


# ═════════════════════════════════════════════
# TAB 3 — DAILY HABITS
# ═════════════════════════════════════════════
with tab_habits:
    st.header("⚡ Daily Eco-Action Checklist")
    st.caption("Check off green actions you've done today to earn XP and build your streak!")

    HABITS = [
        ("bike_commute",  "🚴 Bike or Walk to Work/School",         0.5,  15),
        ("plant_meal",    "🥗 Eat a Plant-Based Meal Today",         0.3,  10),
        ("short_shower",  "🚿 Keep Shower Under 5 Minutes",          0.2,   8),
        ("no_meat",       "🌱 No Meat for the Full Day",             0.9,  20),
        ("reusable_bag",  "🛍️ Use Reusable Bag / Avoid Single-Use", 0.1,   5),
        ("transit_use",   "🚌 Use Public Transit Instead of Car",    0.4,  12),
        ("recycle_act",   "♻️ Actively Recycled Today",              0.15,  7),
        ("energy_save",   "💡 Turned Off Lights / Unplugged Devices", 0.2,  8),
    ]

    col1, col2 = st.columns(2)
    habits_done_today = list(st.session_state.habits_done)
    daily_co2_saved = 0.0
    daily_xp_earned = 0

    for i, (hid, label, co2_offset, xp_val) in enumerate(HABITS):
        col = col1 if i % 2 == 0 else col2
        with col:
            checked = hid in habits_done_today
            new_val = st.checkbox(f"{label}  (+{xp_val} XP | saves {co2_offset} kg CO₂)", value=checked, key=f"habit_{hid}")

            if new_val and hid not in habits_done_today:
                habits_done_today.append(hid)
                st.session_state.xp += xp_val
                st.session_state.lifetime_saved += co2_offset
                st.session_state.streak = st.session_state.get("streak", 0) + 1
            elif not new_val and hid in habits_done_today:
                habits_done_today.remove(hid)
                st.session_state.xp = max(0, st.session_state.xp - xp_val)
                st.session_state.lifetime_saved = max(0.0, st.session_state.lifetime_saved - co2_offset)

            if new_val:
                daily_co2_saved += co2_offset
                daily_xp_earned += xp_val

    st.session_state.habits_done = habits_done_today

    st.divider()
    m1, m2, m3 = st.columns(3)
    m1.metric("Today's CO₂ Saved",  f"{daily_co2_saved:.1f} kg")
    m2.metric("XP Earned Today",     f"{daily_xp_earned} XP")
    m3.metric("Total Streak",        f"{st.session_state.streak} days")

    if st.button("🔄 Reset Today's Habits"):
        for hid, label, co2_offset, xp_val in HABITS:
            if hid in st.session_state.habits_done:
                st.session_state.xp = max(0, st.session_state.xp - xp_val)
                st.session_state.lifetime_saved = max(0.0, st.session_state.lifetime_saved - co2_offset)
        st.session_state.habits_done = []
        st.rerun()


# ═════════════════════════════════════════════
# TAB 4 — SCENARIO PLANNER
# ═════════════════════════════════════════════
with tab_scenario:
    st.header("🌲 Lifestyle Scenario Planner")
    st.caption("Simulate future emission reductions by adjusting lifestyle sliders")

    if grand_total == 0:
        st.warning("⚠️ Complete the Calculators tab first to see meaningful simulation results.")

    col_sliders, col_results = st.columns([1, 1], gap="large")

    with col_sliders:
        st.subheader("🎛️ Adjustment Sliders")
        sim_car = st.slider("🚗 Reduce weekly car distance (km/week)", 0, 300, st.session_state.sim_car_reduction, key="sl_sim_car")
        sim_meals = st.slider("🥗 Replace meat meals with vegan meals/week", 0, 21, st.session_state.sim_food_meals, key="sl_sim_food")
        sim_grid = st.slider("⚡ Switch to green/renewable energy (%)", 0, 100, st.session_state.sim_grid_pct, key="sl_sim_grid")
        sim_fashion = st.slider("👕 Reduce new clothing purchases (items/month)", 0, 20, st.session_state.sim_fashion_items, key="sl_sim_fashion")

        st.session_state.sim_car_reduction  = sim_car
        st.session_state.sim_food_meals     = sim_meals
        st.session_state.sim_grid_pct       = sim_grid
        st.session_state.sim_fashion_items  = sim_fashion

    # ── Compute scenario savings ──────────────
    car_rate = EF["transport"].get(st.session_state.car_type, 0.20)
    actual_car_dist = st.session_state.car_dist
    reduction_km = min(actual_car_dist, sim_car)
    car_saved_kg  = reduction_km * 52 * car_rate

    meal_diff_kg  = 0.90
    food_saved_kg = sim_meals * 52 * meal_diff_kg

    elec_base_kg  = st.session_state.electricity * 12 * EF["home"]["electricityKwh"]
    extra_green   = max(0, sim_grid - st.session_state.green_pct)
    grid_saved_kg = (elec_base_kg * (extra_green / 100)) / max(1, st.session_state.residents)

    clothing_saved_kg = sim_fashion * 12 * EF["consumption"]["clothingItem"]

    total_saved_kg   = car_saved_kg + food_saved_kg + grid_saved_kg + clothing_saved_kg
    total_saved_tons = total_saved_kg / 1000
    trees_count      = round(total_saved_kg / 22)
    pct_cut          = min(100, (total_saved_tons / grand_total * 100)) if grand_total > 0 else 0.0

    # Award Forest Guardian badge
    if trees_count >= 10:
        award_badge("trees_10", 80)

    with col_results:
        st.subheader("📈 Projected Savings")

        r1, r2, r3 = st.columns(3)
        r1.metric("🌍 CO₂ Saved",    f"{total_saved_tons:.2f} T/yr")
        r2.metric("📉 Footprint Cut", f"{pct_cut:.0f}%")
        r3.metric("🌲 Trees Grown",   f"{trees_count}")

        # Progress bar for % cut
        st.markdown("**Footprint reduction progress:**")
        st.progress(min(1.0, pct_cut / 100))

        # Before / After gauge
        if grand_total > 0:
            new_total = max(0, grand_total - total_saved_tons)
            fig_gauge = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=new_total,
                delta={"reference": grand_total, "decreasing": {"color": "#4ade80"}, "increasing": {"color": "#f87171"}},
                title={"text": "Projected Total (T CO₂e/yr)", "font": {"color": "#94a3b8", "size": 13}},
                gauge={
                    "axis": {"range": [0, 16], "tickcolor": "#94a3b8"},
                    "bar": {"color": "#4ade80"},
                    "bgcolor": "rgba(0,0,0,0)",
                    "borderwidth": 0,
                    "steps": [
                        {"range": [0,  2.0], "color": "rgba(34,197,94,0.15)"},
                        {"range": [2.0, 4.8], "color": "rgba(250,204,21,0.1)"},
                        {"range": [4.8,10.0], "color": "rgba(251,146,60,0.1)"},
                        {"range": [10.0,16],  "color": "rgba(248,113,113,0.1)"},
                    ],
                    "threshold": {"line": {"color": "#22d3ee", "width": 3}, "value": 2.0},
                },
                number={"suffix": " T", "font": {"color": "#4ade80", "size": 28}},
            ))
            fig_gauge.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                font={"color": "#94a3b8"},
                height=250,
                margin=dict(t=30, b=10, l=20, r=20),
            )
            st.plotly_chart(fig_gauge, use_container_width=True)

    st.divider()

    # ── Virtual Forest ────────────────────────
    st.subheader("🌲 Your Virtual Carbon-Sink Forest")

    if trees_count == 0:
        st.info("🌱 Adjust the sliders above to start growing your virtual forest!")
    else:
        tree_display = min(48, trees_count)
        trees_html = "".join([
            f'<span style="font-size:1.8rem;animation:fadeIn 0.3s ease {i*15}ms both;">🌲</span>'
            for i in range(tree_display)
        ])
        extra_msg = f"<span style='color:#94a3b8;font-size:0.85rem;'> + {trees_count - tree_display} more trees in your carbon sink!</span>" if trees_count > tree_display else ""
        st.markdown(f"""
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.2);
                    border-radius:14px;padding:1.5rem;line-height:2.2;
                    word-break:break-all;">
            {trees_html}{extra_msg}
        </div>
        <style>
            @keyframes fadeIn {{ from {{ opacity:0; transform:scale(0.5); }} to {{ opacity:1; transform:scale(1); }} }}
        </style>
        """, unsafe_allow_html=True)
        st.caption(f"🌍 Each tree absorbs ~22 kg CO₂/year. Your changes could save **{total_saved_kg:.0f} kg CO₂/yr**!")
