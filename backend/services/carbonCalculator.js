/**
 * Scientific Carbon Calculator
 * Employs standard EPA (Environmental Protection Agency) and DEFRA (UK Department for Environment, Food & Rural Affairs)
 * greenhouse gas conversion factors to compute exact CO2 emissions in kg.
 */

// Core emission factors (in kg CO2 equivalent)
const FACTORS = {
  transport: {
    suv: 0.38,         // per mile
    sedan: 0.27,       // per mile
    ev: 0.08,          // per mile
    public: 0.07,      // per passenger-mile
    active: -0.27      // credits saved per mile replacing a gasoline drive
  },
  diet: {
    beef: 7.5,         // per meal
    poultry: 2.0,      // per meal (chicken, pork, fish)
    vegetarian: 0.8,   // per meal
    vegan: 0.5         // per meal
  },
  energy: {
    ac: 1.8,           // per hour of running (2-ton unit)
    heater: 2.2,       // per hour of running
    electricity: 0.4,  // per kWh from traditional grid
    solar: -1.2        // savings credits per kWh generated
  },
  waste: {
    landfill: 1.5,     // per standard bag
    recycle: -0.8      // savings credits per recycle/compost bin
  }
};

/**
 * Calculates CO2 impact in kg based on activity parameters extracted by the LLM.
 * 
 * @param {string} category - transport, diet, energy, waste, or other
 * @param {object} params - parameters extracted from user message
 * @returns {object} { co2: number, calculationDetail: string }
 */
export function calculateEmissions(category, params = {}) {
  const cat = (category || 'other').toLowerCase();
  
  let co2 = 0;
  let calculationDetail = '';

  switch (cat) {
    case 'transport': {
      const distance = parseFloat(params.distance) || 0;
      let mode = (params.mode || 'sedan').toLowerCase();
      
      // Map mode aliases
      if (mode.includes('car') || mode.includes('gas') || mode.includes('petrol')) {
        mode = params.isSUV ? 'suv' : 'sedan';
      } else if (mode.includes('suv') || mode.includes('truck') || mode.includes('4x4')) {
        mode = 'suv';
      } else if (mode.includes('electric') || mode.includes('ev') || mode.includes('tesla')) {
        mode = 'ev';
      } else if (mode.includes('bus') || mode.includes('train') || mode.includes('metro') || mode.includes('transit') || mode.includes('subway')) {
        mode = 'public';
      } else if (mode.includes('bike') || mode.includes('bicycle') || mode.includes('walk') || mode.includes('run') || mode.includes('foot')) {
        mode = 'active';
      }

      const factor = FACTORS.transport[mode] || FACTORS.transport.sedan;
      co2 = distance * factor;
      
      if (mode === 'active') {
        calculationDetail = `Biking/walking ${distance.toFixed(1)} miles instead of driving saved ${Math.abs(co2).toFixed(1)} kg CO₂.`;
      } else {
        calculationDetail = `Traveled ${distance.toFixed(1)} miles via ${mode} emitting ${co2.toFixed(1)} kg CO₂.`;
      }
      break;
    }

    case 'diet': {
      let foodType = (params.foodType || 'vegetarian').toLowerCase();
      
      if (foodType.includes('beef') || foodType.includes('steak') || foodType.includes('lamb') || foodType.includes('burger')) {
        foodType = 'beef';
      } else if (foodType.includes('chicken') || foodType.includes('poultry') || foodType.includes('pork') || foodType.includes('fish') || foodType.includes('meat')) {
        foodType = 'poultry';
      } else if (foodType.includes('vegan') || foodType.includes('salad') || foodType.includes('plant')) {
        foodType = 'vegan';
      } else {
        foodType = 'vegetarian';
      }

      const factor = FACTORS.diet[foodType];
      const count = parseInt(params.mealCount) || 1;
      co2 = factor * count;
      calculationDetail = `Logged ${count} ${foodType} meal(s), contributing ${co2.toFixed(1)} kg CO₂.`;
      break;
    }

    case 'energy': {
      let type = (params.energyType || 'electricity').toLowerCase();
      const amount = parseFloat(params.amount) || 0;

      if (type.includes('ac') || type.includes('cooling') || type.includes('air con')) {
        type = 'ac';
        co2 = amount * FACTORS.energy.ac;
        calculationDetail = `Ran air conditioning for ${amount.toFixed(1)} hours, emitting ${co2.toFixed(1)} kg CO₂.`;
      } else if (type.includes('heater') || type.includes('heating')) {
        type = 'heater';
        co2 = amount * FACTORS.energy.heater;
        calculationDetail = `Ran heating for ${amount.toFixed(1)} hours, emitting ${co2.toFixed(1)} kg CO₂.`;
      } else if (type.includes('solar') || type.includes('panels')) {
        type = 'solar';
        co2 = amount * FACTORS.energy.solar; // negative offset
        calculationDetail = `Generated ${amount.toFixed(1)} kWh solar power, offsetting ${Math.abs(co2).toFixed(1)} kg CO₂.`;
      } else {
        type = 'electricity';
        co2 = amount * FACTORS.energy.electricity;
        calculationDetail = `Consumed ${amount.toFixed(1)} kWh grid electricity, emitting ${co2.toFixed(1)} kg CO₂.`;
      }
      break;
    }

    case 'waste': {
      let action = (params.wasteAction || 'landfill').toLowerCase();
      const bags = parseFloat(params.bags) || 1;

      if (action.includes('recycle') || action.includes('compost') || action.includes('reuse')) {
        action = 'recycle';
        co2 = bags * FACTORS.waste.recycle;
        calculationDetail = `Recycled/composted ${bags.toFixed(1)} bags of waste, saving ${Math.abs(co2).toFixed(1)} kg CO₂.`;
      } else {
        action = 'landfill';
        co2 = bags * FACTORS.waste.landfill;
        calculationDetail = `Sent ${bags.toFixed(1)} bags of garbage to landfill, emitting ${co2.toFixed(1)} kg CO₂.`;
      }
      break;
    }

    default: {
      co2 = parseFloat(params.manualCO2) || 0;
      calculationDetail = params.customDescription || 'Logged custom daily footprint entry.';
      break;
    }
  }

  return {
    co2: parseFloat(co2.toFixed(2)),
    calculationDetail
  };
}
