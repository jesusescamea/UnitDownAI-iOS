export interface Cause {
  title: string;
  body: string;
}

export interface MeterRow {
  measurement: string;
  normal: string;
  suspect: string;
}

export interface PageData {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  whatItMeans: string[];
  causes: Cause[];
  fastChecks: string[];
  meterReadings: MeterRow[];
  prosInspect: Cause[];
  whenToCall: string[];
}

export const seoPages: PageData[] = [
  {
    slug: "rtu-not-cooling-but-compressor-running",
    metaTitle: "RTU Not Cooling But Compressor Running | UnitDown",
    metaDescription:
      "Common causes when rooftop unit compressor runs but building is not cooling. Fast checks and technician troubleshooting steps.",
    h1: "RTU Not Cooling But Compressor Running",
    intro:
      "One of the most common service calls on a commercial rooftop unit is a compressor that runs continuously while the building temperature climbs. The compressor is consuming power, the unit sounds like it is working, yet return air temperature never drops. This guide walks through the most likely causes, fast field checks, and the meter readings technicians use to pin down the fault quickly.",
    whatItMeans: [
      "When the compressor runs but cooling does not reach the space, the refrigeration circuit is either unable to absorb heat at the evaporator or unable to move conditioned air into the ductwork. Heat transfer is breaking down somewhere between the evaporator coil and the supply registers.",
      "On a rooftop unit the fault is almost always one of four categories: an airflow problem preventing heat exchange, a refrigerant charge or flow problem limiting evaporator capacity, a mechanical compressor problem reducing compression efficiency, or an economizer or damper issue that is diluting supply air with warm outside air.",
    ],
    causes: [
      {
        title: "Dirty or Iced Evaporator Coil",
        body: "A coil blocked with dirt, dust, or ice dramatically reduces heat transfer. Ice buildup is a symptom of restricted airflow or low refrigerant — not a root cause — but it will prevent cooling just as effectively as any component failure. Check for frost at the coil face and inspect for debris accumulation between fins.",
      },
      {
        title: "Failed or Undersized Blower Motor",
        body: "If the supply blower is not running at rated RPM or is not running at all, conditioned air never reaches the space. A failed run capacitor is the most common cause on single-phase motors. On VFD-equipped units, check drive output frequency and motor amp draw.",
      },
      {
        title: "Low Refrigerant Charge",
        body: "A refrigerant leak reduces system capacity. As charge drops, suction pressure falls, evaporating temperature drops below dewpoint and the coil frosts, compressor superheat rises, and discharge temperature climbs. Eventually the low-pressure control trips the compressor. Look for oil streaks, wet spots, and verify pressures against the manufacturer's PT chart.",
      },
      {
        title: "Economizer Stuck Open",
        body: "A damper that fails in the open position on a hot day floods the unit with 90°F+ outside air. The compressor runs against this load and loses. Supply air never cools to setpoint. Check damper blade position physically and verify actuator voltage at minimum and maximum signal.",
      },
      {
        title: "Bad Run Capacitor",
        body: "A weak or failed capacitor on the compressor or condenser fan motor causes low efficiency and elevated amperage. The compressor starts and runs but cannot build proper head pressure or maintain adequate suction lift. Test capacitance with a meter — anything below 90% of rated value should be replaced.",
      },
      {
        title: "Compressor Valve Failure",
        body: "Worn or broken suction or discharge valves allow refrigerant to bypass internally. The compressor spins but cannot compress effectively. Delta-T across the compressor will be minimal, suction and discharge pressures will equalize quickly on shutdown, and amp draw will be below specification.",
      },
      {
        title: "Condenser Fan Motor Failure",
        body: "If condenser fans are not running, head pressure climbs rapidly. High-pressure lockout will cycle the compressor on and off, and cooling capacity collapses. Visually verify all condenser fan motors are spinning at speed.",
      },
    ],
    fastChecks: [
      "Measure supply air temperature at the nearest register — should be 18–22°F below return air on a properly operating unit.",
      "Confirm the supply blower is running and at normal speed. Listen for low RPM, unusual noise, or bearing growl.",
      "Physically inspect economizer dampers. On a hot day they should be at minimum position (typically 15–20% open for ventilation code minimum).",
      "Check condenser section — all fan blades should be spinning, not stationary or slow.",
      "Look at the evaporator access panel for condensation or frost patterns indicating airflow restriction or low charge.",
      "Feel the suction line at the compressor. It should be cold and sweating lightly, not warm and dry.",
    ],
    meterReadings: [
      { measurement: "Supply Air Temp (below return)", normal: "18–22°F ΔT", suspect: "Less than 14°F ΔT" },
      { measurement: "Suction Pressure (R-410A)", normal: "115–130 PSIG", suspect: "Below 90 PSIG" },
      { measurement: "Discharge Pressure (R-410A)", normal: "375–425 PSIG", suspect: "Below 300 or above 500 PSIG" },
      { measurement: "Compressor Amp Draw", normal: "Within 10% of nameplate RLA", suspect: "Greater than 20% over RLA" },
      { measurement: "Superheat at Evap Outlet", normal: "8–12°F TXV / 10–20°F fixed orifice", suspect: "Above 25°F" },
      { measurement: "Run Capacitor", normal: "Within 5% of rated µF", suspect: "Below 90% of rated value" },
    ],
    prosInspect: [
      {
        title: "TXV or Metering Device Operation",
        body: "A stuck-open TXV floods the evaporator and causes low superheat with high suction pressure. A stuck-closed TXV starves the evaporator and causes high superheat with low suction pressure. Both conditions prevent adequate cooling.",
      },
      {
        title: "Compressor Valve Efficiency",
        body: "Perform a valve efficiency test: record suction and discharge pressures at stable operation, then shut the unit off and watch how quickly pressures equalize. Fast equalization (under 2 minutes) on a reciprocating compressor suggests valve bypass.",
      },
      {
        title: "Economizer Control Board and Sensors",
        body: "Faulty OAT or enthalpy sensors can command the economizer open when it should be closed. Verify sensor readings against a calibrated meter and check control board outputs.",
      },
    ],
    whenToCall: [
      "Call a licensed technician if pressures are outside normal range — this indicates a refrigerant issue that requires proper recovery, leak diagnosis, and recharge by a certified technician.",
      "Compressor valve failure diagnosis and replacement requires specialized equipment and should not be attempted without proper training.",
      "Economizer sensor and board replacement on newer units often requires manufacturer-specific calibration procedures.",
    ],
  },

  {
    slug: "rtu-blower-motor-hums-wont-start",
    metaTitle: "RTU Blower Motor Hums But Won't Start | UnitDown",
    metaDescription:
      "Why rooftop blower motors hum but fail to start. Capacitors, seized bearings, voltage drop and overload causes explained.",
    h1: "RTU Blower Motor Hums But Won't Start",
    intro:
      "A blower motor that hums but does not spin is one of the clearest signs of a startup problem. The motor is receiving power and trying to run, but something is preventing rotation. Left unresolved, a humming motor will overheat and trip its internal overload — or fail permanently within minutes. Here is how to diagnose and fix it quickly.",
    whatItMeans: [
      "A humming sound from an electric motor means the motor is energized and attempting to start, but the rotor is not turning. The stator is creating a magnetic field, but either the motor cannot generate enough torque to overcome starting resistance, or the rotor is physically bound.",
      "On PSC (permanent split capacitor) single-phase motors — the most common type on commercial RTU blowers — the run capacitor provides the phase shift needed to create starting torque. Without it, the motor hums under applied voltage but cannot self-start.",
    ],
    causes: [
      {
        title: "Failed Run Capacitor",
        body: "This is the most common cause on single-phase PSC motors. The capacitor creates the phase difference between the main and auxiliary windings that generates starting torque. A failed capacitor leaves the motor with no starting torque — it hums but cannot accelerate. Test with a capacitor meter. Any reading below 90% of rated µF requires replacement.",
      },
      {
        title: "Seized Bearings",
        body: "Bearing failure locks the shaft. Try manually spinning the blower wheel with the power disconnected — it should spin freely with minimal resistance. If the shaft is tight or locked, the bearings require replacement. Listen for grinding or squealing before failure.",
      },
      {
        title: "Jammed Blower Wheel",
        body: "Debris in the blower housing, a wheel that has slipped on the shaft, or a wheel that has collected ice can mechanically prevent rotation. Inspect the blower housing with power off. Foreign objects are common on rooftop units with open access.",
      },
      {
        title: "Low Supply Voltage",
        body: "Significant voltage drop below motor nameplate (typically more than 10%) reduces starting torque. Under-voltage also increases amp draw and overheating. Measure voltage at the motor terminals under load — not just at the disconnect.",
      },
      {
        title: "Overloaded Motor (Tripped Thermal Protection)",
        body: "Many motors have internal thermal protection that opens the circuit when the motor overheats. The motor may hum briefly then go silent as the thermal trips. Allow the motor to cool (15–30 minutes), then retest. If it trips again immediately, the motor is failing or the load is too high.",
      },
      {
        title: "Open Winding",
        body: "A partial winding failure can allow one winding to remain intact while the other is open, causing humming without rotation. Test winding resistance with an ohmmeter at the motor terminals. Compare readings against manufacturer specs or a known-good motor of the same type.",
      },
    ],
    fastChecks: [
      "Disconnect power and try to spin the blower wheel by hand — it should spin freely. Resistance or lockup indicates a mechanical problem.",
      "Measure capacitor µF with a capacitance meter. Compare to nameplate rating.",
      "Check supply voltage at the motor terminals under load — should be within 10% of nameplate voltage.",
      "Listen for a brief hum followed by silence — this pattern suggests thermal overload tripping.",
      "Inspect the blower housing for debris, ice, or a slipped wheel.",
      "Measure winding resistance between motor terminals to check for open windings.",
    ],
    meterReadings: [
      { measurement: "Run Capacitor", normal: "Within 5% of rated µF", suspect: "Below 90% of rated value or OL" },
      { measurement: "Supply Voltage at Motor", normal: "Within 10% of nameplate", suspect: "More than 10% below nameplate" },
      { measurement: "Motor Amp Draw (running)", normal: "At or below FLA on nameplate", suspect: "Greater than 125% FLA" },
      { measurement: "Winding Resistance (T1-T2)", normal: "Manufacturer spec, typically 2–15Ω", suspect: "OL (open winding)" },
      { measurement: "Shaft Free Spin", normal: "Spins freely by hand", suspect: "Stiff, tight, or locked" },
    ],
    prosInspect: [
      {
        title: "Motor Winding Insulation Resistance",
        body: "Use a megohmmeter (500V test) to check insulation resistance between windings and ground. Readings below 1 MΩ indicate insulation breakdown and the motor should be replaced before it fails to ground.",
      },
      {
        title: "Belt and Pulley Alignment",
        body: "On belt-drive blowers, check belt tension and pulley alignment. An over-tensioned belt creates excessive bearing load and can prevent startup. Misaligned pulleys cause premature belt and bearing failure.",
      },
      {
        title: "ECM Motor Diagnostics",
        body: "If the unit has an ECM (electronically commutated motor), the control board communicates with the motor module. A humming ECM often indicates a control board communication fault rather than a motor fault. Check PWM signal and board outputs.",
      },
    ],
    whenToCall: [
      "If the capacitor is replaced but the motor still will not start, the motor likely needs professional evaluation or replacement.",
      "Winding resistance testing and megohm testing should be performed by a trained technician to avoid shock hazard.",
      "ECM motor replacements often require programming and should be done by trained personnel.",
    ],
  },

  {
    slug: "high-static-pressure-rooftop-unit-causes",
    metaTitle: "High Static Pressure Rooftop Unit Causes | UnitDown",
    metaDescription:
      "Find common reasons rooftop units develop high static pressure and airflow problems in commercial HVAC systems.",
    h1: "High Static Pressure Rooftop Unit Causes",
    intro:
      "High external static pressure forces the blower to work harder for the same airflow, reducing system capacity and increasing energy consumption. Over time it causes blower motor overheating, premature bearing failure, duct system strain, and noise complaints. Identifying the source of high static is the first step to restoring proper airflow and equipment life.",
    whatItMeans: [
      "Static pressure is the resistance to airflow in a duct system measured in inches of water column (in. w.c.). Every RTU is designed for a specific external static pressure range — typically 0.3 to 0.8 in. w.c. for light commercial units. When actual static exceeds design, airflow drops and the blower motor works against greater resistance.",
      "High static pressure on a rooftop unit can originate anywhere in the supply or return air path. The root cause must be identified and corrected — simply replacing the blower motor without addressing the restriction is a temporary fix.",
    ],
    causes: [
      {
        title: "Dirty or Clogged Air Filters",
        body: "This is the most common cause and the first thing to check on any service call involving airflow complaints. Loaded filters can add 0.5 in. w.c. or more of additional resistance. Establish a proper filter maintenance schedule — every 1 to 3 months in commercial applications with high dust or traffic.",
      },
      {
        title: "Dirty Blower Wheel",
        body: "A blower wheel coated in dust and grease loses efficiency dramatically. The wheel cannot move the same volume of air per revolution, so static pressure rises while airflow falls. Clean the wheel thoroughly with appropriate solvent and inspect blade depth on both sides.",
      },
      {
        title: "Dirty or Blocked Evaporator Coil",
        body: "A fouled evaporator coil acts as a restriction in the air stream. Even moderate buildup between fins significantly increases static pressure drop across the coil. Clean with coil cleaner and flush with water — inspect the coil face for physical damage and fin collapse.",
      },
      {
        title: "Closed or Partially Closed Dampers",
        body: "Manual volume dampers in the ductwork that are partially or fully closed restrict airflow and appear as high static pressure at the unit. Check zone dampers, balancing dampers, and any manual fire dampers that may have tripped closed.",
      },
      {
        title: "Undersized or Poorly Designed Ductwork",
        body: "If a unit has been replaced with a higher-capacity model without resizing the ductwork, or if the original duct design was poor, static pressure will exceed design. Calculate duct friction using ASHRAE methods and verify against the RTU blower curve.",
      },
      {
        title: "Duct Collapse or Obstruction",
        body: "Flexible duct that has kinked, collapsed, or been stepped on severely restricts airflow. Inspect all accessible flex duct runs. Also look for duct sections that have separated at connections and are blowing into unconditioned space.",
      },
      {
        title: "Wrong Fan Speed Setting",
        body: "Multi-speed RTUs may be set to the wrong tap or motor speed for the installed ductwork. Consult the unit wiring diagram and verify motor tap connections against design airflow requirements.",
      },
    ],
    fastChecks: [
      "Measure static pressure at the unit using a manometer — test ports are typically located on the supply and return plenums.",
      "Replace filters regardless of appearance and retest static pressure.",
      "Inspect blower wheel for dust accumulation with a flashlight through the service panel.",
      "Walk the duct system looking for kinked flex duct, closed dampers, or duct separation.",
      "Check that all supply and return registers are open and not blocked by furniture or equipment.",
      "Compare total external static to the unit nameplate or equipment schedule.",
    ],
    meterReadings: [
      { measurement: "Total External Static Pressure", normal: "0.3–0.8 in. w.c. (check nameplate)", suspect: "Greater than 1.0 in. w.c." },
      { measurement: "Static Across Filter", normal: "0.1–0.2 in. w.c. clean", suspect: "Greater than 0.5 in. w.c." },
      { measurement: "Static Across Evap Coil", normal: "0.2–0.35 in. w.c.", suspect: "Greater than 0.5 in. w.c." },
      { measurement: "Blower Motor Amps", normal: "At or below FLA", suspect: "Exceeds FLA (motor laboring)" },
      { measurement: "Airflow CFM", normal: "Per design — typically 350–400 CFM/ton", suspect: "Less than 300 CFM/ton" },
    ],
    prosInspect: [
      {
        title: "Duct System Traverse Measurement",
        body: "A proper airflow traverse using a pitot tube and manometer through a duct section gives accurate CFM and identifies where flow is being lost. Compare measured CFM to design and to the blower curve at measured static.",
      },
      {
        title: "Blower Performance Curve Verification",
        body: "Plot actual measured static pressure and estimated CFM against the manufacturer blower curve. If the operating point falls outside the design range, the system is either undersized or oversized for the ductwork.",
      },
      {
        title: "Fire Damper Inspection",
        body: "Fire dampers in duct penetrations through fire-rated walls or floors can trip closed from heat, building movement, or vibration. Resetting requires access to inspection doors — check building plans for fire damper locations.",
      },
    ],
    whenToCall: [
      "If replacing filters and cleaning the coil and blower wheel does not resolve high static, a duct system evaluation by a qualified HVAC contractor is required.",
      "Duct resizing, static pressure balancing, and fire damper inspection require professional assessment.",
      "If static pressure exceeds the unit's maximum operating point, continued operation will fail the blower motor.",
    ],
  },

  {
    slug: "economizer-stuck-open-symptoms",
    metaTitle: "Economizer Stuck Open Symptoms | UnitDown",
    metaDescription:
      "Symptoms of a rooftop economizer stuck open and how technicians diagnose damper issues on commercial RTUs.",
    h1: "Economizer Stuck Open Symptoms",
    intro:
      "A rooftop unit economizer is designed to use free outdoor air cooling when conditions allow. When an economizer damper sticks in the open position, it can become one of the most energy-wasting faults on a commercial building HVAC system — and one of the most misdiagnosed. This guide covers the symptoms, how to confirm the fault, and how technicians fix it.",
    whatItMeans: [
      "An economizer stuck open means the outside air damper is allowing 100% outside air (or a high percentage) to enter the unit regardless of outdoor conditions. On a hot, humid day, the unit is now trying to cool and dehumidify large volumes of hot outdoor air in addition to recirculating return air.",
      "The refrigeration system is overwhelmed by the sensible and latent load from unconditioned outside air. The compressor runs continuously at or above capacity but cannot maintain setpoint. Humidity complaints are common alongside temperature complaints.",
    ],
    causes: [
      {
        title: "Failed Actuator",
        body: "The actuator is the motor that physically drives the damper blade. Actuators can fail in any position, including fully open. Check actuator voltage input against expected control signal — if the actuator is receiving a minimum signal (0V or 2V) but the blade is fully open, the actuator has failed mechanically.",
      },
      {
        title: "Broken or Disconnected Linkage",
        body: "The mechanical linkage between the actuator and damper blade can break, slip, or become disconnected. The actuator drives but the blade does not follow. Inspect the linkage hardware — cotter pins, clevis connections, and shaft clamps are common failure points.",
      },
      {
        title: "Faulty Enthalpy or OAT Sensor",
        body: "The economizer controller uses outdoor air temperature (OAT) and sometimes enthalpy sensors to determine when to open. A failed sensor may report cool, dry conditions when it is actually hot and humid, commanding the damper open unnecessarily. Check sensor readings against a calibrated thermometer.",
      },
      {
        title: "Bad Economizer Control Board",
        body: "The economizer control board interprets sensor inputs and commands the actuator. A failed board may output a constant maximum signal to the actuator. Check board output voltages (typically 0–10V DC) against expected control logic.",
      },
      {
        title: "Seized Damper Blade or Shaft",
        body: "Corrosion, paint, debris, or a bent blade can prevent damper movement. The actuator drives against a stuck blade and may stall. Try manually moving the blade with the actuator disconnected — it should pivot freely.",
      },
    ],
    fastChecks: [
      "On a hot day, physically look at the economizer section and observe damper blade position. At minimum ventilation, blades should be nearly closed.",
      "Measure outside air temperature at the OAT sensor location and compare to the sensor reading shown on the controller.",
      "Measure supply air temperature — significantly warmer than expected supply air is a key symptom of outside air flooding.",
      "Disconnect the actuator and manually drive the damper to minimum position — if building cooling improves, the economizer was the fault.",
      "Check controller output voltage to actuator with a meter. 0–2V DC should command minimum position on a 0–10V actuator.",
      "Listen for the blower laboring harder than normal — 100% outside air increases latent load and blower resistance.",
    ],
    meterReadings: [
      { measurement: "OAT Sensor Reading vs Actual", normal: "Within ±3°F", suspect: "Greater than 10°F discrepancy" },
      { measurement: "Actuator Control Signal", normal: "0–2V DC at minimum", suspect: "Signal low but blade fully open" },
      { measurement: "Supply Air Temp (hot day)", normal: "52–58°F at full cooling", suspect: "65°F+ indicates outside air flooding" },
      { measurement: "Return Air Humidity", normal: "Matching setpoint", suspect: "High RH with AC running = excess OA load" },
      { measurement: "Actuator Feedback Signal", normal: "Tracks command signal", suspect: "No feedback movement with command change" },
    ],
    prosInspect: [
      {
        title: "Economizer Controller Fault Codes",
        body: "Modern economizer controllers log fault codes. Connect a laptop or handheld controller and review the fault history. Sensor failures, actuator faults, and lockout conditions are typically recorded with timestamps.",
      },
      {
        title: "DX Lockout Function",
        body: "Verify the economizer controller is properly inhibiting mechanical cooling when the economizer is in full free-cooling mode. A mismatch in control can cause the compressor to run simultaneously against 100% outside air, wasting energy and overloading the system.",
      },
      {
        title: "Enthalpy Control Calibration",
        body: "Differential enthalpy economizers use both supply and return enthalpy sensors. Calibrate or replace sensors per the manufacturer procedure — sensors drift over time and may need replacement every 3–5 years.",
      },
    ],
    whenToCall: [
      "Economizer board replacement and sensor calibration require manufacturer-specific tools and procedures.",
      "If the damper blade is physically damaged or the actuator is burned out, part replacement requires proper access and refrigerant safety awareness.",
      "Building automation system integration issues may require a controls technician familiar with the specific BAS protocol.",
    ],
  },

  {
    slug: "rooftop-unit-ignition-lockout",
    metaTitle: "Rooftop Unit Ignition Lockout Causes | UnitDown",
    metaDescription:
      "Common reasons commercial rooftop units enter ignition lockout mode and how to diagnose heating failures.",
    h1: "Rooftop Unit Ignition Lockout Causes",
    intro:
      "Ignition lockout on a commercial rooftop unit means the control board attempted to light the burners, failed to prove flame within the allotted trial period, and locked out the heating circuit for safety. The unit will not attempt heating again until the lockout is manually reset or the fault clears. Here is a systematic approach to diagnosing the root cause on any direct-spark ignition RTU.",
    whatItMeans: [
      "Commercial RTUs use a direct-spark ignition (DSI) system with an integrated ignition control board. During a heating call, the board opens the gas valve, fires the spark igniter, and then looks for a flame signal from the flame rod within a defined trial-for-ignition (TFI) period — typically 7 seconds.",
      "If the flame signal is not detected within the TFI, the board closes the gas valve and repeats the trial one to three times depending on configuration. After all retries fail, the board enters hard lockout and lights the fault LED. The specific flash code indicates which component in the ignition sequence failed.",
    ],
    causes: [
      {
        title: "Dirty or Contaminated Flame Sensor Rod",
        body: "This is the most common cause of ignition lockout on commercial gas-fired equipment. The flame rod passes a small microamp current through the flame to prove ignition. Oxide buildup on the rod surface insulates it and prevents current flow. Clean with fine steel wool or emery cloth — do not use sandpaper. Replace if the rod is cracked or pitted.",
      },
      {
        title: "Gas Valve Not Opening",
        body: "The gas valve receives a 24V signal from the control board during trial. If the valve coil is burned out or the valve is mechanically stuck, gas does not reach the burners and ignition fails. Verify 24V at the valve terminals during trial. If voltage is present but no gas flows, replace the valve.",
      },
      {
        title: "Draft Pressure Switch Fault",
        body: "The inducer draft motor must prove airflow through a pressure switch before the board initiates trial for ignition. If the pressure switch does not close — due to a blocked flue, failed inducer motor, weak pressure switch, or disconnected hose — the board will not open the gas valve. Measure pressure switch hose connections and verify inducer RPM.",
      },
      {
        title: "Rollout Switch Trip",
        body: "A rollout switch senses flame rolling out of the heat exchanger — a dangerous condition indicating a cracked or blocked heat exchanger. Rollout switches are typically manual-reset safeties. If the rollout has tripped, do not reset and continue operation without thorough inspection of the heat exchanger.",
      },
      {
        title: "Failed Igniter",
        body: "The DSI igniter generates a high-voltage spark at the burners during trial. A failed igniter or cracked electrode produces no spark or a weak spark that cannot consistently light the burner. Inspect the electrode gap (typically 1/8 inch) and check the ignitor wire for cracks or loose connections.",
      },
      {
        title: "Control Board Fault",
        body: "If all components check out but the unit still locks out, the integrated ignition control board may be defective. Check the fault code LED flash pattern and refer to the manufacturer service manual for the specific model. Board replacement requires matching the exact part number.",
      },
    ],
    fastChecks: [
      "Count the flash code on the board fault LED and cross-reference with the wiring diagram mounted inside the unit panel.",
      "Listen for spark during trial — you should hear a clicking sound from the igniter area.",
      "Listen for the gas valve opening click and check if you can smell gas briefly at the burner area during trial.",
      "Verify inducer motor is spinning before trial begins — the draft switch will not close without inducer operation.",
      "Check if rollout switch is tripped — it will be open at its terminals if tripped, and requires manual reset with a small button.",
      "Verify 24V is present at the board's power terminal and at the gas valve connector during trial.",
    ],
    meterReadings: [
      { measurement: "Flame Sensor Microamp Signal", normal: "1.5–5 µA DC (in flame)", suspect: "Less than 0.5 µA or fluctuating" },
      { measurement: "Gas Valve Voltage (during trial)", normal: "24V AC", suspect: "No voltage when board commands" },
      { measurement: "Draft Switch Hose Pressure", normal: "Negative pressure per spec", suspect: "Zero pressure (blocked flue or failed inducer)" },
      { measurement: "Rollout Switch Continuity", normal: "Closed (low resistance)", suspect: "Open (tripped)" },
      { measurement: "Igniter Spark Gap", normal: "3/32–1/8 inch", suspect: "Greater than 3/16 inch or contaminated" },
      { measurement: "Board 24V Input", normal: "24V AC ±10%", suspect: "Below 20V AC" },
    ],
    prosInspect: [
      {
        title: "Heat Exchanger Visual Inspection",
        body: "A rolled-out or cracked heat exchanger is a carbon monoxide hazard. If rollout has tripped, perform a thorough visual and combustion analysis inspection before returning the unit to service. A dye test or smoke test can locate cracks.",
      },
      {
        title: "Combustion Analysis",
        body: "Use a combustion analyzer to verify CO, CO2, O2, and flue temperature after the unit is operational. Poor combustion efficiency indicates a gas pressure, burner, or heat exchanger issue.",
      },
      {
        title: "Gas Manifold Pressure",
        body: "Verify gas manifold pressure matches manufacturer specifications (typically 3.5 in. w.c. for natural gas). Low manifold pressure from a faulty regulator or low supply pressure will cause weak ignition and ignition lockout.",
      },
    ],
    whenToCall: [
      "If a rollout switch has tripped, the heat exchanger must be inspected before the unit is returned to service — this is a safety-critical repair that requires a licensed technician.",
      "Gas valve replacement, gas pressure adjustment, and combustion analysis should only be performed by a licensed gas-appliance technician.",
      "Carbon monoxide risk is present with any cracked heat exchanger — do not operate the unit until cleared by a qualified professional.",
    ],
  },

  {
    slug: "24v-present-no-contactor-pull-in",
    metaTitle: "24V Present But No Contactor Pull In | UnitDown",
    metaDescription:
      "24 volts present but contactor won't pull in? Common HVAC causes and fast checks for this frustrating fault.",
    h1: "24V Present But No Contactor Pull In",
    intro:
      "Verifying 24V at the contactor coil terminals and finding the contactor will not pull in is one of the most frustrating faults in commercial HVAC service. Power is there, but the compressor will not start. This guide covers the most common reasons this happens and how to systematically isolate the fault.",
    whatItMeans: [
      "A magnetic contactor pulls in when the coil receives sufficient voltage to create a magnetic field strong enough to pull the armature (plunger) down against spring tension. This closes the high-voltage contacts and connects the compressor to line power.",
      "If 24V is present but the contactor does not pull in, either the coil is not producing adequate magnetic force (failed coil, low voltage under load), the armature is mechanically stuck, or the contacts are burned and welded open against unusual load. Each cause has a different solution.",
    ],
    causes: [
      {
        title: "Failed Contactor Coil",
        body: "The coil is a wound copper coil inside the contactor body. It can burn open (no current flow, no magnetic field), short internally (draws excess current, trips the transformer), or weaken to the point where it no longer produces adequate pull-in force. Test coil resistance — an open coil reads OL. A shorted coil reads near zero. A good coil reads the value specified in the contactor data sheet (typically 20–200Ω for 24V coils).",
      },
      {
        title: "Low Voltage Under Load",
        body: "24V measured with a meter at the coil terminals may not represent actual available current. If the transformer secondary is overloaded or has high impedance, voltage collapses when the coil draws current. Measure voltage while simultaneously observing if the contactor chatters or buzzes. A reading of 24V that drops to 16V during pull-in attempt indicates a weak transformer or overloaded secondary.",
      },
      {
        title: "Loose or Corroded Low-Voltage Wiring",
        body: "A loose spade terminal at the coil connection can measure 24V under no-load but lose contact when the coil draws current. Check terminal fit — spade connectors should have a firm grip. Clean corroded terminals and remake connections with proper terminals.",
      },
      {
        title: "Mechanical Sticking of the Plunger",
        body: "On older contactors, the armature can stick due to corrosion, debris, or magnetic residue. The coil energizes but the armature does not travel. With power off, manually actuate the plunger with a non-conductive object to check for smooth travel. If it is stiff or gummy, the contactor should be replaced.",
      },
      {
        title: "Burned or Welded Contacts",
        body: "Heavy arcing from repeated starts or a locked rotor condition can weld the contacts together or burn them pitted and irregular. The contactor may pull in but contacts do not close properly, or contacts are welded open against the spring force of the armature. Inspect contact surfaces with power off.",
      },
      {
        title: "Open Safety in Control Circuit",
        body: "If a high-pressure switch, low-pressure switch, or other safety device is wired in series with the contactor coil circuit, an open safety interrupts the circuit even when 24V is measured upstream of the safety. Verify 24V is present specifically at the coil terminals, not just at the thermostat output.",
      },
    ],
    fastChecks: [
      "Measure 24V directly at the contactor coil terminals with an AC voltmeter — verify it is the coil terminals, not the upstream circuit.",
      "Watch the voltage reading while the thermostat is calling — does it drop or collapse when the coil attempts to pull in?",
      "With power disconnected, manually push the contactor plunger with a non-conductive tool — does it move freely?",
      "Measure coil resistance with a multimeter set to ohms — look for open (OL) or near-zero reading.",
      "Trace the low-voltage wiring from the thermostat to the contactor coil and look for loose, corroded, or improperly connected terminals.",
      "Verify all safety devices in the control circuit (high-pressure, low-pressure, freeze stat) are closed by tracing continuity through the circuit.",
    ],
    meterReadings: [
      { measurement: "Voltage at Coil Terminals (calling)", normal: "22–28V AC", suspect: "Below 20V or collapses to 0" },
      { measurement: "Coil Resistance", normal: "Per spec (20–200Ω typical)", suspect: "OL (open) or near 0Ω (shorted)" },
      { measurement: "Transformer Secondary Voltage (no load)", normal: "24–28V AC", suspect: "Below 22V or above 30V" },
      { measurement: "Safety Circuit Continuity", normal: "All safeties closed", suspect: "One open = no pull-in" },
      { measurement: "Plunger Travel", normal: "Free and smooth", suspect: "Stiff, sticky, or immobile" },
    ],
    prosInspect: [
      {
        title: "Control Transformer VA Rating Check",
        body: "Each device on the 24V secondary draws VA. Calculate total connected VA load (contactors, economizer actuator, zone valves, board logic) and compare to transformer nameplate VA. An overloaded transformer drags voltage down under load.",
      },
      {
        title: "Short Circuit in Low-Voltage Wiring",
        body: "A partial short in the thermostat wire between the condenser and the air handler loads the transformer secondary and reduces available voltage. Disconnect loads one at a time and remeasure transformer secondary voltage to isolate the overload.",
      },
    ],
    whenToCall: [
      "If the transformer is overloaded, a controls technician should evaluate the full system load and recommend the correct transformer upgrade.",
      "Contact replacement on high-voltage compressor contactors requires proper lockout/tagout procedures.",
    ],
  },

  {
    slug: "thermostat-calling-but-no-cooling",
    metaTitle: "Thermostat Calling But No Cooling | UnitDown",
    metaDescription:
      "Thermostat calls for cooling but system does not start. Step-by-step troubleshooting guide for HVAC technicians.",
    h1: "Thermostat Calling But No Cooling",
    intro:
      "The thermostat is set below room temperature, the Y and G signals are present, and nothing happens at the unit. This is one of the most common service calls in commercial HVAC and has several distinct root causes. Work through them systematically from the most accessible to the most involved.",
    whatItMeans: [
      "When the thermostat calls for cooling, it sends a 24V signal on the Y (compressor) wire and G (fan) wire to the air handler or unit control board. Each of these signals must travel through the low-voltage wiring, through any safety devices, and reach the appropriate load to start the system.",
      "A break anywhere along this signal path — at the thermostat, in the wire run, at a safety device, at the control board, or at the contactor coil — will prevent cooling from starting. The diagnostic approach is to follow the signal from the thermostat to the load.",
    ],
    causes: [
      {
        title: "Blown Low-Voltage Fuse",
        body: "Most RTUs have a 3–5A fuse protecting the 24V control circuit. A short in the low-voltage wiring or a failed component can blow this fuse silently, killing all control voltage. The unit appears to receive no thermostat signal because the control circuit has no power. Check the fuse holder on the unit control board — this is the first check after verifying 24V at the thermostat.",
      },
      {
        title: "Float Switch or Condensate Safety Open",
        body: "A float switch wired in the low-voltage circuit interrupts the Y signal when the condensate pan fills. If the drain is clogged or the trap has dried out, the float trips and nothing runs. Check the condensate pan water level and drain function. Many float switches are in the secondary drain pan and are easy to miss.",
      },
      {
        title: "Failed Contactor",
        body: "The compressor contactor receives 24V from the control board and connects the compressor to line voltage. A failed contactor coil or a mechanical binding will prevent the compressor from starting even with proper control voltage. Verify 24V at the contactor coil during a Y call.",
      },
      {
        title: "Open Safety Control Device",
        body: "High-pressure switches, low-pressure switches, freeze stats, and motor overloads wired in series with the compressor circuit will prevent operation when tripped. Some reset automatically when the fault clears; others require manual reset. Trace the complete safety circuit.",
      },
      {
        title: "Control Board Failure",
        body: "The RTU control board receives thermostat signals and commands the blower, compressor contactor, and staging outputs. A failed board may receive the Y input but not output the contactor signal. Verify Y signal at the board input and verify the output at the contactor coil.",
      },
      {
        title: "No Line Voltage to Unit",
        body: "A tripped disconnect, blown main fuse, or open circuit breaker will prevent any operation including the 24V transformer. Verify line voltage at the unit disconnect and main terminal block before diagnosing the low-voltage side.",
      },
      {
        title: "Thermostat Wiring or Thermostat Failure",
        body: "A failed thermostat, disconnected wire, or wrong thermostat setting (mode set to Heat or Fan Only) can prevent the Y signal from reaching the unit. Verify Y wire is connected at both the thermostat and the unit. Jump Y to R at the unit terminals to test — if the unit starts with the jumper, the problem is in the thermostat or wiring.",
      },
    ],
    fastChecks: [
      "Check line voltage at the disconnect and main unit terminal block first.",
      "Locate and inspect the 24V control fuse on the unit board — replace if blown.",
      "Check condensate pan water level and test float switch continuity.",
      "With the stat calling, measure 24V between Y and C at the unit board input terminals.",
      "With the stat calling, measure 24V at the contactor coil terminals.",
      "Jump Y to R at the unit low-voltage terminal strip to confirm the thermostat and wire are not the problem.",
    ],
    meterReadings: [
      { measurement: "Line Voltage at Disconnect", normal: "208/230/460V per nameplate ±10%", suspect: "No voltage (tripped)" },
      { measurement: "24V Control Fuse", normal: "Closed (continuity)", suspect: "Open = blown fuse" },
      { measurement: "Y Signal at Board Input", normal: "24V AC when calling", suspect: "0V (stat, wire, or float issue)" },
      { measurement: "Contactor Coil Voltage", normal: "24V AC when board commands", suspect: "0V (board not outputting)" },
      { measurement: "Float Switch Continuity", normal: "Closed", suspect: "Open = pan full or failed switch" },
    ],
    prosInspect: [
      {
        title: "Control Board Input/Output Verification",
        body: "Modern RTU control boards have diagnostic LEDs showing active input signals. Verify Y input LED is lit when thermostat is calling, and verify output LED for compressor stage 1 is lit when the board is commanding cooling.",
      },
      {
        title: "Thermostat Subbase Connections",
        body: "On traditional electromechanical stats, the wire connections at the subbase can corrode or loosen over time. Remove the thermostat from the subbase and inspect wire terminal connections.",
      },
    ],
    whenToCall: [
      "Control board replacement requires matching the exact model and board part number and may require wiring diagram verification.",
      "If multiple safeties are open simultaneously, an underlying mechanical fault requires professional diagnosis.",
    ],
  },

  {
    slug: "float-switch-keeps-tripping-causes",
    metaTitle: "Float Switch Keeps Tripping Causes | UnitDown",
    metaDescription:
      "Why HVAC float switches trip repeatedly and how to solve condensate drainage problems permanently.",
    h1: "Float Switch Keeps Tripping Causes",
    intro:
      "A float switch that trips repeatedly — shutting down the AC system every few hours or every day — is one of the most persistent callbacks in commercial HVAC service. The switch is doing its job, but the root cause of condensate accumulation has not been resolved. Here is how to stop the callbacks and fix the problem permanently.",
    whatItMeans: [
      "A condensate float switch monitors the water level in the primary or secondary drain pan and interrupts the cooling circuit when water reaches a set level. This is a safety device — tripping indicates that condensate is not draining properly and the pan is filling.",
      "Replacing or bypassing the float switch without finding why condensate is accumulating is dangerous and will eventually result in water damage to ceilings, walls, equipment, or electrical systems. Find the drain fault and fix it.",
    ],
    causes: [
      {
        title: "Clogged Primary Condensate Drain",
        body: "Algae, biofilm, and debris accumulate in condensate drain lines over time — especially in humid climates. A completely clogged drain line causes condensate to back up into the pan immediately. Flush the drain line with a wet/dry vacuum, pressurized CO2 cartridge, or a condensate drain cleaning product. Establish an annual or twice-yearly flush schedule.",
      },
      {
        title: "Improper or Missing Condensate Trap",
        body: "Air handlers operating under negative pressure require a properly sized P-trap in the drain line. Without a trap (or with one that has dried out), negative pressure in the unit pulls air up the drain line instead of allowing condensate to flow out. The drain appears to work on the bench but fails under operating conditions. The trap depth must match the negative static pressure of the unit.",
      },
      {
        title: "Cracked or Improperly Pitched Drain Pan",
        body: "A secondary drain pan that is not level will pool water at one end — possibly at the float switch location — even when the primary drain is functioning. Verify pan pitch is toward the drain fitting and inspect the pan for cracks or poor sealing at end caps.",
      },
      {
        title: "High Moisture Load (Dirty Filter or Low Airflow)",
        body: "Restricted airflow causes the evaporator coil to run colder and the refrigerant to operate at lower suction pressure. This causes abnormally heavy condensate production and can cause frost formation that melts rapidly when the blower shuts off, flooding the pan. Check filters and airflow first.",
      },
      {
        title: "Negative Pressure in the Drain Chase",
        body: "In commercial buildings, multiple air handlers draining to a common line can create back-pressure or suction on individual unit drains if the system is not properly air-gapped. Each unit's drain must break to atmosphere properly. Verify drain pipe configurations and venting.",
      },
      {
        title: "Algae Buildup at Drain Fitting",
        body: "Even with a clear line downstream, algae can build a partial blockage right at the drain fitting inside the pan. This is often missed because probing the line beyond the fitting shows clear passage. Inspect the pan drain fitting directly and clean if biofouled.",
      },
    ],
    fastChecks: [
      "Pour water into the primary condensate drain pan — does it drain freely or back up?",
      "Locate and inspect the P-trap — is it present, properly sized, and filled with water?",
      "Check pan slope with a level — it should pitch toward the drain fitting.",
      "Inspect pan water — is it clear or green/black (algae growth)?",
      "Check if filters are clean and blower is running at proper speed.",
      "Verify the drain line terminates properly to atmosphere and is not submerged in standing water downstream.",
    ],
    meterReadings: [
      { measurement: "Float Switch Continuity", normal: "Closed (dry pan)", suspect: "Open when pan has water" },
      { measurement: "Drain Flow Rate", normal: "Drains freely when poured", suspect: "Backs up or drains slowly" },
      { measurement: "Airflow/Filter Static", normal: "Clean filter, normal static", suspect: "Dirty filter, high static" },
      { measurement: "Evap Coil Temperature", normal: "Above 34°F (no frost)", suspect: "Below 32°F (icing, excess melt)" },
    ],
    prosInspect: [
      {
        title: "Drain System Pressure Testing",
        body: "In multi-unit drain systems, cap individual unit drain connections and pressure-test the common drain pipe to identify partial blockages or improper venting that cause back-pressure.",
      },
      {
        title: "Coil Freeze Analysis",
        body: "If the evaporator is icing due to low refrigerant or airflow restriction, the ice melts when the compressor cycles off and overwhelms the drain pan momentarily. Address the root cause of coil icing before the float switch issue fully resolves.",
      },
    ],
    whenToCall: [
      "If the drain system involves a common building drain and multiple units, a plumbing or mechanical contractor may need to evaluate the drain system design.",
      "Cracked condensate pans typically require pan replacement — an air handler service that involves refrigerant management.",
    ],
  },

  {
    slug: "contactor-buzzing-not-pulling-in",
    metaTitle: "Contactor Buzzing But Not Pulling In | UnitDown",
    metaDescription:
      "Contactor buzzing but not engaging? Diagnose weak voltage, coil failure, and mechanical sticking issues.",
    h1: "Contactor Buzzing But Not Pulling In",
    intro:
      "A contactor that buzzes or chatters without fully pulling in is a distinct fault from one that receives no voltage at all. The coil is energized and attempting to pull the armature, but cannot complete the stroke. This condition causes severe arcing at the main contacts and will destroy the contactor and compressor if not corrected quickly.",
    whatItMeans: [
      "Contactors are designed to operate in a binary state — fully open or fully closed. The pull-in voltage is the minimum voltage at which the armature completes its full travel and seals the magnetic circuit, eliminating the air gap. The drop-out voltage is the voltage at which the armature releases.",
      "When the applied voltage is between pull-in and drop-out (sometimes called the 'flutter zone'), the contactor chatters or buzzes as the armature repeatedly attempts to seal but cannot. This state is destructive to both the coil and the contacts, and often to the connected motor.",
    ],
    causes: [
      {
        title: "Low Control Voltage Under Load",
        body: "This is the most common cause of contactor buzzing. When the coil draws current, voltage at the coil terminals drops below the pull-in threshold. Measure voltage directly at the coil terminals while the unit is attempting to start — not at the transformer or upstream terminal. A reading below 20V AC is a clear indicator of voltage drop under load.",
      },
      {
        title: "Overloaded or Weak Control Transformer",
        body: "If the 24V transformer's secondary is overloaded by too many connected devices, voltage sags when additional loads are applied. The coil draws current, the transformer voltage drops, the contactor cannot pull in fully, the coil releases, voltage recovers, the coil tries again — producing the characteristic buzzing. Check transformer VA capacity.",
      },
      {
        title: "Failing Contactor Coil",
        body: "A coil that is partially shorted or has opened some turns has reduced inductance and draws more current for less magnetic force. It may produce enough force to partially close the armature but not enough to complete the pull-in. Test coil resistance against specification.",
      },
      {
        title: "Dirt or Corrosion on Armature Face",
        body: "The magnetic sealing surface of the armature must be clean and flat to allow complete closure. Dirt, corrosion, or magnetic particle buildup increases the air gap and reduces magnetic force at the sealing point. Clean armature and pole faces with a clean cloth — do not use abrasives.",
      },
      {
        title: "Damaged or Worn Shading Coil",
        body: "On AC contactors, a copper shading coil (or shading ring) embedded in the magnet pole faces eliminates the 120Hz hum that would otherwise occur because AC voltage crosses zero twice per cycle. A cracked or broken shading ring produces an audible buzz even when the contactor is properly pulled in. Replace the contactor.",
      },
    ],
    fastChecks: [
      "Measure voltage directly at the contactor coil terminals while the unit is calling — watch for voltage collapse during coil pull-in attempt.",
      "Inspect the shading ring on the armature pole faces — should be a visible copper insert, intact and flush with the magnet face.",
      "With power off, manually push the contactor in — does it travel smoothly and seat fully?",
      "Check for debris, corrosion, or magnetic particle accumulation between the armature faces.",
      "Measure coil resistance — compare to a new contactor of the same model.",
      "Identify all 24V loads on the transformer secondary and estimate total VA draw.",
    ],
    meterReadings: [
      { measurement: "Coil Voltage Under Load (at coil terminals)", normal: "22–28V AC", suspect: "Below 20V (collapses during pull)" },
      { measurement: "Transformer Secondary (no load)", normal: "24–27V AC", suspect: "Below 22V unloaded" },
      { measurement: "Coil Resistance", normal: "Per spec", suspect: "Significantly below spec (shorted turns)" },
      { measurement: "Manual Actuate Travel", normal: "Free and full stroke", suspect: "Stiff or incomplete stroke" },
      { measurement: "Shading Ring Condition", normal: "Intact, flush with face", suspect: "Cracked, missing, or proud" },
    ],
    prosInspect: [
      {
        title: "Transformer VA Load Calculation",
        body: "List all 24V loads: each contactor coil (typically 5–10 VA), economizer actuator (5–8 VA), control board logic (varies), reversing valve (10–15 VA), zone valves. Total VA load should not exceed transformer nameplate VA rating. Size up the transformer if overloaded.",
      },
      {
        title: "Short Circuit Hunting in Low-Voltage Wiring",
        body: "A partial short to ground in thermostat wire or between conductors acts as an additional load on the transformer. Disconnect all thermostat wiring at the unit and check resistance between each conductor and ground — should read infinite. Any resistance below 10kΩ suggests a partial short.",
      },
    ],
    whenToCall: [
      "A buzzing contactor should be replaced immediately — continued operation will weld the contacts and potentially damage the compressor.",
      "Transformer sizing and full system load analysis should be performed by a qualified service technician.",
    ],
  },

  {
    slug: "high-superheat-troubleshooting-chart",
    metaTitle: "High Superheat Troubleshooting Chart | UnitDown",
    metaDescription:
      "Common causes of high superheat in HVAC systems and how technicians verify charge and TXV feed issues.",
    h1: "High Superheat Troubleshooting Chart",
    intro:
      "High superheat at the evaporator outlet indicates the refrigerant is absorbing more heat than it should before leaving the coil — or more precisely, the refrigerant is fully vaporized well before the end of the coil and continues to superheat as a gas. The root cause can range from low refrigerant charge to a starving metering device to restricted airflow. This guide provides the systematic approach technicians use to identify and confirm the fault.",
    whatItMeans: [
      "Superheat is the temperature above the saturation (boiling) point at a given pressure. On the suction side of the evaporator, superheat is measured as the difference between the actual suction line temperature and the saturated suction temperature derived from suction pressure on a PT chart.",
      "Normal evaporator superheat for a TXV (thermostatic expansion valve) system is 8–12°F. For a fixed orifice or piston system, target superheat depends on outdoor temperature and indoor conditions but typically falls between 10–20°F. Superheat above 25°F on a TXV system or above 30°F on a fixed orifice system generally indicates a problem.",
    ],
    causes: [
      {
        title: "Low Refrigerant Charge",
        body: "Low charge is the most common cause of high superheat. With insufficient refrigerant, the evaporator receives less liquid feed and a greater fraction of the coil is used for superheating vapor. Suction pressure will be below normal, discharge pressure may be below normal, and subcooling at the liquid line will be low. High superheat combined with low subcooling is the classic signature of an undercharged system.",
      },
      {
        title: "Underfeeding TXV",
        body: "A TXV that is set too tight, has a weak power head, or has a restricted sensing bulb will throttle refrigerant feed below what the evaporator needs. On TXV systems, superheat above 12°F with normal or high subcooling (ruling out low charge) points to the TXV as the primary suspect. Check bulb clamping, contact, and insulation before condemning the valve.",
      },
      {
        title: "Refrigerant Restriction",
        body: "Ice, wax, or debris blocking the filter drier, liquid line, distributor nozzle, or TXV inlet creates a pressure drop before the metering device. The pressure drop looks like a starving condition. Look for a temperature drop across the restriction and a frost or sweat pattern indicating where the pressure decrease occurs.",
      },
      {
        title: "Dirty Evaporator Coil or Low Airflow",
        body: "A dirty coil or reduced airflow means the refrigerant cannot absorb adequate heat. Evaporating capacity drops, refrigerant flows slowly through the coil, and the small amount that does flow superheats quickly. Suction pressure drops alongside the superheat rise. Check static pressure and coil cleanliness.",
      },
      {
        title: "Low Ambient (Low Indoor Load)",
        body: "In mild weather or at night with low indoor heat load, the evaporator runs at reduced capacity. Refrigerant feed from a fixed orifice does not reduce proportionally, leading to partial evaporator flooding or erratic superheat. This is a system design limitation, not a fault — TXV systems handle varying load much better than fixed orifice.",
      },
      {
        title: "Liquid Line Restriction from Heat",
        body: "A liquid line that runs through a hot attic or mechanical room without insulation can flash refrigerant to vapor before it reaches the metering device — called flash gas. This dramatically reduces system capacity and causes high superheat. Look for unexpectedly hot liquid line sections and install insulation.",
      },
    ],
    fastChecks: [
      "Measure suction line temperature at the evaporator outlet (6 inches from the coil, under insulation) with a contact thermometer.",
      "Measure suction pressure with a refrigerant gauge set and look up saturated suction temperature on the PT chart for your refrigerant.",
      "Calculate superheat: suction line temp minus saturated suction temperature.",
      "Measure liquid line temperature just before the metering device and calculate subcooling the same way — high superheat with low subcooling = low charge.",
      "High superheat with normal or high subcooling = TXV or restriction issue.",
      "Inspect the TXV sensing bulb — it must be clamped firmly at 4 or 8 o'clock position on the suction line with good metal-to-metal contact and insulation wrapped over it.",
    ],
    meterReadings: [
      { measurement: "Evaporator Superheat (TXV)", normal: "8–12°F", suspect: "Above 20°F" },
      { measurement: "Evaporator Superheat (fixed orifice)", normal: "10–20°F", suspect: "Above 30°F" },
      { measurement: "Suction Pressure (R-410A)", normal: "115–130 PSIG", suspect: "Below 90 PSIG" },
      { measurement: "Subcooling (liquid line)", normal: "10–15°F TXV / 15–20°F fixed orifice", suspect: "Below 5°F (low charge)" },
      { measurement: "Discharge Superheat", normal: "Below 60°F above saturation", suspect: "Above 80°F (liquid line restriction or low charge)" },
      { measurement: "Temperature Drop Across Filter Drier", normal: "Less than 3°F", suspect: "Greater than 10°F (restricted drier)" },
    ],
    prosInspect: [
      {
        title: "TXV Hunting Diagnosis",
        body: "A TXV that is hunting (superheat swings continuously from high to low) indicates a sensing bulb contact problem, a TXV with excessive spring tension, or a vapor-bound power head. Observe superheat over 5–10 minutes — steady high superheat suggests refrigerant starvation while oscillating superheat suggests TXV instability.",
      },
      {
        title: "Filter Drier Pressure Drop",
        body: "Measure temperature drop across the filter drier with two contact thermometers. More than 3°F drop indicates restriction and the drier should be replaced. Replace driers after any system opening, after a burnout, or every 3–5 years of service.",
      },
      {
        title: "Weigh-In Verification",
        body: "If charge is suspected, recover the refrigerant, weigh the system, and compare to the nameplate charge weight. Recharge to the nameplate weight and verify superheat and subcooling. This eliminates guesswork from the charging process.",
      },
    ],
    whenToCall: [
      "Refrigerant handling, leak testing, recovery, and recharge require EPA Section 608 certification — this is a regulatory requirement, not just a technical one.",
      "TXV replacement often requires brazing and proper nitrogen purging to prevent system contamination.",
      "Filter drier replacement requires recovering refrigerant and opening the refrigerant circuit — a proper recovery and recharge service.",
    ],
  },
];

export function getPageBySlug(slug: string): PageData | undefined {
  return seoPages.find((p) => p.slug === slug);
}
