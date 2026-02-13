import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Classroom } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  GraduationCap, Plus, Users, BookOpen, ArrowRight, LogOut, Copy, Check, 
  ClipboardList, MessageCircle, HelpCircle, Trash2, Target, 
  Award, TrendingUp, Zap, Sun, Star, Lightbulb,
  FileQuestion, ListOrdered, Timer, UserCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TeacherDashboardProps {
  onClassroomSelect: (classroomId: string) => void;
}

export function TeacherDashboard({ onClassroomSelect }: TeacherDashboardProps) {
  const { 
    currentUser, 
    logout, 
    createClassroom, 
    getTeacherClassrooms
  } = useAuth();
  
  // Create classroom dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomSubject, setNewClassroomSubject] = useState('');
  const [newClassroomDescription, setNewClassroomDescription] = useState('');
  
  // Copy code state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Feedback question dialog
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [selectedClassroomForQuestion, setSelectedClassroomForQuestion] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // Quiz creation dialog
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [selectedClassroomForQuiz, setSelectedClassroomForQuiz] = useState<string | null>(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(15);
  const [quizQuestions, setQuizQuestions] = useState<{ text: string; options: string[]; correctAnswer: number; order: number }[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: 0, order: 0 }
  ]);

  // Student list dialog
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [selectedClassroomForStudents, setSelectedClassroomForStudents] = useState<string | null>(null);
  const [teacherClassrooms, setTeacherClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    const loadClassrooms = async () => {
      if (!currentUser) {
        setTeacherClassrooms([]);
        return;
      }
      const classrooms = await getTeacherClassrooms();
      setTeacherClassrooms(classrooms);
    };
    loadClassrooms();
  }, [currentUser, getTeacherClassrooms]);

  const getStudentNames = (studentIds: string[]) => {
    // Student names feature temporarily disabled
    return studentIds.map((_, index) => `Student ${index + 1}`);
  };

  const handleCreateClassroom = async () => {
    if (!newClassroomName.trim() || !newClassroomSubject.trim()) {
      toast.error('Please fill in classroom name and subject');
      return;
    }

    const result = await createClassroom(newClassroomName, newClassroomSubject, newClassroomDescription);
    if (result.success) {
      toast.success(result.message);
      setNewClassroomName('');
      setNewClassroomSubject('');
      setNewClassroomDescription('');
      setIsCreateDialogOpen(false);
      // Reload classrooms
      if (currentUser) {
        const classrooms = await getTeacherClassrooms();
        setTeacherClassrooms(classrooms);
      }
    } else {
      toast.error(result.message);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Classroom code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddQuestion = () => {
    // Feedback question feature temporarily disabled
    toast.error('Feedback question feature is temporarily unavailable');
  };

  const handleRemoveQuestion = (_classroomId: string, _questionId: string) => {
    // Feedback question feature temporarily disabled
    toast.error('Feedback question feature is temporarily unavailable');
  };

  const handleCreateQuiz = () => {
    // Quiz creation feature temporarily disabled
    toast.error('Quiz creation feature is temporarily unavailable');
  };

  const addQuizQuestionField = () => {
    setQuizQuestions([...quizQuestions, { text: '', options: ['', '', '', ''], correctAnswer: 0, order: quizQuestions.length }]);
  };

  const removeQuizQuestionField = (index: number) => {
    if (quizQuestions.length > 1) {
      setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    }
  };

  const updateQuizQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...quizQuestions];
    if (field === 'text') {
      updated[index].text = value as string;
    } else if (field.startsWith('option')) {
      const optionIndex = parseInt(field.replace('option', ''));
      updated[index].options[optionIndex] = value as string;
    } else if (field === 'correctAnswer') {
      updated[index].correctAnswer = value as number;
    }
    setQuizQuestions(updated);
  };

  const getAnalyticsData = (classroomId: string) => {
    const classroom = teacherClassrooms.find((c: Classroom) => c.id === classroomId);
    if (!classroom || classroom.feedbacks.length === 0) return [];

    const feedbacks = classroom.feedbacks;

    const excellent = feedbacks.filter((f) => {
      const answers = Object.values(f.answers);
      const avg = answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
      return avg >= 4.5;
    }).length;
    
    const good = feedbacks.filter((f) => {
      const answers = Object.values(f.answers);
      const avg = answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
      return avg >= 3.5 && avg < 4.5;
    }).length;
    
    const average = feedbacks.filter((f) => {
      const answers = Object.values(f.answers);
      const avg = answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
      return avg >= 2.5 && avg < 3.5;
    }).length;
    
    const belowAverage = feedbacks.filter((f) => {
      const answers = Object.values(f.answers);
      const avg = answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
      return avg < 2.5;
    }).length;

    return [
      { name: 'Excellent', value: excellent, color: '#537791' },
      { name: 'Good', value: good, color: '#6a8fa3' },
      { name: 'Average', value: average, color: '#C1C0B9' },
      { name: 'Below Average', value: belowAverage, color: '#a39e93' },
    ].filter((item) => item.value > 0);
  };

  const getAverageRating = (classroomId: string) => {
    const classroom = teacherClassrooms.find((c: Classroom) => c.id === classroomId);
    if (!classroom || classroom.feedbacks.length === 0) return '0';

    const total = classroom.feedbacks.reduce((sum: number, f) => {
      const answers = Object.values(f.answers);
      return sum + answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
    }, 0);
    return (total / classroom.feedbacks.length).toFixed(1);
  };

  const getQuizAverageScore = (classroomId: string, quizId: string) => {
    const classroom = teacherClassrooms.find((c: Classroom) => c.id === classroomId);
    if (!classroom) return 0;
    
    const attempts = classroom.quizAttempts.filter((a) => a.quizId === quizId);
    if (attempts.length === 0) return 0;
    
    const total = attempts.reduce((sum: number, a) => sum + (a.score / a.totalQuestions) * 100, 0);
    return Math.round(total / attempts.length);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ background: '#F7F6E7', borderColor: '#E7E6E1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" 
                   style={{ background: '#537791' }}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#537791' }}>Teacher Dashboard</h1>
                <p style={{ color: '#C1C0B9' }}>Welcome, {currentUser?.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2 border-0 hover:shadow-md transition-shadow"
                    style={{ background: '#E7E6E1', color: '#537791' }}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #537791' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <BookOpen className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Classrooms</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>{teacherClassrooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #6a8fa3' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Users className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Students</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    {teacherClassrooms.reduce((sum: number, c: Classroom) => sum + c.students.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #C1C0B9' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <ClipboardList className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Feedback</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    {teacherClassrooms.reduce((sum: number, c: Classroom) => sum + c.feedbacks.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #a39e93' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Target className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Quizzes</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    {teacherClassrooms.reduce((sum: number, c: Classroom) => sum + c.quizzes.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Classroom Button */}
        <div className="mb-6">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                      style={{ background: '#537791' }}>
                <Plus className="w-4 h-4" />
                Create New Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" style={{ background: '#F7F6E7' }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                  <Sun className="w-5 h-5" style={{ color: '#537791' }} />
                  Create New Classroom
                </DialogTitle>
                <DialogDescription style={{ color: '#C1C0B9' }}>
                  Create a classroom and share the code with your students.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="classroom-name" style={{ color: '#537791' }}>Classroom Name</Label>
                  <Input
                    id="classroom-name"
                    placeholder="e.g., Mathematics 101"
                    value={newClassroomName}
                    onChange={(e) => setNewClassroomName(e.target.value)}
                    className="border-0 focus:ring-2"
                    style={{ background: '#E7E6E1', color: '#537791' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" style={{ color: '#537791' }}>Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Mathematics"
                    value={newClassroomSubject}
                    onChange={(e) => setNewClassroomSubject(e.target.value)}
                    className="border-0 focus:ring-2"
                    style={{ background: '#E7E6E1', color: '#537791' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" style={{ color: '#537791' }}>Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the classroom..."
                    value={newClassroomDescription}
                    onChange={(e) => setNewClassroomDescription(e.target.value)}
                    rows={3}
                    className="border-0 focus:ring-2"
                    style={{ background: '#E7E6E1', color: '#537791' }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}
                        style={{ borderColor: '#C1C0B9', color: '#537791' }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateClassroom} className="text-white"
                        style={{ background: '#537791' }}>
                  <Zap className="w-4 h-4 mr-2" />
                  Create Classroom
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classrooms Grid */}
        {teacherClassrooms.length === 0 ? (
          <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
            <CardContent>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                <Sun className="w-10 h-10" style={{ color: '#C1C0B9' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>No Classrooms Yet</h3>
              <p style={{ color: '#C1C0B9' }} className="mb-4">Create your first classroom to start collecting feedback</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 text-white" style={{ background: '#537791' }}>
                <Plus className="w-4 h-4" />
                Create Classroom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {teacherClassrooms.map((classroom) => {
              const analyticsData = getAnalyticsData(classroom.id);
              const avgRating = getAverageRating(classroom.id);
              const studentNames = getStudentNames(classroom.students);
              
              return (
                <Card key={classroom.id} className="overflow-hidden border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
                  <CardHeader className="pb-4" style={{ background: '#E7E6E1' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#537791' }}>
                          <Lightbulb className="w-5 h-5" style={{ color: '#537791' }} />
                          {classroom.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1" style={{ color: '#C1C0B9' }}>
                          <BookOpen className="w-3 h-3" />
                          {classroom.subject}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm" 
                           style={{ background: '#F7F6E7', border: '1px solid #C1C0B9' }}>
                        <span className="text-sm font-mono font-bold" style={{ color: '#537791' }}>{classroom.code}</span>
                        <button
                          onClick={() => copyToClipboard(classroom.code)}
                          className="transition-colors"
                          style={{ color: '#C1C0B9' }}
                        >
                          {copiedCode === classroom.code ? (
                            <Check className="w-4 h-4" style={{ color: '#537791' }} />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: '#C1C0B9' }}>
                      {classroom.description || 'No description provided'}
                    </p>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
                      {/* Student List Dialog */}
                      <Dialog open={isStudentListOpen && selectedClassroomForStudents === classroom.id}
                              onOpenChange={(open) => {
                                setIsStudentListOpen(open);
                                if (open) setSelectedClassroomForStudents(classroom.id);
                                else setSelectedClassroomForStudents(null);
                              }}>
                        <DialogTrigger asChild>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:shadow-sm transition-shadow"
                               style={{ background: '#E7E6E1' }}>
                            <Users className="w-4 h-4" style={{ color: '#537791' }} />
                            <span style={{ color: '#537791' }}>{classroom.students.length} Students</span>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" style={{ background: '#F7F6E7' }}>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                              <Users className="w-5 h-5" />
                              Student List - {classroom.name}
                            </DialogTitle>
                            <DialogDescription style={{ color: '#C1C0B9' }}>
                              {classroom.students.length} students enrolled
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            {studentNames.length === 0 ? (
                              <p className="text-center py-4" style={{ color: '#C1C0B9' }}>No students enrolled yet</p>
                            ) : (
                              <div className="space-y-2 max-h-80 overflow-y-auto">
                                {studentNames.map((name, index) => (
                                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#E7E6E1' }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#537791' }}>
                                      <UserCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium" style={{ color: '#537791' }}>{name}</span>
                                    <CheckCircle className="w-4 h-4 ml-auto" style={{ color: '#537791' }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: '#E7E6E1' }}>
                        <ClipboardList className="w-4 h-4" style={{ color: '#537791' }} />
                        <span style={{ color: '#537791' }}>{classroom.feedbacks.length} Feedback</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: '#E7E6E1' }}>
                        <Target className="w-4 h-4" style={{ color: '#537791' }} />
                        <span style={{ color: '#537791' }}>{classroom.quizzes.length} Quizzes</span>
                      </div>
                      {classroom.feedbacks.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: '#E7E6E1' }}>
                          <Star className="w-4 h-4" style={{ color: '#537791' }} />
                          <span style={{ color: '#537791' }}>{avgRating}/5.0</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4">
                      <Dialog open={isQuestionDialogOpen && selectedClassroomForQuestion === classroom.id} 
                              onOpenChange={(open) => {
                                setIsQuestionDialogOpen(open);
                                if (open) setSelectedClassroomForQuestion(classroom.id);
                                else setSelectedClassroomForQuestion(null);
                              }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 border-0 hover:shadow-sm transition-shadow"
                                  style={{ background: '#E7E6E1', color: '#537791' }}>
                            <MessageCircle className="w-3.5 h-3.5" />
                            Questions
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: '#F7F6E7' }}>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                              <HelpCircle className="w-5 h-5" />
                              Manage Feedback Questions
                            </DialogTitle>
                            <DialogDescription style={{ color: '#C1C0B9' }}>
                              Add or remove questions for student feedback in {classroom.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            {/* Existing Questions */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium" style={{ color: '#537791' }}>Current Questions ({classroom.feedbackQuestions.length})</Label>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {classroom.feedbackQuestions.map((q, index) => (
                                  <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#E7E6E1' }}>
                                    <span className="text-xs font-medium mt-0.5" style={{ color: '#C1C0B9' }}>{index + 1}.</span>
                                    <p className="text-sm flex-1" style={{ color: '#537791' }}>{q.text}</p>
                                    <button
                                      onClick={() => handleRemoveQuestion(classroom.id, q.id)}
                                      className="transition-colors"
                                      style={{ color: '#a39e93' }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Add New Question */}
                            <div className="space-y-2 pt-4 border-t" style={{ borderColor: '#E7E6E1' }}>
                              <Label htmlFor="new-question" style={{ color: '#537791' }}>Add New Question</Label>
                              <Textarea
                                id="new-question"
                                placeholder="Enter your feedback question..."
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                rows={2}
                                className="border-0 focus:ring-2"
                                style={{ background: '#E7E6E1', color: '#537791' }}
                              />
                              <Button onClick={handleAddQuestion} className="w-full text-white" style={{ background: '#537791' }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Question
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isQuizDialogOpen && selectedClassroomForQuiz === classroom.id}
                              onOpenChange={(open) => {
                                setIsQuizDialogOpen(open);
                                if (open) setSelectedClassroomForQuiz(classroom.id);
                                else setSelectedClassroomForQuiz(null);
                              }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 border-0 hover:shadow-sm transition-shadow"
                                  style={{ background: '#E7E6E1', color: '#537791' }}>
                            <FileQuestion className="w-3.5 h-3.5" />
                            Create Quiz
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#F7F6E7' }}>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                              <Target className="w-5 h-5" />
                              Create New Quiz
                            </DialogTitle>
                            <DialogDescription style={{ color: '#C1C0B9' }}>
                              Create a quiz for {classroom.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="quiz-title" style={{ color: '#537791' }}>Quiz Title</Label>
                              <Input
                                id="quiz-title"
                                placeholder="e.g., Midterm Review"
                                value={newQuizTitle}
                                onChange={(e) => setNewQuizTitle(e.target.value)}
                                className="border-0 focus:ring-2"
                                style={{ background: '#E7E6E1', color: '#537791' }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quiz-description" style={{ color: '#537791' }}>Description</Label>
                              <Textarea
                                id="quiz-description"
                                placeholder="Brief description of the quiz..."
                                value={newQuizDescription}
                                onChange={(e) => setNewQuizDescription(e.target.value)}
                                rows={2}
                                className="border-0 focus:ring-2"
                                style={{ background: '#E7E6E1', color: '#537791' }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quiz-time" className="flex items-center gap-2" style={{ color: '#537791' }}>
                                <Timer className="w-4 h-4" />
                                Time Limit (minutes)
                              </Label>
                              <Input
                                id="quiz-time"
                                type="number"
                                min={5}
                                max={120}
                                value={newQuizTimeLimit}
                                onChange={(e) => setNewQuizTimeLimit(parseInt(e.target.value) || 15)}
                                className="border-0 focus:ring-2"
                                style={{ background: '#E7E6E1', color: '#537791' }}
                              />
                            </div>

                            {/* Quiz Questions */}
                            <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#E7E6E1' }}>
                              <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2" style={{ color: '#537791' }}>
                                  <ListOrdered className="w-4 h-4" />
                                  Questions ({quizQuestions.length})
                                </Label>
                                <Button type="button" variant="outline" size="sm" onClick={addQuizQuestionField}
                                        style={{ borderColor: '#C1C0B9', color: '#537791' }}>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Question
                                </Button>
                              </div>
                              
                              {quizQuestions.map((q, qIndex) => (
                                <div key={qIndex} className="p-4 rounded-lg space-y-3" style={{ background: '#E7E6E1' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium" style={{ color: '#537791' }}>Question {qIndex + 1}</span>
                                    {quizQuestions.length > 1 && (
                                      <button
                                        onClick={() => removeQuizQuestionField(qIndex)}
                                        style={{ color: '#a39e93' }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  <Input
                                    placeholder="Enter question text..."
                                    value={q.text}
                                    onChange={(e) => updateQuizQuestion(qIndex, 'text', e.target.value)}
                                    className="border-0 focus:ring-2 text-sm"
                                    style={{ background: '#F7F6E7', color: '#537791' }}
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    {q.options.map((option, oIndex) => (
                                      <div key={oIndex} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`correct-${qIndex}`}
                                          checked={q.correctAnswer === oIndex}
                                          onChange={() => updateQuizQuestion(qIndex, 'correctAnswer', oIndex)}
                                          className="w-4 h-4"
                                          style={{ accentColor: '#537791' }}
                                        />
                                        <Input
                                          placeholder={`Option ${oIndex + 1}`}
                                          value={option}
                                          onChange={(e) => updateQuizQuestion(qIndex, `option${oIndex}`, e.target.value)}
                                          className="border-0 focus:ring-2 text-sm"
                                          style={{ background: '#F7F6E7', color: '#537791' }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}
                                    style={{ borderColor: '#C1C0B9', color: '#537791' }}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateQuiz} className="text-white" style={{ background: '#537791' }}>
                              <Zap className="w-4 h-4 mr-2" />
                              Create Quiz
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Analytics Section */}
                    {classroom.feedbacks.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E7E6E1' }}>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#537791' }}>
                          <TrendingUp className="w-4 h-4" />
                          Feedback Analysis
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analyticsData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {analyticsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend fontSize={12} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Quizzes List */}
                    {classroom.quizzes.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E7E6E1' }}>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#537791' }}>
                          <Award className="w-4 h-4" />
                          Active Quizzes
                        </h4>
                        <div className="space-y-2">
                          {classroom.quizzes.map((quiz) => {
                            const avgScore = getQuizAverageScore(classroom.id, quiz.id);
                            const attemptCount = classroom.quizAttempts.filter((a) => a.quizId === quiz.id).length;
                            
                            return (
                              <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#E7E6E1' }}>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: '#537791' }}>{quiz.title}</p>
                                  <p className="text-xs" style={{ color: '#C1C0B9' }}>{quiz.questions.length} questions • {quiz.timeLimit} min</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold" style={{ color: '#537791' }}>{avgScore}% avg</p>
                                  <p className="text-xs" style={{ color: '#C1C0B9' }}>{attemptCount} attempts</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      className="w-full mt-4 gap-2 border-0 hover:shadow-sm transition-shadow"
                      style={{ background: '#E7E6E1', color: '#537791' }}
                      onClick={() => onClassroomSelect(classroom.id)}
                    >
                      View Full Details
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
