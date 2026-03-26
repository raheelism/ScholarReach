import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { StudentProfile, ProfessorProfile, EmailDraft, generateOutreachEmail, parseCV } from "./services/geminiService";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Progress } from "./components/ui/progress";
import { Badge } from "./components/ui/badge";
import { Loader2, Mail, Copy, RefreshCw, ExternalLink, GraduationCap, User, BookOpen, Send, Upload } from "lucide-react";
import Markdown from "react-markdown";

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsingCV, setIsParsingCV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [student, setStudent] = useState<StudentProfile>({
    name: "",
    nationality: "",
    degree: "",
    institution: "",
    gpa: "",
    interests: "",
    skills: "",
    projects: "",
    program: "PhD",
    cvText: "",
    startDate: "",
  });
  const [professor, setProfessor] = useState<ProfessorProfile>({
    name: "",
    email: "",
    university: "",
    department: "",
    websiteUrl: "",
    scholarUrl: "",
  });
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [tone, setTone] = useState<"Formal" | "Conversational" | "Concise">("Formal");

  const handleGenerate = async (selectedTone: "Formal" | "Conversational" | "Concise" = "Formal") => {
    if (!student.name || !professor.name || !professor.email) {
      toast.error("Please fill in the required fields (Student Name, Professor Name, Professor Email).");
      return;
    }

    setStep(3);
    setIsGenerating(true);
    setTone(selectedTone);

    try {
      const result = await generateOutreachEmail(student, professor, selectedTone);
      setDraft(result);
      setEditedSubject(result.subject);
      setEditedBody(result.body);
      setStep(4);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate email. Please try again.");
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
    toast.success("Copied to clipboard!");
  };

  const handleMailTo = () => {
    const mailtoLink = `mailto:${professor.email}?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
    window.location.href = mailtoLink;
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    
    setIsParsingCV(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const parsedData = await parseCV(base64String, file.type);
        setStudent(prev => ({ ...prev, ...parsedData }));
        toast.success("Profile auto-filled from CV!");
        setIsParsingCV(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to parse CV");
      setIsParsingCV(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-serif font-semibold tracking-tight">ScholarReach</span>
          </div>
          {step !== 3 && (
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <span className={step === 1 ? "text-zinc-900" : ""}>1. Profile</span>
              <span className="text-zinc-300">/</span>
              <span className={step === 2 ? "text-zinc-900" : ""}>2. Professor</span>
              <span className="text-zinc-300">/</span>
              <span className={step === 4 ? "text-zinc-900" : ""}>3. Review</span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-3xl"
            >
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-3xl font-semibold">Your Academic Profile</CardTitle>
                  <CardDescription className="text-base">Tell us about your background, skills, and goals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* CV Upload Section */}
                  <div
                    className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center hover:bg-zinc-100 transition-colors cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                    {isParsingCV ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                        <span className="text-sm text-zinc-500">Extracting profile data...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-zinc-200 p-2">
                          <Upload className="h-5 w-5 text-zinc-600" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700">Upload your CV to auto-fill</span>
                        <span className="text-xs text-zinc-500">PDF, DOCX, or TXT up to 5MB</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input id="nationality" value={student.nationality} onChange={(e) => setStudent({ ...student, nationality: e.target.value })} placeholder="e.g., Canadian" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="degree">Current Degree</Label>
                      <Input id="degree" value={student.degree} onChange={(e) => setStudent({ ...student, degree: e.target.value })} placeholder="BSc Computer Science" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution</Label>
                      <Input id="institution" value={student.institution} onChange={(e) => setStudent({ ...student, institution: e.target.value })} placeholder="University of Toronto" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA / Standing</Label>
                      <Input id="gpa" value={student.gpa} onChange={(e) => setStudent({ ...student, gpa: e.target.value })} placeholder="3.9/4.0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="program">Target Program</Label>
                      <select
                        id="program"
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                        value={student.program}
                        onChange={(e) => setStudent({ ...student, program: e.target.value })}
                      >
                        <option value="PhD">PhD</option>
                        <option value="MS">Master's (MS/MSc)</option>
                        <option value="Research Internship">Research Internship</option>
                        <option value="Postdoc">Postdoc</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Intended Start</Label>
                      <Input id="startDate" value={student.startDate} onChange={(e) => setStudent({ ...student, startDate: e.target.value })} placeholder="Fall 2027" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">Research Interests</Label>
                    <Input id="interests" value={student.interests} onChange={(e) => setStudent({ ...student, interests: e.target.value })} placeholder="e.g., Machine Learning, Computer Vision, AI Safety" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Relevant Skills</Label>
                    <Input id="skills" value={student.skills} onChange={(e) => setStudent({ ...student, skills: e.target.value })} placeholder="e.g., Python, PyTorch, Data Analysis" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projects">Notable Projects / Publications</Label>
                    <Textarea id="projects" value={student.projects} onChange={(e) => setStudent({ ...student, projects: e.target.value })} placeholder="Briefly describe your thesis or key projects..." className="h-24" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvText">CV Text (Optional)</Label>
                    <Textarea id="cvText" value={student.cvText} onChange={(e) => setStudent({ ...student, cvText: e.target.value })} placeholder="Paste your CV text here for better context..." className="h-32" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-zinc-100 bg-zinc-50/50 p-6">
                  <Button onClick={() => setStep(2)} size="lg" className="w-full sm:w-auto">
                    Next: Professor Details
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-3xl"
            >
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-3xl font-semibold">Professor Details</CardTitle>
                  <CardDescription className="text-base">Who are you reaching out to? We'll research them automatically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profName">Professor's Name *</Label>
                      <Input id="profName" value={professor.name} onChange={(e) => setProfessor({ ...professor, name: e.target.value })} placeholder="Dr. Alan Turing" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profEmail">Professor's Email *</Label>
                      <Input id="profEmail" type="email" value={professor.email} onChange={(e) => setProfessor({ ...professor, email: e.target.value })} placeholder="alan.turing@university.edu" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profUniversity">University</Label>
                      <Input id="profUniversity" value={professor.university} onChange={(e) => setProfessor({ ...professor, university: e.target.value })} placeholder="University of Cambridge" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profDepartment">Department</Label>
                      <Input id="profDepartment" value={professor.department} onChange={(e) => setProfessor({ ...professor, department: e.target.value })} placeholder="Computer Science" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profWebsite">Personal / Lab Website URL</Label>
                    <Input id="profWebsite" type="url" value={professor.websiteUrl} onChange={(e) => setProfessor({ ...professor, websiteUrl: e.target.value })} placeholder="https://..." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profScholar">Google Scholar / ResearchGate URL</Label>
                    <Input id="profScholar" type="url" value={professor.scholarUrl} onChange={(e) => setProfessor({ ...professor, scholarUrl: e.target.value })} placeholder="https://scholar.google.com/..." />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-zinc-100 bg-zinc-50/50 p-6">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => handleGenerate("Formal")} size="lg" disabled={!professor.name || !professor.email}>
                    <Mail className="mr-2 h-4 w-4" />
                    Generate Email
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-zinc-900 opacity-20" />
              </div>
              <h2 className="mb-2 font-serif text-3xl font-semibold tracking-tight">Crafting your outreach...</h2>
              <p className="mb-8 text-zinc-500">
                Our AI is currently researching {professor.name}'s recent publications and analyzing alignment with your background.
              </p>
              <div className="w-full max-w-xs space-y-2">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "80%" }}
                  transition={{ duration: 10, ease: "easeOut" }}
                  className="h-2 w-full overflow-hidden rounded-full bg-zinc-100"
                >
                  <div className="h-full bg-zinc-900" style={{ width: "100%" }} />
                </motion.div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Searching web...</span>
                  <span>Drafting email...</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && draft && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            >
              {/* Left Panel: Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">Your Email Draft</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleGenerate(tone)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button size="sm" onClick={handleCopy}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button size="sm" onClick={handleMailTo}>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>

                <Card className="overflow-hidden border-zinc-200 shadow-sm">
                  <div className="border-b border-zinc-100 bg-zinc-50/50 p-4">
                    <div className="mb-4 flex items-center gap-4">
                      <Label className="w-16 text-right text-zinc-500">To:</Label>
                      <Input value={professor.email} readOnly className="bg-white/50" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="w-16 text-right text-zinc-500">Subject:</Label>
                      <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} className="font-medium" />
                    </div>
                  </div>
                  <div className="p-0">
                    <Textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="min-h-[400px] resize-y rounded-none border-0 p-6 text-base leading-relaxed focus-visible:ring-0"
                    />
                  </div>
                </Card>

                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">Tone:</span>
                    <div className="flex gap-2">
                      {(["Formal", "Conversational", "Concise"] as const).map((t) => (
                        <Badge
                          key={t}
                          variant={tone === t ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleGenerate(t)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Right Panel: Research Summary */}
              <div className="space-y-6">
                <Card className="border-zinc-200 shadow-sm">
                  <CardHeader className="bg-zinc-50/50 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-zinc-500" />
                      Research Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border-b border-zinc-100 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700">Personalization Score</span>
                        <span className="text-sm font-bold text-zinc-900">{draft.researchSummary.personalizationScore}%</span>
                      </div>
                      <Progress value={draft.researchSummary.personalizationScore} className="h-2" />
                      {draft.researchSummary.personalizationScore < 50 && (
                        <p className="mt-2 text-xs text-amber-600">
                          {draft.researchSummary.confidenceNotes}
                        </p>
                      )}
                    </div>

                    <Tabs defaultValue="alignment" className="w-full">
                      <TabsList className="w-full justify-start rounded-none border-b border-zinc-100 bg-transparent p-0">
                        <TabsTrigger value="alignment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Alignment</TabsTrigger>
                        <TabsTrigger value="publications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Publications</TabsTrigger>
                        <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Projects</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="alignment" className="p-4 text-sm leading-relaxed text-zinc-600">
                        <div className="markdown-body prose prose-sm prose-zinc">
                          <Markdown>{draft.researchSummary.alignment}</Markdown>
                        </div>
                        {draft.researchSummary.opportunities && (
                          <div className="mt-4 rounded-md bg-blue-50 p-3 text-blue-800">
                            <span className="font-semibold">Opportunities:</span> {draft.researchSummary.opportunities}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="publications" className="p-4">
                        <ul className="space-y-3 text-sm text-zinc-600">
                          {draft.researchSummary.publications.map((pub, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                              <span>{pub}</span>
                            </li>
                          ))}
                          {draft.researchSummary.publications.length === 0 && (
                            <li className="text-zinc-400 italic">No recent publications found.</li>
                          )}
                        </ul>
                      </TabsContent>

                      <TabsContent value="projects" className="p-4">
                        <ul className="space-y-3 text-sm text-zinc-600">
                          {draft.researchSummary.projects.map((proj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                              <span>{proj}</span>
                            </li>
                          ))}
                          {draft.researchSummary.projects.length === 0 && (
                            <li className="text-zinc-400 italic">No specific projects found.</li>
                          )}
                        </ul>
                        <div className="mt-4">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Research Areas</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {draft.researchSummary.researchAreas.map((area, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal">{area}</Badge>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
