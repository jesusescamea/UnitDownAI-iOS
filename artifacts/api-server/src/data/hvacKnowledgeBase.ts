export type PriorityLevel = "low" | "medium" | "high" | "critical";

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  category: string;
  equipment: string[];
  brands: string[];
  triggers: string[];
  symptomClues: string[];
  failureStage: string;
  likelyCauses: string[];
  firstChecks: string[];
  meterChecks: string[];
  priority: PriorityLevel;
  confidenceBase: number;
  recommendedAction: string;
  riskNote: string;
  negativeTriggers?: string[];
}

export const hvacKnowledgeBase: KnowledgeBaseEntry[] = [
  // ─── REFRIGERANT / NO COOL ────────────────────────────────────────────────────

  {
    id: "ref-leak-rtu",
    title: "Refrigerant Leak — Rooftop Unit",
    category: "No Cool",
    equipment: ["rooftop", "rtu", "packaged unit", "package unit"],
    brands: ["carrier", "trane", "york", "lennox", "aaon", "daikin", "goodman", "rheem", "ruud", "american standard", "bryant"],
    triggers: ["hissing", "not cooling", "won't cool", "no cool", "not cold", "refrigerant leak", "low refrigerant", "low charge"],
    symptomClues: ["hiss", "cool", "cold", "refrigerant", "freon", "charge", "leak", "outdoor unit running"],
    negativeTriggers: ["heating", "electric heat", "electric heating", "heat strips", "heat kit", "heating mode", "heat mode", "testing heating", "temperature rise", "temp rise", "no heat", "not heating"],
    failureStage: "runtime",
    confidenceBase: 82,
    priority: "high",
    likelyCauses: [
      "Refrigerant leak at Schrader valve, brazed joint, or coil — low charge reduces system capacity",
      "Leak at service port or aged copper tubing — common in units over 8 years old",
      "Metering device failure causing refrigerant migration and loss of superheat control",
    ],
    firstChecks: [
      "Confirm both the compressor and condenser fan are running on the outdoor/rooftop unit",
      "Check supply air temperature at the nearest diffuser — should be 55–60°F at full load",
      "Look for oil staining around refrigerant fittings, service ports, and coil connections — oil traces indicate leak location",
      "Inspect the sight glass if accessible — bubbles or cloudiness confirm low charge",
      "Listen for a faint hissing sound near the outdoor unit service valves or indoor coil cabinet",
    ],
    meterChecks: [
      "Clamp meter on compressor common leg — low amperage draw (below 80% of nameplate RLA) suggests low load from refrigerant loss",
      "Temperature/humidity probe: measure supply/return delta-T — should be 16–22°F; below 12°F indicates low charge",
      "Manifold gauge set: suction pressure below 60 psig on R-410A or below 55 psig on R-22 confirms undercharge",
      "Electronic leak detector or UV dye lamp around all refrigerant joints and service ports",
    ],
    recommendedAction:
      "Do not continue running the unit — operating with low refrigerant overheats and destroys the compressor. Schedule a licensed EPA 608-certified technician to perform a leak search, repair all leak points, and recharge to nameplate specifications.",
    riskNote:
      "Continued operation with low refrigerant will overheat compressor windings and cause total compressor failure — a $1,500–$4,000 replacement versus a $200–$400 refrigerant service call.",
  },

  {
    id: "compressor-locked-rotor",
    title: "Compressor Locked Rotor / Seized",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "copeland", "bristol", "goodman"],
    triggers: ["compressor hums", "compressor won't start", "hums then shuts off", "hard start", "locked rotor", "compressor seized", "compressor locks up", "lra spike", "locked rotor amperage", "breaker trips within seconds", "trips within 2 seconds", "trips within seconds when compressor", "breaker trips on compressor start", "trips instantly when compressor"],
    symptomClues: ["hum", "buzz", "click", "compressor", "hard start kit", "immediately trips", "instant trip", "trips right away", "trips on startup", "trips within seconds", "within 2 seconds", "breaker trips compressor"],
    negativeTriggers: [
      // Time-delayed trip — locked rotor trips instantly, not minutes after startup
      "after running", "after startup", "minutes after", "10 minutes", "15 minutes",
      "after a while", "runs for", "runs then", "trips after", "while running",
      "after warmup", "after warm up", "after being on", "minutes into", "after it runs",
      "after several minutes", "runs for a few", "after a few minutes",
      // Capacitor confirmed good — the primary locked-rotor first fix is the capacitor
      "tests good", "tested good", "capacitor good", "cap good", "capacitor ok",
      "cap ok", "capacitor checked", "new capacitor", "replaced capacitor",
      "capacitor replaced", "capacitor fine", "replaced the cap", "cap reads good",
      // Non-compressor motor context
      "blower motor", "indoor fan motor", "condenser fan motor", "outdoor fan motor",
      // Context
      "inducer", "draft motor", "no heat", "furnace", "gas valve", "rollout",
    ],
    failureStage: "startup",
    confidenceBase: 88,
    priority: "critical",
    likelyCauses: [
      "Compressor motor windings shorted or open — motor cannot generate enough torque to start",
      "Seized compressor pistons due to lubrication failure or liquid slugging on startup",
      "Failed run or start capacitor — without capacitor assistance, compressor cannot overcome starting torque",
      "Low voltage at compressor terminals causing inadequate starting torque",
    ],
    firstChecks: [
      "Observe the outdoor unit on power-on: a hum followed by a click and then silence is the classic compressor locked-rotor pattern",
      "Reset the breaker and time how long until it trips — less than 10 seconds indicates locked rotor, not a pressure issue",
      "Inspect the run capacitor — if it is bulging, leaking, or has a blown top, replace it before condemning the compressor",
      "Check the disconnect fuses with a multimeter — blown fuses cause similar symptoms",
      "Verify line voltage at the contactor: must be within 10% of nameplate voltage during startup attempt",
    ],
    meterChecks: [
      "Clamp meter on compressor common leg during startup: locked rotor amps (LRA) will spike 4–6x normal RLA immediately, then breaker trips",
      "Ohmmeter between C-S, C-R, and R-S terminals with power off: open or shorted windings confirm compressor failure",
      "Capacitor meter (capacitance mode) on run capacitor: more than 6% below rated µF value means capacitor is bad",
      "Voltmeter at contactor load side during operation: below 208V on 230V equipment causes hard-start conditions",
    ],
    recommendedAction:
      "Install a hard-start kit (SPP5) and replace the run capacitor before condemning the compressor. If the compressor still draws LRA after capacitor replacement, compressor replacement or full system changeout is required.",
    riskNote:
      "A locked-rotor compressor that is repeatedly power-cycled will pull 6× normal current each attempt, burning wiring insulation, destroying contactors, and permanently damaging compressor windings. Do not reset and retry more than once.",
  },

  // ─── COMPRESSOR RUNNING BUT NO COOLING ────────────────────────────────────────
  // Dedicated entry for the pattern: compressor is confirmed running/engaged/on,
  // but there is no useful cooling. This is a CAPACITY fault, NOT a start fault.
  // The scoring engine boosts this entry when compressor-running context is detected.

  {
    id: "compressor-running-no-cooling",
    title: "Compressor Running — No Cooling (Capacity / Refrigerant Fault Tree)",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "compressor running but no cooling",
      "compressor running not cooling",
      "runs but no cool",
      "unit running but no cool",
      "compressor on no cooling",
      "compressor is on but not cooling",
      "running but not cooling",
      "compressor running warm air",
      "compressor engaged no cooling",
      "compressor operating no cool",
      "compressor starts no cool",
      "compressor on but warm air",
      "outdoor unit running no cooling",
      "compressor running but blowing warm",
      "running no cool",
      "unit running no cooling",
      "compressor running no cool",
      "compressor running and no cooling",
    ],
    symptomClues: [
      "compressor running", "compressor on", "compressor engaged", "compressor operating",
      "outdoor unit on", "running", "no cooling", "not cooling", "warm air",
      "still warm", "no cool", "blowing warm", "not cold",
    ],
    negativeTriggers: [
      "compressor not running", "compressor won't start", "compressor dead", "compressor hums",
      "no heat", "furnace", "burner", "gas valve", "inducer",
    ],
    failureStage: "runtime",
    confidenceBase: 88,
    priority: "high",
    likelyCauses: [
      "Low refrigerant charge — compressor runs and draws near-normal amps, suction pressure is below spec, suction superheat elevated; system lacks refrigerant mass to transfer heat",
      "Insufficient indoor airflow — dirty filter, collapsed filter, frozen coil, or failed blower prevents heat exchange at the evaporator; compressor operates but delivers no useful cooling",
      "Dirty condenser coil or failed condenser fan — heat rejection impaired; compressor runs but head pressure is elevated and system capacity is reduced",
      "Compressor internal valve failure — compressor draws near-normal amps but cannot build suction/discharge differential; pressures equalize; no capacity regardless of charge",
      "Restricted or failed metering device (TXV/EEV) — valve stuck closed or badly throttled; compressor runs, evaporator starved, high superheat, no capacity delivered",
      "Reversing valve stuck in heat mode (heat pump only) — compressor runs, refrigerant circulates, circuit delivers heat instead of cooling",
    ],
    firstChecks: [
      "1. AIRFLOW BEFORE GAUGES: confirm indoor filter is clean and blower is running at full speed. A failed blower or clogged filter causes the compressor to run with zero useful cooling. Confirm airflow at all supply registers before connecting gauges.",
      "2. VERIFY COMPRESSOR IS PUMPING: suction and discharge pressures must differ by at least 150+ psig on R-410A during operation. If pressures are nearly equal (~120 psig both sides) while the compressor runs, it is not pumping — this is an internal valve failure, not low charge.",
      "3. MEASURE TEMPERATURE SPLIT: check supply vs. return air temperature at the plenums adjacent to the coil. A split less than 8°F with the compressor running confirms zero capacity — narrows cause to refrigerant, airflow, or compressor pumping.",
      "4. GAUGE PRESSURES: R-410A cooling — expect suction 115–135 psig and discharge 250–350 psig at normal ambient. Equalized pressures = compressor not pumping. Low suction + high superheat = low charge or restriction.",
      "5. HEAT PUMP CHECK: confirm reversing valve shifts to cooling mode — listen for the valve click when switching from heat to cool; no click = valve stuck.",
    ],
    meterChecks: [
      "Manifold gauges: R-410A normal cooling — suction 115–135 psig, discharge 250–350 psig; equalized pressures (~120 psig) while compressor runs = compressor not pumping (internal valve failure, not undercharge)",
      "Suction superheat at indoor coil outlet: above 20°F = low charge or restriction — confirm airflow first; below 5°F = overcharge or TXV flooding",
      "Subcooling at liquid line: below 8°F + high superheat = undercharge confirmed; above 20°F + high superheat = liquid line or TXV restriction",
      "Clamp meter on compressor common: near-nameplate RLA with equalized pressures = valve failure (not low charge); low RLA + low suction = low charge",
      "Temperature probe at supply and return plenums: delta-T below 8°F with compressor running = zero capacity being delivered",
      "Clamp meter on condenser fan motor: zero amps with contactor pulled in = condenser fan not running (heat rejection failure reducing capacity)",
    ],
    recommendedAction:
      "Confirm airflow and blower operation first. Then connect gauges: if suction and discharge pressures are equalized (~120 psig R-410A) while the compressor runs, the compressor is not pumping — this is internal valve failure, not undercharge. If pressures show proper differential with low suction, measure superheat and subcooling to distinguish undercharge from restriction before adding any refrigerant.",
    riskNote:
      "Do not add refrigerant when pressures are equalized — equalized pressures with a running compressor indicate valve failure, not low charge. Adding refrigerant to a non-pumping compressor overcharges the system and causes liquid floodback when the compressor is eventually replaced. Confirm the compressor is building differential pressure before any refrigerant work.",
  },

  {
    id: "condenser-fan-failure",
    title: "Condenser Fan Motor Failure",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: ["condenser fan not spinning", "outdoor fan stopped", "fan not running", "top fan not turning", "condenser fan motor"],
    symptomClues: ["fan", "spinning", "outdoor", "condenser", "hot", "coil", "high pressure", "overheat", "shuts off shortly"],
    negativeTriggers: [
      "inducer", "draft motor", "blower", "no heat", "furnace", "gas valve", "rollout", "ignitor", "igniter",
      "backwards", "backward", "reversed", "reverse", "wrong direction", "wrong way",
      "blowing in", "blowing down", "running backwards", "spinning backwards",
    ],
    failureStage: "runtime",
    confidenceBase: 85,
    priority: "high",
    likelyCauses: [
      "Failed condenser fan motor — thermal overload tripped or motor windings burned out",
      "Seized fan motor bearings — motor draws high current and trips thermal overload",
      "Broken or detached fan blade — motor spins but provides no airflow across condenser coil",
      "Failed capacitor — fan capacitor loss prevents motor from developing starting torque",
    ],
    firstChecks: [
      "Observe the outdoor unit from a safe distance: confirm condenser fan is or is not rotating",
      "Turn off power and manually attempt to spin the fan blade — it should rotate freely; grinding or stiffness indicates seized bearings",
      "Check the fan blade for cracks, missing sections, or detachment from the motor hub",
      "Inspect capacitor (dual-round or oval type) for bulging, leaking, or corroded terminals",
      "Check whether unit runs briefly (2–5 minutes) then shuts off — this is high-pressure lockout caused by no airflow across coil",
    ],
    meterChecks: [
      "Ohmmeter between fan motor terminals with power off: open winding (OL reading) confirms motor failure",
      "Capacitor meter on fan capacitor section: below rated µF by more than 6% means capacitor must be replaced",
      "Clamp meter on fan motor lead during restart: motor should draw rated FLA within 3 seconds — sustained high draw indicates seized bearings",
      "Contact thermometer on condenser coil: coil temperature above 130°F confirms no airflow",
    ],
    recommendedAction:
      "Replace the condenser fan motor and capacitor together — if the motor failed, the capacitor is likely stressed and approaching end of life. Confirm correct motor HP, RPM, and rotation direction before installation.",
    riskNote:
      "Running a refrigerant system without condenser airflow causes head pressure to spike rapidly, risking high-pressure relief valve discharge, compressor valve failure, and permanent refrigerant system damage within minutes of operation.",
  },

  // ─── CONDENSER FAN REVERSE ROTATION ──────────────────────────────────────────

  {
    id: "condenser-fan-reverse-rotation",
    title: "Condenser Fan Running Backwards — Reverse Rotation",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "chiller"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon", "mcquay", "liebert"],
    triggers: [
      "condenser fan running backwards",
      "fan running backwards",
      "fan spinning backwards",
      "condenser fan backwards",
      "outdoor fan backwards",
      "fan reversed",
      "condenser fan reversed",
      "fan blowing wrong way",
      "fan spinning wrong direction",
      "wrong rotation",
      "reverse rotation",
      "backward rotation",
      "fan blowing in",
      "fan blowing down",
      "rotation reversed",
      "spinning the wrong way",
      "turning backwards",
    ],
    symptomClues: [
      "backwards", "backward", "reverse", "reversed", "wrong direction",
      "blowing in", "blowing down", "rotation", "phase", "leads", "wiring",
      "replaced motor", "new motor", "universal motor", "three phase", "3 phase",
      "ecm", "psc motor", "wrong way",
    ],
    negativeTriggers: [
      "not spinning", "not running", "fan not running", "stopped", "won't spin",
      "fan stopped", "seized", "burned", "no movement", "fan not turning",
      "top fan not turning", "outdoor fan stopped",
    ],
    failureStage: "runtime",
    confidenceBase: 94,
    priority: "high",
    likelyCauses: [
      "3-phase motor: two supply phase leads swapped — reversing any two of the three leads reverses rotation direction on every 3-phase induction motor",
      "Single-phase PSC replacement motor: universal motor installed with wrong rotation terminal selected, or rotation leads wired in reverse of OEM specification",
      "Reversible single-phase motor: OEM rotation lead pair (CW vs. CCW) connected incorrectly — check wiring diagram for the designated active lead",
      "Fan blade pitch installed backwards on shaft — motor rotation is correct but blade drives air in the wrong direction because pitch angle is inverted",
      "ECM motor: incorrect rotation programmed, wrong control signal from board, or incompatible replacement motor with opposite default rotation direction",
      "Wrong replacement motor application — motor specification calls for a specific rotation direction not matched by the universal motor that was selected",
    ],
    firstChecks: [
      "SAFETY FIRST: De-energize the unit and verify zero voltage at all motor leads before touching any wiring. Follow lockout/tagout procedure.",
      "Determine motor type (3-phase, single-phase PSC, or ECM) — the fix is completely different for each. Check the motor nameplate.",
      "3-PHASE MOTOR: Confirm incorrect rotation with unit energized and at safe distance. De-energize, then swap any two of the three motor line leads (e.g., swap L1 and L2) to reverse rotation on all 3-phase induction motors. Re-energize, verify correct rotation, then check amperage. Note: 3-phase condenser fan motors do NOT use a standard PSC run capacitor — do not replace or test capacitor.",
      "SINGLE-PHASE PSC MOTOR: Pull the OEM wiring diagram and locate the designated rotation leads (often labeled CW/CCW or by a color code). Confirm which lead should be active for the required rotation. Also verify fan blade pitch orientation on the shaft — a reversed blade drives air the wrong direction even with correct motor rotation.",
      "UNIVERSAL/REPLACEMENT MOTOR: If a new motor was recently installed, compare the motor's rotation label and active wiring to the OEM requirement. Universal motors typically have both CW and CCW leads available — confirm the correct one is connected and the other is capped.",
      "ECM MOTOR: Do not attempt to swap leads. Consult the OEM service manual for rotation configuration parameters, motor harness pinout, and the control signal from the unit board. An ECM running backwards indicates a programming or compatibility issue.",
      "BLADE ORIENTATION: With power off, inspect the blade — pitch angle should cup air toward discharge (typically upward on a top-discharge condenser). An upside-down blade drives air downward into the unit regardless of motor rotation.",
    ],
    meterChecks: [
      "Clamp meter on each motor lead during operation: amps within nameplate FLA confirms the motor is electrically sound — do NOT condemn a motor running at rated current just because rotation is wrong",
      "3-phase: Voltmeter L1-L2, L2-L3, L1-L3 — balanced three-phase voltage within 2% confirms supply quality; unbalanced voltage can cause torque issues beyond rotation direction",
      "Single-phase PSC: Capacitance meter on run capacitor — verify within rated µF (±6%); a significantly degraded capacitor can allow the motor to start in the wrong direction on low-load startups",
      "Single-phase PSC: Voltmeter between rotation lead terminals with power on — confirm only the intended rotation terminal pair is receiving control voltage",
      "After rotation correction: Clamp meter on motor leads to confirm amps at or near rated FLA — elevated amps after the lead swap may indicate blade-shaft binding or an obstruction in the airflow path",
    ],
    recommendedAction:
      "First, determine the motor type — the fix is different for each. (1) 3-PHASE: De-energize and swap any two of the three motor line leads to reverse rotation. Re-energize, confirm correct rotation direction and normal amperage, then return to service. Do not replace the motor or capacitor. (2) SINGLE-PHASE PSC: Consult the OEM wiring diagram for the designated rotation lead configuration. Some reversible PSC motors reverse by activating the alternate rotation lead — use the diagram, do not guess. Also verify fan blade pitch orientation. (3) ECM: Consult the OEM service guide for rotation configuration — do not swap motor leads on an ECM. In all cases: verify zero voltage before touching wiring, confirm correct rotation after the fix, and check head pressure returns to normal operating range before returning the unit to full service.",
    riskNote:
      "A condenser fan running backwards moves air through the coil in the wrong direction — heat rejection drops immediately and head pressure rises rapidly. The compressor will trip on high-pressure lockout within minutes. A motor running backwards is NOT a failed motor — do not replace the motor without first identifying and correcting the root cause. Replacing the motor without fixing the phase rotation, wiring, or blade orientation will reproduce the fault exactly.",
  },

  {
    id: "dirty-condenser-coil",
    title: "Dirty / Blocked Condenser Coil",
    category: "Weak Cooling",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: ["dirty coil", "condenser coil", "high head pressure", "not cooling enough", "can't keep up", "takes forever to cool"],
    symptomClues: ["dirty", "debris", "clogged", "leaves", "lint", "grease", "blocked", "restricted", "airflow", "condenser"],
    failureStage: "runtime",
    confidenceBase: 80,
    priority: "medium",
    likelyCauses: [
      "Condenser coil fins blocked with dirt, cottonwood seeds, grease, or debris — restricts airflow and raises head pressure",
      "Vegetation, fencing, or equipment installed too close to the condenser reducing discharge airflow",
      "Bent condenser fins reducing effective coil surface area",
    ],
    firstChecks: [
      "Visually inspect all four sides of the condenser coil — hold a flashlight through the fins; you should see light on the other side",
      "Check for grease or cooking oil contamination (restaurant/kitchen units) — this requires degreaser, not water alone",
      "Look for bent fins — more than 20% fin damage significantly reduces coil capacity",
      "Measure supply air temperature split over 30 minutes — a split below 14°F at design conditions indicates capacity loss",
      "Confirm discharge air is leaving the top of the unit freely — nearby walls or mechanical equipment can re-circulate hot air back in",
    ],
    meterChecks: [
      "Clamp meter on compressor: amperage above nameplate RLA indicates high head pressure from a dirty coil",
      "Contact thermometer on condenser coil outlet line: temperature above 110°F in moderate ambient indicates restricted heat rejection",
      "Manifold gauge set: high-side pressure above design chart for ambient temperature confirms high head pressure",
    ],
    recommendedAction:
      "Clean the condenser coil with coil cleaner and a low-pressure water rinse (inside-out). For grease-coated coils use alkaline degreaser. Allow to dry completely before restarting. Schedule annual coil cleaning to prevent recurrence.",
    riskNote:
      "A condenser coil blocked more than 30% reduces system capacity by 25–40%, increases electricity consumption 15–25%, and dramatically accelerates compressor wear. Units operated in this state for multiple seasons typically need compressor replacement within 2–3 years.",
  },

  // ─── LOW TEMPERATURE SPLIT / DELTA-T DIAGNOSIS ────────────────────────────────
  // Targeted entry for "delta T is only 10 degrees" and similar low-split complaints.
  // Airflow, economizer, and condenser must be ruled out BEFORE refrigerant work.

  {
    id: "low-delta-t-weak-cooling",
    title: "Low Temperature Split (Delta-T) — Weak Cooling Root Cause Analysis",
    category: "Weak Cooling",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "delta t only 10 degrees",
      "temp split only 10",
      "delta t is 10",
      "temperature split 10 degrees",
      "only 10 degree split",
      "temperature difference 10",
      "delta t low",
      "low delta t",
      "temperature split low",
      "delta t is low",
      "only getting 10 degree split",
      "low temp split",
      "supply return only 10 degrees",
      "return to supply 10 degrees",
      "10 degree temperature difference",
      "delta t 8 degrees",
      "temp split 8",
      "low temperature difference",
      "small temperature split",
      "only 12 degree split",
      "temperature split only 12",
      "weak temperature split",
      "delta t only 12",
      "temp split 10",
      "small delta t",
      "10 degree split",
      "delta t only 10",
    ],
    symptomClues: [
      "delta t", "delta-t", "temperature split", "temp split", "temperature difference",
      "supply temperature", "return temperature", "10 degrees", "12 degrees", "8 degrees",
      "low split", "small split", "weak cooling", "barely cooling", "not cooling enough",
    ],
    negativeTriggers: [
      "no heat", "furnace", "burner", "gas valve", "inducer",
      "temperature rise", "temp rise", "electric heat", "heat strips",
    ],
    failureStage: "runtime",
    confidenceBase: 85,
    priority: "medium",
    likelyCauses: [
      "Airflow too high — blower on a high-speed tap or ECM programmed at excessive CFM; air moves through the coil too quickly to absorb heat, producing a low split even with a full refrigerant charge",
      "Economizer stuck partially or fully open — outside air mixing with return air elevates mixed-air temperature entering the coil; system cannot achieve design delta-T against the additional uncontrolled outside load",
      "Dirty condenser coil or failed condenser fan — heat rejection impaired; compressor capacity reduced; temperature split narrows as the refrigerant circuit operates below design output",
      "Low refrigerant charge — suction pressure below spec; evaporator partially starved; compressor running but system cannot deliver design capacity",
      "Low building load — building is already near setpoint or thermostat is cycling; delta-T is naturally lower when there is little load; verify measurement is taken under genuine peak load conditions",
      "Incorrect measurement location — supply temperature must be measured at the supply plenum immediately adjacent to the coil, not at a distant register; duct heat gain/loss invalidates the reading",
      "Compressor reduced capacity — partially pumping compressor; suction/discharge differential is present but below spec even with correct charge and airflow",
    ],
    firstChecks: [
      "1. VERIFY MEASUREMENT LOCATION: measure supply temperature at the supply plenum immediately off the coil — not at a register 50 feet away. Return temperature at the return plenum adjacent to the coil. Distant measurements include duct losses and are not a valid delta-T reading.",
      "2. CONFIRM AIRFLOW IS AT DESIGN: check blower speed tap or ECM CFM setting against equipment design (400 CFM/ton is typical). An oversped blower reduces delta-T with no refrigerant fault — a 3-ton unit at 1,800 CFM instead of 1,200 CFM will show a 10°F split with a full charge.",
      "3. CHECK ECONOMIZER POSITION: inspect the economizer damper position — any outside air mixing reduces temperature split. On a 90°F day, 20% OA can reduce delta-T by 4–6°F. Check the economizer controller and damper actuator.",
      "4. INSPECT CONDENSER COIL: a dirty condenser coil reduces refrigerant system capacity, narrowing the temperature split. Check all four sides; confirm with gauges if head pressure is elevated.",
      "5. CONNECT GAUGES (only after steps 1–4 are confirmed): compare suction pressure to manufacturer performance data for current ambient. Low suction pressure confirms reduced refrigerant capacity.",
      "6. CHECK LOAD: if the space is already near setpoint, the system is at low load and delta-T will naturally be reduced. Measure during peak load conditions, not when the thermostat is just maintaining.",
    ],
    meterChecks: [
      "Digital thermometer at supply and return plenums (adjacent to coil): delta-T of 16–22°F at design airflow and full load = normal operation; below 12°F warrants investigation by the full checklist",
      "Anemometer or duct traverse: confirm airflow within 10% of design (400 CFM/ton); above-design airflow produces a low split regardless of charge",
      "Manifold gauges (only after airflow confirmed): compare suction pressure to manufacturer performance chart for ambient conditions; low suction with high superheat confirms reduced capacity",
      "Subcooling at liquid line: below 5°F = likely undercharge; above 20°F = restriction; 8–16°F with normal suction = charge is adequate",
      "Clamp meter on compressor: above nameplate RLA with high head pressure = condenser reducing capacity; below nameplate = low charge or reduced pumping",
    ],
    recommendedAction:
      "Do not add refrigerant based on a low delta-T reading alone. Walk the full checklist: correct measurement location → airflow within design range → economizer at minimum position → condenser coil clean and fan running → then connect gauges and evaluate refrigerant pressures. Adding refrigerant to a system with a high-airflow or economizer problem will overcharge it when that issue is later corrected.",
    riskNote:
      "A 10°F temperature split is NOT automatically a low refrigerant charge. High blower airflow, a stuck-open economizer, and a dirty condenser coil are equally common causes — and all three respond differently to a 'low charge' diagnosis. Refrigerant addition to any of these conditions causes overcharge when the actual root cause is later corrected.",
  },

  {
    id: "frozen-evap-coil",
    title: "Frozen Evaporator Coil",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "air handler", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: ["ice on unit", "iced up", "frozen coil", "frost on coil", "coil covered in ice", "ice buildup", "airflow poor"],
    symptomClues: ["ice", "frost", "frozen", "airflow", "restricted", "filter", "dirty", "low refrigerant", "blowing warm air"],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "high",
    likelyCauses: [
      "Severely restricted airflow from a clogged filter — suction pressure drops below freezing point of the coil",
      "Low refrigerant charge — low suction pressure causes evaporator coil temperature to drop below 32°F",
      "Dirty evaporator coil — surface contamination blocks airflow, same effect as a clogged filter",
      "Blower motor failure or slipping belt — reduced indoor airflow causes coil freeze",
    ],
    firstChecks: [
      "Turn the system to FAN ONLY mode immediately — do not run cooling while coil is frozen or you risk flooding the drain pan",
      "Allow the coil to thaw completely — minimum 2–4 hours depending on ice thickness",
      "Replace the air filter — a clogged filter is the single most common cause",
      "After thaw, inspect the coil for dirt buildup before restarting",
      "Check the condensate drain pan — a large volume of thaw water can overflow the pan; have a wet/dry vac ready",
    ],
    meterChecks: [
      "Clamp meter on blower motor: significantly below nameplate FLA indicates motor is slipping or struggling to move airflow",
      "Anemometer at supply registers: airflow below design CFM confirms airflow restriction",
      "Manifold gauge set after thaw: suction pressure below 60 psig on R-410A while running confirms low charge contributing to freeze",
    ],
    recommendedAction:
      "Shut off cooling, replace the filter, allow full thaw (FAN mode only), then inspect the coil surface before restarting. If coil re-freezes after a fresh filter, call a technician for refrigerant charge verification and coil cleaning.",
    riskNote:
      "Running cooling on a frozen coil forces liquid refrigerant back to the compressor (flooding), which washes away the lubricating oil film and causes immediate compressor damage. Fan-only mode is mandatory during thaw.",
  },

  // ─── WATER / DRAIN ────────────────────────────────────────────────────────────

  {
    id: "clogged-drain-line",
    title: "Clogged Condensate Drain Line",
    category: "Water Leak",
    equipment: ["split system", "air handler", "rooftop", "rtu", "fan coil", "ptac"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "mitsubishi"],
    triggers: ["water dripping", "drain clogged", "drain line blocked", "water leaking", "pan overflowing", "condensate drain", "water on floor"],
    symptomClues: ["water", "drip", "leak", "drain", "pan", "overflow", "puddle", "wet", "mold", "algae"],
    failureStage: "runtime",
    confidenceBase: 91,
    priority: "high",
    likelyCauses: [
      "Algae and biofilm growth blocking the condensate drain line — common in humid climates",
      "Debris accumulation at the drain pan outlet or P-trap (if installed)",
      "Improper drain pitch — flat or reverse-sloped drain lines pool water and breed algae",
    ],
    firstChecks: [
      "Locate the drain pan under the indoor coil — check for standing water depth",
      "Find the drain line outlet (at an exterior wall, floor drain, or condensate pump) and check if flow is occurring",
      "Use a wet/dry vac to suction the drain line from the cleanout port or line end",
      "Flush with 1 cup of distilled white vinegar after clearing — kills algae regrowth",
      "Inspect the secondary drain pan and secondary drain line (if installed) — if this pan has water, the primary drain is fully blocked",
    ],
    meterChecks: [
      "No electrical meter checks required — this is a mechanical/plumbing fault",
      "Use a flashlight and inspection mirror to visually confirm drain pan water level and outlet blockage",
      "Moisture meter on surrounding drywall or ceiling tile — check for concealed water damage beyond the unit",
    ],
    recommendedAction:
      "Clear the drain line with a wet/dry vac, flush with vinegar, and install condensate drain tablets (pan tablets with algaecide) to prevent recurrence. If the drain line is inaccessible or repeatedly clogs, a full drain line cleanout with nitrogen blowout is recommended.",
    riskNote:
      "An overflowing condensate pan can discharge 10–30 gallons of water per day directly onto ceiling tiles, drywall, and structural components. Mold growth begins within 24–48 hours of water saturation — immediate action prevents tens of thousands in structural damage.",
  },

  {
    id: "drain-pan-failed",
    title: "Failed or Cracked Condensate Drain Pan",
    category: "Water Leak",
    equipment: ["split system", "air handler", "rooftop", "rtu"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard"],
    triggers: ["cracked pan", "rusted pan", "drain pan leaking", "pan failed", "water under unit", "water underneath"],
    symptomClues: ["pan", "cracked", "rusted", "corroded", "plastic", "water under", "dripping from bottom"],
    failureStage: "runtime",
    confidenceBase: 84,
    priority: "high",
    likelyCauses: [
      "Rusted or corroded metal drain pan — common in units over 10 years old or with chronic standing water",
      "Cracked plastic drain pan — UV degradation or mechanical impact",
      "Pan deteriorated from continuous biological acid (algae/biofilm byproduct)",
    ],
    firstChecks: [
      "With unit off, use a flashlight to inspect the full drain pan surface for visible cracks, holes, or rust-through spots",
      "Fill the pan with a small amount of water and observe for leaks through the pan bottom or sides",
      "Check the secondary drain pan if present — this often catches primary pan leaks",
      "Inspect the area directly below the air handler for water staining or structural damage",
    ],
    meterChecks: [
      "Moisture meter on ceiling/floor structure below the unit to assess extent of water damage",
      "No electrical meter checks required",
    ],
    recommendedAction:
      "Replace the condensate drain pan — this is not a repairable item once cracked or rusted through. While the unit is shut down, inspect the drain line and coil for any secondary issues. Install a secondary overflow pan below the air handler if not already present.",
    riskNote:
      "A leaking drain pan will discharge continuously whenever the system runs. In a ceiling-mounted air handler installation, this can cause catastrophic ceiling collapse. Do not operate the unit until the pan is replaced.",
  },

  // ─── HEAT / NO HEAT ──────────────────────────────────────────────────────────

  {
    id: "gas-ignition-failure",
    title: "Gas Furnace / RTU Ignition Failure",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: ["won't heat", "no heat", "igniter not lighting", "no flame", "furnace clicking", "pilot light", "igniter glowing", "blower runs no heat"],
    symptomClues: ["igniter", "ignition", "flame", "gas", "pilot", "heat", "clicking", "furnace", "burner", "cold air on heat"],
    failureStage: "startup",
    confidenceBase: 88,
    priority: "high",
    likelyCauses: [
      "Failed hot surface igniter (HSI) — silicon carbide or silicon nitride element cracked or burned out",
      "Faulty gas valve — valve not opening on call for heat (coil failed or blocked valve body)",
      "Dirty flame sensor — carbon coating prevents sensor from detecting burner flame, causing lockout after ignition",
      "Tripped limit switch — airflow restriction causes furnace to overheat and lock out on safety",
    ],
    firstChecks: [
      "STEP 1 — TRIAGE: identify which stage of the ignition sequence failed before touching anything. Set the thermostat to HEAT 5°F above room temp and observe one full cycle. The sequence is: (a) inducer motor starts → (b) pressure switch proves → (c) igniter glows orange/red → (d) gas valve clicks open → (e) burners light → (f) flame sensor proves → blower starts on delay.",
      "STAGE BRANCH A — INDUCER RUNS BUT IGNITER WON'T GLOW: the safety string (limits + rollout + pressure switch) has an open contact, or the board is not commanding the igniter. Walk the limit string with a voltmeter: any switch with 24VAC across it is open. Read board fault codes first — they usually identify which safety tripped.",
      "STAGE BRANCH B — IGNITER GLOWS BUT NO FLAME / GAS CLICK: the gas valve is not opening. Confirm the manual gas shutoff at the unit is fully open. Check for 24VAC at the gas valve operator terminals during the ignition window — 0V means the board is withholding the command. Check inlet gas pressure (natural gas 5–7\" W.C., LP 11–14\" W.C.).",
      "STAGE BRANCH C — BURNERS LIGHT THEN DROP OUT WITHIN 2–7 SECONDS: the ignition stage SUCCEEDED — this is a flame SENSOR fault, not an ignition fault. The flame sensor rod is dirty (carbon film reduces conductance below the proving threshold). Clean the flame sensor rod with fine steel wool. Measure microamps — less than 1.5 µA with a clean sensor means sensor wire, ground, or board flame circuit.",
      "STEP 2 — CHECK AIR FILTER: a clogged filter causes the furnace to overheat and trip the high-limit switch on every cycle. If the limit string is the root cause (Stage A), inspect the filter before any other repair — a new igniter will fail the same way on the next call if the filter is not corrected.",
    ],
    meterChecks: [
      "Voltmeter across each limit/rollout switch in series with heat call active: 24VAC across any switch = that switch is OPEN — identify root cause before proceeding",
      "Voltmeter at gas valve operator terminals during ignition window: 24VAC = board commanding open; 0VAC = board fault or open safety string",
      "Ohmmeter on igniter element (power off, disconnected): silicon nitride 40–90 Ω; silicon carbide 25–75 Ω; OL = replace igniter",
      "Microamp meter in series with flame sensor during call: 2–6 µA = normal; below 1.5 µA = dirty sensor, poor ground, or failed sensor",
      "Manometer at gas valve inlet test port: natural gas 5–7\" W.C., LP 11–14\" W.C. — confirm pressure before condemning valve",
    ],
    recommendedAction:
      "Triage the failure stage first — (a) no igniter glow, (b) igniter glows but no gas, or (c) burners light then drop out. Each stage has a distinct root cause and repair path. Do not clean the flame sensor and replace the igniter at the same time without identifying which stage failed — it prevents isolating the root cause on a callback.",
    riskNote:
      "Never bypass the limit switch — it is a fire and CO safety device. A tripped limit switch always indicates an underlying airflow, heat exchanger, or mechanical problem. Bypassing it risks heat exchanger failure and carbon monoxide intrusion into the building.",
  },

  {
    id: "heat-pump-reversing-valve",
    title: "Heat Pump Reversing Valve Stuck in Wrong Mode",
    category: "No Heat",
    equipment: ["heat pump", "split system", "rooftop", "rtu"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "mitsubishi", "lg"],
    triggers: ["heat pump cooling on heat", "heat mode but still cool", "blowing cold in heat mode", "cold air in heat mode", "reversing valve", "stuck in cooling", "cooling when set to heat", "wrong mode heat pump", "heat pump not heating", "cold on heat mode"],
    symptomClues: ["heat pump", "reversing", "mode", "still cool", "cooling in heat", "suction", "discharge"],
    failureStage: "startup",
    confidenceBase: 87,
    priority: "high",
    likelyCauses: [
      "Reversing valve solenoid coil burned out — valve physically cannot shift between heating and cooling modes",
      "Reversing valve spool stuck in cooling position due to debris, corrosion, or pressure imbalance",
      "Control board not energizing the reversing valve solenoid on heat call",
    ],
    firstChecks: [
      "Confirm the thermostat is actually calling for HEAT — check wiring and mode settings",
      "Switch between HEAT and COOL modes at the thermostat several times — this can free a mildly stuck spool",
      "Listen at the outdoor unit for a soft 'click' when switching modes — this is the reversing valve shifting; no click indicates solenoid or valve failure",
      "Check if the outdoor unit is absorbing heat (coil cold and pulling heat from ambient) or rejecting heat (coil warm) — wrong behavior confirms valve stuck in wrong position",
    ],
    meterChecks: [
      "Voltmeter at reversing valve solenoid coil terminals during heat call: 24VAC present and valve not shifting = valve mechanical failure",
      "Ohmmeter on solenoid coil with power off: 20–50 ohms is normal; OL means coil is burned out",
      "Manifold gauges: in stuck-cooling condition, suction will be low and discharge high even in heat mode",
    ],
    recommendedAction:
      "Replace the reversing valve solenoid coil first — it is the least expensive component and the most common failure point. If the coil is functional but the valve does not shift, the valve body must be replaced by a licensed technician (this requires refrigerant recovery).",
    riskNote:
      "Operating a heat pump in cooling mode during cold weather (below 40°F ambient) with no refrigerant flow restriction can cause liquid refrigerant to migrate to the compressor, resulting in slugging and compressor failure.",
  },

  {
    id: "electric-heat-strip",
    title: "Electric Heat Strip Failure",
    category: "No Heat",
    equipment: ["air handler", "split system", "heat pump", "electric furnace", "rtu", "rooftop", "rooftop unit", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon", "bryant"],
    triggers: ["electric heat not working", "heat strips not working", "aux heat not working", "emergency heat not working", "blowing cold in heat mode", "electric heat no output", "electric heating not working", "rtu electric heat no heat", "heat kit not working", "electric heat rtu"],
    symptomClues: ["strip", "element", "electric heat", "electric heating", "sequencer", "aux", "emergency heat", "cold air on heat", "heat pump", "heating", "heat stage", "heat kit", "rtu heat"],
    negativeTriggers: ["stays on", "continuous", "stuck closed", "won't turn off", "sequencer stuck", "open element", "element ohms", "staging", "not staging", "high amps", "trips breaker"],
    failureStage: "startup",
    confidenceBase: 84,
    priority: "high",
    likelyCauses: [
      "Burned-out electric heating element — resistance element opens due to age, scale buildup, or overheat event",
      "Failed heat sequencer — sequencers stagger the elements on and off; a failed sequencer leaves one or more stages inoperable",
      "Tripped electric heat limit switch — manual reset required after an overheat event",
    ],
    firstChecks: [
      "Confirm supply voltage at the electric heat terminal block: 240VAC required; low voltage means utility issue",
      "Turn to emergency heat mode (heat pump systems) and check if any heat output occurs — helps isolate strip vs. heat pump",
      "Inspect breaker for the electric heat circuit — electric heat uses a separate 30–60A breaker that may have tripped",
      "Locate and check the manual-reset limit switches on the heat strip assembly — press to reset if tripped",
    ],
    meterChecks: [
      "Ohmmeter across each heating element with power off: normal resistance is 8–15 ohms per element depending on kW rating; OL means element is open",
      "Clamp meter on each element lead during call for heat: zero amps on one element confirms that element or its sequencer is failed",
      "Voltmeter on sequencer output terminals: 240VAC present at input but 0V at output means sequencer failed open",
    ],
    recommendedAction:
      "Test each element and sequencer with an ohmmeter to identify the failed component. Replace only the failed element(s) or sequencer — do not replace the full strip unless multiple elements are failed. Reset all limit switches after repair.",
    riskNote:
      "A failed open element means lost heating capacity. A failed closed element (rare) means the element heats continuously even without a call, risking overheat and fire. Always verify sequencer operation in both directions.",
  },

  // ─── BREAKER / ELECTRICAL ─────────────────────────────────────────────────────

  {
    id: "capacitor-failure",
    title: "Failed Run / Start Capacitor",
    category: "Trips Breaker",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "bryant"],
    triggers: ["capacitor bad", "capacitor failed", "bulging capacitor", "hard start kit", "won't start hard", "compressor hums won't start"],
    symptomClues: ["capacitor", "start", "hum", "trip", "bulge", "swell", "kick start", "hard start", "won't spin", "struggling to start"],
    failureStage: "startup",
    confidenceBase: 90,
    priority: "high",
    likelyCauses: [
      "Run capacitor below rated µF value — compressor and fan cannot develop full starting torque",
      "Start capacitor failed open — start assist not available for hard-starting compressor",
      "Capacitor overheated due to high ambient temperature inside disconnect box or unit compartment",
    ],
    firstChecks: [
      "Inspect the capacitor visually with power off — look for a bulging or domed top, oil leakage, or corrosion on terminals",
      "Confirm whether the capacitor is dual-run type (compressor + fan combined) or separate run and start capacitors",
      "Safely discharge the capacitor using an insulated resistor (10kΩ, 5W) before handling or testing",
      "Check the capacitor label for rated µF and voltage — replacement must be within ±6% µF and equal or greater voltage rating",
    ],
    meterChecks: [
      "Capacitance meter across capacitor terminals after safe discharge: reading below 94% of rated µF = failed; replace immediately",
      "Voltmeter across capacitor during operation (through sight glass if accessible): should be 370–440VAC for a 370V rated cap during runtime",
      "Clamp meter on compressor and fan motor leads: below normal FLA after capacitor replacement confirms additional faults",
    ],
    recommendedAction:
      "Replace the capacitor with an exact-rated (µF and VAC) replacement. Always replace dual-run caps as a unit, not by splicing. After replacement, verify the compressor starts cleanly and fan motor reaches normal speed within 5 seconds.",
    riskNote:
      "Operating a compressor with a weak capacitor dramatically increases starting current and winding temperature on every start cycle. A weak capacitor left in service will fail the compressor within weeks to months — a $400 capacitor saves a $2,000–4,000 compressor.",
  },

  {
    id: "contactor-failed",
    title: "Burned or Pitted Contactor",
    category: "Trips Breaker",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud"],
    triggers: ["contactor burned", "pitted contacts", "chattering contactor", "contactor welded", "unit not energizing", "contactor failed"],
    symptomClues: ["contactor", "pitted", "burned", "chattering", "welded", "contacts", "relay", "clicking rapidly"],
    failureStage: "startup",
    confidenceBase: 85,
    priority: "high",
    likelyCauses: [
      "Pitted or burned contact surfaces causing high resistance — intermittent connection under load",
      "Welded contacts — unit runs even with thermostat off, contactor stuck in closed position",
      "Chattering contactor — low control voltage or worn contact spring causes rapid open/close cycling",
    ],
    firstChecks: [
      "With power off, inspect contact surfaces through the front opening — black, pitted, or cratered surfaces indicate failure",
      "Check if the unit runs continuously with the thermostat off — this confirms welded contacts",
      "Measure control voltage (24VAC) at the contactor coil terminals — below 22VAC causes chattering",
      "Inspect for burn marks, arc flash discoloration, or melted plastic on the contactor body",
    ],
    meterChecks: [
      "Voltmeter across each contact pair with contactor energized: voltage drop above 0.3V indicates high-resistance (pitted) contacts",
      "Voltmeter at contactor coil terminals: must be 24 ±2VAC for reliable operation — below 22VAC causes chatter",
      "Ohmmeter across contacts with power off and contactor manually depressed: above 0.1 ohm indicates pitting",
    ],
    recommendedAction:
      "Replace the contactor — it is a $25–50 part that protects thousands of dollars in compressor and wiring. Never attempt to sand or file contact surfaces; this shortens contact life and leaves debris in the contact gap.",
    riskNote:
      "A welded contactor forces the compressor and condenser fan to run 24/7 regardless of thermostat demand, causing rapid mechanical wear and extreme energy waste. A chattering contactor produces voltage spikes that destroy compressor motor windings.",
  },

  // ─── CONTACTOR COIL ENERGIZED BUT WILL NOT PULL IN ────────────────────────

  {
    id: "contactor-coil-no-pull-in",
    title: "24V at Contactor Coil — Contactor Won't Pull In",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: [
      "24v at contactor won't pull in",
      "24 volts at contactor coil won't close",
      "contactor not pulling in",
      "coil energized won't close",
      "24v at coil contactor won't move",
      "contactor has voltage won't pull",
      "contactor coil has power won't engage",
      "24v coil not pulling in",
      "contactor coil getting voltage won't close",
      "voltage at contactor coil no movement",
      "contactor getting 24v won't close",
      "24 volts coil no pull",
    ],
    symptomClues: [
      "contactor", "coil", "pull in", "won't close", "coil getting voltage",
      "24v", "24 volts", "won't engage", "won't move", "won't pull",
      "voltage at coil", "coil has power", "coil has voltage",
    ],
    negativeTriggers: [
      "no voltage at coil", "no 24v", "no control voltage", "contactor chattering",
      "welded", "stuck closed", "runs constantly",
    ],
    failureStage: "startup",
    confidenceBase: 94,
    priority: "high",
    likelyCauses: [
      "Open contactor coil winding — coil ohms out OL; coil burned open internally and cannot produce the electromagnetic force needed to pull the armature. Replace the contactor.",
      "Contactor plunger mechanically seized — corrosion, debris, or wasp/insect nest in the contactor body prevents the magnetic core from completing its travel even with correct coil voltage. Common after a season of outdoor storage.",
      "Control voltage sagging below pull-in threshold — 24VAC reads correctly at no-load, but sags below 20VAC when the contactor coil draws inrush current; a marginal transformer drops out before pull-in completes.",
      "Wrong coil voltage — replacement contactor installed with a 120VAC coil where a 24VAC coil is required; coil receives correct building voltage but wrong coil rating for the equipment.",
      "Intermittent 24VAC control signal — loose connection at thermostat wiring or board output causes coil to receive voltage momentarily but not hold it long enough for the magnetic circuit to latch.",
    ],
    firstChecks: [
      "STEP 1 — MANUAL PLUNGER TEST (power off): manually push the contactor plunger by hand. It should travel smoothly through its full stroke with a firm spring return. Any roughness, sticking, or inability to reach full closure = mechanical seizure (wasp nest or corrosion inside the body). Replace the contactor.",
      "STEP 2 — OHMMETER THE COIL (power off, one lead disconnected): measure resistance across the coil terminals. Normal 24VAC coil: 20–100 Ω. OL = coil burned open (replace contactor). Near-zero = coil shorted (replace contactor). Normal ohms with mechanical bind = mechanical failure.",
      "STEP 3 — VERIFY CONTROL VOLTAGE UNDER LOAD: with the cooling call active, measure transformer secondary voltage while the contactor is attempting to pull in. Voltage must hold at 24 ±2VAC during the coil's inrush. A marginal transformer sags below 20VAC under the coil load and fails to complete pull-in.",
      "STEP 4 — CONFIRM COIL VOLTAGE RATING: check the label on the contactor body for the coil voltage specification. Should read '24VAC' or '24V' for standard residential/light commercial. A 120VAC or 240VAC coil installed in error receives the wrong voltage — it will either fail to pull in (too low) or hum and overheat (too high).",
      "STEP 5 — MANUAL ENGAGEMENT DIAGNOSTIC: with a call for cooling active, manually push and hold the contactor plunger in the closed position (insulated tool only, power applied). If the unit starts and runs normally, the coil is the fault, not the control circuit upstream.",
    ],
    meterChecks: [
      "Voltmeter at contactor coil terminals with cooling call active: 24 ±2VAC = coil receiving correct voltage; below 20VAC = control voltage sag; 0VAC = control circuit fault (trace upstream before replacing contactor)",
      "Ohmmeter across coil terminals (power off, one lead lifted): 20–100 Ω = coil intact; OL = coil open — replace contactor; near-zero = coil shorted — replace contactor",
      "Voltmeter at transformer secondary under load: confirm voltage holds above 22VAC during contactor pull-in attempt — sag below this = replace transformer",
      "Manual plunger test (power off): full smooth stroke with spring return = mechanically OK; any bind or restriction = replace contactor regardless of coil condition",
    ],
    recommendedAction:
      "Ohmmeter the coil first (power off, one lead disconnected) — an open coil (OL reading) is the most common cause and requires contactor replacement. If the coil ohms normally, perform the manual plunger test for mechanical bind. Verify control voltage holds above 22VAC during the pull-in attempt. Replace the contactor if the coil is open, shorted, or the plunger is mechanically seized.",
    riskNote:
      "Do not bypass the contactor or manually hold it closed as a permanent workaround — the contactor is both the control switching device and the primary overcurrent protection point for the compressor. A bypassed contactor eliminates both overcurrent and control-circuit protection.",
  },

  // ─── NO CONTROL VOLTAGE AT TERMINAL BLOCK ─────────────────────────────────────
  // For "Carrier unit not getting voltage to terminal bar" and similar inputs.
  // Walk the power path from line voltage forward — transformer, fuse, terminal block.

  {
    id: "control-voltage-no-power",
    title: "RTU / Unit — No Control Voltage at Terminal Block",
    category: "No Cool",
    equipment: ["rooftop", "rtu", "packaged unit", "split system", "air handler", "furnace"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "aaon", "daikin", "bryant"],
    triggers: [
      "no voltage at terminal bar",
      "not getting voltage to terminal block",
      "no power at terminal strip",
      "no 24v at terminal bar",
      "no voltage at terminal block",
      "unit not getting power",
      "no voltage to unit",
      "no power to control board",
      "no voltage at control board",
      "24v not reaching unit",
      "no control power",
      "no 24v at unit",
      "unit has no power",
      "terminal bar no voltage",
      "lost control voltage",
      "no control voltage",
      "not getting voltage to terminal",
      "carrier unit not getting voltage",
      "unit not getting voltage",
      "no voltage at unit terminal",
      "no 24v at board",
      "unit dead no voltage",
    ],
    symptomClues: [
      "terminal bar", "terminal block", "terminal strip", "terminal board",
      "no voltage", "no power", "no 24v", "24v absent", "lost power",
      "control board", "control voltage", "no control", "power dead",
      "no incoming power", "getting no voltage", "voltage dead",
    ],
    negativeTriggers: [
      "24v at contactor", "24v at coil", "24v present", "voltage present",
      "has 24v", "getting voltage", "voltage is there", "24v at thermostat",
    ],
    failureStage: "startup",
    confidenceBase: 90,
    priority: "high",
    likelyCauses: [
      "Blown low-voltage control fuse on the unit control board or fuse holder — 3A or 5A glass fuse blown by a wiring short or control circuit overload; leading cause of a completely 'dead' control circuit",
      "Open main line-voltage disconnect or blown line-voltage fuses at the rooftop disconnect — transformer primary has no input power; secondary output is zero even with an intact transformer",
      "Failed 24VAC transformer — primary has correct line voltage but secondary output is 0V; transformer winding failed open internally",
      "Tripped main unit circuit breaker at the distribution panel — all unit functions including the transformer primary are de-energized",
      "Open or corroded connection between transformer secondary and terminal block — a single break in the hot (R) or common (C) conductor kills the entire control circuit",
      "Wiring short in the low-voltage circuit blowing the fuse repeatedly — wire-to-wire short, chafed wire on chassis edge, or shorted thermostat cable continuously blowing the replacement fuse",
    ],
    firstChecks: [
      "1. LINE VOLTAGE FIRST: confirm line voltage (208/230/460V per nameplate) is present at the main disconnect and at the line side of the contactor. A tripped main breaker or blown line-voltage fuse eliminates all power — including transformer primary input — before any low-voltage diagnosis.",
      "2. TRANSFORMER PRIMARY: with line voltage confirmed at the disconnect, measure transformer primary terminals directly — should read line voltage (208/230/460V). If 0V with disconnect closed, trace between disconnect and transformer primary.",
      "3. TRANSFORMER SECONDARY: measure transformer secondary terminals (R to C) with the unit energized — should read 24–28VAC no-load. If primary has voltage and secondary reads 0V, the transformer has failed.",
      "4. LOW-VOLTAGE FUSE: locate the control fuse (glass fuse, 3A or 5A, on the control board or in a holder near the transformer secondary). Remove and test with an ohmmeter — OL = blown. Replace with the same size and rating only.",
      "5. IF FUSE BLOWS AGAIN: disconnect thermostat wires at the unit terminal block and measure R to C, R to Y, R to G with an ohmmeter (power off). Any reading below 5Ω = active wiring short. Reconnect one wire at a time to isolate the shorted circuit.",
      "6. TERMINAL BLOCK VOLTAGE: after confirming transformer output, measure R to C at the unit terminal block — should read 24VAC. Any voltage loss here indicates an open conductor between the transformer secondary and the terminal block.",
    ],
    meterChecks: [
      "Voltmeter at main disconnect line side: confirm 208/230/460V present before any low-voltage diagnosis",
      "Voltmeter at transformer primary terminals: should match line voltage; 0V = primary circuit open (disconnect, fuse, or wiring open before transformer)",
      "Voltmeter at transformer secondary (R to C): 24–28VAC no-load; 0V = transformer failed or primary not energized",
      "Ohmmeter on low-voltage fuse (power off, removed): OL = blown — replace with identical size and investigate cause before restarting",
      "Voltmeter at R and C terminals on unit terminal block: 24VAC = control power present at terminal block; 0V = open between transformer secondary and terminal block",
      "Ohmmeter from R terminal to chassis ground (all thermostat wires removed, power off): below 5Ω = wiring short to ground causing fuse to blow",
    ],
    recommendedAction:
      "Walk the power path in sequence: line voltage at disconnect → transformer primary → transformer secondary → fuse integrity → terminal block. The first measurement that reads zero identifies the fault location. Replace blown fuses only after identifying the root cause — a fuse that blows again immediately confirms an active short in the low-voltage circuit.",
    riskNote:
      "Do not replace the transformer before confirming its primary is receiving line voltage. A tripped breaker or blown upstream fuse is the most common cause of zero secondary output — not a failed transformer. Check the upstream source and the low-voltage fuse before ordering any parts.",
  },

  // ─── 24V AT THERMOSTAT — NO VOLTAGE AT CONTACTOR COIL ────────────────────────
  // For "24V at thermostat but not at contactor" — the Y-circuit path has an open
  // between the thermostat Y output and the contactor coil input.

  {
    id: "low-voltage-path-fault",
    title: "24V at Thermostat — No Voltage at Contactor Coil (Y-Circuit Open)",
    category: "No Cool",
    equipment: ["rooftop", "rtu", "packaged unit", "split system", "heat pump"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon", "bryant"],
    triggers: [
      "24v at thermostat not at contactor",
      "24 volts at thermostat no voltage at contactor",
      "thermostat has 24v contactor doesn't",
      "voltage at stat not at contactor",
      "24v at thermostat but no 24v at unit",
      "thermostat showing 24v no voltage at outdoor unit",
      "stat has power contactor has nothing",
      "24v at thermostat 0 at contactor",
      "24v at stat zero at contactor",
      "power at thermostat none at coil",
      "thermostat has power no voltage at contactor coil",
      "24 volts at stat but nothing at outdoor unit",
      "24v at thermostat no power at unit",
      "voltage present at thermostat not at contactor",
      "stat has 24v nothing at coil",
      "24v at stat not reaching contactor",
      "24v leaving thermostat not arriving at unit",
      "no voltage reaches contactor coil",
      "no voltage reaching contactor coil",
      "24v present at thermostat no voltage at contactor",
      "24v present y call no voltage contactor coil",
      "voltage present at thermostat not reaching contactor",
      "y call no voltage at contactor coil",
      "24v present at y call no voltage reaches contactor",
    ],
    symptomClues: [
      "24v at thermostat", "voltage at stat", "thermostat has power",
      "not at contactor", "not reaching contactor", "contactor has nothing",
      "no voltage at coil", "zero at contactor", "nothing at outdoor",
      "float switch", "low pressure switch", "safety open", "y circuit",
    ],
    negativeTriggers: [
      "24v at contactor coil", "contactor getting 24v", "voltage present at coil",
      "24v at coil won't pull", "coil getting voltage",
    ],
    failureStage: "startup",
    confidenceBase: 91,
    priority: "high",
    likelyCauses: [
      "Open condensate float switch in series with Y circuit — float switch tripped due to high water level in drain pan; blocks all cooling calls until pan is drained and switch resets; most commonly overlooked series device",
      "Open conductor in Y wire between thermostat and unit — long cable runs develop opens at splice points, UV-damaged outdoor sections, or stapled/pinched sections in the wall; continuity test the full run",
      "Control board not passing the Y signal to the outdoor unit — board Y-out relay or output triac failed; 24V at Y-in but 0V at Y-out on the board",
      "Open low-pressure or high-pressure safety switch wired in series with the Y circuit — refrigerant-side pressure fault has opened a series safety; the thermostat is calling but the safety blocks the call",
      "Blown low-voltage fuse breaking the common (C) path — an open C conductor prevents circuit completion; all control voltages read near-zero even though the hot side is intact",
      "Thermostat Y output terminal failed — thermostat display shows cooling call but the internal Y relay has failed; the Y sub-base terminal reads 0V even though thermostat reports 'cooling'",
    ],
    firstChecks: [
      "1. CONFIRM Y SIGNAL AT THERMOSTAT SUB-BASE: with thermostat calling for cool, measure Y to C at the thermostat sub-base screw terminals — 24VAC = thermostat is outputting a call; 0VAC = no Y signal from thermostat (thermostat fault or wiring at thermostat).",
      "2. CHECK CONDENSATE FLOAT SWITCH FIRST: locate any float switch or overflow safety wired in series with the R or Y circuit. A high drain pan level trips the float and blocks cooling — check the drain pan level and test the float switch for continuity. This is the most overlooked open in this fault pattern.",
      "3. TRACE Y WIRE TO INDOOR UNIT: with 24V confirmed at thermostat Y output, measure Y to C at the air handler or furnace terminal block. If 0V, the Y conductor between thermostat and indoor unit has an open — inspect the cable for damage, bad splices, or disconnected terminals.",
      "4. BOARD Y OUTPUT: if the unit has a control board, measure Y-out (or CC) to C on the board during a call — 0V at Y-out with 24V at Y-in = board Y-output relay or triac has failed.",
      "5. PRESSURE SWITCHES IN SERIES: identify any low-pressure or high-pressure switches wired in series with the Y-to-contactor path. Measure across each switch during a call — 24V drop across a switch = that switch is open and blocking the call.",
      "6. OUTDOOR UNIT Y TERMINAL: confirm 24VAC at Y and C at the outdoor unit wiring compartment during a call. 0V here with 24V at indoor board output = open wire between indoor and outdoor units.",
    ],
    meterChecks: [
      "Voltmeter Y to C at thermostat sub-base during call: 24VAC = thermostat generating Y output; 0VAC = thermostat internal fault or no call commanded",
      "Ohmmeter on float switch (power off): OL = switch is open/tripped — drain the condensate pan and retest",
      "Voltmeter Y to C at air handler terminal block: 24VAC = signal reaching indoor unit; 0VAC = open Y wire between thermostat and indoor unit",
      "Voltmeter Y-out (or CC) to C at control board during call: 24VAC = board passing signal; 0VAC = board Y-output relay/triac failed",
      "Voltmeter across each series safety (float switch, low-pressure switch, high-pressure switch) during call: 24VAC drop across any = that device is open and blocking the cooling call",
      "Voltmeter Y to C at outdoor unit control terminals during call: 24VAC = signal reached outdoor unit; 0VAC = open between indoor board output and outdoor unit",
    ],
    recommendedAction:
      "Trace the Y-circuit path from thermostat sub-base output → air handler terminal block → control board Y-out → series safeties (float switch, pressure switches) → outdoor unit Y terminal. Each point must read 24VAC during a call. Check the condensate float switch first — it is the most commonly overlooked break in this circuit and is free to test.",
    riskNote:
      "Do not condemn the thermostat, control board, or contactor until the full Y-circuit is traced with a voltmeter. A tripped condensate float switch, an open wire, or an active pressure safety trip are far more common than a failed board. Always trace the signal path before replacing parts.",
  },

  // ─── COOLING CALL DROPS OUT IMMEDIATELY — LOW-VOLTAGE CONTROL FAULT ──────────
  // For "compressor and condenser fan start and drop out immediately", R-to-Y1
  // jumper tests that cause instant dropout, control voltage collapse, and
  // Y1/Y2 wiring suspects. This fault is ALWAYS a control-circuit issue, never
  // a refrigerant issue — low-pressure switches do not open within 2 seconds of
  // a Y call on a charged system.

  {
    id: "cooling-call-dropout-control-fault",
    title: "Cooling Call Drops Out Immediately — Low-Voltage Control Circuit Fault",
    category: "No Cool",
    equipment: ["rooftop", "rtu", "split system", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon", "bryant"],
    triggers: [
      "r to y1 drops out",
      "jump r to y1 drops out",
      "r jumped to y1 drops out",
      "jumping r to y compressor drops out",
      "compressor drops out immediately",
      "condenser fan drops out immediately",
      "drops out immediately on y1 call",
      "control voltage collapses on y call",
      "control voltage drops when contactor pulls",
      "24v collapses on cooling call",
      "y1 call drops out",
      "cooling call drops out",
      "compressor starts then drops out",
      "fan drops out immediately",
      "controls drop out on cooling call",
      "y1 y2 wiring suspected",
      "y1 miswired",
      "y2 miswired",
      "relay does not energize on y call",
      "compressor and condenser fan drop out immediately",
      "condenser fan drop out immediately",
      "r is jumped to y1 drops out",
    ],
    symptomClues: [
      "r to y1", "y1", "y2", "drops out", "drop out", "drops out immediately",
      "control voltage", "control voltage collapses", "control voltage drops",
      "contactor coil", "wiring suspect", "miswired", "board output",
      "relay does not energize", "24v collapses", "cooling call",
      "immediately", "instantly", "right away", "compressor drops",
      "condenser fan drops", "both drop out", "drop out when",
    ],
    negativeTriggers: [
      "short cycling", "suction pressure drops", "low pressure switch opened",
      "runs for minutes", "after 10 minutes", "after 15 minutes",
      "runs for", "suction pressure low", "low refrigerant",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "high",
    likelyCauses: [
      "Y1/Y2 miswired or crossed leads at thermostat, control board, or outdoor unit terminal strip — staging calls producing unexpected load or conflicting stage signals",
      "Contactor coil shorted or drawing excessive VA — coil inrush pulls transformer secondary voltage below hold-in threshold immediately",
      "Weak or overloaded 24VAC transformer — control voltage collapses when contactor coil load is added to existing secondary loading",
      "Loose or broken common (C) wire — C connection fails under current draw when cooling call is placed",
      "Control board relay/output dropping out under load — Y-output relay on the board opens immediately when contactor coil inrush begins",
      "Safety circuit wired in series with Y opening immediately after call — low-pressure, high-pressure, or freeze switch that was already tripped before the call",
    ],
    firstChecks: [
      "1. MEASURE CONTROL VOLTAGE UNDER LOAD: measure R to C (transformer secondary) during the Y call with a voltmeter set to AC. Voltage must hold at 24 ±2VAC when the contactor coil energizes. A collapse below 20VAC during pull-in = transformer overloaded or C-wire fault.",
      "2. MEASURE Y TO C AT EACH JUNCTION: with a cooling call active, measure Y to C at: (a) thermostat sub-base, (b) indoor board Y-in, (c) indoor board Y-out, (d) outdoor unit Y terminal, (e) contactor coil input. The first point that reads 0V locates the break.",
      "3. VERIFY Y1/Y2 TERMINATIONS: with power off, pull the thermostat and compare Y1/Y2 connections against the OEM low-voltage wiring diagram. Check at the thermostat, control board, and outdoor unit terminal strip. A Y1/Y2 swap creates a staging conflict that causes immediate dropout.",
      "4. OHM THE CONTACTOR COIL: with power off and one coil lead lifted, measure coil resistance. Normal 24VAC coil: 20–100 Ω. Near-zero = coil shorted (drawing excessive VA, loading transformer). OL = coil open (different fault).",
      "5. ISOLATE SERIES SAFETIES: identify every safety wired in series with the Y circuit (low-pressure switch, high-pressure switch, freeze stat, float switch). Measure across each device during a call — 24VAC drop across a switch = that switch is already open before the call.",
      "6. TRANSFORMER VA LOAD TEST: with all loads energized, measure transformer secondary voltage during the Y call. More than 2VAC sag = transformer is at VA capacity — replace with a higher VA unit.",
    ],
    meterChecks: [
      "Voltmeter R to C at transformer secondary during Y call: must hold at 24 ±2VAC; collapse below 20VAC = transformer overloaded or C wire fault",
      "Voltmeter Y to C at thermostat sub-base during call: 24VAC = stat generating call; 0VAC = no Y output from thermostat",
      "Voltmeter Y to C at each junction in sequence (board Y-in, board Y-out, outdoor Y terminal, contactor coil input): first 0VAC reading = location of the open or dropout",
      "Ohmmeter on contactor coil (power off, one lead lifted): 20–100 Ω = normal; near-zero = coil shorted; OL = coil open",
      "Ohmmeter Y1 and Y2 conductor continuity from thermostat to board and board to unit terminal strip: confirm correct wire landed on correct terminal at every point",
      "Voltmeter across each series safety (low-pressure, high-pressure, freeze stat, float switch) during Y call: 24VAC drop across any device = that safety was already open when the call was placed",
    ],
    recommendedAction:
      "Trace the control circuit with a voltmeter — start at transformer secondary (R to C under load) and measure Y to C at each junction toward the contactor coil. The first point that reads 0V during a Y call is where the break or overload is. Verify Y1/Y2 wiring against the OEM diagram before replacing any component. Do not connect manifold gauges or add refrigerant until the control circuit is confirmed intact.",
    riskNote:
      "A cooling call that drops out within 2 seconds of compressor start is almost never a refrigerant fault. Low-pressure switches do not trip this fast on a charged system unless the switch was already open before the call. Misdiagnosing a control circuit fault as low refrigerant leads to refrigerant added to a functional sealed system and the original fault left unresolved.",
  },

  {
    id: "ground-fault-wiring",
    title: "Ground Fault / Wiring Short",
    category: "Trips Breaker",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: [],
    triggers: ["breaker trips immediately", "trips right away", "trips instantly", "burnt wire", "melted wiring", "burning smell", "smoke"],
    symptomClues: ["burning smell", "smoke", "melted", "charred", "burn", "trip", "immediately", "instantly", "ground fault", "short circuit"],
    failureStage: "startup",
    confidenceBase: 88,
    priority: "critical",
    likelyCauses: [
      "Insulation failure in compressor motor windings causing a line-to-ground short",
      "Rodent damage to wiring harness — chewed insulation creates a direct ground fault",
      "Moisture/corrosion in the disconnect box or wiring compartment shorting conductors to ground",
    ],
    firstChecks: [
      "Do NOT reset the breaker again — a breaker tripping on a ground fault is doing its job",
      "Visually inspect all accessible wiring for burn marks, melted insulation, or rodent damage",
      "Check the disconnect box interior for moisture, corrosion, or carbon tracking on terminals",
      "Smell for burnt electrical insulation — a distinct acrid smell distinguishes electrical faults from refrigerant or mechanical issues",
    ],
    meterChecks: [
      "Megohmmeter (megger) at 500V on compressor terminals to ground with power off: below 1 MΩ confirms winding ground fault",
      "Ohmmeter between each phase conductor and equipment ground with circuit isolated: any reading below 1 MΩ = ground fault",
      "Clamp meter cannot diagnose this — the fault must be isolated with an insulation resistance test",
    ],
    recommendedAction:
      "Do not operate this equipment until the fault is located and repaired by a licensed electrician and/or HVAC technician. Ground faults require a megohmmeter to locate properly — insulation resistance testing will identify whether the fault is in the wiring or the compressor motor.",
    riskNote:
      "A persistent ground fault is a fire and electrocution hazard. Resetting the breaker repeatedly on a ground fault risks breaker failure in the closed position, which removes all overcurrent protection from the circuit.",
  },

  // ─── MAIN POWER FUSE OVERCURRENT ─────────────────────────────────────────────
  // Dedicated entry for: "fuse keeps popping / blowing on main power to unit."
  // This is a HIGH-VOLTAGE ELECTRICAL behavior — an overcurrent or dead-short
  // event at the line-voltage level. NOT a surge/lightning event unless storm
  // context is explicitly present.

  {
    id: "main-fuse-overcurrent",
    title: "Main Power Fuse Blowing — Overcurrent / Ground Fault / Dead Short",
    category: "Trips Breaker",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "fuse keeps popping",
      "fuse keeps blowing",
      "fuse pops",
      "fuse blows",
      "blowing fuses",
      "blowing the fuse",
      "keeps blowing fuse",
      "fuse blown",
      "main fuse blowing",
      "fuse on main power",
      "main power fuse",
      "main disconnect fuse blowing",
      "fuse pops immediately",
      "fuse blows on startup",
      "unit keeps blowing fuse",
      "replace fuse blows again",
      "new fuse blows",
      "fuse pops as soon as",
      "fuse pops right away",
    ],
    symptomClues: [
      "fuse", "popping", "blowing", "main power", "disconnect",
      "overcurrent", "dead short", "locked rotor", "grounded",
      "winding", "compressor", "fan motor", "contactor",
    ],
    negativeTriggers: [
      // Storm-related — lightning/surge entries handle those
      "lightning", "lightning strike", "power surge", "surge damage",
      "after lightning", "storm damage", "power outage then",
    ],
    failureStage: "startup",
    confidenceBase: 91,
    priority: "critical",
    likelyCauses: [
      "Grounded compressor motor winding — insulation failed to chassis ground; fuse blows instantly on energization because the compressor draws locked-rotor amps through the ground path; confirm with a megohmmeter before any replacement",
      "Compressor locked rotor drawing LRA continuously — seized or liquid-slugged compressor draws 4–6× nameplate amps until the fuse fails; capacitor failure is the most common cause of a preventable locked-rotor condition",
      "Grounded condenser fan or blower motor winding — motor winding has shorted to frame; the fault current path follows: L1 → motor winding → frame ground → fuse → failure; isolate by disconnecting each motor and testing which reconnection blows the fuse",
      "Dead short in main wiring — chewed, pinched, or rodent-damaged conductors between the disconnect and the unit contactor create a direct line-to-ground short",
      "Contactor contacts welded closed — contactor failed energized; compressor starts immediately on utility restore without a thermostat call and draws LRA on every energization",
      "Undersized fuse — original equipment fuse replaced with wrong amp rating; fuse is sized correctly but the circuit is drawing legitimate overcurrent that must be diagnosed",
    ],
    firstChecks: [
      "1. DO NOT KEEP REPLACING THE FUSE — every fuse replacement without identifying the cause is a diagnostic clue. Record exactly when it blows: on power restore (dead short or grounded winding), after a few seconds (locked rotor), or after 10–20 minutes (thermal overload from sustained overcurrent).",
      "2. ISOLATE BY DISCONNECTION: with power off, disconnect the compressor contactor load-side leads. Restore power — if the fuse holds, the fault is the compressor or a downstream component. If the fuse still blows, the fault is upstream (wiring, disconnect, or contactor).",
      "3. MEGGER THE COMPRESSOR: with all compressor leads isolated and power off, test insulation resistance from each compressor terminal to ground (chassis). Below 1 MΩ at 500V = grounded winding; compressor replacement required. Do not reconnect a grounded compressor.",
      "4. INSPECT CONTACTOR: with power off, visually and mechanically inspect the contactor. If the contacts are welded closed (plunger cannot open), the compressor energizes on every utility restore — replace the contactor before meggering the compressor.",
      "5. CHECK CAPACITOR FIRST BEFORE LOCKED-ROTOR CONCLUSION: a failed run capacitor is the most common cause of compressor locked rotor. A compressor that could start with a good capacitor will draw LRA and blow fuses with a bad one. Replace the capacitor and retest before condemning the compressor.",
      "6. TRACE WIRING FOR DAMAGE: inspect all conductors in the disconnect, wiring compartment, and from the contactor to the compressor and condenser fan for chewing, pinching, abrasion, or burn marks.",
    ],
    meterChecks: [
      "Megohmmeter (500V) from each compressor terminal (C, R, S) to chassis ground with leads isolated: below 1 MΩ = grounded winding; below 0.1 MΩ = hard ground fault",
      "Ohmmeter between line conductors and equipment ground with circuit isolated: near-zero reading = wiring dead short; identify which conductor and at what point it is grounded",
      "Capacitance meter on run capacitor (with power off, leads discharged): more than 6% below nameplate µF = replace before any further testing",
      "Clamp meter on each leg during momentary energization (only if wiring is confirmed intact): sustained LRA (4–6× nameplate RLA) on compressor common = locked rotor",
      "Ohmmeter between compressor terminals C-R, C-S, R-S with power off: OL on any pair = open winding (compressor failure); zero ohms = shorted winding",
      "Ohmmeter on each motor lead to ground (condenser fan and blower, power off): below 0.5 MΩ = motor winding grounded — isolate and replace",
    ],
    recommendedAction:
      "Start with isolation: disconnect loads one at a time to identify which component is causing the overcurrent. Megger the compressor before reconnecting. Replace the capacitor before condemning the compressor for locked rotor. Do not operate until the overcurrent source is confirmed — repeated fuse replacements without diagnosis indicate a persistent short-circuit or ground fault that will damage the wiring and create a fire or electrocution hazard.",
    riskNote:
      "A fuse blowing on main power is a safety protection event — do not bypass or upsize the fuse as a workaround. A grounded compressor winding is an electrocution hazard if the equipment ground path is compromised. A welded contactor energizes the compressor without thermostat control and is both a fire and equipment-damage risk. Diagnose before re-energizing.",
  },

  // ─── CYCLING / INTERMITTENT ───────────────────────────────────────────────────

  {
    id: "high-pressure-lockout",
    title: "High-Pressure Safety Lockout",
    category: "Reset Helps Then Fails Again",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard"],
    triggers: ["high pressure lockout", "pressure switch", "runs then shuts off", "works after reset then fails", "high head pressure", "trips on pressure"],
    symptomClues: ["pressure", "high pressure", "lockout", "reset", "works temporarily", "runs for a while", "shuts off", "trips", "safety", "cutout"],
    failureStage: "cycling",
    confidenceBase: 85,
    priority: "high",
    likelyCauses: [
      "Dirty condenser coil raising head pressure above the high-pressure switch cutout point (typically 400–450 psig on R-410A)",
      "Failed condenser fan motor — no airflow across coil causes rapid head pressure rise",
      "Non-condensables (nitrogen, air) in the refrigerant circuit raising head pressure without increasing capacity",
    ],
    firstChecks: [
      "Time the failure: if the unit fails after 5–15 minutes, high-pressure lockout is the prime suspect",
      "Visually inspect the condenser coil — any blockage will cause high-pressure lockout in warm ambient",
      "Verify the condenser fan is running at full speed during the failure period",
      "Note the ambient temperature: if ambient is above 95°F, the system is being pushed to its design limits",
      "After reset, observe how long until next failure — consistent timing indicates a repeatable load condition",
    ],
    meterChecks: [
      "Manifold gauge set on high side: above 400 psig on R-410A in normal ambient confirms high-pressure condition",
      "Contact thermometer on condenser coil inlet vs. outlet: small temperature difference confirms restricted airflow",
      "Clamp meter on condenser fan motor: low amps during hot ambient indicates motor slipping under thermal load",
    ],
    recommendedAction:
      "Clean the condenser coil thoroughly with approved coil cleaner and a low-pressure rinse. Verify condenser fan is running at rated RPM. If the issue recurs after cleaning, manifold gauge testing is required to check for non-condensables or refrigerant overcharge.",
    riskNote:
      "Repeated high-pressure lockouts rapidly degrade compressor valve integrity — each high-pressure event forces the valves beyond their design limits. A unit that trips more than twice per day on high pressure needs same-day service.",
  },

  // ─── AFTERNOON / AMBIENT-DEPENDENT CAPACITY FAILURE ──────────────────────────

  {
    id: "afternoon-capacity-failure",
    title: "System Only Fails in Afternoon / Hot Weather — Ambient-Dependent Capacity Fault",
    category: "Reset Helps Then Fails Again",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "only fails in afternoon",
      "only trips on hot days",
      "works in morning trips afternoon",
      "fails when it gets hot",
      "only fails on hot days",
      "afternoon only trips",
      "works fine in morning",
      "only shuts off on hot afternoons",
      "trips on hot days not cool ones",
      "fails in heat of day",
      "only a problem when hot outside",
      "works morning but not afternoon",
      "afternoon high pressure lockout",
      "only fails in heat",
      "good in morning bad in afternoon",
    ],
    symptomClues: [
      "afternoon", "morning", "hot day", "hot outside", "high ambient",
      "only when", "works sometimes", "peak hours", "later in day",
      "gets worse as day", "afternoon only", "hot weather",
    ],
    negativeTriggers: ["no heat", "furnace", "burner", "gas valve", "inducer", "immediately", "trips instantly"],
    failureStage: "cycling",
    confidenceBase: 87,
    priority: "high",
    likelyCauses: [
      "Dirty condenser coil — at peak ambient (2–4 PM), the combination of solar heating and a fouled coil pushes head pressure above the high-pressure cutout threshold. The same unit operates normally at 8 AM when ambient is 20°F cooler.",
      "Condenser fan motor slowing under thermal load — motor with worn bearings or a weak capacitor starts fine but slows as it heats up during a sustained afternoon run cycle. Reduced fan speed drives head pressure progressively higher under peak load.",
      "System at design limit — equipment undersized for peak load or installed in an ambient that exceeds the design temperature. Unit performs adequately on mild days but cannot maintain setpoint when outdoor ambient exceeds equipment rating.",
      "Condenser air recirculation — nearby walls, equipment, or solar-heated surfaces recirculate hot discharge air back into the condenser inlet. Recirculation is worst during peak solar load in the afternoon.",
      "Marginal refrigerant charge — low charge performs adequately at low ambient but provides insufficient capacity at peak conditions; system trips on low-pressure or thermal protection when building load is highest.",
    ],
    firstChecks: [
      "TIME AND TEMPERATURE LOG: record the exact time of failure and the outdoor ambient temperature at that moment. 'Only fails after 2 PM on days above 90°F' is the diagnostic fingerprint of a condenser/heat-rejection fault.",
      "SERVICE DURING THE FAILURE WINDOW: arrive on-site in the afternoon during expected failure conditions. A dirty coil that passes casual inspection at 8 AM may clearly show thermal load failure under sustained afternoon operation.",
      "CONDENSER COIL INSPECTION UNDER LOAD: check all four sides with a flashlight during peak ambient. A coil that appears borderline in mild weather may be restricting 25–30% of airflow — enough to cause failure only at peak ambient.",
      "CONDENSER FAN SPEED UNDER SUSTAINED LOAD: clamp-meter the condenser fan during a sustained run cycle. Compare amps at startup vs. after 20 minutes — a fan motor with worn bearings or a marginal capacitor often shows rising or dropping amps over time as it heats up.",
      "CHECK FOR AIR RECIRCULATION: observe where discharge air goes after leaving the condenser top. A south-facing wall, nearby rooftop equipment, or solar-heated surface within 10 feet can cause the condenser to pull in air significantly warmer than ambient — the effect is worst during peak afternoon sun.",
    ],
    meterChecks: [
      "Manifold gauge set during the failure window: high-side above 400 psig on R-410A in ambient below 95°F confirms high head pressure as the fault cause during the afternoon trip",
      "Clamp meter on condenser fan motor (sustained run): compare amps at startup vs. after 15–20 minutes — significant rise or fall indicates bearing wear or capacitor degradation under thermal load",
      "Contact thermometer on condenser discharge air: temperature above ambient + 35°F confirms restricted heat rejection — normal is ambient + 20–30°F",
      "Supply/return delta-T during failure window: below 14°F indicates capacity shortfall (low charge, weak compressor, or coil condition)",
    ],
    recommendedAction:
      "Clean the condenser coil thoroughly and check condenser fan amp draw and speed under sustained load before any refrigerant work. If both are confirmed normal, connect gauges during an afternoon failure event and identify whether the trip is high-pressure (dirty coil / fan), low-pressure (low charge / airflow), or thermal overload (amp draw at trip time). A system failing only in peak ambient conditions may also need a hard-start kit or a refrigerant charge verification.",
    riskNote:
      "A system that 'only fails on hot days' is an early warning of a deteriorating condenser coil, a failing fan motor, or a marginal refrigerant charge. These conditions will progress — what trips on a 95°F day this season will trip on an 85°F day next season. Service before peak season, not during it.",
  },

  // ─── BREAKER TRIPS AFTER RUNNING ─────────────────────────────────────────────

  {
    id: "breaker-trips-after-running",
    title: "Breaker Trips After Running — Runtime Thermal / Overload Fault",
    category: "Trips Breaker",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "breaker trips after running",
      "trips after 10 minutes",
      "trips after startup",
      "trips after warmup",
      "runs then trips breaker",
      "runs for a few minutes then trips",
      "breaker trips while running",
      "trips after a while",
      "runs 10 minutes then trips",
      "works for a while then trips",
      "trips after several minutes",
      "trips after being on",
      "unit runs then breaker trips",
      "breaker trips after it runs",
    ],
    symptomClues: [
      "after running", "after startup", "warmup", "minutes", "while running",
      "runs then", "trips", "breaker", "thermal", "overload", "heat", "temperature",
      "10 minutes", "15 minutes", "after a while", "sustained", "under load",
    ],
    negativeTriggers: [
      "immediately", "instantly", "right away", "trips right when", "trips on startup",
      "won't start", "won't come on", "hums", "locked rotor", "won't spin", "before it starts",
    ],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "high",
    likelyCauses: [
      "High head pressure from dirty condenser coil — compressor draws excessive current under high discharge pressure, eventually tripping thermal overload or breaker after 5–15 minutes",
      "Condenser fan motor overheating under load — motor with worn bearings may start fine but slow as it heats up, reducing airflow and driving head pressure progressively higher",
      "Compressor thermal overload open — compressor windings overheat from sustained high amps or high discharge temperature; thermal protector trips after a consistent run time",
      "Weak or age-fatigued breaker — breaker contacts have pitted or weakened over years of service, tripping at a lower current than rated after being warmed by sustained load",
      "Loose or high-resistance electrical connection at breaker lug, disconnect, contactor, or compressor terminals — connection heats under sustained current, increasing voltage drop and raising amps",
      "Motor bearing drag — increasing mechanical friction raises motor amp draw above rated FLA after the motor warms up and thermal expansion tightens the bearing clearance",
      "Low line voltage under load — voltage sags below nameplate minimum during peak demand, forcing the compressor to draw excess current to maintain capacity",
    ],
    firstChecks: [
      "NOTE THE TRIP TIME: record exactly how many minutes from startup until the breaker trips — consistent timing (5–20 min) points to a thermal/load fault, not a ground fault or locked rotor",
      "IMMEDIATELY AFTER TRIP: feel the compressor housing, condenser coil, and motor housings for excessive heat — the hottest component is the fault location",
      "Inspect the condenser coil for blockage on all four sides — a dirty or blocked coil causes head pressure to build over 5–15 minutes until the compressor hits thermal overload or high-pressure cutout",
      "Verify the condenser fan is running at full speed throughout the run cycle and is not slowing down under load",
      "Inspect all high-current electrical connections (breaker terminals, disconnect lugs, contactor line and load sides) for heat discoloration, carbon tracking, or loose terminations",
      "Check the breaker age and visual condition — a breaker over 15 years old or showing terminal corrosion may trip below its rated amperage when warmed under load",
    ],
    meterChecks: [
      "Clamp meter on compressor lead during operation — compare running amps to nameplate RLA; above 120% of RLA sustained before the trip confirms overload condition",
      "Clamp meter on condenser fan motor lead — amps should be stable near rated FLA; rising amps over time indicate bearing drag",
      "Contact thermometer on breaker body during operation: above 140°F at the breaker body suggests high resistance at the lug or internal contact weakness",
      "Contact thermometer on all lug connections at disconnect and contactor: any connection more than 20°F hotter than adjacent conductors indicates high-resistance joint",
      "Manifold gauge set if available: high-side above 400 psig on R-410A in normal ambient confirms head pressure is the overload source",
      "Voltmeter at compressor terminals under load: below 208V on a 230V circuit confirms voltage drop — check for undersized wire or high-resistance connections upstream",
    ],
    recommendedAction:
      "Do NOT simply replace the breaker — a breaker tripping after sustained operation is responding to a real overcurrent event. Work the sequence: (1) Clean the condenser coil if dirty. (2) Verify condenser fan runs at full speed through the entire run cycle. (3) Clamp-meter the compressor — if amps exceed nameplate RLA, find the overcurrent source before returning to service. (4) Inspect and re-torque all high-current connections. (5) If load is confirmed within spec and the breaker still trips, replace the breaker with an identical-rated device and document the amp reading that triggered the trip.",
    riskNote:
      "Replacing a tripping breaker without identifying the root cause is a fire hazard — if the breaker was protecting against a real overload, installing a higher-rated or identical new breaker without correcting the root cause risks wiring insulation failure or compressor destruction. Always confirm amp draw is within nameplate spec before closing an overcurrent investigation.",
  },

  // ─── MOTOR WON'T START — CAPACITOR CONFIRMED GOOD ────────────────────────────

  {
    id: "motor-no-start-capacitor-good",
    title: "Motor Won't Start — Capacitor Confirmed Good",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: [
      "capacitor tests good but won't start",
      "cap tests good won't start",
      "capacitor good motor won't start",
      "capacitor ok wont start",
      "capacitor fine but won't run",
      "new capacitor still won't start",
      "replaced capacitor still won't start",
      "capacitor good but unit won't start",
      "capacitor reads good won't start",
      "capacitor reads good won't come on",
      "capacitor good won't come on",
      "cap reads good won't come on",
      "capacitor ok won't come on",
      "capacitor fine motor won't come on",
      "capacitor good motor won't come on",
      "checked capacitor it's good still won't start",
      "capacitor reads good",
      "cap reads good",
      "capacitor checked good",
    ],
    symptomClues: [
      "tests good", "tested good", "capacitor good", "cap good", "capacitor ok",
      "capacitor fine", "replaced cap", "new cap", "still won't start",
      "still won't run", "still not starting", "still dead", "open winding",
      "internal overload", "contactor", "no voltage", "no power to motor",
      "won't come on", "won t come on", "still won't come on", "reads good",
      "won't run", "not starting", "motor won't", "motor won t",
    ],
    negativeTriggers: [
      "capacitor bad", "capacitor failed", "capacitor blown", "bulging capacitor",
      "running backwards", "spinning backwards",
    ],
    failureStage: "startup",
    confidenceBase: 92,
    priority: "high",
    likelyCauses: [
      "Open motor winding — C-S, C-R, or R-S winding reads OL on ohmmeter regardless of capacitor condition; motor is internally failed",
      "Contactor not pulling in — no voltage is reaching motor terminals; contactor coil open, contacts pitted open, or 24VAC control signal absent",
      "Internal thermal overload still open — compressor or motor thermal protector tripped and has not cooled enough to reset (can take 30–60 minutes after shutdown)",
      "No line voltage at motor terminals — fuse blown, disconnect open, or breaker tripped upstream of the contactor",
      "Capacitor passes static test but fails under load — marginal capacitors can read within spec on a cold bench test but fail to deliver adequate starting torque at operating temperature and voltage",
      "Loose or corroded motor terminal connection — intermittent or open connection at the compressor terminal block or motor lead splice",
      "Mechanically bound motor shaft — compressor pistons seized or fan shaft physically jammed; motor draws LRA immediately and trips internal overload even with a good capacitor",
    ],
    firstChecks: [
      "IDENTIFY THE MOTOR: which component won't start — compressor, condenser fan motor, or indoor blower motor? Each has a different diagnostic path. The compressor is the most expensive assumption — confirm which motor before proceeding.",
      "VERIFY LINE VOLTAGE: confirm voltage is actually reaching the motor terminals during the start attempt. Zero voltage at motor terminals with a pulled-in contactor = pitted/open contacts. Zero voltage with no contactor movement = control circuit fault (24VAC, fuse, board).",
      "CONTACTOR CHECK: with a call for cooling active, measure 24VAC at the contactor coil. If 24VAC present and contactor is not pulling in = contactor coil failed. If 24VAC is absent = trace control circuit upstream (transformer, board, thermostat wiring).",
      "INTERNAL OVERLOAD RESET: de-energize the unit and allow 30–60 minutes for the internal thermal protector to cool and reset before the next start attempt.",
      "WINDING TEST: with power off, ohmmeter C-S, C-R, and R-S — OL (open loop) on any pairing confirms an open winding and motor failure. Normal readings for most residential compressors are below 5 ohms on each pairing.",
      "MECHANICAL BIND: with power off, attempt to turn the shaft by hand — any resistance, grinding, or inability to rotate confirms mechanical seizure. Do not attempt to power a seized shaft.",
      "CAPACITOR UNDER LOAD: if all voltage, winding, and contactor checks pass — try a new capacitor from a verified source. A capacitor that reads within spec cold may still fail under operating voltage at elevated temperature.",
    ],
    meterChecks: [
      "Voltmeter at motor terminals during start attempt: zero volts = upstream fault (contactor contacts, fuse, breaker, disconnect) — do not condemn motor without confirmed voltage present",
      "Ohmmeter C-S, C-R, R-S terminals with power off: OL on any pair = open winding, motor failed. Record all three readings before ordering parts.",
      "Voltmeter at contactor load-side with coil energized: zero volts across closed contacts = contacts failed; replace contactor",
      "Voltmeter at control transformer output under load: confirm 24 ±2VAC — low control voltage prevents contactor pull-in and mimics motor failure",
      "Clamp meter at first startup attempt: LRA spike with immediate drop to zero = overload tripped (allow cooling and retry); sustained LRA with no overload trip = seized shaft",
      "Megohmmeter at 500VDC from motor terminals to case ground (power off): below 1 MΩ indicates winding-to-ground insulation failure",
    ],
    recommendedAction:
      "A confirmed-good capacitor eliminates one cause but leaves several others. Work the sequence: (1) Confirm line voltage reaches motor terminals — zero load-side voltage at a pulled-in contactor means bad contacts. (2) Ohmmeter all motor winding pairs — an open winding is definitive. (3) Allow 60 minutes de-energized for internal overload to reset, then retry. (4) Check for mechanical bind — shaft must turn freely by hand. (5) If all above pass, replace the capacitor with a new unit (dynamic load failure is possible even when static test is good). Identify which motor (compressor, condenser fan, blower) before ordering any replacement parts.",
    riskNote:
      "Forcing power onto a motor with a seized shaft draws locked-rotor current and burns motor windings within seconds. If the shaft will not turn freely by hand, do not apply power — confirm the source of the mechanical bind before energizing.",
  },

  {
    id: "low-pressure-lockout",
    title: "Low-Pressure Lockout / Short Cycling",
    category: "Reset Helps Then Fails Again",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard"],
    triggers: ["low pressure lockout", "low side pressure", "short cycling", "cycles on off frequently", "cycles rapidly", "suction pressure low", "low pressure safety opens", "opens low pressure safety", "low pressure safety", "trips on low pressure safety", "trips on low pressure", "suction pressure drops below", "suction pressure drops low"],
    symptomClues: ["low pressure", "suction", "short cycle", "rapid cycling", "on off", "cycles every few minutes", "low refrigerant"],
    negativeTriggers: [
      "r to y1", "jumping r to y", "jumped r to y",
      "drops out immediately", "drop out immediately",
      "drops out instantly", "control voltage collapses",
      "control voltage drops when", "wiring suspect", "miswired",
      "relay does not energize", "contactor coil not energized",
      "no voltage at contactor coil", "thermostat wiring suspect",
    ],
    failureStage: "cycling",
    confidenceBase: 83,
    priority: "high",
    likelyCauses: [
      "Low refrigerant charge — suction pressure drops below the low-pressure switch cutout within minutes of compressor startup",
      "Restricted metering device (TXV or orifice) — starves the evaporator and causes suction pressure drop",
      "Frozen evaporator coil restricting refrigerant flow — system short cycles as suction pressure drops",
    ],
    firstChecks: [
      "Count the cycles per hour — more than 6 start/stop cycles per hour on a properly sized system indicates a fault",
      "Listen: if the compressor starts and shuts off within 2–5 minutes consistently, low-pressure cutout is confirmed",
      "Check the air filter — a severely clogged filter simulates refrigerant loss by starving the evaporator",
      "Check for ice on the suction line near the indoor coil — suction line icing confirms low refrigerant or airflow restriction",
    ],
    meterChecks: [
      "Manifold gauge set: suction pressure dropping below 100 psig on R-410A within 5 minutes of compressor startup = low charge or restriction",
      "Superheat measurement at indoor coil: superheat above 25°F suggests low charge; below 5°F suggests TXV flooding",
      "Subcooling at outdoor coil: below 5°F suggests low charge; above 20°F suggests TXV restriction",
    ],
    recommendedAction:
      "Replace the air filter and allow 30 minutes of operation before drawing conclusions. If short cycling continues with a clean filter, refrigerant pressure testing and superheat/subcooling analysis are required to diagnose charge level or metering device fault.",
    riskNote:
      "Short cycling (frequent starts) subjects the compressor to locked-rotor current on every cycle. A compressor that starts 10+ times per hour may fail within days from thermal and electrical stress on the motor windings.",
  },

  // ─── NOISE ────────────────────────────────────────────────────────────────────

  {
    id: "bearing-failure-motor",
    title: "Fan Motor Bearing Failure",
    category: "Noisy Unit",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "air handler", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: ["grinding noise", "squealing noise", "screeching fan", "motor bearing", "fan grinding", "loud fan"],
    symptomClues: ["grinding", "squealing", "screeching", "bearing", "fan", "motor", "getting louder", "belt", "blower"],
    negativeTriggers: ["inducer", "draft motor", "pressure switch", "ignitor", "igniter", "flame sensor", "gas valve", "rollout", "no heat", "furnace", "won't heat", "heat call"],
    failureStage: "runtime",
    confidenceBase: 86,
    priority: "high",
    likelyCauses: [
      "Condenser fan motor bearing failure — bearing lubricant depleted or contaminated",
      "Indoor blower motor bearing failure — prolonged operation with a dirty filter accelerates bearing wear",
      "Belt-driven blower: worn or cracked belt slipping on pulley causing squeal",
    ],
    firstChecks: [
      "Identify whether noise comes from the indoor blower or outdoor condenser fan (test each section independently)",
      "With power off, manually spin the fan blade or blower wheel — any roughness, stiffness, or grinding confirms bearing failure",
      "Inspect belt-driven systems for glazed, cracked, or frayed belts and check belt tension",
      "Listen for the noise to worsen as the motor warms up — thermal expansion worsens bearing clearance issues",
    ],
    meterChecks: [
      "Clamp meter on motor leads during operation: amperage above nameplate FLA indicates motor is working harder due to bearing drag",
      "Contact thermometer on motor housing: above 140°F indicates excessive friction from bearing failure",
      "No additional meter checks required — bearing failure is a mechanical diagnosis",
    ],
    recommendedAction:
      "Replace the failed motor. Fan motors with failed bearings cannot be reliably lubricated or temporarily repaired — the bearing race is already damaged. Confirm replacement motor HP, RPM, shaft diameter, and rotation before ordering.",
    riskNote:
      "A motor with failed bearings will seize completely if operated — typically within hours of the grinding noise starting. A seized motor draws locked-rotor current and will trip the breaker or burn the motor windings, adding cost to the repair.",
  },

  {
    id: "liquid-slugging",
    title: "Refrigerant Liquid Slugging",
    category: "Noisy Unit",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard"],
    triggers: ["gurgling sound", "liquid slugging", "banging on startup", "refrigerant gurgle", "compressor banging"],
    symptomClues: ["gurgling", "banging", "slugging", "startup", "liquid", "refrigerant", "crankcase", "morning startup"],
    failureStage: "startup",
    confidenceBase: 83,
    priority: "high",
    likelyCauses: [
      "Liquid refrigerant migrating to compressor crankcase during off-cycle — dissolves oil and causes foaming on startup",
      "Refrigerant overcharge — excess refrigerant floods the evaporator and returns as liquid to the compressor",
      "No crankcase heater or failed crankcase heater — allows refrigerant migration in cool ambient temperatures",
    ],
    firstChecks: [
      "Check if noise is worst on cold morning startups and improves after a few minutes — classic liquid slugging signature",
      "Inspect for a crankcase heater — a small resistance heater wrapped around the compressor base should be warm to touch before startup",
      "Check if crankcase heater is plugged in or operational",
      "After 30 minutes of operation, listen for noise improvement — if slugging stops, oil is flushing clean",
    ],
    meterChecks: [
      "Ohmmeter on crankcase heater leads with disconnected: 100–400 ohms is typical; OL = heater failed open",
      "Contact thermometer on compressor body after extended off-cycle: below 50°F is cold enough for refrigerant migration",
      "Manifold gauges during startup: suction pressure that is initially high then drops rapidly confirms liquid boil-off",
    ],
    recommendedAction:
      "Install or replace the crankcase heater — this is a low-cost preventive measure. If overcharge is suspected, verify refrigerant charge with subcooling measurement. Do not add a hard-start kit as a substitute — slugging is a refrigerant management issue, not a starting torque issue.",
    riskNote:
      "Liquid slugging is mechanically damaging on every startup — liquid refrigerant is incompressible and can crack compressor valves, pistons, or connecting rods. Repeated slugging leads to compressor failure, typically without warning.",
  },

  // ─── POST-STORM ───────────────────────────────────────────────────────────────

  {
    id: "lightning-surge-damage",
    title: "Lightning / Power Surge Damage",
    category: "After Rain Failure",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: [],
    triggers: ["lightning strike", "power surge", "after lightning", "surge damage", "power outage then failed", "storm damage electrical"],
    symptomClues: ["lightning", "surge", "storm", "power", "outage", "burned", "board", "fuse", "blown fuse", "capacitor", "control board"],
    failureStage: "post-storm",
    confidenceBase: 88,
    priority: "critical",
    likelyCauses: [
      "Induced voltage spike on power lines — damages capacitors, control boards, and compressor motor windings",
      "Direct lightning to the disconnect or unit — immediate catastrophic failure of all electronics",
      "Utility power restoration transient — voltage spike on return from outage exceeds component ratings",
    ],
    firstChecks: [
      "Inspect the low-voltage fuse on the control board (3A or 5A glass fuse) — this is the first component to blow on a surge",
      "Check the run capacitor for a bulging or blown top — capacitors frequently fail on surge events",
      "Inspect the control board for burn marks, cracked components, or carbon tracking",
      "Verify line voltage with a multimeter before attempting restart — confirm utility voltage is stable and within 10% of nameplate",
      "Check the condensate pump and thermostat for damage — surge damage propagates through all low-voltage wiring",
    ],
    meterChecks: [
      "Voltmeter at main disconnect: confirm stable 240VAC (or 208VAC) before any restart attempt",
      "Ohmmeter at compressor terminals to ground (megger preferred): check for surge-induced insulation breakdown",
      "Capacitance meter on run capacitor: surge events frequently lower capacitance below spec",
      "Voltmeter on 24VAC secondary of transformer: confirms transformer integrity",
    ],
    recommendedAction:
      "Replace the low-voltage fuse and capacitor as a starting point — these are the lowest-cost components most likely to have failed. If the system still does not operate after these replacements, control board and compressor testing by a technician is required.",
    riskNote:
      "A surge-damaged compressor that appears to start normally may have compromised insulation that will fail within weeks. If the system experienced a direct lightning event, a full electrical inspection is recommended before relying on the equipment for critical cooling.",
  },

  {
    id: "flood-damage-outdoor",
    title: "Flood / Water Intrusion — Outdoor Unit",
    category: "After Rain Failure",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: [],
    triggers: ["unit flooded", "submerged outdoor unit", "water in unit", "flood damage", "standing water around unit"],
    symptomClues: ["flood", "submerged", "water in", "standing water", "hurricane", "rainwater", "drowned"],
    failureStage: "post-storm",
    confidenceBase: 92,
    priority: "critical",
    likelyCauses: [
      "Water in compressor oil — causes immediate mechanical failure on startup as oil is displaced by water",
      "Water in electrical compartment — shorts control board, contactors, and wiring",
      "Silt and debris clogging condenser coil — restricts airflow to zero effective capacity",
    ],
    firstChecks: [
      "Do NOT power on or attempt to start the unit if it was submerged even partially — this is the most critical rule",
      "Visually assess the water line on the unit — note the highest waterline mark on the cabinet",
      "If the unit was submerged above the compressor base, assume the compressor is contaminated with water",
      "Open the electrical compartment: if any standing water or visible moisture is present, do not apply power",
      "Allow the unit to dry in place for a minimum of 72 hours in dry ambient before any inspection",
    ],
    meterChecks: [
      "Megohmmeter after drying: insulation resistance below 1 MΩ at 500V DC confirms water-contaminated motor or wiring",
      "No other meter tests should be performed until the unit is fully dry and visually inspected",
    ],
    recommendedAction:
      "Contact the equipment manufacturer's warranty line and your insurance carrier before any service is attempted — flood damage to HVAC equipment is typically a total replacement scenario, not a repair. A technician must perform a full inspection before attempting restart on any flooded unit.",
    riskNote:
      "Starting a compressor with water-contaminated refrigerant oil causes immediate catastrophic mechanical failure — water forms hydrofluoric acid in the refrigerant circuit, destroying the entire refrigerant system from inside. No exceptions: do not start a flooded unit.",
  },

  // ─── EQUIPMENT-SPECIFIC ───────────────────────────────────────────────────────

  {
    id: "mini-split-error-code",
    title: "Mini-Split / Multi-Split Error Code",
    category: "No Cool",
    equipment: ["mini-split", "mini split", "ductless", "multi-split", "split system"],
    brands: ["mitsubishi", "daikin", "fujitsu", "lg", "samsung", "panasonic", "pioneer", "gree", "midea", "senville"],
    triggers: ["error code", "e code", "f code", "blinking light", "error light flashing", "error on display", "unit flashing"],
    symptomClues: ["error", "code", "blink", "flash", "display", "indoor unit", "outdoor unit", "communication", "E1", "E2", "E3", "F1", "F2"],
    failureStage: "startup",
    confidenceBase: 89,
    priority: "high",
    likelyCauses: [
      "Communication error between indoor and outdoor unit — wiring fault, board failure, or signal interference",
      "Thermistor (temperature sensor) failure — indoor or outdoor air sensor out of range triggers fault code",
      "Refrigerant flow fault — pressure or temperature sensor detects abnormal refrigerant condition",
    ],
    firstChecks: [
      "Note the exact error code shown on the indoor unit display or the number of LED flashes",
      "Look up the code in the equipment service manual — each manufacturer uses proprietary codes (Mitsubishi P-series codes differ from Daikin F-codes)",
      "Power cycle the unit: disconnect power for 30 seconds, then reapply — clears nuisance codes and confirms persistent faults",
      "Inspect the communication wiring between indoor and outdoor unit — check for pinched, reversed, or disconnected terminals",
      "Check the outdoor unit for running/not-running status — LED flash codes on outdoor board often give additional diagnostic info",
    ],
    meterChecks: [
      "Ohmmeter on indoor thermistor: room temp thermistor should read 5–15 kΩ at 70°F — out-of-range indicates sensor failure",
      "Voltmeter on communication signal line between indoor and outdoor unit: should show a pulsing 12–24VDC signal during operation",
      "Clamp meter on outdoor unit compressor lead during startup attempt: zero amps with a communication fault means outdoor unit never receives run command",
    ],
    recommendedAction:
      "Identify the exact error code using the manufacturer service manual (available as a PDF from the manufacturer's technical site). Address the specific fault indicated — do not attempt generic repairs without identifying the code. Most error codes require a factory-trained technician with manufacturer-specific diagnostic tools.",
    riskNote:
      "Ignoring an active error code and forcing the unit to run by bypassing the fault can cause compressor damage, refrigerant contamination, or PCB damage in multi-stage inverter compressor systems. These are expensive repairs that are not covered under warranty if caused by improper operation.",
  },

  {
    id: "ptac-not-cooling",
    title: "PTAC / Through-Wall Unit — Not Cooling",
    category: "No Cool",
    equipment: ["ptac", "pthp", "through-wall", "wall unit", "hotel unit", "motel unit"],
    brands: ["ge", "amana", "friedrich", "carrier", "weil-mclain", "lg", "samsung"],
    triggers: ["PTAC not cooling", "wall unit not cooling", "hotel unit not cooling", "through wall unit", "room unit not cooling"],
    symptomClues: ["ptac", "pthp", "wall unit", "hotel", "motel", "guest room", "through wall", "sleeve", "chassis"],
    failureStage: "runtime",
    confidenceBase: 84,
    priority: "medium",
    likelyCauses: [
      "Dirty evaporator or condenser coils — PTACs are notorious for coil fouling in hospitality environments",
      "Failed compressor or capacitor — PTAC compressors are small hermetic units that frequently fail after 5–8 years",
      "Mode selection error — unit may be in FAN ONLY or HEAT mode",
    ],
    firstChecks: [
      "Pull the chassis from the sleeve (unplug first) and inspect both coils — PTACs in hotel rooms collect carpet fibers and debris",
      "Clean both evaporator (indoor-side) and condenser (outdoor-side) coils with a coil brush and low-pressure rinse",
      "Verify the control is set to COOL mode and fan speed is not set to OFF",
      "Check for error codes on the control panel display",
      "Confirm the unit is not in lockout mode from a power event — some models require a 5-minute delay after a reset",
    ],
    meterChecks: [
      "Clamp meter on compressor common leg: zero amps during cooling call confirms compressor or capacitor failure",
      "Capacitance meter on run capacitor: most PTACs use a small 1.5–5 µF run capacitor that can be replaced easily",
      "Voltmeter at the outlet/supply: confirm 120VAC or 208/240VAC depending on model",
    ],
    recommendedAction:
      "Clean both coils thoroughly before any electrical diagnosis — dirty coils are the primary failure mode in PTACs. If cleaning restores cooling, schedule a full fleet PTAC PM program. If compressor or capacitor has failed, replacement of the chassis (not the sleeve) is the standard repair approach for hospitality applications.",
    riskNote:
      "Hotels operating non-cooling rooms during peak season risk guest satisfaction and health concerns. In facilities where PTACs provide the only cooling, failure during summer months requires same-day service or room relocation.",
  },

  // ─── BLOWER MOTOR HUMS BUT WON'T START ────────────────────────────────────────
  // Dedicated entry for "blower hums won't spin" — the specific hum-no-rotation
  // pattern points primarily to a failed run capacitor (PSC) or mechanical jam.
  // The scoring engine boosts this entry and penalizes the general failure entry
  // when "hums" or "buzzes" context is detected.

  {
    id: "blower-motor-hum-capacitor",
    title: "Indoor Blower Motor Hums But Won't Start — Capacitor / Mechanical Fault",
    category: "No Cool",
    equipment: ["air handler", "split system", "furnace", "rooftop", "rtu", "fan coil"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon", "bryant"],
    triggers: [
      "blower motor hums but won't start",
      "blower hums won't spin",
      "indoor fan hums but doesn't run",
      "blower motor humming not spinning",
      "blower buzzes won't start",
      "indoor fan buzzes won't run",
      "blower hums then trips",
      "blower humming not running",
      "blower hums but won't turn",
      "air handler fan hums no airflow",
      "blower motor hum no movement",
      "fan hums but won't run",
      "blower just hums",
      "blower hums no spin",
      "indoor blower hums",
      "blower hum no air",
      "blower motor hums",
      "blower hums",
      "fan hums won't start",
      "blower buzzes",
    ],
    symptomClues: [
      "hums", "humming", "buzzes", "buzzing", "hum", "buzz",
      "blower", "indoor fan", "air handler fan", "supply fan",
      "won't spin", "won't turn", "no spin", "no rotation",
      "capacitor", "blower capacitor", "run cap", "locked",
    ],
    negativeTriggers: [
      "inducer", "condenser fan", "outdoor fan", "compressor hums",
      "no heat inducer", "furnace hums",
    ],
    failureStage: "startup",
    confidenceBase: 90,
    priority: "high",
    likelyCauses: [
      "Failed run capacitor (PSC motors) — hum with no rotation is the textbook capacitor-failure symptom; the motor windings energize but lack phase-shift current to develop starting torque; most common and cheapest fix",
      "Blower wheel jammed or obstructed — debris (sock, insulation, tape) in the blower housing prevents wheel rotation; motor energizes and hums at locked-rotor current until thermal overload trips",
      "Thermal overload tripped from prior overheating — motor overheated during a previous locked-rotor event; internal thermal overload opens; motor hums without rotating; allow 20–30 minutes to cool and reset",
      "Open start or run winding — one motor winding has failed; the intact winding energizes (causing hum) but starting torque cannot be developed without both windings",
      "Seized motor shaft bearings — bearing failure has locked the shaft; motor draws locked-rotor current and hums until thermal protection trips",
    ],
    firstChecks: [
      "1. TURN OFF POWER IMMEDIATELY — a humming, stalled motor draws 4–6× normal locked-rotor current. Every second it runs without spinning burns the winding insulation. Cut power at the disconnect or breaker now.",
      "2. RUN CAPACITOR FIRST (most common cause, lowest cost): with power off, discharge the capacitor, remove it, and test µF with a capacitance meter. More than ±6% below nameplate = replace the capacitor. This resolves the majority of blower-hum calls.",
      "3. INSPECT FOR WHEEL OBSTRUCTION: with power off, manually spin the blower wheel by hand through the filter access or service panel. The wheel must rotate freely through a full 360° with light hand pressure. Any binding, catching, or inability to turn = wheel is jammed or shaft is seized.",
      "4. ALLOW THERMAL OVERLOAD TO RESET: if the capacitor tests within spec and the wheel spins freely, de-energize the unit for 20–30 minutes to allow the internal thermal overload (if tripped) to cool and reset. Attempt one restart — if the motor runs normally, the overload had tripped from a prior event.",
      "5. MOTOR WINDING TEST: with power off, ohmmeter on the motor terminals — test C-to-R, C-to-S, and R-to-S. OL (open loop) on any pair = failed winding; motor must be replaced.",
      "6. ECM MOTORS DO NOT USE CAPACITORS: an ECM motor that hums without spinning has a failed motor module or drive board — do not apply the capacitor test to an ECM motor; follow OEM diagnostic procedure.",
    ],
    meterChecks: [
      "Capacitance meter on run capacitor: compare measured µF to nameplate — more than ±6% below nameplate = failed capacitor; a capacitor at 50% of rated value causes this exact symptom",
      "Clamp meter on blower motor lead during hum (1–2 seconds only, then remove power): 4–6× FLA = locked-rotor confirmed; do not sustain — destroys windings",
      "Ohmmeter on motor windings with power off: OL on any C-S, C-R, or R-S pair = failed winding — motor replacement required",
      "Voltmeter at blower motor terminals with call active: 120VAC or 240VAC = voltage reaching the motor correctly; 0V = upstream fault (board relay, wiring, or contactor)",
    ],
    recommendedAction:
      "Turn off power immediately to prevent winding damage. Test the run capacitor first — this resolves the majority of blower-hum calls at minimal cost. If the capacitor is within spec, spin the blower wheel by hand to confirm it is clear, then allow 30 minutes for the thermal overload to reset. Only test motor windings if the capacitor is good and the wheel is unobstructed. An ECM motor hum requires OEM diagnostic procedure, not a capacitor test.",
    riskNote:
      "A motor humming at locked-rotor current for more than 30–60 seconds will overheat and burn its windings. Repeatedly re-energizing a jammed or seized motor destroys it permanently. Turn off power before diagnosing — every additional power cycle on a stalled motor reduces the chance of motor salvage.",
  },

  {
    id: "blower-motor-failure",
    title: "Indoor Blower Motor Failure",
    category: "No Cool",
    equipment: ["air handler", "split system", "furnace", "rooftop", "rtu", "fan coil"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: ["no airflow", "blower not running", "fan not blowing", "no air from vents", "indoor fan stopped", "blower motor failed"],
    symptomClues: ["airflow", "blower", "fan", "air", "vents", "registers", "indoor unit", "motor", "no air", "nothing blowing"],
    negativeTriggers: ["inducer", "draft motor", "condenser fan", "outdoor fan", "no heat", "furnace", "gas valve", "rollout", "ignitor", "igniter", "hums", "humming", "buzzes", "buzzing"],
    failureStage: "startup",
    confidenceBase: 87,
    priority: "high",
    likelyCauses: [
      "Failed ECM or PSC blower motor — motor windings failed or motor control module (for ECM motors) burned out",
      "Seized blower bearings — motor overheats and trips thermal overload",
      "Failed run capacitor (PSC motors) — motor cannot develop starting torque",
    ],
    firstChecks: [
      "Confirm the thermostat FAN setting is on AUTO and COOL is selected — rule out a settings issue",
      "Listen at the air handler: if compressor is running outdoors but no airflow is felt at registers, blower is the fault",
      "Attempt to manually spin the blower wheel through the filter slot with power off — any stiffness indicates seized bearings",
      "Check the control board for a lit fault LED or error code indicating blower failure",
      "Inspect the run capacitor on the blower motor (PSC motors only — ECM motors do not use run capacitors)",
    ],
    meterChecks: [
      "Voltmeter at blower motor leads during call for cooling: 120VAC or 240VAC present with motor not running confirms motor failure",
      "Ohmmeter on PSC motor windings: OL reading on any winding confirms motor failure",
      "Clamp meter on blower lead: zero amps despite voltage present confirms motor or module failure",
      "For ECM motors: proprietary diagnostic tool or control board LED codes are the most reliable diagnostic path",
    ],
    recommendedAction:
      "Replace the blower motor. For ECM motors, confirm whether the motor, the module (separate replaceable component on some models), or the control board is the failed component before ordering — ECM motor modules are often the failed part and are less expensive than the full motor assembly.",
    riskNote:
      "Running the refrigerant system without indoor airflow will freeze the evaporator coil within 15–20 minutes and return liquid refrigerant to the compressor. The outdoor unit should be turned off immediately if the blower is not operating.",
  },

  {
    id: "economizer-failure",
    title: "RTU Economizer Fault — Stuck Damper",
    category: "No Cool",
    equipment: ["rooftop", "rtu", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "aaon", "daikin", "goodman"],
    triggers: ["economizer stuck", "outside air damper", "damper stuck open", "damper stuck closed", "economizer fault", "outside air problem", "economizer stuck open hot air", "hot air from economizer", "economizer open causing hot air", "outside air flooding hot air", "hot supply air economizer", "economizer hot air", "damper open hot air", "economizer blowing hot air"],
    symptomClues: ["economizer", "damper", "outside air", "OA", "fresh air", "mixed air", "enthalpy", "actuator"],
    failureStage: "runtime",
    confidenceBase: 83,
    priority: "medium",
    likelyCauses: [
      "Damper actuator failed — motor burned out or potentiometer feedback failed, leaving damper in last position",
      "Damper stuck open on a hot humid day — allows uncontrolled outside air load, overwhelming cooling capacity",
      "Economizer controls (enthalpy sensor, OA thermostat) failed — sending incorrect open/close commands",
    ],
    firstChecks: [
      "Locate the economizer damper on the RTU (typically at the return air section) — visually confirm its position",
      "If damper is fully open on a hot day: this alone can prevent the unit from reaching setpoint",
      "Check the economizer controller for fault lights or error codes",
      "Manually set the economizer to minimum position (manually override the actuator) to determine if the refrigerant system can maintain setpoint",
      "Inspect the outside air enthalpy or temperature sensor — corroded or failed sensors cause incorrect damper commands",
    ],
    meterChecks: [
      "Voltmeter at actuator control signal: 0–10VDC or 2–10VDC depending on manufacturer; signal in range with no actuator movement = actuator failed",
      "Ohmmeter on actuator motor terminals: OL = motor winding open",
      "Voltmeter on enthalpy sensor output: compare to sensor spec sheet for the ambient conditions",
    ],
    recommendedAction:
      "Manually override the economizer damper to minimum position to restore cooling capacity immediately. Schedule actuator and controls replacement as a follow-up. Do not leave the damper manually overridden long-term — economizer operation is required by energy codes in many jurisdictions.",
    riskNote:
      "A stuck-open economizer on a 95°F, 70% RH day can add 20–40% additional cooling load to the RTU. This causes the unit to run continuously, overheat, and enter high-pressure lockout. In commercial kitchens or spaces with high exhaust, a stuck-closed economizer can cause pressurization issues.",
  },

  {
    id: "thermostat-control-fault",
    title: "Thermostat / Controls Intermittent Fault",
    category: "Reset Helps Then Fails Again",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["honeywell", "ecobee", "nest", "johnson controls", "siemens", "carrier", "trane"],
    triggers: ["works sometimes", "intermittent cooling", "random shutoff", "thermostat problem", "intermittent heat", "works then stops randomly"],
    symptomClues: ["intermittent", "random", "sometimes works", "thermostat", "controls", "wiring", "loose wire", "low voltage"],
    failureStage: "intermittent",
    confidenceBase: 78,
    priority: "medium",
    likelyCauses: [
      "Loose or corroded thermostat wiring terminal — intermittent control signal causes nuisance shutdowns",
      "Faulty thermostat — internal relay or temperature measurement fails intermittently",
      "Transformer output voltage fluctuating — 24VAC drops under load causing control circuit drop-outs",
    ],
    firstChecks: [
      "Check the thermostat display for loss of power or blank screen events — this is a key indicator of control voltage issues",
      "Inspect each thermostat wiring terminal for loose connections, corrosion, or strands touching adjacent terminals",
      "Verify a consistent 24–26VAC from the transformer secondary under load (thermostat calling for cooling)",
      "Swap to a known-good thermostat temporarily to isolate whether the fault follows the thermostat or stays with the unit",
    ],
    meterChecks: [
      "Voltmeter at thermostat sub-base terminals: must hold 24 ±2VAC on all control terminals during operation — a dip below 22VAC confirms low control voltage",
      "Voltmeter at transformer secondary: measure under load vs. no-load — more than 2V drop indicates a failing transformer or overloaded control circuit",
      "Resistance check on thermostat cable at all terminals with thermostat removed: any reading above 1 ohm per conductor indicates corroded or undersized wiring",
    ],
    recommendedAction:
      "Re-terminate all thermostat wiring with fresh cuts, confirm all terminals are fully seated, and replace the transformer if its output drops more than 2V under load. If the fault persists with new wiring, replace the thermostat.",
    riskNote:
      "Intermittent control voltage faults cause nuisance lockouts that are difficult to diagnose remotely. In a commercial building, repeated unexplained shutdowns during business hours often indicate a failing transformer — a $40 part that prevents thousands in tenant complaints and lost productivity.",
  },

  {
    id: "vrf-fault",
    title: "VRF / VRV System Communication or Capacity Fault",
    category: "No Cool",
    equipment: ["vrf", "vrv", "variable refrigerant flow", "variable refrigerant volume", "multi-split"],
    brands: ["daikin", "mitsubishi", "lg", "samsung", "carrier", "trane", "york", "panasonic"],
    triggers: ["VRF fault", "VRV fault", "indoor unit not cooling", "VRF communication error", "some indoor units not working", "VRF capacity issue"],
    symptomClues: ["vrf", "vrv", "variable refrigerant", "indoor unit", "outdoor unit", "branch box", "refnet", "communication"],
    failureStage: "runtime",
    confidenceBase: 82,
    priority: "high",
    likelyCauses: [
      "Communication bus fault — noise, wiring fault, or failed module on the RS-485 or proprietary network",
      "Refrigerant distribution imbalance — one branch of the VRF system starved due to branch box or valve fault",
      "Outdoor unit capacity limit reached — building load exceeds system rated capacity at current ambient",
    ],
    firstChecks: [
      "Record the exact fault code from the outdoor unit controller and branch box (if equipped)",
      "Identify which indoor units are failing and which are operating — a pattern of failures (all on one branch vs. random) indicates a distribution fault",
      "Confirm the outdoor unit is running and not in a fault or protection mode",
      "Inspect the communication wiring for all indoor units on the failed branch — the address assignments and wiring order must match the system configuration",
    ],
    meterChecks: [
      "Voltmeter on communication bus terminals: 12–30VDC pulsing signal should be present; flat voltage indicates bus fault",
      "Resistance check on communication wiring with system off: above 100kΩ between signal and ground indicates open/broken bus wire",
      "Manufacturer-specific diagnostic tool or BMS connection is required for full VRF system diagnosis",
    ],
    recommendedAction:
      "VRF system diagnosis requires manufacturer-certified technicians with proprietary diagnostic software. Do not attempt to manually adjust refrigerant distribution valves or branch box settings without the manufacturer's commissioning software. Contact the manufacturer's commercial service desk.",
    riskNote:
      "Incorrect intervention on a VRF system — such as adding refrigerant without proper weighing-in, or manually overriding branch box valves — can damage the inverter compressor and void the warranty. VRF equipment warranties typically require factory-certified service.",
  },

  {
    id: "runs-constantly-contactor",
    title: "Stuck Contactor — Unit Runs Continuously",
    category: "Runs Constantly",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud"],
    triggers: ["won't turn off", "runs all the time", "never shuts off", "contactor welded", "runs continuously", "won't stop running"],
    symptomClues: ["won't stop", "never turns off", "thermostat off but running", "contactor", "welded", "always on"],
    failureStage: "runtime",
    confidenceBase: 85,
    priority: "high",
    likelyCauses: [
      "Welded contactor contacts — contact surfaces fused together by an arc flash event",
      "Thermostat wiring short causing continuous signal to the contactor coil",
      "Stuck relay on the control board continuously energizing the contactor coil",
    ],
    firstChecks: [
      "Turn the thermostat to OFF — if the outdoor unit continues to run, the contactor is welded or a wiring short exists",
      "Turn the thermostat fan from AUTO to OFF — if the air handler fan continues, there may be an air handler wiring fault",
      "Turn off power at the disconnect to confirm the contactor is the issue, not a wiring short causing a phantom signal",
      "With disconnect off, inspect the contactor for fused contact surfaces (contacts stuck in closed position)",
    ],
    meterChecks: [
      "Voltmeter at contactor coil terminals with thermostat off: if 24VAC is present at coil with thermostat off, wiring short exists",
      "Voltmeter across contactor contacts with disconnect off and contacts manually opened: if contacts cannot be opened by hand, they are welded",
    ],
    recommendedAction:
      "Replace the contactor immediately — operating with a welded contactor runs the compressor 24 hours a day regardless of building occupancy or demand. This causes rapid mechanical wear, extremely high energy bills, and compressor failure within weeks.",
    riskNote:
      "A system with a welded contactor will consume full electrical load 24/7. In a commercial building, this can add $500–$2,000 per month per unit to the electric bill. Additionally, continuous operation without rest cycles causes lubrication failure in the compressor.",
  },

  {
    id: "weak-cooling-low-charge",
    title: "Gradual Refrigerant Loss — Slow Leak",
    category: "Weak Cooling",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: ["gradually less cool", "used to cool better", "takes longer than before", "worse every summer", "adding refrigerant every year"],
    symptomClues: ["gradual", "worse over time", "last summer", "used to", "slowly", "less cooling", "not as cold as before"],
    failureStage: "runtime",
    confidenceBase: 82,
    priority: "medium",
    likelyCauses: [
      "Slow refrigerant leak that has progressively reduced system charge over multiple seasons",
      "Leak at Schrader valve cores — gradual loss through valve cores that were never properly capped",
      "Micro-leak at copper-to-brass fittings due to vibration and thermal cycling fatigue",
    ],
    firstChecks: [
      "Review service history — if refrigerant has been added multiple times, there is definitely a leak that was never repaired",
      "Check service port caps — they should be brass, not plastic; plastic caps do not seal against slow valve core leaks",
      "Measure the temperature split (supply vs. return) and compare to manufacturer performance charts for current conditions",
      "Look for oil staining around all refrigerant connections — oil always follows the refrigerant leak path",
    ],
    meterChecks: [
      "Manifold gauge set: compare measured pressures to manufacturer charts for current ambient — below-spec suction confirms low charge",
      "Superheat and subcooling measurements: low subcooling (below 8°F) and high superheat (above 15°F) together confirm undercharge",
      "Electronic leak detector survey of all joints, service ports, and indoor coil connections",
    ],
    recommendedAction:
      "The leak must be found and repaired before adding refrigerant — adding refrigerant to a leaking system is an EPA violation under Section 608 and only delays the problem. Schedule a full leak search, repair, and verified charge to nameplate specifications.",
    riskNote:
      "Systems that are repeatedly topped off with refrigerant without locating the leak release refrigerant into the atmosphere (an EPA Section 608 violation) and mask a compressor-damaging undercharge condition each time the refrigerant depletes. The leak repair cost is always far less than a compressor replacement.",
  },

  // ─── REFRIGERATION MEASUREMENTS / PSYCHROMETRICS ──────────────────────────

  {
    id: "ref-high-superheat",
    title: "High Superheat — Evaporator Starved / Low Refrigerant Feed",
    category: "Refrigerant Imbalance",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "chiller", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard", "copeland"],
    triggers: [
      "high superheat", "superheat too high", "superheat elevated",
      "superheat reading high", "superheat is high", "superheat above",
      "evaporator starved", "starved evaporator",
    ],
    symptomClues: ["superheat", "evaporator", "txv", "metering device", "refrigerant feed", "suction superheat", "coil starved", "low suction", "suction pressure low"],
    failureStage: "runtime",
    confidenceBase: 88,
    priority: "high",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Low refrigerant charge — insufficient refrigerant mass flow starves the evaporator, driving suction superheat high",
      "Restricted or failed TXV / EEV metering device — valve not opening fully, throttling refrigerant feed to the coil",
      "Clogged filter drier — partial restriction on the liquid line starves the metering device",
      "Restricted liquid line or line set undersized — pressure drop across the line reduces feed to the coil",
    ],
    firstChecks: [
      "Measure suction line temperature at the indoor coil outlet and suction pressure at the service port — subtract saturation temperature from suction line temperature to get superheat",
      "Normal operating superheat range: 6–14°F at the evaporator for a fixed-orifice system, 8–18°F for TXV systems; above 20°F indicates a feed problem",
      "Inspect sight glass for bubbles — bubbles at the sight glass confirm flash gas, pointing to low charge or filter drier restriction",
      "Check for frost or ice on the suction line closer to the indoor coil but not further out — high superheat with icing suggests restriction before the coil",
      "Feel the filter drier surface — significant temperature drop across the drier (more than 3°F) confirms partial restriction",
    ],
    meterChecks: [
      "Manifold gauge set: compare suction pressure to manufacturer superheat charts; low suction + high superheat = undercharge or metering restriction",
      "Temperature clamp on suction line at coil outlet: subtract saturation temp from line temp; above 20°F is diagnostic",
      "Temperature drop across filter drier: greater than 3°F delta = restricted drier — replace immediately",
      "Subcooling measurement at liquid line service port: low subcooling (below 8°F) combined with high superheat confirms undercharge rather than restriction",
    ],
    recommendedAction:
      "Do not add refrigerant without first ruling out a filter drier restriction or TXV fault — adding charge to a restricted system overloads the high side. Check subcooling first; if below 8°F and there is no restriction, add refrigerant incrementally to target specifications. Replace filter drier if drop across it exceeds 3°F.",
    riskNote:
      "Sustained high superheat overheats compressor discharge valves and motor windings. Compressor manufacturers specify maximum continuous suction superheat — exceeding this by 5°F or more over an extended period accelerates valve wear and causes early compressor failure.",
  },

  {
    id: "ref-low-superheat",
    title: "Low Superheat — Floodback / Overfeeding Risk",
    category: "Refrigerant Imbalance",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard"],
    triggers: [
      "low superheat", "superheat low", "superheat too low", "superheat below",
      "flooding back", "floodback", "refrigerant flooding", "overfeeding refrigerant",
      "liquid floodback", "suction line cold and sweating", "liquid returning to compressor",
    ],
    symptomClues: ["superheat", "floodback", "flooding", "liquid refrigerant", "suction line sweating", "suction sweating", "txv hunting", "overfeed", "overcharge", "high suction", "suction pressure high", "suction high"],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "critical",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Refrigerant overcharge — excess liquid refrigerant floods the evaporator and returns to the compressor as liquid",
      "Failed or stuck-open TXV / EEV — valve passing too much refrigerant into the evaporator",
      "Insufficient evaporator airflow — low airflow causes the coil to absorb refrigerant without fully vaporizing it",
      "Loss of TXV bulb charge — bulb charge failure causes valve to open fully, flooding the coil",
    ],
    firstChecks: [
      "Measure suction superheat immediately — below 5°F at the evaporator outlet is confirmed floodback territory",
      "Inspect the suction line from the indoor coil to the outdoor unit — sweating along the full length of the suction line (unusual for normal operation) indicates liquid is traveling back",
      "Check the evaporator filter — severely restricted airflow can cause low superheat by reducing the load on the refrigerant",
      "Listen for liquid slugging sounds at compressor startup — a gurgling or banging sound confirms liquid is reaching the compressor",
      "Check TXV bulb attachment — the sensing bulb must be tightly clamped to the suction line with no air gap",
    ],
    meterChecks: [
      "Temperature clamp on suction line at compressor inlet: below 20°F above saturation temperature confirms floodback risk",
      "Manifold gauges: high suction pressure combined with low superheat confirms overcharge or open metering device",
      "Clamp meter on compressor: low amperage relative to nameplate RLA during a floodback event suggests liquid is reducing compression work",
      "Subcooling check: above 20°F subcooling on R-410A system with normal charge suggests overcharge",
    ],
    recommendedAction:
      "Reduce refrigerant charge if overcharge is confirmed via subcooling measurement. If TXV is stuck open, replace the TXV and sensing bulb assembly. Do not allow the compressor to continue operating with confirmed floodback — liquid refrigerant strips compressor oil film and causes immediate mechanical damage.",
    riskNote:
      "Liquid floodback is one of the most destructive conditions for a compressor — liquid refrigerant is incompressible. Even brief liquid slugging can crack valve reeds, break connecting rods, and damage piston rings. A compressor that has experienced repeated floodback events will typically fail within weeks.",
  },

  {
    id: "ref-high-subcooling",
    title: "High Subcooling — Liquid Line Restriction / Overcharge",
    category: "Refrigerant Imbalance",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard"],
    triggers: [
      "high subcooling", "subcooling high", "subcooling too high", "subcooling elevated",
      "liquid line restriction", "filter drier restricted", "overcharge", "refrigerant overcharged",
      "subcooling reading high", "subcooling above spec",
    ],
    symptomClues: ["subcooling", "liquid line", "filter drier", "overcharge", "sight glass", "liquid line restriction", "high liquid pressure"],
    failureStage: "runtime",
    confidenceBase: 86,
    priority: "high",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Refrigerant overcharge — excess refrigerant backs up in the condenser, increasing liquid subcooling above design",
      "Liquid line restriction at the filter drier — restriction raises pressure and subcooling upstream of the restriction",
      "TXV stuck closed — liquid refrigerant cannot pass the metering device, backing up and raising subcooling upstream",
      "Undersized or kinked liquid line — flow restriction raises high-side liquid temperature relative to saturation",
    ],
    firstChecks: [
      "Measure subcooling at the liquid line service port: subtract the measured liquid line temperature from the condensing saturation temperature (read from the high-side gauge). Normal R-410A subcooling: 8–18°F — above 20°F warrants investigation",
      "Feel the filter drier: if the outlet side is noticeably colder than the inlet side (more than 3°F), the drier is restricted",
      "Check for a restricted or kinked liquid line between the condenser and the metering device",
      "Verify refrigerant charge history — if refrigerant was recently added without subcooling verification, overcharge is likely",
      "Observe suction superheat alongside subcooling — high subcooling + high superheat together strongly indicate a restriction between the condenser and evaporator",
    ],
    meterChecks: [
      "Temperature clamp on liquid line at service port + high-side gauge pressure: subcooling = saturation temp (from pressure chart) minus measured liquid line temp",
      "Temperature drop across filter drier: use two clamp thermometers on inlet and outlet — above 3°F drop = restricted drier",
      "Manifold gauge: high-side pressure significantly above the design chart for ambient temperature confirms high head from overcharge or restriction",
      "Suction superheat: if superheat is high alongside high subcooling, restriction is likely; if superheat is normal/low, overcharge is more likely",
    ],
    recommendedAction:
      "If filter drier restriction is confirmed (temperature drop), recover refrigerant, replace the filter drier, recharge to specification, and verify subcooling. If overcharge is suspected, carefully recover refrigerant in small increments until subcooling is within manufacturer specification.",
    riskNote:
      "A restricted filter drier starves the metering device and evaporator of refrigerant, causing high suction superheat and compressor overheating. Continued operation with a blocked drier will cause compressor failure. A contaminated drier also indicates refrigerant circuit contamination (moisture or acid) that requires full system flush and acid neutralization.",
  },

  {
    id: "ref-low-subcooling",
    title: "Low Subcooling — Low Charge / Flash Gas Risk",
    category: "Refrigerant Imbalance",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard"],
    triggers: [
      "low subcooling", "subcooling low", "subcooling too low", "subcooling below spec",
      "flash gas", "flash gas in liquid line", "subcooling reading low", "low charge subcooling",
      "bubbles in sight glass", "sight glass bubbles", "sight glass cloudy",
    ],
    symptomClues: ["subcooling", "flash gas", "sight glass", "low charge", "bubbles", "low refrigerant", "undercharge"],
    failureStage: "runtime",
    confidenceBase: 85,
    priority: "high",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Low refrigerant charge — insufficient liquid refrigerant in the condenser to produce adequate subcooling",
      "Flash gas formation in the liquid line — refrigerant partially vaporizes before reaching the metering device, reducing capacity",
      "Condenser heat rejection problem reducing liquid sub-cooling — high ambient with a dirty or blocked condenser coil",
      "Refrigerant leak — gradual charge loss is the most common cause of progressively falling subcooling",
    ],
    firstChecks: [
      "Measure subcooling at the liquid line service port: below 5°F indicates near-zero liquid subcooling — flash gas is forming in the liquid line",
      "Inspect the sight glass: bubbles or a streaky (cloudy) sight glass confirms flash gas in the liquid line",
      "Perform a leak survey of all refrigerant joints, service ports, coil connections, and brazed fittings with an electronic leak detector",
      "Review service records — if refrigerant has been added previously without a leak repair, the system has a confirmed leak",
      "Measure suction superheat alongside subcooling: low subcooling + high superheat = undercharge confirmed",
    ],
    meterChecks: [
      "Manifold gauge set: low suction pressure consistent with low charge; low high-side pressure indicates low total refrigerant mass",
      "Temperature clamp on liquid line: subcooling (saturation temp minus liquid line temp) below 5°F confirms low charge or flash gas",
      "Sight glass inspection: bubbles = flash gas; solid and clear = adequate liquid supply",
      "Electronic leak detector survey at all service ports, valve stems, brazed joints, and indoor coil connections",
    ],
    recommendedAction:
      "Do not add refrigerant without first completing a leak search — adding refrigerant to a leaking system is an EPA violation and a temporary fix at best. Locate and repair all leaks, replace the filter drier after any repair, and recharge to manufacturer subcooling specification.",
    riskNote:
      "Flash gas in the liquid line reduces system capacity by 10–30% and causes erratic metering device behavior. Sustained low-charge operation eventually destroys the compressor as the low refrigerant mass reduces motor cooling. The leak must be repaired, not masked with additional refrigerant.",
  },

  {
    id: "ref-high-head-pressure",
    title: "High Head Pressure — Condenser Heat Rejection Problem",
    category: "High Head Pressure",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard"],
    triggers: [
      "high head pressure", "head pressure high", "head pressure elevated", "discharge pressure high",
      "high discharge pressure", "condenser heat rejection", "heat rejection problem",
      "head pressure too high", "head pressure above", "condensing pressure high",
    ],
    symptomClues: ["head pressure", "discharge pressure", "condensing pressure", "condenser", "high pressure", "heat rejection", "ambient", "non condensable"],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "high",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Dirty or blocked condenser coil — fouled fins restrict airflow, raising condensing temperature and pressure",
      "Failed condenser fan motor — no airflow across the coil causes rapid head pressure rise",
      "Non-condensables (air, nitrogen) in the refrigerant circuit — non-condensables raise head pressure without adding to capacity",
      "Refrigerant overcharge — excess refrigerant floods the condenser and raises head pressure",
      "High ambient temperature with equipment operating at design limits — verify system is sized for current ambient",
    ],
    firstChecks: [
      "Compare measured high-side pressure to the manufacturer's performance chart for current outdoor ambient temperature — a pressure 20+ psig above chart is diagnostic",
      "Inspect the condenser coil on all sides — hold a flashlight through the fins; blocked or severely fouled fins will be immediately visible",
      "Verify the condenser fan is running at full speed; a fan that has slipped or lost speed reduces airflow without obvious failure",
      "Check for recirculation of hot discharge air — nearby walls, equipment, or debris deflectors can re-introduce discharge air into the coil inlet",
      "Confirm the refrigerant circuit has not been contaminated with non-condensables after recent service",
    ],
    meterChecks: [
      "Manifold gauge set high side: compare to manufacturer performance chart — above 400 psig on R-410A in normal ambient (below 95°F) confirms high head",
      "Clamp meter on condenser fan motor: below rated FLA indicates motor is slipping under heat load",
      "Contact thermometer on condenser coil discharge air: significantly above ambient + 30°F confirms restricted heat rejection",
      "Subcooling measurement: high subcooling with high head pressure suggests overcharge or non-condensables",
    ],
    recommendedAction:
      "Clean the condenser coil with approved coil cleaner and low-pressure rinse (inside-out). Verify condenser fan is at full speed. If head pressure remains elevated after cleaning, recover the refrigerant, purge non-condensables (if air contamination is suspected), and recharge to specification.",
    riskNote:
      "High head pressure dramatically accelerates wear on compressor discharge valves — each high-pressure event forces the valve plate beyond design limits. A system that consistently operates 50+ psig above design head pressure will experience valve failure within one to two seasons.",
  },

  {
    id: "ref-low-suction-pressure",
    title: "Low Suction Pressure — Evaporator Starvation / Airflow / Low Charge",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "aaon", "daikin", "american standard"],
    triggers: [
      "low suction pressure", "suction pressure low", "suction low", "low suction",
      "suction dropping", "suction below spec", "suction pressure dropping",
      "suction pressure too low", "low suction line pressure", "evaporator starvation",
    ],
    symptomClues: ["suction pressure", "suction", "low pressure", "evaporator", "airflow", "charge", "txv", "metering", "filter drier", "psig"],
    failureStage: "runtime",
    confidenceBase: 86,
    priority: "high",
    negativeTriggers: ["no heat", "furnace", "burner", "ignitor", "igniter", "gas valve", "inducer", "rollout"],
    likelyCauses: [
      "Low refrigerant charge — insufficient refrigerant mass reduces suction pressure and evaporator saturation temperature",
      "Restricted airflow across the evaporator — dirty filter, failed blower, or blocked return air starves the coil of heat load",
      "Restricted metering device (TXV or fixed orifice) — insufficient refrigerant feed to the evaporator",
      "Clogged filter drier — restriction on the liquid line reduces refrigerant flow to the metering device",
      "Frozen evaporator coil — ice buildup blocks airflow and reduces heat absorption, causing suction pressure to fall",
    ],
    firstChecks: [
      "Compare suction pressure to manufacturer's performance chart for current indoor conditions — on R-410A, suction below 100 psig at design airflow warrants investigation",
      "Replace the air filter first — a severely clogged filter reduces evaporator heat load and mimics low refrigerant symptoms exactly",
      "Verify indoor fan is running at full speed — low blower speed reduces heat load on the coil and lowers suction pressure",
      "Check the suction line for ice accumulation near the indoor coil — suction line icing confirms the coil is running too cold from low refrigerant or low airflow",
      "Feel the filter drier surface for a temperature drop — a temperature drop of 3°F or more confirms liquid line restriction",
    ],
    meterChecks: [
      "Manifold gauge set, suction side: on R-410A, normal suction is 115–135 psig at 70–80°F return air — below 100 psig is low",
      "Suction superheat at the coil: superheat above 20°F with low suction pressure confirms undercharge or restriction",
      "Temperature drop across filter drier: above 3°F means replace the drier before adding refrigerant",
      "Clamp meter on indoor blower motor: below rated FLA may indicate slipping motor or failed capacitor reducing airflow",
    ],
    recommendedAction:
      "Replace the air filter and verify indoor fan speed before any refrigerant work — airflow issues are the most common and least expensive cause of low suction pressure. If airflow is confirmed normal and suction is still low, perform a superheat/subcooling analysis to determine if the issue is undercharge, metering device restriction, or filter drier blockage.",
    riskNote:
      "Operating with sustained low suction pressure causes the evaporator coil to freeze. Once frozen, liquid refrigerant returns to the compressor (floodback), stripping the compressor oil film and causing immediate mechanical damage. Shut the system to FAN ONLY mode if suction pressure cannot be corrected promptly.",
  },

  // ─── LOW SUCTION — AIRFLOW RESTRICTION (POST FILTER CHANGE OR COIL) ──────────

  {
    id: "low-suction-airflow-restriction",
    title: "Low Suction Pressure — Airflow Restriction (Filter MERV / Coil / Blower)",
    category: "No Cool",
    equipment: ["split system", "rooftop", "rtu", "heat pump", "air handler", "packaged unit"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "aaon"],
    triggers: [
      "low suction after filter change",
      "changed filter suction dropped",
      "filter replaced suction low",
      "new filter still low suction",
      "suction dropped after filter",
      "just changed filter low pressure",
      "low suction restricted airflow",
      "filter restriction low suction",
      "suction low dirty coil",
      "low suction dirty filter",
      "airflow restriction low suction",
      "static pressure high low suction",
      "dirty evap coil low suction",
      "low suction poor airflow",
      "low suction blower issue",
      "low suction pressure normal head pressure",
      "low suction pressure with normal head",
      "suction pressure dropping evaporator freezing",
      "evaporator beginning to freeze low suction",
      "low suction evaporator freezing",
      "suction low evaporator beginning to freeze",
    ],
    symptomClues: [
      "filter", "new filter", "changed filter", "replaced filter", "airflow",
      "static pressure", "low airflow", "dirty coil", "evap coil", "blower",
      "restriction", "plugged", "low suction", "merv",
      "evaporator", "beginning to freeze", "freeze", "suction pressure",
    ],
    negativeTriggers: [
      "overcharge", "txv fault", "subcooling high", "no heat", "furnace", "burner",
    ],
    failureStage: "runtime",
    confidenceBase: 88,
    priority: "high",
    likelyCauses: [
      "Filter MERV rating too high after replacement — a MERV 13+ filter installed on a system designed for MERV 8 dramatically increases static resistance; suction pressure drops and the coil begins to freeze within minutes of operation",
      "Installed filter collapsing under static pressure — thin or budget filters fold inward under blower negative pressure, partially or fully blocking the airflow path; visible as a bowed filter face during operation",
      "Dirty evaporator coil — surface contamination on the coil face acts as an additional restriction beyond the filter; common on systems with no pre-filter or with high carpet-fiber and dust loads",
      "Blower speed or belt issue — a PSC motor on a low-speed tap, a slipping or broken belt on a belt-drive system, or an ECM programmed at incorrect CFM causes low airflow regardless of filter condition",
      "Damper partially closed during or after maintenance — a zone or balancing damper was disturbed during filter access and left partially closed; easily overlooked and often blamed on refrigerant",
    ],
    firstChecks: [
      "AIRFLOW BEFORE REFRIGERANT — DO NOT ADD CHARGE YET: low suction from restricted airflow produces high superheat and low suction pressure that is identical to undercharge on the gauges. Adding refrigerant to an airflow-restricted system will overshoot the charge when airflow is restored.",
      "CHECK THE FILTER MERV RATING: read the MERV number on the installed filter and compare it to the equipment OEM recommendation (typically MERV 8–11 for residential equipment, MERV 8–13 for light commercial). A MERV 13 filter in a system rated for MERV 8 can reduce airflow by 20–40%.",
      "INSPECT FOR FILTER COLLAPSE: with the system running, visually inspect the filter face — any visible inward bowing means the filter is collapsing under static pressure. Replace with a rigid-frame filter or step down one MERV rating.",
      "MEASURE EXTERNAL STATIC PRESSURE (ESP): use a digital manometer at the blower section inlet and outlet. Compare total ESP to the equipment nameplate maximum static pressure or blower performance curve. ESP above 0.5\" W.C. on a 2–3 ton residential system indicates a restriction.",
      "INSPECT THE EVAPORATOR COIL FACE: use a flashlight through the filter slot or access panel to inspect the coil face. More than 10–15% surface coverage with dirt or debris requires coil cleaning before any refrigerant diagnosis.",
      "VERIFY BLOWER OPERATION: confirm the blower is on the correct speed tap (multi-speed PSC) or programmed CFM (ECM). A blower running on a low-speed tap or low-CFM ECM setting can mimic a refrigerant undercharge condition completely.",
    ],
    meterChecks: [
      "Digital manometer for external static pressure: above 0.5\" W.C. on a typical 2-ton split system = restriction present; compare to equipment nameplate maximum static or blower curve",
      "Anemometer at supply registers: spot-check CFM against design; below 350–400 CFM/ton indicates an airflow deficit regardless of gauge readings",
      "Suction superheat at the coil outlet: superheat above 20°F with confirmed adequate airflow = low charge; if superheat normalizes after restoring airflow, airflow was the cause — not undercharge",
      "Clamp meter on blower motor: compare measured amps to nameplate FLA; below rated amps with correct voltage may indicate a slipping belt, low-speed tap, or ECM at minimum speed",
    ],
    recommendedAction:
      "Confirm the filter MERV rating matches OEM recommendation and verify the filter is not collapsing under static. Measure external static pressure. If ESP is elevated, trace and correct the restriction before any refrigerant work. After restoring airflow, measure suction superheat — if it normalizes, airflow was the root cause. Only proceed to refrigerant diagnosis if suction pressure remains low with confirmed adequate airflow and clean coil.",
    riskNote:
      "Adding refrigerant to a system with low suction caused by airflow restriction will overcharge the system. When airflow is later restored (filter cleaned, coil cleaned, damper opened), suction pressure rises and the system operates with excess refrigerant — causing high discharge pressure, high amp draw, and potential liquid floodback to the compressor. Confirm airflow first, always.",
  },

  // ─── HEATING SEQUENCE ─────────────────────────────────────────────────────────

  {
    id: "inducer-motor-fault",
    title: "RTU Inducer Motor Not Starting — Pre-Ignition Sequence Fault",
    category: "No Heat",
    equipment: ["rooftop", "rtu", "gas heat", "packaged unit", "gas pack", "furnace"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "inducer not starting", "inducer won't start", "inducer motor not running",
      "inducer not running", "draft motor not starting", "inducer motor failed",
      "inducer dead", "inducer motor not working", "inducer does not come on",
      "no inducer", "draft inducer not starting", "inducer motor won't run",
    ],
    symptomClues: [
      "inducer", "draft", "pressure switch", "pre-ignition", "won't initiate",
      "no ignition sequence", "heat call", "w terminal", "inducer motor",
      "draft motor", "venting", "flue",
    ],
    failureStage: "startup",
    confidenceBase: 91,
    priority: "high",
    negativeTriggers: ["grinding", "squealing", "bearing", "vibration", "noise", "rattling"],
    likelyCauses: [
      "Failed inducer motor — winding open or shorted, or bearing seized preventing rotation",
      "Failed inducer run capacitor — motor hums but cannot develop starting torque",
      "Control board not energizing the inducer output — fault code or open safety in the pre-inducer circuit",
      "Open rollout switch or high-limit switch blocking board from initiating the inducer stage",
      "Pressure switch not closing after inducer starts — caused by blocked flue venting, collapsed pressure tubing, or cracked pressure port",
    ],
    firstChecks: [
      "1. Verify heat call at control board: confirm W terminal reads 24VAC with thermostat in HEAT mode",
      "2. Read active fault code on board LED or unit display — fault code will often name the failed safety or component directly",
      "3. Before the inducer stage, all safeties must be closed: check rollout switches and high-limit switch with a voltmeter — any voltage drop across a switch means it is open (tripped)",
      "4. During a heat call, check voltage at the inducer motor output terminals — 120VAC (or 240VAC per unit spec) must be present for the motor to run",
      "5. If voltage is present at inducer terminals and motor does not run: test the run capacitor with a capacitance meter; if capacitor is within spec, test motor windings with an ohmmeter — OL on any winding confirms motor failure",
      "6. If inducer runs but pressure switch does not close: inspect pressure switch tubing for blockage or disconnection, verify the flue/vent path is clear and unobstructed, test the switch directly across its terminals",
    ],
    meterChecks: [
      "Voltmeter at W terminal on control board during heat call: 24VAC confirms thermostat call is reaching the board",
      "Voltmeter at inducer motor output leads during heat call: 120VAC present with motor not running = motor or capacitor failure",
      "Capacitance meter on inducer run capacitor: compare to nameplate µF rating — more than ±6% out of spec, replace capacitor",
      "Ohmmeter on inducer motor windings with power off: OL = open winding (motor failed); near-zero ohms = shorted winding",
      "Voltmeter in series across rollout and limit switches: 24VAC drop across any switch = that safety is open/tripped",
      "Voltmeter across pressure switch terminals with inducer running: switch should close (0V drop) within 5–10 seconds of inducer reaching full speed",
    ],
    recommendedAction:
      "Follow the six-step sequence: verify heat call → read fault code → check safeties → confirm voltage at inducer → test capacitor and motor → test pressure switch and venting. Replace the first component found out of spec before proceeding further.",
    riskNote:
      "Never bypass the inducer pre-purge cycle or the pressure switch. These interlocks prevent unburned gas accumulation in the heat exchanger before ignition. Bypassing them creates a combustion explosion risk and potential carbon monoxide intrusion into the occupied space.",
  },

  // ─── GAS HEAT SUB-FAULT DIFFERENTIATION ───────────────────────────────────

  {
    id: "gas-heat-ignitor-glows-no-flame",
    title: "Gas Furnace — HSI Glows But No Flame (Gas Delivery Failure)",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "igniter glows no flame", "ignitor glows but no ignition", "hsi glows no gas",
      "igniter red hot no fire", "glowing igniter no heat", "ignitor glowing no flame",
      "glow rod red but no flame", "igniter glows nothing lights", "hot surface igniter no flame",
      "igniter glowing no ignition", "hsi red no burner", "glows but won't light",
    ],
    symptomClues: [
      "igniter", "ignitor", "hsi", "glow", "glowing", "no flame", "no gas", "gas valve",
      "gas pressure", "gas flow", "manual shutoff", "burner", "crossover",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "high",
    negativeTriggers: ["inducer", "pressure switch", "blower", "rollout"],
    likelyCauses: [
      "Closed manual gas shutoff valve upstream of the unit — most commonly missed first check",
      "Low inlet gas pressure — supply pressure at manifold below minimum (typically 5–7\" W.C. for natural gas, 11\" for LP)",
      "Failed gas valve solenoid — 24VAC present at valve but valve not opening (coil open or stuck valve body)",
      "Dirty or plugged burner crossover ports — gas does not propagate across all burners",
      "Gas valve operator not receiving 24VAC — open limit string, failed board relay, or no control voltage reaching valve",
    ],
    firstChecks: [
      "1. Visually confirm manual gas shutoff valve at the unit is fully open (handle parallel to pipe)",
      "2. During ignition sequence, use a voltmeter to confirm 24VAC at gas valve operator terminals — if 0V, board is not commanding it open",
      "3. Check inlet gas pressure with a manometer at the upstream test port — natural gas should be 5–7\" W.C., LP should be 11–14\" W.C.",
      "4. Observe all burners during a call — if one or two light but others do not carry over, crossover ports are plugged or burners are misaligned",
      "5. Attempt a manual gas valve reset if applicable, then observe ignition sequence again",
    ],
    meterChecks: [
      "Voltmeter at gas valve operator terminals during heat call: 24VAC = board commanding open; 0VAC = board fault or open limit string",
      "Manometer at gas supply inlet test port: natural gas 5–7\" W.C., LP 11–14\" W.C. — low pressure confirms supply problem",
      "Voltmeter at board limit string input terminal: 24VAC present confirms safeties are all closed and board can energize valve",
      "Ohmmeter on gas valve solenoid coil (power off): 10–50 ohms is normal; OL = coil burned open; replace valve",
    ],
    recommendedAction:
      "Confirm manual shutoff valve is open, verify 24VAC at gas valve during call, measure inlet pressure with a manometer. If voltage is present at the valve and pressure is correct, the gas valve operator is likely failed and needs replacement.",
    riskNote:
      "Do not assume the igniter is working correctly just because it glows — verify gas supply before condemning any component. A missed closed manual shutoff is the single most common cause of this symptom.",
  },

  {
    id: "gas-heat-ignitor-no-glow",
    title: "Gas Furnace — Inducer Runs But HSI Does Not Glow (Ignition Circuit Fault)",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "igniter not glowing", "hsi not heating up", "ignitor not glowing",
      "inducer runs no igniter", "igniter won't glow", "hsi not working",
      "no glow from igniter", "draft motor runs no ignition", "no hot surface ignition",
      "ignitor cold no heat", "inducer on igniter dead", "igniter not lighting",
    ],
    symptomClues: [
      "inducer", "igniter", "ignitor", "hsi", "glow", "no glow", "limit", "board",
      "120v igniter", "ignition circuit", "limit string", "open limit",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "high",
    negativeTriggers: ["no flame", "gas valve", "pressure switch stuck", "rollout"],
    likelyCauses: [
      "Open (failed) hot surface igniter — silicon carbide or silicon nitride element cracked; reads OL on ohmmeter",
      "No 120VAC power reaching the igniter — open high-limit switch, rollout switch, or board igniter relay not energizing",
      "Open limit string — series chain of limit/rollout/pressure switches has an open contact; board blocks ignition stage",
      "Control board igniter relay failed — board receives heat call and runs inducer but cannot energize igniter output",
      "Ignition control module failure — ignition timing module not sending ignite command after pressure switch proves",
    ],
    firstChecks: [
      "1. Read the board fault code — most boards flash LED codes that directly identify which safety tripped or which circuit failed",
      "2. Walk the limit string: voltmeter in series across each safety (rollout, high-limit, pressure switch) — any switch showing 24VAC drop is open",
      "3. During heat call, check for 120VAC at the igniter harness connector — voltage present with no glow confirms igniter is failed",
      "4. With power off, ohmmeter across igniter: 40–90 ohms normal for silicon nitride; silicon carbide 25–75 ohms; OL = failed open",
      "5. Confirm the pressure switch proved closed before igniter stage — if switch did not prove, board correctly withholds igniter power",
    ],
    meterChecks: [
      "Voltmeter at igniter harness plug during call for heat: 120VAC present, no glow = igniter failed open",
      "Ohmmeter across igniter terminals (power off): silicon nitride 40–90 Ω, silicon carbide 25–75 Ω; OL = replace igniter",
      "Voltmeter across each limit/rollout switch in series: 24VAC drop across any switch = that safety is open",
      "Voltmeter at board IND/IGNITER output during call: 120VAC not present with inducer running = board output relay failed",
    ],
    recommendedAction:
      "Read the board fault code first — it will often name the tripped safety directly. Then walk the limit string with a voltmeter. If all safeties are closed and 120V is present at the igniter but no glow, replace the igniter. If voltage is absent at the igniter with all safeties closed, the board's igniter relay is failed.",
    riskNote:
      "Do not bypass any limit or rollout switch to 'test' the igniter — a tripped safety is protecting against a real hazard. Identify and correct the root cause of the tripped safety before restoring ignition.",
  },

  {
    id: "gas-heat-flame-dropout",
    title: "Gas Furnace — Burners Light Then Flame Drops Out After Seconds",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "burners light then shut off", "flame drops out", "lights then goes out",
      "flame dropout", "flame proves then off", "fires then shuts off",
      "burner lights for 2 seconds", "ignites then cuts out", "flame sense dropout",
      "flame sensor lockout", "short cycling heat", "lights then locks out",
      "burner shuts off immediately", "flame carryover", "flame rectification",
    ],
    symptomClues: [
      "flame sensor", "flame rod", "lockout", "seconds", "dropout", "carryover",
      "ground", "microamp", "rectification", "polarity", "burner", "lights",
    ],
    failureStage: "runtime",
    confidenceBase: 95,
    priority: "high",
    negativeTriggers: ["igniter not glowing", "no gas", "inducer"],
    likelyCauses: [
      "Dirty flame sensor rod — carbon or oxidation coating prevents ion current from completing the flame rectification circuit",
      "Poor chassis ground — flame rectification requires a complete circuit through the burner ground back to the board; missing ground causes false dropout",
      "Reversed line polarity at unit — hot and neutral swapped; flame rectification circuit works on half-wave AC and is polarity-sensitive",
      "Weak or marginal flame — low gas pressure, dirty burners, or partial crossover gives a flame too thin to produce adequate ion current",
      "Flame carryover issue — flame does not propagate properly to the burner where the flame rod is positioned",
      "Failed flame sensor or board flame circuit — sensor reads okay cold but breaks down thermally under operating heat",
    ],
    firstChecks: [
      "1. Remove the flame sensor rod and clean with fine steel wool (do not use sandpaper — it embeds abrasive in the rod coating)",
      "2. Use a microamp meter in series with the flame sensor circuit during a call — less than 1.5 µA confirms sensor or ground issue",
      "3. Check chassis ground: verify a continuous ground path exists from the burner assembly back to the board chassis ground terminal",
      "4. Check line polarity at the unit disconnect with a hot-neutral tester — reversed polarity directly causes intermittent flame sensing failure",
      "5. Observe the burner flame during the ignition window — thin, yellow, or non-continuous flame indicates low gas pressure or dirty burners",
    ],
    meterChecks: [
      "Microamp meter in series with flame sensor circuit during call: 2–6 µA = normal; below 1.5 µA = failed sensing; below 0.5 µA = certain lockout",
      "Ohmmeter on flame sensor rod (cool, disconnected): OL = open rod, replace; near-zero = shorted rod, replace",
      "Hot/neutral tester at unit disconnect: confirms correct line polarity; reversed polarity causes false flame dropout",
      "Manometer at gas manifold during call: natural gas manifold pressure 3.5\" W.C., LP 10\" W.C. — low reading = insufficient flame for rectification",
    ],
    recommendedAction:
      "Clean the flame sensor rod first — this resolves approximately 40% of flame dropout calls at zero parts cost. If dropout continues, measure microamp signal during operation. If below 1.5 µA with clean sensor, check ground continuity and line polarity before condemning the board.",
    riskNote:
      "A flame sensor that tests acceptable cold may fail hot due to hairline cracks in the ceramic insulator. If the unit passes cold testing but still drops out after several seconds of operation, suspect the ceramic insulator and replace the sensor. Do not allow the unit to repeatedly attempt ignition without finding root cause — repeated lockout cycling can overheat the heat exchanger.",
  },

  {
    id: "gas-heat-immediate-blower",
    title: "Gas Furnace — Blower Starts Immediately on Heat Call (Limit or Relay Fault)",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "blower starts immediately heat", "fan comes on right away heat",
      "blower on before heat", "fan starts with heat call", "immediate blower heat mode",
      "blower no delay heat", "fan before burners", "blower runs immediately",
      "blower starts instantly heat call", "fan relay stuck",
      "blower immediately on heat call", "blower on with heat call", "fan on immediately heat",
      "blower starts before ignition", "blower comes on instantly",
      "blower starts immediately", "fan starts immediately heat", "blower immediately on",
      "fan immediately on heat", "blower on immediately heat call", "blower right away heat",
    ],
    symptomClues: [
      "blower", "fan", "immediate", "delay", "limit", "relay", "g terminal",
      "fan relay stuck", "limit previously tripped", "overheat", "instantly", "right away",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "medium",
    negativeTriggers: ["no heat", "no flame", "inducer", "rollout"],
    likelyCauses: [
      "Previously tripped high-limit switch — board detected a prior overheat condition; blower runs continuously to cool the heat exchanger until limit resets",
      "Fan relay welded or stuck closed — relay contacts fused; blower receives constant power independent of board command",
      "Thermostat G (fan) circuit energized at the board — thermostat or wiring fault continuously energizing the fan terminal",
      "Board fault — board software or relay driver running the fan output continuously",
      "Blower control fault on variable-speed ECM motor — ECM module running at minimum speed on all calls",
    ],
    firstChecks: [
      "1. Check the board fault code — a previously tripped limit will almost always log a fault; read all stored faults",
      "2. Confirm the thermostat is not energizing the G (fan) terminal — disconnect the G wire at the board and observe if blower stops",
      "3. If blower stops when G is disconnected, the thermostat or low-voltage wiring has a fault energizing the fan continuously",
      "4. With G disconnected and no call for heat, if blower still runs: check the fan relay — remove control power and see if blower stops; if not, relay contacts are welded",
      "5. Check the high-limit switch for a tripped condition: limit will reset only when the heat exchanger cools below reset threshold",
    ],
    meterChecks: [
      "Voltmeter at G terminal on control board with no thermostat call: 24VAC present = thermostat or wiring fault energizing G",
      "Voltmeter at fan relay output terminals (low voltage side): 24VAC energized with no fan call = board or relay fault",
      "Voltmeter across high-limit switch: 24VAC drop = limit is open; replace after finding root cause of overheat",
      "Clamp meter on blower motor lead: amperage during cold start confirms motor is running at full speed, not just ECM minimum speed",
    ],
    recommendedAction:
      "Disconnect the G wire at the board first — if blower stops, the fault is in the thermostat or low-voltage circuit. If it continues, check the fan relay. Find and correct the root cause of any prior limit trip (airflow restriction, dirty filter, failed blower motor) before returning the unit to service.",
    riskNote:
      "A blower that runs continuously without a heat call may indicate the heat exchanger previously overheated. Do not ignore this — inspect the heat exchanger for cracks or deformation. A cracked heat exchanger allows combustion gases including carbon monoxide to enter the airstream.",
  },

  {
    id: "gas-heat-rollout-trip",
    title: "Gas Furnace — Rollout Switch Tripped",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "rollout switch tripped", "rollout open", "rollout switch open",
      "roll out switch", "rollout limit", "manual reset rollout",
      "flame rollout", "rollout condition", "furnace rollout",
      "heat exchanger crack rollout", "blocked flue rollout",
    ],
    symptomClues: [
      "rollout", "roll-out", "heat exchanger", "cracked", "blocked flue",
      "negative pressure", "delayed ignition", "burner misalign", "flame spilling",
    ],
    failureStage: "startup",
    confidenceBase: 96,
    priority: "critical",
    negativeTriggers: ["pressure switch", "inducer not starting", "no igniter"],
    likelyCauses: [
      "Cracked heat exchanger — combustion gas escapes the heat exchanger, creates a draft reversal, and causes flame to roll out of the burner box",
      "Blocked or restricted flue/vent — back pressure causes flame to roll toward the rollout switch location",
      "Delayed ignition — gas accumulates in the heat exchanger before igniting; the sudden ignition creates a pressure wave that rolls flame backward",
      "Burner assembly misalignment — burners shifted or displaced, directing flame toward rollout switch",
      "Negative building pressure — excessive exhaust fans or stack effect pulling combustion air from the unit, causing flame reversal",
      "Failed inducer wheel — weak draft allows back-pressure and flame rollout before ignition is complete",
    ],
    firstChecks: [
      "1. DO NOT bypass or tape over the rollout switch — this is a life-safety device protecting against CO intrusion and fire",
      "2. Inspect the burner box and heat exchanger visually for signs of flame impingement (discoloration, carbon deposits at rollout switch location)",
      "3. Check the flue vent pathway from the unit to the termination — look for blocked B-vent, disconnected flue sections, bird nests, or ice blockage",
      "4. Perform a heat exchanger inspection: use a combustion analyzer or smoke pencil to detect combustion gas crossing into the supply air stream",
      "5. Check for delayed ignition: observe the burner ignition event — a 'boom' or visible pressure wave from the burner box confirms delayed ignition",
    ],
    meterChecks: [
      "Combustion analyzer in supply air stream with burners on: any CO above 0 ppm in supply air confirms heat exchanger breach",
      "Manometer measuring negative static pressure in equipment room: greater than 0.25\" W.C. negative indicates building pressure problem",
      "Voltmeter across rollout switch terminals: 24VAC drop confirms rollout is open (manual reset required)",
      "Manifold pressure with manometer: check gas manifold pressure during ignition — delayed ignition may show as pressure spike",
    ],
    recommendedAction:
      "Treat every rollout trip as a potential life-safety emergency. Manually reset the rollout switch only once for diagnostic purposes while observing the ignition sequence. If it trips again, tag and lock out the unit and call for a licensed technician to perform a full heat exchanger inspection before returning to service.",
    riskNote:
      "A rollout switch that trips repeatedly is warning that combustion gases are escaping the heat exchanger into the living or working space. Carbon monoxide poisoning is the primary risk. The unit must not be operated until the root cause is identified. Never permanently jumper a rollout switch under any circumstance.",
  },

  {
    id: "gas-heat-pressure-switch-open",
    title: "Gas Furnace — Pressure Switch Won't Close (Draft Proving Failure)",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "pressure switch won't close", "pressure switch open", "pressure switch stuck open",
      "pressure switch fault", "ps fault", "no pressure switch closure",
      "inducer runs pressure switch open", "draft proving failure", "pressure switch not proving",
      "pressure switch error", "inducer on switch won't close", "draft proving fault",
    ],
    symptomClues: [
      "pressure switch", "ps", "draft", "inducer", "vent", "blocked flue",
      "hose", "tubing", "condensate", "weak draft", "wrong pressure switch",
    ],
    failureStage: "startup",
    confidenceBase: 94,
    priority: "high",
    negativeTriggers: ["rollout", "igniter", "flame sensor", "pressure switch closed"],
    likelyCauses: [
      "Blocked or restricted flue vent — most common cause; blockage reduces draft differential, switch cannot develop enough pressure to close",
      "Cracked, disconnected, or clogged pressure switch hose/tubing — switch is measuring ambient instead of inducer draft",
      "Weak inducer wheel — cracked, slipping, or coated wheel cannot generate required draft differential at design speed",
      "Condensate plugging the pressure port or drain leg of the pressure switch — water blocks the pressure tap",
      "Pressure switch rating incorrect — replacement switch set point too high for the unit's actual draft differential",
      "Failed (open-contact) pressure switch — contacts do not close even with correct draft pressure applied",
    ],
    firstChecks: [
      "1. With inducer running, use a manometer or U-tube at the pressure switch port — compare measured draft to the switch's rated set point (printed on switch body)",
      "2. Disconnect the pressure switch hose and inspect for condensate, debris blockage, or cracks — blow through to verify it is clear",
      "3. Inspect the flue path from unit to termination — look for bird nests, ice, collapsed vent sections, or shared vents creating back pressure",
      "4. Temporarily short the pressure switch (one time only, for diagnostic verification with someone watching) — if the unit lights normally with the switch shorted, the switch or hose is the fault",
      "5. Check inducer wheel through the vent collar for blade fouling, slipping on shaft, or cracked plastic housing",
    ],
    meterChecks: [
      "Manometer at pressure switch port with inducer running: compare to switch set point — measured draft should exceed set point by 20%+ for reliable closure",
      "Voltmeter across pressure switch terminals with inducer running: 24VAC drop = switch open; 0V drop = switch closed",
      "Ohmmeter on pressure switch with inducer off: normally-open contact should read OL; if reads closed, switch contacts are welded (see pressure-switch-closed entry)",
      "Clamp meter on inducer motor: compare amp draw to nameplate — low amps may indicate slipping wheel or weak motor not developing full draft",
    ],
    recommendedAction:
      "Start with the hose — disconnect, inspect, and blow clear. Then check the flue termination for blockage. Then measure draft with a manometer and compare to switch set point. Replace the switch only after confirming correct draft is present but switch still does not close.",
    riskNote:
      "A blocked flue vent is the most dangerous root cause here — it causes incomplete combustion products including carbon monoxide to back up into the space. Do not reset and run the unit until the vent path is confirmed clear and unobstructed.",
  },

  {
    id: "gas-heat-pressure-switch-closed",
    title: "Gas Furnace — Pressure Switch Stuck Closed (Unsafe Bypass Condition)",
    category: "No Heat",
    equipment: ["furnace", "rooftop", "rtu", "gas heat", "packaged unit", "gas pack"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "bryant", "aaon"],
    triggers: [
      "pressure switch stuck closed", "pressure switch welded", "jumpered pressure switch",
      "pressure switch bypassed", "ps stuck closed", "pressure switch always closed",
      "water in pressure switch tubing", "pressure switch contacts welded",
      "pressure switch miswired", "pressure switch shorted",
      "pressure switch jumpered", "ps welded", "switch closed before inducer",
    ],
    symptomClues: [
      "pressure switch", "stuck closed", "welded", "bypass", "jumper",
      "water", "tubing", "miswired", "always proving", "contacts",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "critical",
    negativeTriggers: ["pressure switch open", "won't close", "pressure switch fault no draft"],
    likelyCauses: [
      "Welded pressure switch contacts — repeated pressure spikes (from hard ignitions or power cycling) fuse the contacts permanently closed",
      "Water in the pressure switch tubing or switch body — condensate creates a hydraulic lock that holds the diaphragm in the closed position",
      "Pressure switch jumpered or bypassed by a previous technician — highly dangerous; unit operates without verifying draft/venting",
      "Miswired pressure switch — switch wired to always-closed circuit rather than normally-open draft-proving circuit",
      "Pressure switch set point too low — closes from normal building pressures or ambient conditions before inducer starts",
    ],
    firstChecks: [
      "1. With the unit fully off and inducer not running, check pressure switch with ohmmeter — a normally-open switch should read OL with no draft; if it reads closed, contacts are welded or it is jumpered",
      "2. Inspect the pressure switch hose for water — disconnect at both ends and drain any condensate; condensate in the tubing creates a hydraulic bypass",
      "3. Visually inspect the pressure switch wiring — look for jumper wires across the switch terminals or non-factory wiring",
      "4. Verify the pressure switch part number matches the unit's wiring diagram specification — wrong switch may have too low a set point",
      "5. Replace a stuck-closed switch immediately — do not attempt to operate the unit with a confirmed stuck-closed or bypassed pressure switch",
    ],
    meterChecks: [
      "Ohmmeter across pressure switch contacts with inducer OFF and hose disconnected: OL = switch is normal; continuity = contacts welded or switch failed closed",
      "Ohmmeter from each pressure switch terminal to chassis ground: continuity to ground = switch is miswired or jumpered to ground",
      "Visual inspection of hose for water: tilt tubing and observe for condensate; clear a clogged condensate drain leg",
    ],
    recommendedAction:
      "Replace a welded-closed pressure switch immediately. Drain all condensate from tubing before reinstalling or replacing. Remove any jumper wires from the pressure switch circuit — document this finding for the building owner. Verify the replacement switch part number matches the wiring diagram.",
    riskNote:
      "A pressure switch that is stuck closed, jumpered, or bypassed allows the unit to operate without verifying that the venting system is active and functional. This is the single most dangerous condition in gas heating diagnostics — it permits the unit to ignite and operate while combustion gases may be venting back into the occupied space. This is a reportable safety violation in most jurisdictions.",
  },

  // ─── OIL HEAT DIAGNOSTICS ─────────────────────────────────────────────────

  {
    id: "oil-heat-no-ignition",
    title: "Oil Burner — Primary Control Lockout / No Ignition",
    category: "No Heat",
    equipment: ["oil furnace", "oil boiler", "oil heat", "oil burner"],
    brands: ["beckett", "riello", "carlin", "wayne", "weil-mclain", "burnham", "peerless", "slant fin"],
    triggers: [
      "oil burner lockout", "primary control lockout", "oil heat no ignition",
      "oil furnace won't light", "oil burner won't fire", "primary control reset",
      "oil burner reset button", "oil heat no flame", "burner lockout",
      "oil furnace not heating", "cad cell lockout", "oil burner tripped",
    ],
    symptomClues: [
      "oil", "burner", "lockout", "primary control", "cad cell", "nozzle",
      "ignition transformer", "electrode", "fuel", "reset", "oil heat",
    ],
    failureStage: "startup",
    confidenceBase: 88,
    priority: "high",
    negativeTriggers: ["gas", "gas valve", "hsi", "hot surface igniter", "inducer"],
    likelyCauses: [
      "Cad cell not detecting flame — dirty or misaligned cadmium sulfide cell fails to prove flame to primary control, causing lockout",
      "Plugged or degraded nozzle — atomizing orifice clogged or worn, preventing proper fuel atomization and ignition",
      "Failed ignition electrodes — electrode tips burned, corroded, or gap out of specification; no spark across the gap",
      "Failed ignition transformer — transformer not producing 10,000V across electrodes for arc ignition",
      "Air in fuel line — air lock or vapor pocket prevents consistent oil delivery to the nozzle",
      "Oil filter plugged — annual filter change skipped; restriction prevents adequate pump flow to nozzle",
    ],
    firstChecks: [
      "1. Reset the primary control (red button) ONE TIME ONLY — never reset more than once without finding root cause; unburned oil accumulates in the firebox creating a puffback risk",
      "2. Check the oil tank gauge — confirm adequate fuel supply; check that the fuel shutoff valve is open",
      "3. Inspect the cad cell: remove from burner, clean the glass face with a dry cloth, and confirm it is aimed directly at the flame view port",
      "4. Measure cad cell resistance with an ohmmeter: in darkness (simulating no flame) should be greater than 1,500 ohms; if low in darkness, cad cell is failed or shorted",
      "5. Inspect the nozzle: if the last service was more than one year ago, replace the nozzle as a routine step before further diagnosis",
    ],
    meterChecks: [
      "Ohmmeter on cad cell in daylight: 200–400 Ω; in darkness: greater than 1,500 Ω — low dark resistance = cad cell failed (shorted), causing primary control to lock out thinking flame is present when not",
      "Voltmeter at ignition transformer primary: 120VAC during call confirms primary control is energizing transformer",
      "High-voltage probe or spark tester at transformer secondary: 10,000V arc between electrodes — no arc = transformer or electrode failure",
      "Oil pressure gauge at pump: 100–140 PSI during operation; low pressure = pump, filter, or supply problem",
      "Combustion analyzer at flue during startup: smoke reading above 1 on the Bacharach scale = poor atomization (nozzle)",
    ],
    recommendedAction:
      "Replace the nozzle and oil filter as a first step if annual service is overdue — this resolves the majority of oil burner lockout calls. Then clean the cad cell. Then verify electrode gap and condition. Test the ignition transformer last.",
    riskNote:
      "Never reset the primary control more than once without investigating root cause. Repeated resets with unburned oil in the combustion chamber create a puffback risk — an explosive ignition of accumulated oil that can destroy the heat exchanger, damage the flue, and cause injury. If you smell oil in the flue or firebox, do not attempt ignition until the chamber is inspected and cleared.",
  },

  {
    id: "oil-heat-delayed-ignition",
    title: "Oil Burner — Delayed Ignition / Puffback Risk",
    category: "No Heat",
    equipment: ["oil furnace", "oil boiler", "oil heat", "oil burner"],
    brands: ["beckett", "riello", "carlin", "wayne", "weil-mclain", "burnham", "peerless"],
    triggers: [
      "oil burner puffback", "delayed ignition oil", "boom on ignition oil",
      "loud bang oil furnace", "oil heat delayed ignition", "oil burner puff",
      "explosion ignition oil", "delayed firing oil burner", "oil furnace bangs",
    ],
    symptomClues: [
      "boom", "bang", "puff", "delayed", "oil", "burner", "ignition", "flame", "explosion", "pressure wave",
    ],
    failureStage: "startup",
    confidenceBase: 92,
    priority: "critical",
    negativeTriggers: ["gas", "gas valve", "hsi", "no ignition lockout"],
    likelyCauses: [
      "Incorrect electrode gap or position — arc fires too late or in wrong location relative to fuel spray; oil accumulates before igniting",
      "Degraded nozzle atomization — nozzle produces large droplets or an irregular spray pattern; droplets pool before igniting",
      "Low oil pump pressure — oil arrives at nozzle below minimum pressure, producing a poor spray pattern with delayed flame propagation",
      "Delayed transformer energization — ignition transformer or primary control timing allows oil to spray for too long before arc begins",
      "Negative draft — back pressure from chimney or building prevents reliable ignition; ignition occurs when enough fuel has built up",
    ],
    firstChecks: [
      "1. DO NOT restart the unit until the combustion chamber is visually inspected for accumulated oil — unburned oil in the firebox is a puffback hazard",
      "2. Replace the nozzle with a factory-specified size, angle, and spray pattern — never substitute a different nozzle type or size",
      "3. Check and reset electrode gap to manufacturer specifications (typically 1/8\" to 3/16\" gap, 1/2\" ahead of nozzle face)",
      "4. Measure oil pump cutoff pressure — pumps that do not cutoff cleanly allow oil to dribble after shutdown, pooling for the next ignition",
      "5. Measure chimney draft with a draft gauge — measure over fire and at the breeching; insufficient draft causes ignition problems",
    ],
    meterChecks: [
      "Oil pressure gauge at pump: 100–140 PSI normal; low pressure causes poor atomization and delayed ignition",
      "Draft gauge over fire (combustion chamber): -0.02 to -0.04\" W.C. during operation is normal; positive or near-zero draft = chimney or flue problem",
      "Draft gauge at breeching: -0.04 to -0.06\" W.C. typical — poor draft allows combustion products to back up and interfere with ignition",
      "Combustion analyzer at flue: CO above 200 PPM undiluted or smoke number above 1 = incomplete combustion (nozzle or air settings)",
    ],
    recommendedAction:
      "Replace the nozzle, reset the electrode gap, and measure pump pressure and chimney draft before attempting another ignition. This is a safety-first call — do not bypass or rush any step.",
    riskNote:
      "A puffback is an explosive event that can rupture the heat exchanger, spray burning oil through the unit, damage the flue, and cause fire and injury. If the customer reports a boom, bang, or pressure wave at startup, inspect the combustion chamber for oil accumulation and heat exchanger integrity before any restart attempt. This situation may require an insurance claim.",
  },

  {
    id: "oil-heat-smoke-sooting",
    title: "Oil Burner — Smoke, Soot, or Carbon Buildup",
    category: "No Heat",
    equipment: ["oil furnace", "oil boiler", "oil heat", "oil burner"],
    brands: ["beckett", "riello", "carlin", "wayne", "weil-mclain", "burnham", "peerless"],
    triggers: [
      "oil furnace sooting", "black smoke oil", "soot buildup oil",
      "carbon buildup oil furnace", "oily soot", "smoke from furnace",
      "black deposits oil", "flue sooting", "oil heat smoke",
      "oil smell soot", "dirty flame oil", "oil burner sooting",
    ],
    symptomClues: [
      "soot", "carbon", "smoke", "black", "deposits", "dirty flame", "oil smell",
      "oil buildup", "sooty flue", "incomplete combustion",
    ],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "high",
    negativeTriggers: ["gas", "gas valve", "no ignition", "lockout"],
    likelyCauses: [
      "Incorrect air-to-fuel ratio — too little combustion air causes rich combustion and soot production",
      "Worn or partially clogged nozzle — degraded atomization creates large droplets that do not fully combust",
      "Low oil pump pressure — fine atomization requires correct pump pressure; low pressure creates heavy droplet spray",
      "Insufficient chimney draft — low draft reduces combustion air velocity through the air band, causing rich burning",
      "Sooted heat exchanger reducing heat transfer — soot on heat exchanger surfaces acts as insulation; efficiency drops and combustion worsens",
      "Air band or static plate setting incorrect — combustion head not delivering correct turbulence or air volume to flame zone",
    ],
    firstChecks: [
      "1. Perform a combustion analysis with a combustion analyzer — CO, CO2, O2, and smoke number will quantify the imbalance",
      "2. Check the smoke number at the stack: Bacharach smoke number above 1 = excessive soot production",
      "3. Inspect the heat exchanger flue passageways — heavy soot accumulation dramatically reduces efficiency and can cause flue restriction",
      "4. Check the oil nozzle: any soot suggests the nozzle should be replaced as part of the tune-up",
      "5. Check combustion air band setting — opening the air band slightly increases excess air and typically reduces soot",
    ],
    meterChecks: [
      "Combustion analyzer at flue: target CO2 11–13% for No. 2 oil; O2 3–5%; CO below 100 PPM; smoke 0–1 Bacharach",
      "Draft gauge over fire: -0.02\" W.C. during operation; low or positive draft causes rich combustion",
      "Oil pressure gauge: 100–140 PSI at pump; adjust to nameplate specification for the nozzle installed",
      "Flue temperature: normal efficiency range 350–550°F; above 600°F indicates heavy scale on heat exchanger surfaces",
    ],
    recommendedAction:
      "Perform a complete oil burner tune-up: replace nozzle and oil filter, clean combustion chamber and heat exchanger surfaces, set electrodes, measure pump pressure, and adjust air band for a smoke-free combustion analysis result.",
    riskNote:
      "Soot accumulation in the flue reduces draft and eventually blocks the chimney, causing combustion gases including carbon monoxide to spill back into the building. Annual oil burner tune-ups are not optional — they are a life-safety requirement for oil-fired equipment.",
  },

  {
    id: "oil-heat-pump-pressure",
    title: "Oil Burner — Fuel Delivery / Pump Pressure Problem",
    category: "No Heat",
    equipment: ["oil furnace", "oil boiler", "oil heat", "oil burner"],
    brands: ["beckett", "riello", "carlin", "wayne", "suntec", "webster"],
    triggers: [
      "oil pump failure", "oil pump pressure low", "oil pump not delivering",
      "no oil flow", "air in oil line", "oil filter clogged",
      "fuel delivery problem oil", "oil pump seized", "oil line air lock",
      "two pipe oil system", "single pipe oil system", "oil supply line",
      "oil pump problem", "oil pressure low", "oil flow problem",
      "oil pump not building pressure", "oil filter restricted",
      "air lock oil", "oil burner no fuel", "oil pump bleed",
    ],
    symptomClues: [
      "pump", "oil pressure", "fuel line", "filter", "air in line", "supply",
      "two-pipe", "single pipe", "cutoff", "strainer", "oil", "fuel",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "high",
    negativeTriggers: ["gas", "gas valve", "hsi", "puffback"],
    likelyCauses: [
      "Air lock in fuel supply line — most common on single-pipe systems when tank runs low or line is disturbed",
      "Clogged oil filter — annual filter change missed; restriction prevents adequate flow to pump inlet",
      "Worn or failed oil pump — pump internals worn, pump not developing cutoff pressure, or pump seized",
      "Incorrect two-pipe to single-pipe conversion — bypass plug missing in pump causes air entrainment",
      "Partially closed fuel shutoff valve — reduces supply flow below minimum pump inlet requirement",
      "Cracked or leaking fuel line — air enters at a crack, fitting, or loose compression joint on the suction side",
    ],
    firstChecks: [
      "1. Check the fuel oil level in the tank — confirm adequate supply and that the gauge reads correctly (float may be stuck)",
      "2. Open the bleeder port on the oil pump and prime the pump by running the burner briefly — clear, bubble-free oil should flow from the bleeder",
      "3. Replace the oil filter if last service is unknown or overdue — an annual filter change is required maintenance",
      "4. Check all fuel line connections from tank to pump for tightness — pay special attention to compression fittings, which loosen over time",
      "5. Confirm the two-pipe vs. single-pipe configuration matches the pump bypass plug installation",
    ],
    meterChecks: [
      "Oil pressure gauge at pump: 100–140 PSI at rated speed; low pressure = worn pump or restricted suction",
      "Pump cutoff: oil pressure should drop to near-zero within 0.1 seconds of burner shutdown — slow cutoff causes oil dribble and ignition residue",
      "Vacuum gauge at pump inlet: greater than 8\" Hg suction indicates restriction in supply line, filter, or strainer",
      "Observe bleeder port flow: clear, continuous oil with no bubbles = air-free supply; bubbles = air leak in suction side",
    ],
    recommendedAction:
      "Replace the oil filter and bleed the pump as a first step. If the pump cannot develop rated pressure after bleeding, test the pump with a gauge and compare to specification. Replace a worn pump rather than adjusting the pressure relief valve above its rated range.",
    riskNote:
      "Low oil pump pressure causes poor fuel atomization, which results in incomplete combustion, soot production, and heat exchanger fouling. A pump that does not cut off cleanly leaves residual oil at the nozzle, which drips into the combustion chamber and causes puffback on the next call for heat.",
  },

  // ─── ELECTRIC HEAT ADVANCED DIAGNOSTICS ──────────────────────────────────

  {
    id: "electric-heat-open-element",
    title: "Electric Heat — Open Heating Element",
    category: "No Heat",
    equipment: ["air handler", "electric furnace", "heat pump", "fan coil", "electric heat"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin", "nordyne"],
    triggers: [
      "open heating element", "burned out element", "electric heat element failed",
      "heat strip element open", "resistance element open", "element ohms open",
      "heating element resistance", "failed heating element", "burned element",
      "heat strip element test", "element testing open circuit",
    ],
    symptomClues: [
      "element", "resistance", "ohms", "open circuit", "strip", "heat strip",
      "kw", "watt", "electric heat", "air handler", "fan coil",
    ],
    failureStage: "runtime",
    confidenceBase: 91,
    priority: "high",
    negativeTriggers: ["sequencer", "oil", "gas", "gas valve", "oil heat"],
    likelyCauses: [
      "Burned-out nichrome resistance element — element wire overheated and burned through due to age, overtemperature event, or scale buildup",
      "Element insulator cracked or tracked — element arcs to frame on startup, tripping the breaker or fusing an overtemperature limiter",
      "Connection terminal overheated and open — high-resistance terminal joint caused localized overheating that opened the element circuit",
      "Element coil sagged and shorted — coil segment droops and contacts the element frame, causing a short-to-ground fault",
    ],
    firstChecks: [
      "1. De-energize and lock out the electric heat circuit before any testing",
      "2. Disconnect both leads from each element and test element resistance with an ohmmeter — compare to calculated expected resistance",
      "3. Calculate expected element resistance: R = V² / W (e.g. a 5kW element at 240V = 240² / 5000 = 11.5 Ω)",
      "4. Inspect element connection terminals for discoloration, melting, or arcing — a burned terminal means the element ran at high resistance before failing",
      "5. Test each element for short-to-frame: ohmmeter from element terminal to chassis ground — OL (no continuity) is normal; continuity to ground = shorted element",
    ],
    meterChecks: [
      "Ohmmeter across each element (leads disconnected, power off): expected resistance = V² / element kW; OL = open element (replace)",
      "Ohmmeter from each element terminal to chassis ground: OL = normal; any measurable resistance = shorted element (replace and check breaker)",
      "Clamp meter on each element lead during call: zero amps with correct supply voltage = open element or failed sequencer feeding it",
      "Voltmeter at element terminals during call: 240VAC present but zero amps = open element confirmed",
    ],
    recommendedAction:
      "Test each element individually with an ohmmeter (power off). Replace only the failed element(s) — element banks are replaceable individually. After replacing, check all connections for discoloration and re-torque to specification.",
    riskNote:
      "A shorted element (arcing to frame) will trip the breaker repeatedly. Do not simply reset the breaker without identifying the source of the short. A short-to-ground from a heating element that bypasses the breaker (due to nuisance overcurrent conditions) is a fire hazard.",
  },

  {
    id: "electric-heat-sequencer-fail",
    title: "Electric Heat — Sequencer Failure / Heat Strips Not Staging",
    category: "No Heat",
    equipment: ["air handler", "electric furnace", "heat pump", "fan coil"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: [
      "heat strips not staging", "sequencer failed", "sequencer not working",
      "electric heat sequencer", "heat strips not all on", "partial heat electric",
      "sequencer fault", "one stage electric heat", "heat strip partial heat",
      "sequencer wont close", "second stage heat not coming on", "staging issue electric heat",
    ],
    symptomClues: [
      "sequencer", "stage", "staging", "heat strip", "strip", "partial heat",
      "second stage", "first stage", "not all elements", "low heat output",
    ],
    failureStage: "startup",
    confidenceBase: 93,
    priority: "medium",
    negativeTriggers: ["oil", "gas", "flame", "gas valve", "rollout"],
    likelyCauses: [
      "Failed sequencer — bimetal or solid-state sequencer contacts not closing on 24V heating element; one or more strips remain off",
      "Open sequencer heater element — sequencer's internal 24V heater coil burned out; sequencer never receives the heat signal to close its contacts",
      "Sequencer contacts welded — contacts fused in the closed position; strip heats continuously even after thermostat is satisfied (see electric-heat-stays-on)",
      "Incorrect sequencer wiring — missing jumper between sequencers for staged operation; second or third stage never receives a call",
      "Blown fuse on sequencer 24V circuit — sequencer does not see control voltage; contacts never close",
    ],
    firstChecks: [
      "1. Confirm all heat strips have correct supply voltage at the inlet terminals (240VAC required at each strip breaker)",
      "2. During a heat call, observe each sequencer for a 30–60 second time delay — sequencers are designed to close with a built-in delay; wait the full delay before concluding a sequencer is failed",
      "3. With a voltmeter, check 24VAC at the sequencer heater terminals during a call — 24VAC present means the sequencer is being commanded; absent 24V = wiring or control fault",
      "4. With the thermostat calling for heat, check for 240VAC at each element's load-side terminals — no voltage at the load side while input voltage is present = sequencer contacts open (failed)",
      "5. Check for a blown 24V fuse or open fusible link in the control circuit feeding the sequencer heater coils",
    ],
    meterChecks: [
      "Voltmeter at sequencer 24V heater terminals during call: 24VAC = commanded; 0V = control circuit fault",
      "Voltmeter at sequencer output (240V load) terminals during call (after delay): 240VAC = contacts closed; 0V = contacts failed open",
      "Ohmmeter across sequencer contacts with power off (24V side de-energized): OL = contacts open (normal at rest for NO sequencer); continuity = contacts welded",
      "Clamp meter on each heat strip lead during call: zero amps on a strip that should be staged confirms that strip's sequencer is failed open",
    ],
    recommendedAction:
      "Identify which stage is not heating by clamping each element lead during operation. Trace back to its sequencer and test both the 24V heater input and the 240V contact output. Replace the failed sequencer only — individual sequencers are inexpensive and field-replaceable.",
    riskNote:
      "A sequencer stuck closed causes continuous element heating even after thermostat satisfaction. This overheats the heat exchanger, trips limit switches, and can cause a fire if limits also fail. Always confirm sequencer operation in both directions — opening and closing.",
  },

  {
    id: "electric-heat-stays-on",
    title: "Electric Heat — Heat Stays On After Thermostat Is Satisfied",
    category: "No Heat",
    equipment: ["air handler", "electric furnace", "heat pump", "fan coil"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: [
      "heat won't turn off", "electric heat stays on", "heat keeps running",
      "heat strips stay on", "electric heat not shutting off", "heats past setpoint",
      "heat won't cycle off", "electric heat overheating", "sequencer stuck closed",
      "heat stays on overheating", "heat strips continuous", "won't stop heating",
      "electric heat continuous", "heat stays on after setpoint", "heat not cycling off",
      "electric furnace stays on", "heat strips won't stop",
      "heat stays on after thermostat", "electric heat won't shut off",
      "heat strips stay on after", "heat won't stop", "electric strip stays on",
      "heat keeps going after thermostat", "heat continuous after satisfied",
    ],
    symptomClues: [
      "stays on", "won't turn off", "continuous", "overheating", "past setpoint",
      "won't stop", "sequencer welded", "sequencer stuck", "contactor stuck",
      "after thermostat", "satisfied", "keeps running", "keeps going",
    ],
    failureStage: "runtime",
    confidenceBase: 93,
    priority: "high",
    negativeTriggers: ["won't start", "no heat", "oil", "gas", "flame"],
    likelyCauses: [
      "Sequencer contacts welded closed — contacts fused; element receives continuous power regardless of thermostat status",
      "Contactor contacts welded — multi-speed contactor or individual strip contactor stuck in the energized position",
      "Thermostat W (heat) terminal stuck energized — thermostat internal relay welded or thermostat software fault continuously calling for heat",
      "Thermostat anticipator setting incorrect — thermostat overshoots setpoint and calls for heat too long before releasing",
      "Failed board heat relay — board heat output relay stuck closed; continues to command strips on",
    ],
    firstChecks: [
      "1. Turn the thermostat to OFF position — if heating stops, the fault is in the thermostat or its wiring",
      "2. If heating continues with thermostat OFF, de-energize the 24V control circuit at the board — if heating stops, the fault is a stuck board relay or control wiring",
      "3. If heating continues with control voltage removed, the fault is a welded power-side contactor or sequencer contact — these require line voltage isolation (breaker off) to inspect",
      "4. With thermostat at OFF position, measure 24VAC at the W terminal on the board — voltage present with thermostat off = thermostat internal fault or wiring cross",
      "5. With breaker off, check sequencer contacts with ohmmeter — continuity with no 24V applied = contacts welded",
    ],
    meterChecks: [
      "Voltmeter at W terminal on control board with thermostat set to OFF: 24VAC present = thermostat stuck on heat",
      "Ohmmeter across sequencer contacts (power off, 24V de-energized): continuity = contacts welded (replace sequencer)",
      "Ohmmeter across contactor contacts (power off): continuity = contacts welded (replace contactor)",
      "Clamp meter on element lead with thermostat set to OFF: non-zero amps = element is receiving power continuously",
    ],
    recommendedAction:
      "Step down the control circuit methodically — thermostat off first, then board power off. The step at which heating stops identifies which level the fault is at. Welded contacts in sequencers and contactors require part replacement — they cannot be safely repaired.",
    riskNote:
      "Continuous electric heat operation without cycling will overheat the heat exchanger, trip limit switches, and potentially cause a fire if all limits also fail. Do not leave the unit running unattended with a suspected stuck sequencer or contactor. Turn off the breaker to the electric heat circuit until the fault is resolved.",
  },

  // ─── RTU ELECTRIC HEAT — NO TEMPERATURE RISE ─────────────────────────────────
  // Targeted entry for the common pattern: technician is testing heating mode on
  // an RTU with an electric heat kit and measures little or no temperature rise
  // between return air (RAT) and discharge air (DAT). This is a heating electrical
  // fault — NOT a refrigerant or cooling-circuit fault.

  {
    id: "electric-heat-rtu-no-temp-rise",
    title: "RTU / Packaged Unit — Electric Heat Not Energizing / No Temperature Rise",
    category: "No Heat",
    equipment: ["rtu", "rooftop", "rooftop unit", "packaged unit", "air handler"],
    brands: ["carrier", "trane", "york", "lennox", "aaon", "daikin", "goodman", "rheem", "ruud", "american standard", "bryant"],
    triggers: [
      "electric heating rtu", "testing heating rtu", "rtu electric heat not heating",
      "electric heat not heating", "heating mode rtu", "testing electric heat",
      "no temperature rise electric", "no temp rise electric", "low temperature rise",
      "low temp rise", "no temperature rise", "electric heat rtu",
      "rtu heating", "heat strips not working rtu", "heat kit rtu not working",
      "testing heating", "heating rtu",
    ],
    symptomClues: [
      "rat", "dat", "return air", "discharge air", "temperature rise", "temp rise",
      "electric heating", "heating", "heat kit", "heat strips", "heat stage",
      "rtu heat", "rooftop heat", "heating test", "heat mode",
      "heating mode", "heat call", "w terminal", "w1", "w2",
    ],
    failureStage: "startup",
    confidenceBase: 90,
    priority: "high",
    negativeTriggers: [
      "not cooling", "no cool", "won't cool", "refrigerant leak", "low charge",
      "compressor won't start", "refrigerant", "subcooling", "superheat",
    ],
    likelyCauses: [
      "No 24V heat call at W/W1/W2 terminal — thermostat not outputting a heat call or wiring is open between thermostat and unit control board",
      "Heat contactor or sequencer not pulling in — sequencer heater coil failed open or contactor coil has high resistance or is open",
      "Electric heat breaker or fuse open — the dedicated 30–60A electric heat circuit breaker has tripped or fuse link is blown",
      "Open high-limit switch on heat strip assembly — manual-reset limit tripped after an overheat event; must be pressed to reset before heat can energize",
      "Airflow proving switch not made — blower not running or VFD not at minimum speed; proving switch prevents heat strips from energizing without airflow",
      "Control board not outputting W heat stage signal — board fault, failed heat relay, or lost 24V control power to heat circuit",
      "Failed heat strip bank — all elements open due to age or sustained overheat event (confirm with ohmmeter before condemning)",
    ],
    firstChecks: [
      "1. Confirm thermostat is in HEAT mode and setpoint is above current room temperature — verify the thermostat is actively calling for heat",
      "2. Verify 24VAC at the W/W1 terminal on the unit control board during a heat call — 0V means thermostat, wiring, or transformer fault",
      "3. Check the heat contactor or sequencer: 24VAC at the coil during call = commanded; no audible click or pull-in = coil failure or mechanical bind",
      "4. Check the electric heat circuit breaker (dedicated 30–60A breaker, separate from the main unit breaker) — reset if tripped, clamp amps before re-energizing",
      "5. Locate and press all manual-reset high-limit switches on the heat strip assembly — they may have tripped without a visible indicator",
      "6. Confirm the supply fan/blower is running — many RTU control boards require proven airflow before allowing heat strips to energize",
      "7. Amp-clamp each heat strip circuit during a heat call — zero amps on a circuit that should be energized confirms that strip or its sequencer is failed",
      "8. Measure temperature rise: DAT − RAT should reach 25–45°F with all stages energized at design airflow; a 1–2°F rise (e.g. RAT 72, DAT 73) confirms heat is not energizing",
    ],
    meterChecks: [
      "Voltmeter at W/W1 terminal on control board during heat call: 24VAC = board receiving heat call; 0V = thermostat, wiring, or transformer fault upstream",
      "Voltmeter at heat contactor/sequencer coil terminals: 24VAC during call = commanded; 0V = control circuit fault (check 24V fuse, board heat output relay)",
      "Voltmeter at heat strip input terminals: 240VAC = breaker and contactor closed correctly; 0V = breaker open, contactor failed, or fuse blown",
      "Clamp meter on each element lead during call: expect approximately V²/element-kW ÷ voltage (e.g. 5kW at 240V ≈ 20.8A per strip); zero amps = open element or failed sequencer",
      "Temperature probe at supply and return: DAT − RAT = temperature rise; target 25–45°F for electric heat at design airflow; 1–5°F rise confirms heat circuit is not energizing",
    ],
    recommendedAction:
      "Walk the electric heat sequence of operation from the thermostat forward: verify 24V heat call at W terminal → confirm contactor or sequencer receives and responds to 24V → confirm 240V reaches heat strip input terminals → clamp each element. A 1°F temperature rise (RAT 72, DAT 73) is conclusive evidence the heating electrical circuit is not energizing — not a refrigerant or cooling fault.",
    riskNote:
      "A temperature rise of 1–2°F with electric heat called confirms the heat circuit is not energizing — this is NOT a refrigerant leak, compressor fault, or cooling issue. Do not condemn sequencers or elements before confirming 24V heat call and 240V supply reaching each strip. Operating with no heat output in heating mode is a comfort failure; in freezing conditions it becomes a life-safety risk.",
  },

  {
    id: "electric-heat-high-amp",
    title: "Electric Heat — High Amp Draw / Trips Breaker",
    category: "Trips Breaker",
    equipment: ["air handler", "electric furnace", "heat pump", "fan coil"],
    brands: ["carrier", "trane", "york", "lennox", "goodman", "rheem", "ruud", "american standard", "daikin"],
    triggers: [
      "electric heat trips breaker", "heat strips trip breaker", "electric heat high amps",
      "aux heat trips breaker", "electric heat overcurrent", "strip heater high amperage",
      "electric heat tripping", "heat strips overloading", "electric heat nuisance trip",
      "electric heat breaker keeps tripping", "heat strip amp draw high",
    ],
    symptomClues: [
      "breaker", "tripping", "high amps", "overcurrent", "electric heat", "strips",
      "element", "short", "ground fault", "overload", "aux heat",
    ],
    failureStage: "runtime",
    confidenceBase: 87,
    priority: "high",
    negativeTriggers: ["oil", "gas", "flame", "no heat", "inducer"],
    likelyCauses: [
      "Shorted heating element — element wire contacts frame or grounded surface, causing a direct short that draws locked-rotor-level current",
      "Undersized or degraded breaker — breaker contact surfaces pitted; breaker trips at normal amperage due to internal fault",
      "Multiple elements staging simultaneously — sequencers wired without staging delay; total inrush from simultaneous element energization trips the breaker",
      "High-resistance connection — corroded or loose terminal creates localized heating that eventually causes an arc fault trip",
      "Blower motor failure — airflow loss causes heat exchanger to overheat; thermally activated sequencers stage additional elements in an attempt to cool the exchanger, overloading the circuit",
    ],
    firstChecks: [
      "1. With power off, perform element-to-ground test: ohmmeter from each element terminal to chassis — any continuity = shorted element",
      "2. Measure all connection terminals for discoloration, arcing, or heat damage — a high-resistance joint is often visible",
      "3. Clamp the main electric heat feeder during operation — compare total amperage to nameplate maximum amperage and the breaker rating",
      "4. Confirm the blower is operating correctly — a stopped or slow blower causes the heat exchanger to overheat and can trigger unusual sequencer behavior",
      "5. Test the breaker: replace a breaker that trips below 80% of its rated amperage or shows discoloration at the connection point",
    ],
    meterChecks: [
      "Ohmmeter from each element terminal to chassis ground (power off): OL = normal; any resistance = shorted element (replace element and check breaker for damage)",
      "Clamp meter on each element lead during call: compare measured amps to nameplate rated amps — more than 10% above nameplate = element fault",
      "Clamp meter on electric heat main feeder: total draw should not exceed breaker rating × 80% for continuous loads",
      "Voltmeter at breaker output terminals under load: greater than 5V drop across breaker contacts indicates pitted contacts (replace breaker)",
    ],
    recommendedAction:
      "Perform element-to-ground test first (power off). If any element shows continuity to ground, replace it and inspect the breaker for contact damage. If all elements are normal, clamp the feeder under load and compare to nameplate — if within spec, replace the breaker.",
    riskNote:
      "A breaker that trips on a shorted element is doing exactly what it was designed to do — the breaker is not the problem, the element is. Replacing the breaker without finding and correcting the element fault will result in an arc fault or fire. Always find the root cause before replacing overcurrent protection devices.",
  },
];
