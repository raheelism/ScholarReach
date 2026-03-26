const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CV_PARSER_MODEL = "llama-3.1-8b-instant";
const OUTREACH_MODEL = "llama-3.3-70b-versatile";
const MAX_BASE64_CONTEXT_LENGTH = 12000;
const groqApiKey = process.env.GROQ_API_KEY;

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

function decodeBase64Utf8(base64Data: string): string {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding is not supported in this environment.");
  }
  const binaryString = atob(base64Data);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function truncateBase64ForContext(base64Data: string): string {
  if (base64Data.length < 4) {
    return base64Data;
  }
  const maxLength = Math.min(base64Data.length, MAX_BASE64_CONTEXT_LENGTH);
  const safeLength = maxLength - (maxLength % 4);
  return base64Data.slice(0, safeLength || 4);
}

async function createStructuredCompletion(model: string, prompt: string): Promise<string> {
  if (!groqApiKey) {
    throw new Error("Missing GROQ_API_KEY.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a careful assistant. Return valid JSON only and follow the requested schema exactly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq API returned an empty response.");
  }

  return content;
}

export async function parseCV(base64Data: string, mimeType: string): Promise<Partial<StudentProfile>> {
  let cvContentForModel = "";
  if (mimeType.startsWith("text/")) {
    cvContentForModel = decodeBase64Utf8(base64Data);
  } else {
    cvContentForModel = `CV file MIME type: ${mimeType}. Raw base64 (truncated): ${truncateBase64ForContext(base64Data)}`;
  }

  const prompt = `
You are an expert academic advisor. Analyze the provided CV content and extract the following information to populate a student profile form.
Return a JSON object using this exact schema:
{
  "name": string,
  "nationality": string,
  "degree": string,
  "institution": string,
  "gpa": string,
  "interests": string,
  "skills": string,
  "projects": string,
  "cvText": string
}
If a field is not found or cannot be confidently inferred, leave it as an empty string.
For 'cvText', provide a comprehensive plain-text extraction or detailed summary of the entire CV so it can be used as context later.
CV content:
${cvContentForModel}
`;

  const content = await createStructuredCompletion(CV_PARSER_MODEL, prompt);
  return JSON.parse(content) as Partial<StudentProfile>;
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

Task 1: Analyze the Professor Information
Use only the provided professor fields and student profile to infer:
1. Likely recent publications, key themes, methodologies, and findings.
2. Active research areas and lab focus.
3. Ongoing or recently funded projects where possible.
4. Any likely lab openings or student opportunities.
5. Analyze the alignment between the student's background and the professor's work.
Do not claim you accessed websites or external tools.

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
Return the result strictly as a JSON object using this exact schema:
{
  "subject": string,
  "body": string,
  "researchSummary": {
    "publications": string[],
    "researchAreas": string[],
    "projects": string[],
    "opportunities": string,
    "alignment": string,
    "personalizationScore": number,
    "confidenceNotes": string
  }
}
`;

  const content = await createStructuredCompletion(OUTREACH_MODEL, prompt);
  return JSON.parse(content) as EmailDraft;
}
