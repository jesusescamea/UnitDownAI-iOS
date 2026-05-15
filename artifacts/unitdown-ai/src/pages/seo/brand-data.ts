export interface BrandPage {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  brand: string;
  intro: string;
  symptoms: string[];
  likelyCauses: { title: string; body: string }[];
  sequenceNotes: string[];
  meterChecks: { measurement: string; expected: string; note: string }[];
  resetSteps: string[];
  repeatFailures: string[];
  whenReplacement: string[];
  whenEscalate: string[];
  relatedSlug?: string;
  relatedTitle?: string;
}

export const brandPages: BrandPage[] = [
  {
    slug: "lennox-prodigy-m3-lockout-causes",
    metaTitle: "Lennox Prodigy M3 Lockout Causes | UnitDown",
    metaDescription:
      "Why Lennox Prodigy M3 commercial RTUs enter lockout mode. Fault codes, sensor faults, and board diagnostics explained.",
    h1: "Lennox Prodigy M3 Lockout Causes",
    brand: "Lennox",
    intro:
      "The Lennox Prodigy M3 controller is the integrated microprocessor control system used on Lennox commercial rooftop units including the LGH, LCH, and LCA series. When the M3 enters lockout, it has detected a fault condition it cannot auto-recover from. The M3 stores fault history with timestamps — reading those codes is the starting point for any lockout diagnosis.",
    symptoms: [
      "Unit does not respond to thermostat or BAS cooling or heating calls",
      "M3 display shows a fault code or flashing LED pattern",
      "Unit compressor or heat section was running, then abruptly stopped",
      "Supply air temperature climbing or falling out of setpoint range",
      "Local alarm output energized on building automation system",
    ],
    likelyCauses: [
      {
        title: "High-Pressure Lockout (Fault Code HP or Code 3)",
        body: "The high-pressure switch opened during operation, indicating refrigerant pressure exceeded the safety cutout point (typically 410 PSIG on R-410A). Common causes include dirty condenser coils, failed condenser fan motor, non-condensable gases in the system, or an overcharge condition.",
      },
      {
        title: "Low-Pressure Lockout (Fault Code LP or Code 4)",
        body: "The low-pressure switch opened, indicating suction pressure dropped below the cutout setpoint. Low refrigerant charge, a blocked TXV, a frozen evaporator coil, or a loss of suction are common triggers. The M3 allows a configurable number of auto-resets before locking out hard.",
      },
      {
        title: "Ignition Lockout (Fault Code IG or Code 7)",
        body: "The M3 initiated a heating sequence, the inducer ran and proved draft pressure, but the flame signal was not established within the trial period. Dirty flame sensor, low gas pressure, failed gas valve, or a bad ignitor are the most common causes. Check the fault history for the number of consecutive ignition failures before lockout.",
      },
      {
        title: "Compressor Overload Trip (Code 10 or OL)",
        body: "The compressor internal thermal overload or external motor protection device has opened, indicating the compressor motor temperature exceeded safe limits. Possible causes: low refrigerant causing loss of suction cooling, high compression ratio, or the compressor is aged and losing efficiency. Allow 45 minutes of cool-down before attempting reset.",
      },
      {
        title: "Coil Sensor Fault (Code 13 or CS)",
        body: "One of the M3's temperature sensors — typically the outdoor air, entering coil, or leaving coil sensor — has failed or reported an out-of-range reading. The M3 uses these sensors to manage economizer and refrigerant staging. A failed sensor can cause the unit to lockout or operate in limited-mode.",
      },
      {
        title: "Communication Loss (Code 15 or COMM)",
        body: "On networked units, a loss of communication between the M3 board and an expansion board, remote panel, or BAS gateway triggers a communication fault. Check field wiring, terminal connections at the M3 board and remote modules, and verify proper termination on the communication bus.",
      },
    ],
    sequenceNotes: [
      "Cooling: M3 receives Y call → enables outdoor fan → enables compressor contactor after OFD timer (3 seconds default) → monitors HP/LP switches and coil sensors continuously",
      "Heating: M3 receives W call → M3 verifies OAT is below heating lockout setpoint → enables inducer → waits for draft proving switch to close (90 seconds max) → opens gas valve, fires igniter → monitors flame sensor current → locks out if no flame after TFI period",
      "HP/LP auto-reset: M3 allows up to 3 auto-resets (default, configurable) on HP/LP faults within a 60-minute window before entering hard lockout requiring manual reset",
      "Ignition: M3 allows 3 ignition trials before hard lockout on ignition failures",
      "M3 fault codes are accessible via the M3 display or Lennox Prodigy service interface — always pull fault history before beginning physical diagnosis",
    ],
    meterChecks: [
      { measurement: "M3 Board 24VAC Supply", expected: "24V AC ±2V", note: "Measured at J1 terminal block on M3 board" },
      { measurement: "Flame Sensor Microamp Signal", expected: "1.5–5 µA DC", note: "In-flame signal; below 0.5 µA causes lockout" },
      { measurement: "Draft Pressure Switch", expected: "Closed during inducer operation", note: "Open at run = blocked flue or weak inducer" },
      { measurement: "Coil Temperature Sensor Resistance", expected: "Per Lennox spec table (NTC thermistor)", note: "Compare reading to ambient temp vs resistance chart" },
      { measurement: "HP Switch", expected: "Closed below 410 PSIG (R-410A)", note: "Open at rest = failed switch or trapped high side" },
      { measurement: "LP Switch", expected: "Closed above 50 PSIG (R-410A)", note: "Open at rest = system in deep vacuum or failed switch" },
    ],
    resetSteps: [
      "Identify and read the M3 fault code from the display before clearing — take a photo for documentation",
      "Address the root cause of the fault (do not just clear and restart without correcting the underlying issue)",
      "Perform a manual reset: press and hold the M3 reset button for 3 seconds, or cycle power at the unit disconnect for 30 seconds",
      "For HP/LP auto-reset faults, confirm system pressures are within normal range before reset",
      "For ignition lockout, confirm gas supply, gas valve operation, and flame sensor condition before reset",
      "After reset, observe the first call to confirm the unit completes a full run cycle without faulting",
    ],
    repeatFailures: [
      "Repeated HP lockouts with clean condenser coil suggest refrigerant overcharge or non-condensable gases",
      "Repeated LP lockouts with normal-appearing system suggest intermittent refrigerant leak or TXV hunting",
      "Repeated ignition lockouts after flame sensor cleaning suggest gas pressure fluctuation or a failing gas valve solenoid",
      "Repeated communication faults during rain or humidity suggest a wiring insulation issue in outdoor communication runs",
    ],
    whenReplacement: [
      "Compressor has locked out on overload more than 3 times in one season — compressor winding insulation may be degrading",
      "M3 board displays communication errors that persist after wiring verification — M3 processor or expansion modules may need replacement",
      "Flame sensor has been cleaned multiple times and microamp signal is still below 0.5 µA with a good flame — replace the sensor rod",
      "Gas valve tests show voltage at terminals but no gas flow — replace the gas valve",
    ],
    whenEscalate: [
      "Any fault code pointing to a heat exchanger issue or rollout condition — requires combustion analysis and heat exchanger inspection before restart",
      "Compressor locked out on overload with evidence of liquid flood-back or oil loss — requires refrigerant system evaluation",
      "M3 board or expansion module replacement — requires Lennox service training for calibration and configuration",
      "Units under active manufacturer warranty — lockout repair should be performed by a Lennox authorized service provider",
    ],
    relatedSlug: "rooftop-unit-ignition-lockout",
    relatedTitle: "Rooftop Unit Ignition Lockout Causes",
  },

  {
    slug: "carrier-rtu-high-pressure-lockout-reset",
    metaTitle: "Carrier RTU High Pressure Lockout Reset | UnitDown",
    metaDescription:
      "Why Carrier commercial rooftop units lock out on high pressure and how technicians diagnose and safely reset the fault.",
    h1: "Carrier RTU High Pressure Lockout Reset",
    brand: "Carrier",
    intro:
      "High-pressure lockout on a Carrier commercial RTU (WeatherMaker, 48/50 series) is one of the most common service calls in peak summer months. The refrigerant circuit exceeded the high-pressure switch cutout point and the compressor was shut down by the control board. Before resetting, the cause must be identified or the fault will return — often faster the second time.",
    symptoms: [
      "Unit not cooling, no compressor operation",
      "Carrier control board fault light on or flash code indicating HP fault",
      "High-side refrigerant pressure elevated at gauges even after shutdown",
      "Condenser section noticeably hot to the touch",
      "Building temperature rising with thermostat calling for cooling",
    ],
    likelyCauses: [
      {
        title: "Dirty Condenser Coil",
        body: "The most common cause on Carrier RTUs. Airborne debris, cottonwood, and dust build up on the condenser coil face, blocking airflow. Head pressure climbs as the condenser cannot reject heat. Clean the coil from the inside out with coil cleaner and a low-pressure water rinse.",
      },
      {
        title: "Failed Condenser Fan Motor",
        body: "One or more condenser fan motors not running causes immediate head pressure rise. Verify all condenser fans are spinning at normal speed. On Carrier units with multiple fans, check each motor individually. A single failed fan on a two-fan circuit can trigger HP lockout within minutes on a hot day.",
      },
      {
        title: "Refrigerant Overcharge",
        body: "Too much refrigerant elevates subcooling and raises head pressure. The overcharge condition typically persists across weather conditions — HP lockout occurs even on moderate ambient days. Verify subcooling against the manufacturer's charging chart for the current ambient and indoor conditions.",
      },
      {
        title: "Non-Condensable Gases",
        body: "Air or nitrogen in the refrigerant circuit raises head pressure disproportionately to outdoor temperature. Non-condensables accumulate at the top of the condenser and create a thermal blanket. The system will have elevated discharge pressure with normal or low subcooling.",
      },
      {
        title: "High Ambient Temperature Condition",
        body: "Carrier RTUs have published maximum ambient operating temperatures (typically 115°F on 48/50 series). On days exceeding this, the unit may trip HP lockout even if everything is functioning correctly. Verify the installation meets manufacturer clearance requirements for condenser airflow.",
      },
      {
        title: "Blocked Condenser Discharge Air",
        body: "Obstructions above or around the condenser — parapets, equipment, or another unit — recirculate hot discharge air back through the condenser. Head pressure rises even with a clean coil and working fans. Check clearances per Carrier installation requirements.",
      },
    ],
    sequenceNotes: [
      "Carrier 48/50 series: thermostat Y call → control board enables outdoor fan contactor → 3-second fan pre-run → compressor contactor enabled → HP/LP switches monitored continuously",
      "HP lockout: switch opens at cutout pressure → board de-energizes compressor contactor immediately → fault logged with timestamp",
      "Auto-reset: most Carrier commercial boards allow 3 HP auto-resets within a rolling 60-minute period — after 3 trips, hard lockout requires manual reset",
      "Hard lockout reset: cycle disconnect power for 30 seconds or press reset button on board if equipped",
    ],
    meterChecks: [
      { measurement: "Discharge Pressure (R-410A)", expected: "375–425 PSIG at full load", note: "Above 450 PSIG at trip = confirmed HP issue" },
      { measurement: "Subcooling (liquid line)", expected: "10–15°F", note: "High subcooling (>20°F) suggests overcharge" },
      { measurement: "Condenser Fan Motor Amp Draw", expected: "Within 10% of nameplate FLA", note: "High amps = struggling motor; low or zero = failed" },
      { measurement: "HP Switch Continuity", expected: "Closed below cutout pressure", note: "Should open at ≥410 PSIG (R-410A)" },
      { measurement: "Condenser Coil Delta-T", expected: "Discharge air 15–25°F above ambient", note: "Low delta-T = restricted airflow through coil" },
    ],
    resetSteps: [
      "Verify system has been off long enough for pressure to stabilize (15 minutes minimum)",
      "Check discharge pressure with gauges — should be below 300 PSIG before attempting reset",
      "Inspect and clean condenser coil if needed",
      "Verify all condenser fan motors are operational",
      "Reset: cycle unit disconnect for 30 seconds, or use thermostat emergency heat/cool cycle on supported boards",
      "Restart unit and immediately observe discharge pressure — should stabilize below 425 PSIG within 5 minutes",
    ],
    repeatFailures: [
      "HP lockout recurring on hot afternoons only → condenser airflow marginal, clean coil and verify fan operation",
      "HP lockout recurring regardless of outdoor temperature → refrigerant overcharge or non-condensable contamination",
      "HP lockout on first start of the season → condenser coil heavily fouled from winter",
    ],
    whenReplacement: [
      "Condenser fan motor draws high amps and runs hot before failure — replace before the season",
      "HP switch reads open at atmospheric pressure — switch has failed and should be replaced",
      "Condenser coil damage (fin collapse, corrosion) prevents effective cleaning — coil replacement may be required",
    ],
    whenEscalate: [
      "Discharge pressure exceeds 500 PSIG at any point — potential for refrigerant circuit rupture, evacuate area",
      "HP lockout after confirmed clean coil and working fans with no overcharge — consult Carrier technical support",
      "Any refrigerant handling (recovery, recharge, non-condensable purge) requires EPA Section 608 certification",
    ],
    relatedSlug: "rtu-not-cooling-but-compressor-running",
    relatedTitle: "RTU Not Cooling But Compressor Running",
  },

  {
    slug: "trane-voyager-trips-on-heat",
    metaTitle: "Trane Voyager Unit Trips on Heat | UnitDown",
    metaDescription:
      "Why Trane Voyager commercial RTUs trip during heating calls. Ignition faults, rollout switches, heat exchanger issues explained.",
    h1: "Trane Voyager Unit Trips on Heat",
    brand: "Trane",
    intro:
      "The Trane Voyager (YSC, YHC series) is one of the most widely installed commercial rooftop units in North America. Heat trip complaints on Voyager units — where the unit shuts down during a heating call or fails to maintain setpoint — are among the most common winter service calls. The Voyager's IntelliControl board logs fault codes that are essential for efficient diagnosis.",
    symptoms: [
      "Unit starts heating cycle but shuts down within seconds or minutes",
      "Building does not reach setpoint despite thermostat W call being active",
      "IntelliControl board fault LED is flashing",
      "Unit attempts heat multiple times then stops attempting",
      "Unusual smell (burning, gas odor) at supply registers",
    ],
    likelyCauses: [
      {
        title: "Rollout Switch Trip",
        body: "The rollout switch (also called the flame rollout safety) is a one-shot thermal fuse that trips when flame rolls out of the heat exchanger. This is a critical safety condition indicating a blocked or cracked heat exchanger. Do not reset and operate the unit without thorough heat exchanger inspection. Trane Voyager rollout switches are located on the burner compartment access side.",
      },
      {
        title: "Pressure Switch Fault (Draft-Proving)",
        body: "The Voyager inducer must prove airflow through the burner heat exchanger before the gas valve opens. If the pressure switch does not close — due to a blocked vent, failed inducer, cracked pressure switch hose, or failed switch — the IntelliControl will not initiate ignition trial. Fault code typically 4 flashes.",
      },
      {
        title: "Ignition Lockout After Failed Trials",
        body: "The IntelliControl allows a set number of ignition trials (typically 3) before locking out. Dirty or failed igniter, dirty flame sensor, or intermittent gas pressure are common causes. Fault code typically 3 flashes.",
      },
      {
        title: "High Limit Trip",
        body: "The high-limit temperature control shuts down the gas valve when heat exchanger temperature exceeds the safe limit. Causes include restricted return airflow, blocked filters, failed indoor blower, or a heat exchanger design issue causing hot spots. Fault code typically 5 flashes.",
      },
      {
        title: "Gas Valve Failure",
        body: "The Trane Voyager uses a combination gas valve with separate main and pilot valve solenoids. If either solenoid fails or receives insufficient voltage, gas does not flow during trial. Verify 24VAC at the valve during an active W call and inducer operation.",
      },
    ],
    sequenceNotes: [
      "W call received → IntelliControl verifies OAT is below heating lockout setpoint",
      "Inducer motor energized → pressure switch monitored (must close within 30 seconds)",
      "After pressure switch closes → gas valve opens, igniter fires",
      "Flame sensor must prove within 7-second trial period → if no flame, gas valve closes",
      "After 3 failed trials, IntelliControl enters ignition lockout → requires manual reset or auto-reset after delay",
      "If rollout switch is open → IntelliControl will not initiate heating at all — logs fault immediately on W call",
    ],
    meterChecks: [
      { measurement: "Rollout Switch Continuity", expected: "Closed (≤1Ω)", note: "Open = tripped, requires manual reset — inspect heat exchanger first" },
      { measurement: "Draft Pressure Switch", expected: "Open at rest, closed during inducer run", note: "Stays open with inducer running = failed switch or blocked flue" },
      { measurement: "Flame Sensor Signal", expected: "1.5–5 µA DC in-flame", note: "Below 0.5 µA = dirty sensor or grounding issue" },
      { measurement: "Gas Valve Voltage (main valve)", expected: "24V AC during trial", note: "No voltage with W call = board not commanding" },
      { measurement: "High Limit Switch", expected: "Closed below 200°F (per model)", note: "Open at ambient temp = failed switch" },
    ],
    resetSteps: [
      "Read IntelliControl fault code flash pattern before resetting — count flashes and cross-reference with wiring diagram inside unit door",
      "For rollout trip: do not reset until heat exchanger has been visually inspected for cracks, gaps, or combustion gas leakage",
      "For pressure switch fault: verify inducer is running and vent is clear before reset",
      "For ignition lockout: verify gas supply, flame sensor, and igniter condition before reset",
      "Reset method: cycle main disconnect for 30 seconds, or on supported models press reset button on IntelliControl board",
    ],
    repeatFailures: [
      "Repeated high-limit trips → blower motor is failing, filters are chronically dirty, or heat exchanger is partially blocked",
      "Repeated pressure switch faults in humid weather → condensate in pressure switch hose — drain hose and replace if cracked",
      "Repeated ignition lockouts after sensor cleaning → gas pressure fluctuation at meter or regulator",
    ],
    whenReplacement: [
      "Rollout has tripped and heat exchanger has visible cracks or breach — heat exchanger replacement or RTU replacement",
      "Inducer motor draws high amps, runs hot, or shaft has bearing noise — replace inducer assembly before next heating season",
      "IntelliControl board logs multiple different fault codes in short succession — board may be failing",
    ],
    whenEscalate: [
      "Any rollout trip — this is a potential carbon monoxide hazard and requires licensed technician inspection before restart",
      "Combustion air or flue vent blockage — may indicate building pressurization issue requiring mechanical engineering review",
      "Gas pressure issues at the meter or building regulator — contact the gas utility or licensed gas piping contractor",
    ],
    relatedSlug: "lennox-prodigy-m3-lockout-causes",
    relatedTitle: "Lennox Prodigy M3 Lockout Causes",
  },

  {
    slug: "york-simplicity-board-random-shutdown",
    metaTitle: "York Simplicity Board Random Shutdown | UnitDown",
    metaDescription:
      "York Simplicity control board causes random shutdowns. Fault codes, sensor issues, and control board diagnosis.",
    h1: "York Simplicity Board Random Shutdown",
    brand: "York",
    intro:
      "The York Simplicity controller (used on York YCH, YHH, and ZJ series units) manages all unit functions including compressor staging, economizer control, heating sequencing, and protection controls. Random or intermittent shutdowns with no obvious pattern are often caused by transient faults, sensor issues, or power quality problems that are difficult to capture in real time. The Simplicity's fault history is the most important diagnostic tool.",
    symptoms: [
      "Unit shuts down without a consistent pattern — sometimes during cooling, sometimes during heating",
      "Building temperature control is erratic — unit runs for varying periods before shutting off",
      "York Simplicity fault LED or display shows codes that clear on their own",
      "Unit restarts on its own after a few minutes and runs normally",
      "No obvious mechanical noise or visible component failure",
    ],
    likelyCauses: [
      {
        title: "Intermittent Sensor Fault",
        body: "The Simplicity board relies on multiple temperature sensors — outdoor air, return air, supply air, and coil sensors. A sensor with an intermittent connection, corroded terminal, or cracked housing may report a legitimate out-of-range reading under specific thermal conditions (vibration, heat soak, cold startup). Pull sensor fault history and check wiring at each sensor terminal.",
      },
      {
        title: "Control Power Quality Issue",
        body: "Voltage spikes, brownouts, or momentary power interruptions can cause the Simplicity microprocessor to reset or log a false fault. Check power quality at the unit main disconnect during a suspected event window. An inline power quality meter or data logger installed at the unit can capture intermittent voltage issues.",
      },
      {
        title: "Safety Input Chattering",
        body: "A safety switch (HP, LP, freeze stat) with a marginal condition — operating very close to its trip point — may open and close repeatedly before latching open. Each opening triggers a shutdown. The fault history will show repeated HP or LP trips. This pattern warrants thorough refrigerant circuit and coil inspection.",
      },
      {
        title: "Aging Simplicity Board Capacitors",
        body: "On older Simplicity boards (10+ years), electrolytic capacitors on the board can degrade, causing microprocessor instability. Random resets with no clear fault code, or fault codes that do not match actual field conditions, suggest board aging. Board replacement is the solution.",
      },
      {
        title: "Loose Field Wiring at Board Terminals",
        body: "Vibration from the RTU itself can loosen screw terminals on the Simplicity board over time. A loose 24VAC input or a loose safety input creates intermittent continuity. Tighten all terminal connections at J1, J2, and J3 connectors on the Simplicity board.",
      },
    ],
    sequenceNotes: [
      "Simplicity board monitors all inputs continuously — any input that exceeds limits triggers immediate protective action",
      "Fault history is accessed via the Simplicity keypad (Enter + Up arrow simultaneously on most models) — displays last 12 faults with timestamp",
      "If fault code is 'NONE' but unit shut down, the shutdown was commanded by the thermostat or BAS, not by a board protection event",
      "Simplicity 'Auto-reset' vs 'Manual reset' faults: check the fault code list in the unit wiring diagram to determine which faults auto-reset",
    ],
    meterChecks: [
      { measurement: "Control Power at Board (J1)", expected: "24V AC ±2V", note: "Measure under load — sag indicates transformer issue" },
      { measurement: "All Sensor Resistance Values", expected: "Per York sensor table for ambient temp", note: "Out-of-range = sensor or wiring fault" },
      { measurement: "Safety Input Continuity (HP, LP, freeze stat)", expected: "All closed at ambient conditions", note: "Any open safety at rest = fault source" },
      { measurement: "Board Terminal Tightness", expected: "Firm, no movement on terminal pull", note: "Loose terminal = intermittent fault source" },
    ],
    resetSteps: [
      "Retrieve and document the last 12 fault codes from the Simplicity fault history before any reset",
      "If faults are all the same type (all HP, all sensor X) — address that specific fault before reset",
      "If faults are mixed or random — suspect power quality or board issue",
      "Reset: cycle main disconnect for 30 seconds or use board reset function via keypad (Hold Reset button 5 seconds on most models)",
    ],
    repeatFailures: [
      "Same fault code every 2–4 hours → marginal condition on that safety device, not yet fully latched",
      "Random different fault codes → board aging or power quality",
      "Shutdowns only in afternoon heat → high ambient thermal stress exposing marginal component",
    ],
    whenReplacement: [
      "Board shows fault codes that do not correspond to any real field condition and all field wiring checks are verified good",
      "Board is 12+ years old and fault frequency is increasing — proactive replacement before peak season is recommended",
      "York technical support confirms a known firmware issue for that board revision",
    ],
    whenEscalate: [
      "Power quality issues requiring utility intervention or building electrical work",
      "Simplicity board replacement and configuration — requires York-specific parameters and functional test",
      "BAS integration issues causing unwanted shutdown commands — controls technician required",
    ],
    relatedSlug: "thermostat-calling-but-no-cooling",
    relatedTitle: "Thermostat Calling But No Cooling",
  },

  {
    slug: "aaon-freeze-protection-alarm-causes",
    metaTitle: "Aaon Freeze Protection Alarm Causes | UnitDown",
    metaDescription:
      "AAON RTU freeze protection alarm causes. Coil sensor faults, low refrigerant, and airflow issues on AAON commercial units.",
    h1: "Aaon Freeze Protection Alarm Causes",
    brand: "AAON",
    intro:
      "AAON commercial rooftop units (RN, RL, RQ series) use a coil temperature sensor to detect dangerously low evaporator temperatures that indicate the coil is approaching or reaching freeze conditions. When the freeze protection alarm activates, the unit shuts down compressor operation to prevent coil icing that can damage the unit, block airflow, and damage the heat exchanger. This fault requires investigation before restart.",
    symptoms: [
      "AAON unit display or fault output shows 'Freeze Protection' or 'Low Coil Temp' alarm",
      "Compressor shut down; indoor blower may continue to run",
      "Evaporator coil visible through access panel shows frost or ice formation",
      "Supply air temperature warmer than expected after fault",
      "Repeated freeze alarms within hours of each other",
    ],
    likelyCauses: [
      {
        title: "Low Refrigerant Charge",
        body: "A refrigerant leak lowers suction pressure. As suction pressure drops, the evaporating temperature drops below 32°F and the coil freezes. AAON freeze protection is specifically designed to catch this condition early. Verify suction pressure and superheat — both will be abnormal with low charge.",
      },
      {
        title: "Low Airflow Across Evaporator",
        body: "Restricted airflow allows the coil to drop temperature rapidly with only a small refrigerant load. Dirty filters, a blocked return air path, a slowing blower motor, or a closed zone damper are common causes. The coil cools the air effectively but the reduced airflow means the coil temperature drops further than designed.",
      },
      {
        title: "Dirty Evaporator Coil",
        body: "Dirt and biofilm on the coil surface act as an insulator, reducing heat transfer and causing the refrigerant-side temperature to drop below the freeze point even at normal charge and airflow. AAON coils are often high-efficiency and have tight fin spacing that is susceptible to fouling.",
      },
      {
        title: "Freeze Stat Sensor Failure or Mis-Mounting",
        body: "If the coil temperature sensor is not making good contact with the coil (it should be clipped to a fin near the center of the coil face), it may read erroneously cold or warm. A sensor that has fallen off the coil, is coated in ice, or has a damaged lead wire can trigger false freeze alarms.",
      },
      {
        title: "Low Outdoor Temperature Operation",
        body: "AAON units in cooling mode at low ambient temperatures can develop freeze conditions at normal charge. Verify the unit is not being commanded to cool when outdoor temperatures are below the minimum cooling ambient (typically 45–55°F on AAON units). Low ambient cooling kits and controls are available.",
      },
    ],
    sequenceNotes: [
      "AAON freeze protection: coil temp sensor monitored continuously during cooling operation",
      "When coil temp drops below the freeze setpoint (typically 28–32°F, configurable), compressor is de-energized",
      "Blower continues to run in defrost mode to melt ice accumulation",
      "After coil temperature rises above the release setpoint, cooling can restart if the call is still active",
      "After a set number of freeze events in a rolling time window, AAON units may enter lockout requiring manual reset",
      "AAON Microprocessor Controller (E7 or E9 series) logs all alarm events — access via front panel or ModBus",
    ],
    meterChecks: [
      { measurement: "Suction Pressure (R-410A)", expected: "115–130 PSIG at design conditions", note: "Below 80 PSIG with normal airflow = low charge" },
      { measurement: "Coil Temperature Sensor Reading", expected: "Within 5°F of saturated suction temp", note: "Large discrepancy = sensor mis-mounted or failed" },
      { measurement: "Evaporator Superheat", expected: "8–12°F TXV system", note: "Below 5°F = potential flood-back; above 20°F = low charge" },
      { measurement: "Airflow CFM", expected: "Per AAON design (typically 400 CFM/ton)", note: "Below 300 CFM/ton = airflow restriction contributing to freeze" },
      { measurement: "Filter Static Pressure Drop", expected: "Less than 0.3 in. w.c. clean", note: "High static = dirty filter driving freeze condition" },
    ],
    resetSteps: [
      "Allow the unit to complete its defrost cycle with blower running — do not interrupt blower operation",
      "Confirm coil is fully defrosted (no ice visible through access port) before restart",
      "Address root cause before restart — check filters, verify refrigerant pressures, inspect coil sensor mounting",
      "Reset method: depends on AAON model — most require cycling unit off via thermostat for 5+ minutes or clearing alarm via E7/E9 controller interface",
    ],
    repeatFailures: [
      "Freeze alarm recurring every 2–4 hours → low refrigerant charge slowly worsening or marginal TXV feeding",
      "Freeze alarms correlating with occupancy schedule → filters dirty, airflow drops when VAV boxes close at low load",
      "Freeze alarm only during first cooling call of the day → cold coil startup with low ambient condition",
    ],
    whenReplacement: [
      "Freeze stat sensor reads out-of-range at known ambient temperature — replace the coil temperature sensor",
      "Evaporator coil is fouled with microbial growth that cannot be cleaned — coil replacement",
    ],
    whenEscalate: [
      "Low refrigerant charge confirmed — requires EPA 608-certified technician for leak finding and recharge",
      "AAON controller parameter access for setpoint changes (freeze setpoint, minimum cooling ambient) — requires AAON service training",
      "Repeated freeze faults despite normal charge and airflow — AAON technical support line should be consulted",
    ],
    relatedSlug: "high-superheat-troubleshooting-chart",
    relatedTitle: "High Superheat Troubleshooting Chart",
  },

  {
    slug: "daikin-rtu-safety-lockout-reset",
    metaTitle: "Daikin RTU Safety Lockout Reset | UnitDown",
    metaDescription:
      "Daikin Applied commercial RTU safety lockout causes and reset procedures. Fault codes, sensor diagnostics, and field steps.",
    h1: "Daikin RTU Safety Lockout Reset",
    brand: "Daikin Applied",
    intro:
      "Daikin Applied commercial rooftop units (Rebel, Applied RTU, formerly McQuay models) use an integrated microprocessor controller with comprehensive fault logging. A safety lockout means the controller detected a condition outside safe operating parameters and has shut down one or more system functions. The controller's fault history is essential before any reset attempt.",
    symptoms: [
      "Daikin unit display shows alarm code or lockout indicator",
      "Compressor, blower, or heating section not operating on a valid call",
      "Building temperature out of setpoint range for extended period",
      "BAS alarm point energized for Daikin unit fault",
      "Unit attempted operation, alarmed, and has not retried",
    ],
    likelyCauses: [
      {
        title: "High-Pressure Switch Lockout",
        body: "The high-pressure safety has opened, indicating discharge pressure exceeded the cutout setpoint. On R-410A Daikin units this is typically 610 PSIG cutout. Clean condenser coil, verify condenser fan operation, and check for refrigerant overcharge before reset.",
      },
      {
        title: "Low-Pressure Switch Lockout",
        body: "Suction pressure dropped below the low-pressure cutout. On R-410A units typically 40–50 PSIG cutout. Indicates low charge, restricted metering device, or frozen evaporator. The controller may attempt auto-resets — after the configured number of resets without successful operation, it enters hard lockout.",
      },
      {
        title: "Discharge Temperature Sensor Fault",
        body: "Daikin Applied units monitor compressor discharge temperature directly via a sensor on the discharge line. If discharge temperature exceeds the setpoint (typically 240°F) or the sensor fails and reads out-of-range, the controller shuts the compressor. Check sensor resistance against the temperature-resistance chart.",
      },
      {
        title: "Motor Protection Trip",
        body: "The compressor, supply fan, or condenser fan motor protection relay (or internal thermal overload) has opened. Verify each motor's thermal protection has reset (allow 30–60 minute cool-down for compressors). Check amp draw against FLA after restart.",
      },
      {
        title: "Communication Bus Fault",
        body: "Daikin Applied units using Modbus or BACnet communication with expansion boards may lockout if communication is lost. Verify field communication wiring integrity and termination. Check for loose terminal connections at all communication ports.",
      },
    ],
    sequenceNotes: [
      "Daikin Applied controller monitors all safety inputs with a configurable auto-reset count — typically 3 auto-resets before hard lockout",
      "Hard lockout requires manual reset via the controller interface — cycling power alone may not clear a hard lockout on all models",
      "Fault log is accessible via the Daikin controller display interface — navigate to Diagnostics → Fault History",
      "Discharge temperature protection has a separate lockout from HP/LP switches — board confirms discharge temp within range before restarting",
    ],
    meterChecks: [
      { measurement: "Discharge Temperature Sensor", expected: "Per Daikin resistance-temperature curve", note: "Disconnect and measure ohms, compare to chart at ambient" },
      { measurement: "HP Switch", expected: "Closed at ambient, opens at 610 PSIG (R-410A)", note: "Open at atmospheric = failed switch" },
      { measurement: "LP Switch", expected: "Closed above 50 PSIG (R-410A)", note: "Open at startup = unit in vacuum or failed switch" },
      { measurement: "Supply Fan Motor Amps", expected: "Within nameplate FLA", note: "Over FLA = motor overloading or belt drive issue" },
      { measurement: "Communication Bus Voltage (Modbus/BACnet)", expected: "As per bus spec (RS-485: ~5V differential)", note: "No voltage = communication wire break or controller port failure" },
    ],
    resetSteps: [
      "Navigate to Fault History on controller display and record all active and historical fault codes",
      "Address root cause of the most recent fault before proceeding",
      "For hard lockout: navigate to Diagnostics → Reset Alarms → Confirm on controller display (model-specific — refer to unit IOM)",
      "After reset, observe first call cycle closely — monitor discharge temperature and system pressures",
      "If fault recurs within 10 minutes of restart, do not continue resetting — diagnose before further operation",
    ],
    repeatFailures: [
      "Repeated discharge temperature faults → compressor running at high compression ratio, verify system charge and airflow",
      "Repeated LP faults with normal refrigerant charge → TXV restricting or freeze-up cycle",
      "Repeated communication faults after wet weather → moisture in outdoor communication wiring conduit",
    ],
    whenReplacement: [
      "Discharge temperature sensor reads out-of-range at known conditions after re-checking wiring — replace sensor",
      "Controller display fails to clear lockout after reset procedure — controller board may need replacement",
    ],
    whenEscalate: [
      "Discharge temperature sustained over 220°F before lockout → potential compressor failure developing, do not operate without refrigerant system evaluation",
      "Controller parameter changes (setpoint adjustments, auto-reset counts) — Daikin Applied authorized service provider required",
      "Units under Daikin service agreement — lockout documentation and repair authorization may be required",
    ],
    relatedSlug: "carrier-rtu-high-pressure-lockout-reset",
    relatedTitle: "Carrier RTU High Pressure Lockout Reset",
  },

  {
    slug: "goodman-commercial-pressure-switch-trips",
    metaTitle: "Goodman Commercial Pressure Switch Trips | UnitDown",
    metaDescription:
      "Why Goodman commercial HVAC pressure switches trip repeatedly and how technicians diagnose inducer and refrigerant circuit faults.",
    h1: "Goodman Commercial Pressure Switch Trips",
    brand: "Goodman",
    intro:
      "Goodman commercial gas furnaces and package units (GPG, CPG series) use draft-proving pressure switches on the heating circuit and refrigerant HP/LP switches on the cooling circuit. Repeated pressure switch trips are a leading cause of no-heat callbacks on Goodman commercial equipment. Each type of pressure switch has a different diagnostic path.",
    symptoms: [
      "Unit not heating — pressure switch preventing ignition trial",
      "Goodman control board fault LED indicates pressure switch open",
      "Unit attempts inducer start but shuts down before gas valve opens",
      "Intermittent heating — works for a while then stops",
      "Continuous fan operation with no heating",
    ],
    likelyCauses: [
      {
        title: "Blocked or Restricted Flue Vent",
        body: "A blocked flue vent prevents the inducer from creating sufficient negative pressure to close the draft pressure switch. Bird nests, ice, debris, and deteriorated vent pipes are common causes. Inspect the full vent run from the unit to the discharge point for any obstruction.",
      },
      {
        title: "Failed Inducer Motor",
        body: "An inducer motor that is running below rated RPM (failing bearings, weak capacitor) does not generate enough pressure differential to close the switch. Measure inducer amp draw and verify rotation speed. A motor running at reduced speed may not trip immediately — the fault may be intermittent at first.",
      },
      {
        title: "Cracked or Disconnected Pressure Switch Hose",
        body: "The small rubber or vinyl hose connecting the pressure switch to the inducer housing can crack, pull off a fitting, or become pinched. Any leak in this hose prevents proper pressure sensing. Inspect the full hose run, especially where it connects to the inducer housing port and the switch fitting.",
      },
      {
        title: "Failed Pressure Switch",
        body: "Pressure switches can fail open (always reads open), fail closed (always reads closed — a safety risk), or have calibration drift. Test the switch by disconnecting the hose, applying controlled negative pressure with a manometer, and verifying the switch closes at the rated setpoint.",
      },
      {
        title: "Condensate in the Pressure Switch Hose",
        body: "Goodman condensing furnaces and some package units produce condensate in the heat exchanger that can migrate into the pressure switch hose, blocking the sensing port. Drain any water from the hose and the switch body before testing. Ensure the drain trap is functioning properly.",
      },
    ],
    sequenceNotes: [
      "W call received → control board energizes inducer motor",
      "Inducer runs → pressure switch monitors for switch closure (must close within 90 seconds on most Goodman boards)",
      "If pressure switch closes → board waits for pre-purge time → opens gas valve → fires spark igniter",
      "If pressure switch does not close within timeout → board de-energizes inducer, logs PS fault, attempts retry",
      "After 3 consecutive pressure switch faults → board locks out heating",
    ],
    meterChecks: [
      { measurement: "Pressure Switch Continuity (inducer running)", expected: "Closed (continuity) during inducer run", note: "Open = pressure not being sensed or switch failed" },
      { measurement: "Draft Pressure (manometer at hose port)", expected: "Per Goodman spec (typically −0.5 to −1.2 in. w.c.)", note: "Insufficient negative pressure = inducer or vent problem" },
      { measurement: "Inducer Motor Amp Draw", expected: "Within 10% of nameplate", note: "Low amps with running motor = weak motor" },
      { measurement: "Pressure Switch Hose Integrity", expected: "No cracks, fully seated on both fittings", note: "Any air leak = failed pressure sensing" },
    ],
    resetSteps: [
      "Verify there is no active vent blockage before attempting reset",
      "Check pressure switch hose and confirm it is intact and properly connected",
      "Allow unit to cool (5 minutes) then cycle thermostat off and on to initiate a new sequence",
      "For hard lockout: cycle main disconnect for 30 seconds",
    ],
    repeatFailures: [
      "Pressure switch trips only in cold weather → condensate freezing in vent or hose",
      "Pressure switch trips after several minutes → inducer motor thermally limiting as it heats up",
      "Pressure switch trips initially then clears → partial hose blockage that clears with repeated inducer cycling",
    ],
    whenReplacement: [
      "Pressure switch tests at incorrect setpoint with new hose and clear vent — replace switch",
      "Inducer motor draws over-amperage consistently — replace motor assembly",
      "Cracked heat exchanger identified during inspection — heat exchanger or unit replacement required",
    ],
    whenEscalate: [
      "Suspected cracked heat exchanger — combustion analysis and licensed technician inspection required before restart",
      "Gas supply issues or regulator problems — contact gas utility or licensed gas contractor",
    ],
    relatedSlug: "rooftop-unit-ignition-lockout",
    relatedTitle: "Rooftop Unit Ignition Lockout Causes",
  },

  {
    slug: "rheem-ignition-retry-lockout",
    metaTitle: "Rheem Ignition Retry Lockout | UnitDown",
    metaDescription:
      "Rheem commercial HVAC ignition retry lockout causes. Flame sensor faults, gas valve issues, and board diagnostics.",
    h1: "Rheem Ignition Retry Lockout",
    brand: "Rheem",
    intro:
      "Rheem and Ruud commercial package units (RKKL, RKRL, RKJL series) use a direct-spark ignition system with an integrated control board that performs multiple ignition trials before locking out. Understanding the retry sequence and what each trial failure means is key to efficient diagnosis and getting the unit back on heat.",
    symptoms: [
      "Unit not heating after multiple retry attempts",
      "Rheem control board fault light blinking in a specific pattern",
      "Unit makes clicking sounds during trial but no ignition",
      "Gas odor detected briefly during failed trials",
      "Unit locked out after several ignition attempts — will not retry without reset",
    ],
    likelyCauses: [
      {
        title: "Dirty Flame Sensor",
        body: "The flame sensor rod in Rheem units oxidizes over time and loses its ability to conduct microamp current through the flame. This is the most common cause of ignition retry lockout in the field. Clean with fine emery cloth — wipe in one direction only along the rod. If the ceramic insulator is cracked, replace the sensor.",
      },
      {
        title: "Igniter Failure or Degraded Spark",
        body: "The silicon carbide or silicon nitride igniter in Rheem units can crack or develop high resistance. On hot-surface igniter models, verify the igniter glows visibly orange within 30 seconds of a heating call. On DSI spark models, listen for a consistent clicking pattern during trial. A weak spark will not reliably light the burner.",
      },
      {
        title: "Gas Pressure Below Specification",
        body: "Rheem gas valves require adequate manifold pressure to flow enough gas for reliable ignition. Verify manifold pressure during a call with the gas valve open. Natural gas manifold pressure should be 3.2–3.8 in. w.c. Low pressure from a building regulator, an undersized gas line, or high-demand conditions will cause ignition failure.",
      },
      {
        title: "Rollout Safety Open",
        body: "A rolled-out or tripped rollout switch prevents the heating sequence entirely on Rheem units. If a rollout has tripped, the board typically does not attempt ignition and displays a specific fault code. Do not manually reset the rollout without inspecting the heat exchanger for the cause of flame rollout.",
      },
      {
        title: "Induced Draft Pressure Switch Fault",
        body: "Rheem units require draft-proving before ignition. A failed pressure switch or blocked vent prevents the sequence from reaching ignition trial. The board logs a pressure switch fault (typically different flash code from ignition lockout).",
      },
    ],
    sequenceNotes: [
      "W call → board pre-checks safety inputs (rollout, limit, pressure switch) → energizes inducer",
      "Draft pressure switch must close within 30 seconds of inducer start",
      "After pressure switch close → inducer pre-purge (30 seconds typical) → igniter energizes",
      "On hot-surface models: igniter heats for 30–45 seconds → gas valve opens → board monitors flame sensor",
      "On DSI models: spark begins → gas valve opens simultaneously → board monitors flame sensor current",
      "Flame sensor must read >0.5 µA within 7 seconds → if not, gas valve closes, retry begins",
      "After 3 failed trials → board locks out → specific flash code displayed",
    ],
    meterChecks: [
      { measurement: "Flame Sensor Microamp Output", expected: "1.5–5 µA during flame", note: "Below 0.5 µA = clean sensor, verify signal again" },
      { measurement: "Hot Surface Igniter Resistance", expected: "40–75Ω at room temperature (silicon carbide)", note: "OL = cracked igniter; low resistance = shorted (rare)" },
      { measurement: "Gas Manifold Pressure", expected: "3.2–3.8 in. w.c. (natural gas)", note: "Measure with U-tube manometer during valve-open" },
      { measurement: "Rollout Switch Continuity", expected: "Closed (≤1Ω) — manual reset required if tripped", note: "Open = tripped rollout, inspect heat exchanger" },
      { measurement: "Board 24VAC Input", expected: "24V AC ±2V", note: "Low voltage = transformer overload or failing transformer" },
    ],
    resetSteps: [
      "Note the fault code flash pattern before resetting — 2 flashes, 3 flashes, etc. each mean a different fault on Rheem boards",
      "Address root cause: clean flame sensor if ignition lockout, verify gas pressure, inspect rollout if rollout fault",
      "Reset method: cycle disconnect power for 30 seconds",
      "After reset, observe full trial sequence — listen for inducer start, spark click, gas valve click, and flame establishment",
      "Do not perform more than 3 manual resets without diagnosing why the previous ignition failed",
    ],
    repeatFailures: [
      "Flame sensor cleaned multiple times per season → consider annual sensor replacement proactively",
      "Ignition lockout in cold weather only → gas pressure drops when building demand is high in cold weather, manifold pressure dips below ignition threshold",
      "Lockout only on initial morning startup → hot-surface igniter has high resistance when cold, but clears as it warms on retry",
    ],
    whenReplacement: [
      "Hot-surface igniter glows but dims and fails to establish flame after multiple cleanings → igniter degraded, replace",
      "Gas valve receives 24V but flow cannot be confirmed — replace valve after verifying supply pressure is adequate",
      "Flame sensor cleaned twice and still reading below 0.5 µA → replace sensor rod",
    ],
    whenEscalate: [
      "Rollout trip — requires heat exchanger inspection by licensed technician before any restart",
      "Gas pressure issues at the building regulator or meter — utility or licensed gas contractor required",
      "Repeated ignition lockout with no identifiable component fault — Rheem technical service line should be contacted",
    ],
    relatedSlug: "rooftop-unit-ignition-lockout",
    relatedTitle: "Rooftop Unit Ignition Lockout Causes",
  },

  {
    slug: "carrier-economizer-fault-causes",
    metaTitle: "Carrier Economizer Fault Causes | UnitDown",
    metaDescription:
      "Carrier commercial RTU EconoMi$er fault codes and causes. Actuator failures, sensor faults, and controller diagnostics.",
    h1: "Carrier Economizer Fault Causes",
    brand: "Carrier",
    intro:
      "The Carrier EconoMi$er IV and EconoMi$er X are integrated economizer controllers used on Carrier WeatherMaker and other commercial RTUs. Faults on these controllers range from sensor failures to actuator mechanical problems to control board failures. When an economizer fault is active, the unit typically defaults to minimum outdoor air or full outdoor air — both of which reduce energy efficiency and in some cases hurt building comfort significantly.",
    symptoms: [
      "Carrier unit display or BAS showing economizer fault code",
      "Building humidity complaints — outdoor air not being managed properly",
      "Unit running more mechanical cooling than expected on mild days",
      "Supply air temperature higher than setpoint despite cooling operation",
      "Economizer damper blade stuck in open or closed position",
    ],
    likelyCauses: [
      {
        title: "OAT or Enthalpy Sensor Fault",
        body: "The EconoMi$er uses an outdoor air temperature (OAT) sensor and optionally an enthalpy sensor to determine when free cooling is available. A sensor reading out-of-range forces the controller to fault or operate in a degraded mode. Measure the sensor resistance or voltage against the Carrier sensor table for the current actual temperature.",
      },
      {
        title: "Actuator Failure",
        body: "The EconoMi$er actuator drives the damper blade to the commanded position. Actuator failure can cause the blade to remain at whatever position it was in when the actuator failed. Test by disconnecting the actuator and manually moving the damper — should move freely. Then verify the control signal at the actuator with a voltmeter.",
      },
      {
        title: "Damper Blade Binding",
        body: "Corrosion, bent blade, or dislodged hardware can prevent the damper from traveling its full stroke. The actuator may torque-limit and trigger a fault. Inspect blade clearances and hardware, and clean blade edges and pivot shafts.",
      },
      {
        title: "Control Board Communication Loss",
        body: "On EconoMi$er X models, the economizer module communicates with the unit's Comfort Controller via a proprietary bus. Communication loss between modules triggers a fault and defaults the economizer to a safe position. Check bus wiring at J5/J6 connectors on the EconoMi$er board.",
      },
      {
        title: "DX Mechanical Cooling Lockout Not Working",
        body: "The EconoMi$er should lock out mechanical cooling when free cooling is available and conditions are acceptable. If the lockout contact is not functioning, the compressor may run simultaneously with full outside air — an energy penalty and a potential coil icing condition.",
      },
    ],
    sequenceNotes: [
      "EconoMi$er IV: standalone controller, OAT sensor input, 0–10V actuator output, separate DX lockout relay output",
      "EconoMi$er X: communicates with Carrier Comfort Controller II board, BACnet integration available",
      "Free cooling mode: OAT below setpoint AND (if enthalpy control) OA enthalpy below return enthalpy → actuator drives to full open, DX locked out",
      "Mixed air mode: OAT above cooling setpoint but free cooling helps → actuator modulates to minimum mixed air setpoint",
      "Fault mode: sensor out of range or actuator feedback fault → controller defaults to minimum OA position (mechanical cooling still available)",
    ],
    meterChecks: [
      { measurement: "OAT Sensor Resistance", expected: "Per Carrier NTC table for actual temp", note: "Out-of-range = sensor or wiring fault" },
      { measurement: "Actuator Control Signal", expected: "0–10V DC proportional to demand", note: "Constant 0V with active call = board not outputting" },
      { measurement: "Actuator Feedback Signal", expected: "Tracks control signal (±0.5V)", note: "No tracking = mechanical or motor fault in actuator" },
      { measurement: "DX Lockout Relay", expected: "Open when economizer in full free-cooling", note: "Closed when should be open = lockout not working" },
    ],
    resetSteps: [
      "Read fault code from EconoMi$er IV display or Comfort Controller interface",
      "Address identified fault (sensor replacement, actuator replacement, wiring repair)",
      "Cycle unit power off for 30 seconds to clear latched faults",
      "Verify actuator travels through full stroke on restart",
      "Verify DX lockout relay operates correctly by observing compressor behavior during free-cooling condition",
    ],
    repeatFailures: [
      "Sensor faults recurring → check wiring for intermittent ground fault or chafed insulation from vibration",
      "Actuator fault recurring after replacement → damper blade is binding and over-torquing the replacement actuator — fix damper first",
    ],
    whenReplacement: [
      "Actuator fails within one season of replacement — suspect damper binding is destroying actuators",
      "EconoMi$er IV board shows erratic output with all sensors verified good — replace control module",
    ],
    whenEscalate: [
      "EconoMi$er X integration with BACnet or LON requires controls technician programming",
      "Damper blade damage requiring ductwork modification — sheet metal contractor required",
    ],
    relatedSlug: "economizer-stuck-open-symptoms",
    relatedTitle: "Economizer Stuck Open Symptoms",
  },

  {
    slug: "trane-supply-fan-proof-failure",
    metaTitle: "Trane Supply Fan Proof Failure | UnitDown",
    metaDescription:
      "Trane RTU supply fan proof failure causes. Airflow switches, VFD faults, and belt drive issues on Trane commercial units.",
    h1: "Trane Supply Fan Proof Failure",
    brand: "Trane",
    intro:
      "Supply fan proof failure on a Trane commercial rooftop unit (YSC, YHC, Voyager series) means the IntelliControl board commanded the supply fan to run and expected to receive confirmation of airflow via the airflow proving switch or supply fan status input — and did not. This is a protection function to prevent cooling or heating operation without confirmed air distribution. The fault must be cleared before any conditioning can resume.",
    symptoms: [
      "Trane IntelliControl fault code indicates 'Supply Fan Proof' or 'Airflow Switch' fault",
      "Blower does not start or starts briefly then shuts off",
      "Compressor and heating sections will not operate — fan proof required before conditioning",
      "Building temperature out of setpoint range with no airflow from supply registers",
      "VFD fault light on (VFD-equipped units)",
    ],
    likelyCauses: [
      {
        title: "Failed Airflow Proving Switch",
        body: "The differential pressure airflow switch (duct static switch) monitors pressure across the supply duct to confirm the blower is running and moving air. A failed switch or one that has lost calibration will not close even with the blower running. Test by jumping the switch — if the unit operates, replace the switch.",
      },
      {
        title: "Blower Motor Failure",
        body: "If the blower motor fails to start due to a failed capacitor, open winding, or seized bearing, there is no airflow and the proving switch correctly remains open. Troubleshoot the blower motor before suspecting the proving switch.",
      },
      {
        title: "VFD Fault (Variable Frequency Drive)",
        body: "On Trane units with VFD blower control (common on Precedent and larger Voyager models), a VFD fault will prevent the motor from starting. The IntelliControl receives no run-confirm signal from the VFD and triggers a fan proof fault. Read the VFD fault code from the drive display — common faults include OC (overcurrent), OV (overvoltage), UF (underfrequency), and COMM (communication loss).",
      },
      {
        title: "Belt or Sheave Drive Failure",
        body: "Belt-drive blower assemblies can slip or break, causing the blower wheel to not turn even if the motor runs. A broken belt produces no airflow and the proving switch remains open. Inspect the belt condition and tension and verify sheave alignment.",
      },
      {
        title: "Duct Static Pressure Too Low",
        body: "If the system has been rebalanced, dampers have been closed, or a duct section has been sealed, duct static pressure may be too low to reliably close the airflow switch. The switch is calibrated to a specific minimum pressure — if system resistance has changed, the switch setpoint may need adjustment.",
      },
    ],
    sequenceNotes: [
      "IntelliControl fan proof sequence: supply fan start command → fan proof switch must close within 30 seconds (model-dependent)",
      "On VFD units: IntelliControl sends start command to VFD → VFD ramps motor to minimum speed → VFD outputs run-status signal → IntelliControl confirms fan proof",
      "If fan proof switch does not close within timeout → IntelliControl logs fan proof fault and de-energizes supply fan",
      "Fan proof fault prevents compressor and heating operation until cleared — unit will not condition air without confirmed fan operation",
    ],
    meterChecks: [
      { measurement: "Fan Proof Switch Continuity (blower running)", expected: "Closed (continuity) with blower at full speed", note: "Open with blower running = failed switch or low static" },
      { measurement: "Blower Motor Amp Draw", expected: "Within FLA on nameplate", note: "Zero amps with motor commanded = open winding, no capacitor power" },
      { measurement: "VFD Output Frequency", expected: "At commanded frequency (Hz) when running", note: "VFD fault code display is the primary diagnostic tool" },
      { measurement: "Belt Condition", expected: "No cracking, proper tension, aligned", note: "Slipping belt = no wheel rotation with motor running" },
      { measurement: "Duct Static Pressure", expected: "Above switch setpoint (typically 0.1–0.2 in. w.c.)", note: "Below setpoint = duct or balancing change since switch calibration" },
    ],
    resetSteps: [
      "Verify blower motor is capable of running — check motor, capacitor, and power supply first",
      "On VFD units: read the VFD fault code and address the VFD fault before addressing the fan proof fault",
      "After addressing root cause: cycle unit off via thermostat for 5 minutes → re-enable",
      "For hard lockout on IntelliControl: cycle unit disconnect for 30 seconds",
      "After restart, verify fan proof switch closes within 15 seconds of blower start",
    ],
    repeatFailures: [
      "Fan proof fault recurring on cold mornings only → belt stiff from cold, slipping on startup, then gripping when warm",
      "Fan proof fault after filter changes → filters replaced with a higher-resistance rating than system was designed for, reducing static",
      "VFD fault recurring at same time of day → power quality event at that time (e.g. utility load switching)",
    ],
    whenReplacement: [
      "Airflow proving switch verified failed at correct static pressure — replace with exact Trane replacement part",
      "Belt stretched beyond adjustment range — replace belt and check sheave condition",
      "VFD fault codes indicate internal VFD hardware failure after addressing all external causes — VFD replacement",
    ],
    whenEscalate: [
      "VFD replacement and parameter programming on Trane units — requires Trane service training",
      "Blower motor replacement on direct-drive units with IntelliControl motor speed programming — requires technician setup",
      "Fan proof switch setpoint adjustment — only if duct system has been intentionally rebalanced; requires verification of intent",
    ],
    relatedSlug: "high-static-pressure-rooftop-unit-causes",
    relatedTitle: "High Static Pressure Rooftop Unit Causes",
  },
];

export function getBrandPageBySlug(slug: string): BrandPage | undefined {
  return brandPages.find((p) => p.slug === slug);
}
