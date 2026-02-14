import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { classroomService } from '@/services/classroomService';
import type { Classroom } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ArrowLeft, Users, User, MessageCircle, CheckCircle, Star, BarChart3,
  GraduationCap, BookOpen, ClipboardList, Target, Award, Flame, Zap, Timer, AlertCircle,
  ListOrdered, Clock, MessageSquare, TrendingUp, UserCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClassroomPageProps {
  classroomId: string;
  onBack: () => void;
}

export function ClassroomPage({ classroomId, onBack }: ClassroomPageProps) {
  const {
    currentUser,
    getTeacherClassrooms,
    getStudentClassrooms
  } = useAuth();

  // Feedback form state (disabled)
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Quiz state (disabled)
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;

      let classrooms: Classroom[] = [];
      if (currentUser.role === 'teacher') {
        classrooms = await getTeacherClassrooms();
      } else {
        classrooms = await getStudentClassrooms();
      }

      const found = classrooms.find(c => c.id === classroomId);
      setClassroom(found || null);
    };
    load();
  }, [classroomId, currentUser, getTeacherClassrooms, getStudentClassrooms]);


  const [studentNameMap, setStudentNameMap] = useState<Record<string, string>>({});

  // Initialize answers when classroom loads
  useEffect(() => {
    if (classroom) {
      const initialAnswers: Record<string, number> = {};
      (classroom.feedbackQuestions).forEach((q) => {
        initialAnswers[q.id] = 3;
      });
      setAnswers(initialAnswers);

      // Fetch student names
      const students = classroom.students;
      if (students.length > 0) {
        classroomService.getStudentNames(students).then(names => setStudentNameMap(names));
      }
    }
  }, [classroom]);

  // Quiz timer
  useEffect(() => {
    if (activeQuiz && quizTimeLeft > 0 && !quizCompleted) {
      const timer = setInterval(() => {
        setQuizTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeQuiz, quizTimeLeft, quizCompleted]);

  if (!classroom || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
        <Card className="text-center py-12 border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
          <CardContent>
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#C1C0B9' }} />
            <p style={{ color: '#C1C0B9' }}>Classroom not found</p>
            <Button onClick={onBack} className="mt-4 text-white" style={{ background: '#537791' }}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTeacher = currentUser.role === 'teacher';
  const isStudent = currentUser.role === 'student';

  const hasSubmittedFeedbackStatus = classroom
    ? classroom.feedbacks.some(f => f.studentId === currentUser.email)
    : false;

  const isEnrolled = (classroom.students).includes(currentUser.email); // Note: students array contains emails now. currentUser.id is likely email if we updated AuthContext correctly?
  // checking AuthContext... createClassroom used currentUser.email. 
  // Let's assume currentUser.id might still be the UUID from Supabase Auth, but enrollments store email?
  // If `classroom.students` contains emails, and `currentUser.id` is UUID, this check fails.
  // I should use `currentUser.email`.

  const getStudentNames = () => {
    return (classroom.students).map(email => studentNameMap[email] || email);
  };

  const handleAnswerChange = (questionId: string, value: number[]) => {
    setAnswers({ ...answers, [questionId]: value[0] });
  };

  const handleSubmitFeedback = async () => {
    if (!classroom || !currentUser) return;
    setIsSubmittingFeedback(true);

    try {
      const result = await classroomService.submitFeedback({
        classroomId: classroom.id,
        studentId: currentUser.email,
        answers,
        comment
      });

      if (result.success) {
        toast.success(result.message);
        // Optimistic update or refresh needed. For now, rely on reload or just simple state update if we had setClassroom.
        // We have setClassroom. Let's update it to reflect submission status immediately.
        const newFeedback = {
          id: 'temp-' + Date.now(),
          studentId: currentUser.email,
          classroomId: classroom.id,
          answers,
          comment,
          submittedAt: new Date()
        };
        setClassroom({
          ...classroom,
          feedbacks: [...classroom.feedbacks, newFeedback]
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Quiz functions
  const startQuiz = (quizId: string) => {
    const quiz = (classroom.quizzes).find((q) => q.id === quizId);
    if (!quiz) return;

    setActiveQuiz(quizId);
    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
    setQuizTimeLeft(quiz.timeLimit * 60);
    setQuizCompleted(false);
  };

  const handleQuizAnswerChange = (questionIndex: number, answer: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answer;
    setQuizAnswers(newAnswers);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !classroom || !currentUser) return;

    setIsSubmittingQuiz(true);

    const quiz = classroom.quizzes.find(q => q.id === activeQuiz);
    if (!quiz) {
      setIsSubmittingQuiz(false);
      return;
    }

    // Calculate score
    let score = 0;
    quiz.questions.forEach((q, index) => {
      // Ensure we compare numbers. q.correctAnswer should be number from normalized service.
      if (Number(quizAnswers[index]) === Number(q.correctAnswer)) {
        score++;
      }
    });

    try {
      const result = await classroomService.submitQuizAttempt({
        quizId: activeQuiz,
        studentId: currentUser.email,
        answers: quizAnswers,
        score,
        totalQuestions: quiz.questions.length
      });

      if (result.success) {
        toast.success(result.message);
        setQuizScore({ score, total: quiz.questions.length });
        setQuizCompleted(true);
        // Do NOT set activeQuiz to null immediately, so we can show result.
        // setActiveQuiz(null); 
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Analytics data for teachers
  const getAnalyticsData = () => {
    if (!classroom) return [];
    const feedbacks = classroom.feedbacks;
    if (feedbacks.length === 0) return [];

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

  const getQuestionAnalytics = () => {
    if (!classroom) return [];
    const feedbacks = classroom.feedbacks;
    const feedbackQuestions = classroom.feedbackQuestions;
    if (feedbacks.length === 0 || feedbackQuestions.length === 0) return [];

    return feedbackQuestions.map((question) => {
      const total = feedbacks.reduce((sum: number, f) => sum + (f.answers[question.id] || 0), 0);
      const average = total / feedbacks.length;
      return {
        name: `Q${question.order + 1}`,
        fullQuestion: question.text,
        average: parseFloat(average.toFixed(2)),
      };
    });
  };

  const getAverageRating = () => {
    if (!classroom) return 0;
    const feedbacks = classroom.feedbacks;
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((sum: number, f) => {
      const answers = Object.values(f.answers);
      return sum + answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
    }, 0);
    return (total / feedbacks.length).toFixed(1);
  };

  const getQuizAnalytics = (quizId: string) => {
    if (!classroom) return null;
    const attempts = (classroom.quizAttempts).filter((a) => a.quizId === quizId);
    if (attempts.length === 0) return null;

    const avgScore = attempts.reduce((sum: number, a) => sum + (a.score / a.totalQuestions) * 100, 0) / attempts.length;
    const distribution = [
      { range: '90-100%', count: attempts.filter((a) => (a.score / a.totalQuestions) * 100 >= 90).length },
      {
        range: '80-89%', count: attempts.filter((a) => {
          const pct = (a.score / a.totalQuestions) * 100;
          return pct >= 80 && pct < 90;
        }).length
      },
      {
        range: '70-79%', count: attempts.filter((a) => {
          const pct = (a.score / a.totalQuestions) * 100;
          return pct >= 70 && pct < 80;
        }).length
      },
      {
        range: '60-69%', count: attempts.filter((a) => {
          const pct = (a.score / a.totalQuestions) * 100;
          return pct >= 60 && pct < 70;
        }).length
      },
      { range: '<60%', count: attempts.filter((a) => (a.score / a.totalQuestions) * 100 < 60).length },
    ];

    return { avgScore: Math.round(avgScore), distribution, totalAttempts: attempts.length };
  };

  const analyticsData = getAnalyticsData();
  const questionAnalytics = getQuestionAnalytics();
  const averageRating = getAverageRating();
  const studentNames = getStudentNames();

  // Quiz Result View
  if (activeQuiz && quizCompleted && quizScore) {
    const quiz = (classroom.quizzes).find((q) => q.id === activeQuiz);
    const percentage = Math.round((quizScore.score / quizScore.total) * 100);

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
        <Card className="w-full max-w-md border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: percentage >= 70 ? '#dcfce7' : '#fee2e2' }}>
              {percentage >= 70 ? (
                <Award className="w-10 h-10 text-green-600" />
              ) : (
                <Target className="w-10 h-10 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold" style={{ color: '#537791' }}>
              Quiz Completed!
            </CardTitle>
            <CardDescription style={{ color: '#C1C0B9' }}>
              {quiz?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-5xl font-bold" style={{ color: '#537791' }}>{percentage}%</span>
              <p className="text-sm mt-2" style={{ color: '#C1C0B9' }}>
                You scored {quizScore.score} out of {quizScore.total} questions
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm" style={{ color: '#537791' }}>
                <span>Correct Answers</span>
                <span className="font-bold">{quizScore.score}</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>

            <Button
              onClick={() => { setActiveQuiz(null); setQuizCompleted(false); setQuizScore(null); }}
              className="w-full h-12 text-lg font-medium"
              style={{ background: '#537791' }}
            >
              Back to Classroom
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Quiz View
  if (activeQuiz && !quizCompleted) {
    const quiz = (classroom.quizzes).find((q) => q.id === activeQuiz);
    if (!quiz) return null;

    const answeredCount = quizAnswers.filter((a: number) => a !== -1).length;
    const progress = (answeredCount / quiz.questions.length) * 100;

    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
        {/* Quiz Header */}
        <header className="shadow-sm border-b sticky top-0 z-10" style={{ background: '#F7F6E7', borderColor: '#E7E6E1' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}
                  className="border-0" style={{ background: '#E7E6E1', color: '#537791' }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#537791' }}>{quiz.title}</h1>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>{classroom.name}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${quizTimeLeft < 60 ? '' : ''
                }`}
                style={{
                  background: quizTimeLeft < 60 ? '#fee2e2' : '#E7E6E1',
                  color: quizTimeLeft < 60 ? '#dc2626' : '#537791'
                }}>
                <Timer className="w-5 h-5" />
                {formatTime(quizTimeLeft)}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: '#C1C0B9' }}>Progress</span>
                <span className="font-medium" style={{ color: '#537791' }}>{answeredCount}/{quiz.questions.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </header>

        {/* Quiz Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
              <Card key={question.id} className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: '#537791' }}>
                      {qIndex + 1}
                    </div>
                    <h3 className="text-lg font-medium pt-1" style={{ color: '#537791' }}>{question.text}</h3>
                  </div>

                  <RadioGroup
                    value={quizAnswers[qIndex]?.toString()}
                    onValueChange={(value) => handleQuizAnswerChange(qIndex, parseInt(value))}
                    className="space-y-3 ml-11"
                  >
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:shadow-sm"
                        style={{ background: '#E7E6E1' }}>
                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`}
                          style={{ accentColor: '#537791' }} />
                        <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer" style={{ color: '#537791' }}>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleSubmitQuiz}
              disabled={isSubmittingQuiz || answeredCount < quiz.questions.length}
              className="w-full text-white font-semibold py-6 shadow-lg"
              style={{ background: answeredCount < quiz.questions.length ? '#C1C0B9' : '#537791' }}
            >
              {isSubmittingQuiz ? (
                'Submitting...'
              ) : answeredCount < quiz.questions.length ? (
                <><AlertCircle className="w-5 h-5 mr-2" /> Answer all questions</>
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Submit Quiz</>
              )}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ background: '#F7F6E7', borderColor: '#E7E6E1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack} className="gap-2 border-0 hover:shadow-sm transition-shadow"
              style={{ background: '#E7E6E1', color: '#537791' }}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#537791' }}>
                <GraduationCap className="w-5 h-5" />
                {classroom.name}
              </h1>
              <p className="text-sm flex items-center gap-1" style={{ color: '#C1C0B9' }}>
                <BookOpen className="w-3 h-3" />
                {classroom.subject}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Classroom Info */}
        <Card className="mb-8 border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <User className="w-5 h-5" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>Teacher</p>
                  <p className="font-medium" style={{ color: '#537791' }}>{classroom.teacherName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Users className="w-5 h-5" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>Students</p>
                  <p className="font-medium" style={{ color: '#537791' }}>{classroom.students.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <ClipboardList className="w-5 h-5" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>Feedback</p>
                  <p className="font-medium" style={{ color: '#537791' }}>{classroom.feedbacks.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Target className="w-5 h-5" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>Quizzes</p>
                  <p className="font-medium" style={{ color: '#537791' }}>{classroom.quizzes.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Clock className="w-5 h-5" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#C1C0B9' }}>Created</p>
                  <p className="font-medium" style={{ color: '#537791' }}>{format(new Date(classroom.createdAt), 'MMM d')}</p>
                </div>
              </div>
            </div>
            {classroom.description && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E7E6E1' }}>
                <p style={{ color: '#C1C0B9' }}>{classroom.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student List for Teachers */}
        {isTeacher && (
          <Card className="mb-8 border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                <Users className="w-5 h-5" />
                Enrolled Students ({studentNames.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentNames.length === 0 ? (
                <p className="text-center py-4" style={{ color: '#C1C0B9' }}>No students enrolled yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {studentNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#E7E6E1' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#537791' }}>
                        <UserCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium" style={{ color: '#537791' }}>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teacher View - Analytics */}
        {isTeacher && (
          <Tabs defaultValue="feedback" className="space-y-6">
            <TabsList className="border-0" style={{ background: '#E7E6E1' }}>
              <TabsTrigger value="feedback" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: '#C1C0B9' }}>
                <BarChart3 className="w-4 h-4" />
                Feedback Analytics
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: '#C1C0B9' }}>
                <Target className="w-4 h-4" />
                Quiz Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="space-y-6">
              {classroom.feedbacks.length === 0 ? (
                <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                  <CardContent>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                      <MessageCircle className="w-10 h-10" style={{ color: '#C1C0B9' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>No Feedback Yet</h3>
                    <p style={{ color: '#C1C0B9' }}>Students haven't submitted any feedback for this classroom</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Overall Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm mb-2" style={{ color: '#C1C0B9' }}>Average Rating</p>
                        <div className="flex items-center justify-center gap-2">
                          <Star className="w-8 h-8" style={{ color: '#537791', fill: '#537791' }} />
                          <span className="text-4xl font-bold" style={{ color: '#537791' }}>{averageRating}</span>
                          <span style={{ color: '#C1C0B9' }}>/5</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm mb-2" style={{ color: '#C1C0B9' }}>Total Responses</p>
                        <p className="text-4xl font-bold" style={{ color: '#537791' }}>{classroom.feedbacks.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm mb-2" style={{ color: '#C1C0B9' }}>Response Rate</p>
                        <p className="text-4xl font-bold" style={{ color: '#537791' }}>
                          {classroom.students.length > 0
                            ? Math.round((classroom.feedbacks.length / classroom.students.length) * 100)
                            : 0}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                          <TrendingUp className="w-5 h-5" />
                          Overall Satisfaction
                        </CardTitle>
                        <CardDescription style={{ color: '#C1C0B9' }}>Distribution of student ratings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analyticsData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {analyticsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                          <BarChart3 className="w-5 h-5" />
                          Question-wise Analysis
                        </CardTitle>
                        <CardDescription style={{ color: '#C1C0B9' }}>Average ratings per question</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={questionAnalytics}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis domain={[0, 5]} />
                              <Tooltip
                                formatter={(value: number) => [`${value}/5`, 'Average Rating']}
                                labelFormatter={(label) => {
                                  const q = questionAnalytics.find(qa => qa.name === label);
                                  return q ? q.fullQuestion.substring(0, 50) + '...' : label;
                                }}
                              />
                              <Bar dataKey="average" fill="#537791" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Student Comments */}
                  <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                        <MessageSquare className="w-5 h-5" />
                        Student Comments
                      </CardTitle>
                      <CardDescription style={{ color: '#C1C0B9' }}>Anonymous feedback from students</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {classroom.feedbacks.filter((f) => f.comment).length === 0 ? (
                          <p className="text-center py-4" style={{ color: '#C1C0B9' }}>No comments yet</p>
                        ) : (
                          classroom.feedbacks
                            .filter((f) => f.comment)
                            .map((feedback) => {
                              const answers = Object.values(feedback.answers);
                              const avg = answers.reduce((a: number, b: number) => a + b, 0) / answers.length;
                              return (
                                <div key={feedback.id} className="p-4 rounded-lg" style={{ background: '#E7E6E1' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-4 h-4 ${star <= avg
                                            ? ''
                                            : ''
                                            }`}
                                          style={{
                                            color: star <= avg ? '#537791' : '#C1C0B9',
                                            fill: star <= avg ? '#537791' : 'transparent'
                                          }}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs" style={{ color: '#C1C0B9' }}>
                                      {format(new Date(feedback.submittedAt), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <p style={{ color: '#537791' }}>{feedback.comment}</p>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-6">
              {classroom.quizzes.length === 0 ? (
                <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                  <CardContent>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                      <Target className="w-10 h-10" style={{ color: '#C1C0B9' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>No Quizzes Yet</h3>
                    <p style={{ color: '#C1C0B9' }}>Create quizzes from the dashboard to see analytics</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {classroom.quizzes.map((quiz) => {
                    const analytics = getQuizAnalytics(quiz.id);
                    return (
                      <Card key={quiz.id} className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                                <Award className="w-5 h-5" />
                                {quiz.title}
                              </CardTitle>
                              <CardDescription style={{ color: '#C1C0B9' }}>{quiz.description}</CardDescription>
                            </div>
                            {analytics && (
                              <div className="text-right">
                                <p className="text-2xl font-bold" style={{ color: '#537791' }}>{analytics.avgScore}%</p>
                                <p className="text-xs" style={{ color: '#C1C0B9' }}>Avg Score</p>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: '#C1C0B9' }}>
                            <span className="flex items-center gap-1">
                              <ListOrdered className="w-4 h-4" />
                              {quiz.questions.length} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.timeLimit} minutes
                            </span>
                            {analytics && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {analytics.totalAttempts} attempts
                              </span>
                            )}
                          </div>

                          {analytics && (
                            <div className="h-48 mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.distribution}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="range" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#537791" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Student View */}
        {isStudent && isEnrolled && (
          <Tabs defaultValue="feedback" className="space-y-6">
            <TabsList className="border-0" style={{ background: '#E7E6E1' }}>
              <TabsTrigger value="feedback" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: '#C1C0B9' }}>
                <MessageCircle className="w-4 h-4" />
                Feedback
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: '#C1C0B9' }}>
                <Target className="w-4 h-4" />
                Quizzes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedback">
              {hasSubmittedFeedbackStatus ? (
                <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                  <CardContent>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                      <CheckCircle className="w-10 h-10" style={{ color: '#537791' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>Feedback Submitted!</h3>
                    <p style={{ color: '#C1C0B9' }}>Thank you for your feedback. Your response has been recorded.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-xl max-w-3xl mx-auto" style={{ background: '#F7F6E7' }}>
                  <CardHeader style={{ background: '#E7E6E1' }}>
                    <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                      <GraduationCap className="w-5 h-5" />
                      Submit Your Feedback
                    </CardTitle>
                    <CardDescription style={{ color: '#C1C0B9' }}>
                      Please rate your experience in this classroom. Your feedback is anonymous.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-8">
                      {classroom.feedbackQuestions.map((question, index) => (
                        <div key={question.id} className="space-y-3">
                          <Label className="text-base font-medium flex items-start gap-2" style={{ color: '#537791' }}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5"
                              style={{ background: '#537791' }}>
                              {index + 1}
                            </span>
                            {question.text}
                          </Label>
                          <div className="flex items-center gap-4 ml-8">
                            <span className="text-sm" style={{ color: '#C1C0B9' }}>Poor</span>
                            <Slider
                              value={[answers[question.id] || 3]}
                              onValueChange={(value) => handleAnswerChange(question.id, value)}
                              min={1}
                              max={5}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm" style={{ color: '#C1C0B9' }}>Excellent</span>
                          </div>
                          <div className="flex justify-center ml-8">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 transition-colors`}
                                  style={{
                                    color: star <= (answers[question.id] || 3) ? '#537791' : '#C1C0B9',
                                    fill: star <= (answers[question.id] || 3) ? '#537791' : 'transparent'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="space-y-2 pt-4" style={{ borderTop: '1px solid #E7E6E1' }}>
                        <Label htmlFor="comment" className="flex items-center gap-2" style={{ color: '#537791' }}>
                          <MessageSquare className="w-4 h-4" />
                          Additional Comments (Optional)
                        </Label>
                        <Textarea
                          id="comment"
                          placeholder="Share your thoughts about the course..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={4}
                          className="border-0 focus:ring-2"
                          style={{ background: '#E7E6E1', color: '#537791' }}
                        />
                      </div>

                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={isSubmittingFeedback}
                        className="w-full text-white font-semibold py-6 shadow-lg"
                        style={{ background: '#537791' }}
                      >
                        {isSubmittingFeedback ? (
                          'Submitting...'
                        ) : (
                          <><Flame className="w-5 h-5 mr-2" /> Submit Feedback</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="quizzes">
              {(classroom.quizzes ?? []).length === 0 ? (
                <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
                  <CardContent>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                      <Target className="w-10 h-10" style={{ color: '#C1C0B9' }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>No Quizzes Available</h3>
                    <p style={{ color: '#C1C0B9' }}>Your teacher hasn't created any quizzes yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(classroom.quizzes ?? []).map((quiz) => {
                    // Quiz attempt features temporarily disabled
                    return (
                      <Card key={quiz.id} className="border-0 shadow-lg overflow-hidden" style={{ background: '#F7F6E7' }}>
                        <CardHeader style={{ background: '#E7E6E1' }}>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#537791' }}>
                                <Target className="w-5 h-5" style={{ color: '#537791' }} />
                                {quiz.title}
                              </CardTitle>
                              <CardDescription style={{ color: '#C1C0B9' }}>{quiz.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: '#C1C0B9' }}>
                            <span className="flex items-center gap-1">
                              <ListOrdered className="w-4 h-4" />
                              {quiz.questions.length} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.timeLimit} minutes
                            </span>
                          </div>

                          <Button
                            onClick={() => startQuiz(quiz.id)}
                            className="w-full text-white"
                            style={{ background: '#537791' }}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Start Quiz
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Not Enrolled Message */}
        {isStudent && !isEnrolled && (
          <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
            <CardContent>
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#C1C0B9' }} />
              <p style={{ color: '#C1C0B9' }}>You are not enrolled in this classroom</p>
              <Button onClick={onBack} className="mt-4 text-white" style={{ background: '#537791' }}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
