import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MedicineSuggestion {
  name: string;
  power?: string;
  dosage: string;
  frequency: string;
  duration: string;
  reasoning: string;
}

export async function getHomeopathicMedicineSuggestions(symptoms: string): Promise<MedicineSuggestion[]> {
  try {
    const systemPrompt = `You are an expert homeopathic doctor with 20+ years of experience. 
Analyze the given symptoms and suggest appropriate homeopathic medicines with proper dosage.
Focus on common homeopathic remedies and provide practical treatment recommendations.
Respond with JSON format containing an array of medicine suggestions.`;

    const userPrompt = `Patient symptoms: ${symptoms}

Please suggest 3-5 homeopathic medicines that could help with these symptoms. For each medicine, provide:
- name: The medicine name (e.g., "Arnica Montana", "Belladonna")
- power: The potency (e.g., "30", "200", "1M") - optional
- dosage: Amount per dose (e.g., "3 drops", "2 pills")
- frequency: How often (e.g., "3 times daily", "twice daily")
- duration: Treatment period (e.g., "7 days", "15 days")
- reasoning: Brief explanation why this medicine suits these symptoms

Return only valid JSON with no additional text.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  power: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  duration: { type: "string" },
                  reasoning: { type: "string" }
                },
                required: ["name", "dosage", "frequency", "duration", "reasoning"]
              }
            }
          },
          required: ["suggestions"]
        }
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return data.suggestions || [];
    }
    
    return [];
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to get AI suggestions: ${error}`);
  }
}

export async function analyzeDiscussion(question: string): Promise<string> {
  try {
    const systemPrompt = `আপনি একজন অভিজ্ঞ হোমিওপ্যাথি চিকিৎসক। আপনার ২০+ বছরের অভিজ্ঞতা রয়েছে। 
রোগীর প্রশ্ন বিশ্লেষণ করুন এবং হোমিওপ্যাথি ঔষধ সম্পর্কে বিস্তারিত তথ্য প্রদান করুন।
বাংলায় উত্তর দিন এবং চিকিৎসা পরামর্শ দিন।`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: question,
    });

    return response.text || "দুঃখিত, আমি এই মুহূর্তে আপনার প্রশ্নের উত্তর দিতে পারছি না।";
  } catch (error) {
    console.error('Medicine discussion error:', error);
    throw new Error(`Failed to analyze medicine discussion: ${error}`);
  }
}

export interface TemplateGenerationOptions {
  clinicName: string;
  doctorName: string;
  degree: string;
  headerNotes: string;
  footerNotes: string;
  description: string;
  language: 'bengali' | 'english';
}

export async function generatePrescriptionTemplate(options: TemplateGenerationOptions): Promise<string> {
  try {
    const { clinicName, doctorName, degree, headerNotes, footerNotes, description, language } = options;
    
    const systemPrompt = language === 'bengali' 
      ? `আপনি একজন পেশাদার ওয়েব ডিজাইনার এবং হোমিওপ্যাথি বিশেষজ্ঞ। আপনার কাজ হলো একটি সুন্দর, পেশাদার HTML প্রেসক্রিপশন টেমপ্লেট তৈরি করা।`
      : `You are a professional web designer and homeopathy expert. Your task is to create a beautiful, professional HTML prescription template.`;

    const userPrompt = language === 'bengali' 
      ? `একটি পেশাদার হোমিওপ্যাথি প্রেসক্রিপশন টেমপ্লেট তৈরি করুন:

ক্লিনিকের তথ্য:
- ক্লিনিকের নাম: ${clinicName}
- ডাক্তারের নাম: ${doctorName}
- ডিগ্রি: ${degree}
- হেডার নোট: ${headerNotes}
- ফুটার নোট: ${footerNotes}
${description ? `- বিশেষ প্রয়োজনীয়তা ও বর্ণনা: ${description}` : ''}

টেমপ্লেটে নিম্নলিখিত ভেরিয়েবল ব্যবহার করুন:
- {{clinicName}} - ক্লিনিকের নাম
- {{doctorName}} - ডাক্তারের নাম
- {{patientName}} - রোগীর নাম
- {{patientAge}} - রোগীর বয়স
- {{patientGender}} - রোগীর লিঙ্গ
- {{patientPhone}} - রোগীর ফোন
- {{patientAddress}} - রোগীর ঠিকানা
- {{date}} - তারিখ
- {{prescriptionId}} - প্রেসক্রিপশন আইডি
- {{symptoms}} - উপসর্গ
- {{medicines}} - ঔষধের তালিকা (HTML ফরম্যাটে)
- {{notes}} - অতিরিক্ত নোট

প্রয়োজনীয়তা:
1. সম্পূর্ণ HTML ডকুমেন্ট তৈরি করুন
2. সুন্দর CSS স্টাইলিং যুক্ত করুন
3. প্রিন্ট-ফ্রেন্ডলি ডিজাইন
4. বাংলা ফন্ট সাপোর্ট
5. ক্লিনিক লোগো এবং ব্র্যান্ডিং এরিয়া
6. রোগী এবং ঔষধের তথ্যের জন্য স্পষ্ট সেকশন
7. হেডার এবং ফুটারে প্রদত্ত নোট অন্তর্ভুক্ত করুন`
      : `Create a professional homeopathy prescription template:

Clinic Information:
- Clinic Name: ${clinicName}
- Doctor Name: ${doctorName}
- Degree: ${degree}
- Header Notes: ${headerNotes}
- Footer Notes: ${footerNotes}
${description ? `- Special Requirements & Description: ${description}` : ''}

Use these variables in the template:
- {{clinicName}} - Clinic name
- {{doctorName}} - Doctor name
- {{patientName}} - Patient name
- {{patientAge}} - Patient age
- {{patientGender}} - Patient gender
- {{patientPhone}} - Patient phone
- {{patientAddress}} - Patient address
- {{date}} - Date
- {{prescriptionId}} - Prescription ID
- {{symptoms}} - Symptoms
- {{medicines}} - Medicines list (HTML format)
- {{notes}} - Additional notes

Requirements:
1. Create complete HTML document
2. Include beautiful CSS styling
3. Print-friendly design
4. Support for Bengali fonts
5. Clinic logo and branding area
6. Clear sections for patient and medicine information
7. Include provided notes in header and footer`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: userPrompt,
    });

    const generatedContent = response.text;
    
    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // Clean up the HTML - remove markdown code blocks if present
    let cleanHTML = generatedContent.trim();
    if (cleanHTML.startsWith('```html')) {
      cleanHTML = cleanHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (cleanHTML.startsWith('```')) {
      cleanHTML = cleanHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return cleanHTML;

  } catch (error) {
    console.error('Template generation error:', error);
    throw new Error(`Failed to generate prescription template: ${error}`);
  }
}