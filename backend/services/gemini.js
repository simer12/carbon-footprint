import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateEmissions } from './carbonCalculator.js';
import dotenv from 'dotenv';

// Load env variables immediately before evaluating process.env keys
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const isApiKeyMock = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

let genAI = null;
if (!isApiKeyMock) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Failed to initialize GoogleGenerativeAI:', error);
  }
}

/**
 * Heuristic fallback parser when Gemini API is unconfigured/offline.
 */
function simulateCarbonFootprintAnalysis(message, userProfile = {}) {
  const text = message.toLowerCase();
  const activities = [];
  const actionPlan = [];
  let responseText = `Hi ${userProfile.email ? userProfile.email.split('@')[0] : 'there'}! [Demo Mode] `;

  const today = new Date().toISOString().split('T')[0];
  let matched = false;

  if (text.includes('drive') || text.includes('car') || text.includes('mile')) {
    matched = true;
    let distance = 15; // default fallback
    const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mi|mile)/);
    if (distanceMatch) {
      distance = parseFloat(distanceMatch[1]);
    }
    const calc = calculateEmissions('transport', { distance, mode: 'sedan' });
    activities.push({
      category: 'transport',
      co2: calc.co2,
      description: 'Commuted by car (Heuristic)',
      date: today
    });
    responseText += `Logged transport activity. ${calc.calculationDetail} Biking or public transit could save carbon.`;
    actionPlan.push({
      task: "Walk or cycle for trips under 2 miles this week",
      category: "transport",
      co2Reduction: 2.2,
      difficulty: "easy"
    });
  } else if (text.includes('beef') || text.includes('steak') || text.includes('meat') || text.includes('eat')) {
    matched = true;
    const calc = calculateEmissions('diet', { foodType: 'beef', mealCount: 1 });
    activities.push({
      category: 'diet',
      co2: calc.co2,
      description: 'Had beef meal (Heuristic)',
      date: today
    });
    responseText += `Logged diet choice. ${calc.calculationDetail} Beef is high in emissions. Consider poultry or plant-based protein.`;
    actionPlan.push({
      task: "Try a full plant-based lunch tomorrow",
      category: "diet",
      co2Reduction: 4.5,
      difficulty: "easy"
    });
  } else if (text.includes('ac') || text.includes('air conditioning') || text.includes('power') || text.includes('electricity')) {
    matched = true;
    const calc = calculateEmissions('energy', { energyType: 'ac', amount: 3 });
    activities.push({
      category: 'energy',
      co2: calc.co2,
      description: 'Used air conditioning (Heuristic)',
      date: today
    });
    responseText += `Logged energy usage. ${calc.calculationDetail} Cooling consumes high energy. Try eco-mode temperatures.`;
    actionPlan.push({
      task: "Adjust AC thermostat by 2 degrees to save energy",
      category: "energy",
      co2Reduction: 1.5,
      difficulty: "easy"
    });
  } else if (text.includes('recycle') || text.includes('compost') || text.includes('plastic')) {
    matched = true;
    const calc = calculateEmissions('waste', { wasteAction: 'recycle', bags: 1 });
    activities.push({
      category: 'waste',
      co2: calc.co2,
      description: 'Recycled plastics/cans (Heuristic)',
      date: today
    });
    responseText += `Logged waste management. ${calc.calculationDetail} Keep up the great recycling work!`;
    actionPlan.push({
      task: "Eliminate plastic bottles by using a reusable mug",
      category: "waste",
      co2Reduction: 0.8,
      difficulty: "easy"
    });
  }

  if (!matched) {
    responseText += "Thanks for checking in! Tell me about your commutes, meals, energy usage, or recycling habits, and I will analyze them and suggest personalized tasks.";
    actionPlan.push({
      task: "Log all your meals tomorrow for a complete diet report",
      category: "diet",
      co2Reduction: 1.0,
      difficulty: "easy"
    });
  }

  return {
    text: responseText + " [Running in Auth Demo Mode - Gemini Key Missing]",
    activities,
    actionPlan,
    demoMode: true
  };
}

/**
 * Helper to invoke the Gemini API, automatically falling back from gemini-2.5-flash
 * to stable gemini-1.5-flash if the service is overloaded (503 Service Unavailable).
 */
async function generateContentWithModelFallback(genAI, fullPrompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    return await model.generateContent(fullPrompt);
  } catch (error) {
    const isServiceError = error.message && (
      error.message.includes('503') || 
      error.message.includes('Service Unavailable') || 
      error.message.includes('demand') || 
      error.message.includes('overloaded') || 
      error.message.includes('429') || 
      error.message.includes('ResourceExhausted')
    );
    
    if (isServiceError) {
      console.warn('⚠️ gemini-2.5-flash service unavailable. Retrying with stable gemini-1.5-flash...');
      try {
        const fallbackModel = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });
        return await fallbackModel.generateContent(fullPrompt);
      } catch (fallbackError) {
        console.error('❌ gemini-1.5-flash fallback also failed:', fallbackError);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Process a message with Gemini to perform parameter extraction & context injection,
 * and calculate deterministic emissions.
 */
export async function analyzeHabit(userMessage, chatHistory = [], userProfile = {}, recentLogs = []) {
  if (isApiKeyMock || !genAI || process.env.NODE_ENV === 'test') {
    return simulateCarbonFootprintAnalysis(userMessage, userProfile);
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Compute quick stats for Profile-Context Injection
    const totalEmissions = recentLogs.filter(l => l.co2 > 0).reduce((sum, l) => sum + l.co2, 0);
    const totalSavings = Math.abs(recentLogs.filter(l => l.co2 < 0).reduce((sum, l) => sum + l.co2, 0));
    const netFootprint = totalEmissions - totalSavings;
    const streak = userProfile.streak || 0;
    const username = userProfile.email ? userProfile.email.split('@')[0] : 'User';

    const systemPrompt = `You are EcoGuide, a warm, motivating, and scientifically-grounded AI Carbon Coach.
    
    CURRENT DATE: ${currentDate}
    
    USER PROFILE DETAILS:
    - User Name: ${username}
    - Current Active Streak: ${streak} day(s)
    - User's Net Footprint Today: ${netFootprint.toFixed(1)} kg CO2
    - Recent Activities Logged Today: ${JSON.stringify(recentLogs.slice(0, 5).map(l => ({ category: l.category, co2: l.co2, desc: l.description })))}
    
    INSTRUCTIONS:
    Analyze the user's message. You must output a JSON response matching the following schema:
    {
      "text": "Your conversational response. Acknowledge the user, cheer them on for their active streak, reference their recent logs if relevant, and explain the science of their choices.",
      "extractedActivity": {
        "category": "transport" | "diet" | "energy" | "waste" | "other",
        "description": "Brief description of the action logged (e.g. 'Commuted by sedan' or 'Had beef hamburger')",
        "params": {
          "distance": number (for transport, in miles),
          "mode": "sedan" | "suv" | "ev" | "public" | "active" (for transport),
          "isSUV": boolean (for transport, true if vehicle is an SUV, truck, or large van),
          "foodType": "beef" | "poultry" | "vegetarian" | "vegan" (for diet),
          "mealCount": number (for diet, default 1),
          "energyType": "ac" | "heater" | "electricity" | "solar" (for energy),
          "amount": number (hours for ac/heater, kWh for electricity/solar),
          "wasteAction": "landfill" | "recycle" (for waste),
          "bags": number (for waste, default 1),
          "manualCO2": number (only for 'other' category, manual estimation),
          "customDescription": "string (only for 'other' category)"
        }
      },
      "actionPlan": [
        {
          "task": "A concrete daily task recommendation to help them reduce carbon emissions",
          "category": "transport" | "diet" | "energy" | "waste",
          "co2Reduction": number (estimated daily savings in kg CO2),
          "difficulty": "easy" | "medium" | "hard"
        }
      ]
    }
    
    CRITICAL BEHAVIOR RULES:
    1. If the user's message does not describe any specific footprint activity (e.g., just saying 'hello' or asking a general question), omit the "extractedActivity" field or set it to null.
    2. Suggest 1 to 2 personalized tasks in the "actionPlan" list when they log an emission or ask for tips. If no recommendations are needed, return an empty array [].
    3. Keep conversational text concise, encouraging, and clear.`;

    const chatContext = chatHistory.slice(-6).map(msg => 
      `${msg.sender === 'user' ? 'User' : 'EcoGuide'}: ${msg.text}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}\n\nChat Context:\n${chatContext}\n\nUser Message: ${userMessage}\n\nAnalyze the message and output the requested JSON object.`;

    const result = await generateContentWithModelFallback(genAI, fullPrompt);
    const responseData = JSON.parse(result.response.text());

    // Post-Process: Calculate deterministic carbon offset using our local calculator
    let processedActivities = [];
    if (responseData.extractedActivity) {
      const ext = responseData.extractedActivity;
      const calc = calculateEmissions(ext.category, ext.params || {});
      
      processedActivities.push({
        category: ext.category,
        co2: calc.co2,
        description: calc.calculationDetail || ext.description,
        date: currentDate
      });
    }

    return {
      text: responseData.text,
      activities: processedActivities,
      actionPlan: responseData.actionPlan || [],
      demoMode: false
    };

  } catch (error) {
    console.error('Gemini API query failed. Falling back to simulator:', error);
    return simulateCarbonFootprintAnalysis(userMessage, userProfile);
  }
}
