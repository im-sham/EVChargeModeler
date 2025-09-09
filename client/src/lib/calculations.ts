import { evaluate } from "mathjs";

interface DCFInputs {
  capex: number;
  opex: number;
  chargerCount: number;
  peakUtilization: number; // as decimal (e.g., 0.65 for 65%)
  chargingRate: number; // $/kWh
  lcfsCredits?: number; // $/tonne
  stateRebate?: number;
  discountRate?: number; // default 10%
  projectLife?: number; // default 10 years
}

interface DCFResults {
  npv: number;
  irr: number;
  lcoc: number; // Levelized Cost of Charging
  cashFlows: number[];
}

export function calculateDCF(inputs: DCFInputs): DCFResults {
  const {
    capex,
    opex,
    chargerCount,
    peakUtilization,
    chargingRate,
    lcfsCredits = 0,
    stateRebate = 0,
    discountRate = 0.10,
    projectLife = 10,
  } = inputs;

  // Assumptions for EV truck charging
  const chargerPowerKW = 350; // DC Ultra Fast charging
  const hoursPerDay = 16; // Operating hours
  const daysPerYear = 365;
  const utilizationRampUp = 0.7; // Start at 70% of peak in year 1

  // Calculate annual revenue
  const annualKWhPerCharger = chargerPowerKW * hoursPerDay * daysPerYear * (peakUtilization / 100);
  const totalAnnualKWh = annualKWhPerCharger * chargerCount;
  
  // LCFS credits calculation (rough estimate)
  const co2ReductionPerKWh = 0.0004; // tonnes CO2 per kWh
  const annualLCFSRevenue = totalAnnualKWh * co2ReductionPerKWh * lcfsCredits;

  const cashFlows: number[] = [];
  
  // Year 0: Initial investment minus state rebate
  cashFlows.push(-(capex - stateRebate));

  // Years 1-10: Operating cash flows
  for (let year = 1; year <= projectLife; year++) {
    // Utilization ramp-up over first 3 years
    const utilizationFactor = Math.min(1, utilizationRampUp + ((1 - utilizationRampUp) * (year - 1) / 2));
    
    const yearlyKWh = totalAnnualKWh * utilizationFactor;
    const yearlyRevenue = yearlyKWh * chargingRate;
    const yearlyLCFS = annualLCFSRevenue * utilizationFactor;
    
    // Operating costs include electricity cost (rough estimate)
    const electricityCost = yearlyKWh * 0.12; // $0.12/kWh wholesale
    const totalOpex = opex + electricityCost;
    
    const netCashFlow = yearlyRevenue + yearlyLCFS - totalOpex;
    cashFlows.push(netCashFlow);
  }

  // Calculate NPV
  let npv = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + discountRate, i);
  }

  // Calculate IRR using iterative method
  const calculateNPVAtRate = (rate: number): number => {
    let npvAtRate = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      npvAtRate += cashFlows[i] / Math.pow(1 + rate, i);
    }
    return npvAtRate;
  };

  // Binary search for IRR
  let irrLow = -0.99;
  let irrHigh = 10.0;
  let irr = 0;
  
  for (let iteration = 0; iteration < 100; iteration++) {
    irr = (irrLow + irrHigh) / 2;
    const npvAtIRR = calculateNPVAtRate(irr);
    
    if (Math.abs(npvAtIRR) < 1) break;
    
    if (npvAtIRR > 0) {
      irrLow = irr;
    } else {
      irrHigh = irr;
    }
  }

  // Calculate LCOC (Levelized Cost of Charging)
  const totalPresentValueCosts = Math.abs(cashFlows[0]) + 
    cashFlows.slice(1).reduce((sum, cf, index) => {
      const opexPortion = opex + (totalAnnualKWh * 0.12); // Rough approximation
      return sum + (opexPortion / Math.pow(1 + discountRate, index + 1));
    }, 0);
  
  const totalPresentValuekWh = cashFlows.slice(1).reduce((sum, _, index) => {
    const utilizationFactor = Math.min(1, utilizationRampUp + ((1 - utilizationRampUp) * index / 2));
    const yearlyKWh = totalAnnualKWh * utilizationFactor;
    return sum + (yearlyKWh / Math.pow(1 + discountRate, index + 1));
  }, 0);

  const lcoc = totalPresentValueCosts / totalPresentValuekWh;

  return {
    npv: Math.round(npv),
    irr: irr,
    lcoc: lcoc,
    cashFlows: cashFlows.map(cf => Math.round(cf)),
  };
}

// Helper function to validate inputs
export function validateDCFInputs(inputs: Partial<DCFInputs>): string[] {
  const errors: string[] = [];
  
  if (!inputs.capex || inputs.capex <= 0) {
    errors.push("CapEx must be greater than 0");
  }
  
  if (!inputs.opex || inputs.opex <= 0) {
    errors.push("OpEx must be greater than 0");
  }
  
  if (!inputs.chargerCount || inputs.chargerCount < 4 || inputs.chargerCount > 8) {
    errors.push("Charger count must be between 4 and 8");
  }
  
  if (!inputs.peakUtilization || inputs.peakUtilization <= 0 || inputs.peakUtilization > 100) {
    errors.push("Peak utilization must be between 0 and 100%");
  }
  
  if (!inputs.chargingRate || inputs.chargingRate <= 0) {
    errors.push("Charging rate must be greater than 0");
  }
  
  return errors;
}
