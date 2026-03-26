import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface StudentProfile {
  name: string;
  nationality: string;
  degree: string;
  institution: string;
  gpa: string;
  interests: string;
  skills: string;
  projects: string;
  program: string;
  cvText: string;
  startDate: string;
}

export interface ProfessorProfile {
  email: string;
  websiteUrl: string;
  scholarUrl: string;
  name: string;
  university: string;
  department: string;
}

export interface ResearchSummary {
  publications: string[];
  researchAreas: string[];
  projects: string[];
  opportunities: string;
  alignment: string;
  personalizationScore: number;
  confidenceNotes: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  researchSummary: ResearchSummary;
}

export async function parseCV(base64Data: string, mimeType: string): Promise<Partial<StudentProfile>> {
  const prompt = `
You are an expert academic advisor. Analyze the provided CV and extract the following information to populate a student profile form.
Return a JSON object matching the schema. If a field is not found or cannot be confidently inferred, leave it as an empty string.
For 'cvText', provide a comprehensive plain-text extraction or detailed summary of the entire CV so it can be used as context later.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      prompt,
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Full name of the student" },
          nationality: { type: Type.STRING, description: "Nationality or country of origin" },
          degree: { type: Type.STRING, description: "Current or most recent degree (e.g., BSc Computer Science)" },
          institution: { type: Type.STRING, description: "Current or most recent university/institution" },
          gpa: { type: Type.STRING, description: "GPA or academic standing" },
          interests: { type: Type.STRING, description: "Research interests, separated by commas" },
          skills: { type: Type.STRING, description: "Relevant technical or academic skills, separated by commas" },
          projects: { type: Type.STRING, description: "Notable projects, publications, or theses" },
          cvText: { type: Type.STRING, description: "Full text extraction or detailed summary of the CV" },
        },
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to parse CV.");
  }

  return JSON.parse(text) as Partial<StudentProfile>;
}

export async function generateOutreachEmail(
  student: StudentProfile,
  professor: ProfessorProfile,
  tone: "Formal" | "Conversational" | "Concise" = "Formal"
): Promise<EmailDraft> {
  const prompt = `
You are an expert academic advisor helping a student write a highly personalized, research-aligned outreach email to a professor for a ${student.program} opportunity.

Student Profile:
- Name: ${student.name}
- Nationality: ${student.nationality}
- Current Degree: ${student.degree} at ${student.institution}
- GPA: ${student.gpa}
- Research Interests: ${student.interests}
- Skills: ${student.skills}
- Notable Projects/Publications: ${student.projects}
- Preferred Program: ${student.program}
- Intended Start Date: ${student.startDate}
- CV Text (if any): ${student.cvText}

Professor Information:
- Name: ${professor.name}
- Email: ${professor.email}
- University: ${professor.university}
- Department: ${professor.department}
- Website: ${professor.websiteUrl}
- Google Scholar/ResearchGate: ${professor.scholarUrl}

Task 1: Research the Professor
Use the Google Search tool to find recent information about the professor (last 3-5 years). Look for:
1. Recent publications, key themes, methodologies, and findings.
2. Active research areas and lab focus.
3. Ongoing or recently funded projects.
4. Any mention of lab openings or student opportunities.
5. Analyze the alignment between the student's background and the professor's work.

If no profile links are provided, attempt a web search using the professor's name + university + department to find their profile.
If research data is sparse, gracefully acknowledge this and generate the best possible email with what's available. Flag low-confidence sections in the confidenceNotes.

Task 2: Draft the Email
Write a professional, warm, and highly personalized email.
- Tone: ${tone} (Confident but humble, specific but concise, professional but human).
- Length: 250-350 words.
- Opening: Specific, genuine reference to the professor's recent work (NOT generic flattery).
- Intent: Clearly state the intent (${student.program} application/supervision).
- Alignment: Highlight 2-3 concrete alignment points between the student's skills/interests and the professor's research.
- Achievement: Briefly present the student's most relevant achievement or project.
- Call to Action: Clear, low-friction (e.g., a 15-minute call, or asking if positions are available).

Task 3: Output as JSON
Return the result strictly as a JSON object matching the requested schema.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: {
            type: Type.STRING,
            description: "A compelling and professional subject line for the email.",
          },
          body: {
            type: Type.STRING,
            description: "The body of the email. Use markdown for formatting if necessary, but keep it clean.",
          },
          researchSummary: {
            type: Type.OBJECT,
            properties: {
              publications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 2-3 recent publications found.",
              },
              researchAreas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of active research areas.",
              },
              projects: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of ongoing or recently funded projects.",
              },
              opportunities: {
                type: Type.STRING,
                description: "Notes on any lab openings or student opportunities found.",
              },
              alignment: {
                type: Type.STRING,
                description: "Summary of alignment between student and professor.",
              },
              personalizationScore: {
                type: Type.NUMBER,
                description: "A score from 1 to 100 indicating how well the email is tailored based on the available information.",
              },
              confidenceNotes: {
                type: Type.STRING,
                description: "Warnings if professor info was insufficient for deep personalization, and suggestions for improvement.",
              },
            },
            required: [
              "publications",
              "researchAreas",
              "projects",
              "opportunities",
              "alignment",
              "personalizationScore",
              "confidenceNotes",
            ],
          },
        },
        required: ["subject", "body", "researchSummary"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to generate email content.");
  }

  return JSON.parse(text) as EmailDraft;
}
