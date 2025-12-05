
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, Shift, Location, RotaAssignment } from "./types";

const SYSTEM_INSTRUCTION = `
You are an expert workforce scheduler. You will generate a rota for a specific week defined by dates (YYYY-MM-DD).
You will receive employees (with default locations), shifts, available locations, and the start date of the week.
Output a JSON array of assignments.
Each assignment must include: date (YYYY-MM-DD), employeeId, shiftId, locationId.
Rules:
1. Use the employee's defaultLocationId for locationId unless told otherwise.
2. Respect the 7 days provided (Monday to Sunday).
3. Ensure coverage.
`;

export const generateRotaWithAI = async (
  employees: Employee[],
  shifts: Shift[],
  locations: Location[],
  promptConstraints: string,
  weekStart: Date
): Promise<RotaAssignment[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  // Calculate the 7 days string array
  const dates = [];
  const d = new Date(weekStart);
  for(let i=0; i<7; i++){
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate()+1);
  }

  const inputPrompt = `
    Week Dates: ${JSON.stringify(dates)}
    Employees: ${JSON.stringify(employees)}
    Shifts: ${JSON.stringify(shifts)}
    Locations: ${JSON.stringify(locations)}
    
    Constraints: ${promptConstraints || "Standard coverage."}
    
    Generate assignments for these specific dates.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: inputPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              employeeId: { type: Type.STRING },
              shiftId: { type: Type.STRING },
              locationId: { type: Type.STRING }
            },
            required: ["date", "employeeId", "shiftId", "locationId"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    
    return rawData.map((item: any) => ({
      ...item,
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

  } catch (error) {
    console.error("Gemini AI Rota Generation Error:", error);
    throw error;
  }
};
