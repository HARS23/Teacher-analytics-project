import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Classroom } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, Users, BookOpen, ArrowRight, LogOut, CheckCircle, 
  Target, Lightbulb, Zap, MessageCircle, FileQuestion, 
  CheckSquare, Hourglass, Trophy, Bookmark, Rocket, Crown, Gem,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentDashboardProps {
  onClassroomSelect: (classroomId: string) => void;
}

export function StudentDashboard({ onClassroomSelect }: StudentDashboardProps) {
  const { 
    currentUser, 
    logout, 
    joinClassroom, 
    getStudentClassrooms
  } = useAuth();
  
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [classroomCode, setClassroomCode] = useState('');
  const [studentClassrooms, setStudentClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    const loadClassrooms = async () => {
      if (!currentUser) {
        setStudentClassrooms([]);
        return;
      }
      const classrooms = await getStudentClassrooms();
      setStudentClassrooms(classrooms);
    };
    loadClassrooms();
  }, [currentUser, getStudentClassrooms]);

  const handleJoinClassroom = async () => {
    if (!classroomCode.trim()) {
      toast.error('Please enter a classroom code');
      return;
    }

    if (!currentUser) {
      toast.error('Please login first');
      return;
    }

    const result = await joinClassroom(classroomCode.toUpperCase());
    if (result.success) {
      toast.success(result.message);
      setClassroomCode('');
      setIsJoinDialogOpen(false);
      // Reload classrooms
      const classrooms = await getStudentClassrooms();
      setStudentClassrooms(classrooms);
    } else {
      toast.error(result.message);
    }
  };

  // Quiz and feedback features temporarily disabled
  const getPendingQuizzes = (_classroomId: string) => {
    return 0;
  };

  const getCompletedQuizzes = (_classroomId: string) => {
    return 0;
  };

  const getTotalQuizScore = (_classroomId: string) => {
    return 0;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ background: '#F7F6E7', borderColor: '#E7E6E1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: '#537791' }}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#537791' }}>Student Dashboard</h1>
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
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>{studentClassrooms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #6a8fa3' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <CheckCircle className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Feedback Done</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #C1C0B9' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Target className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Quizzes Taken</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    {studentClassrooms.reduce((sum, c) => sum + getCompletedQuizzes(c!.id), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7', borderLeft: '4px solid #a39e93' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                  <Trophy className="w-6 h-6" style={{ color: '#537791' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#C1C0B9' }}>Avg Score</p>
                  <p className="text-2xl font-bold" style={{ color: '#537791' }}>
                    {studentClassrooms.length > 0 
                      ? Math.round(studentClassrooms.reduce((sum, c) => sum + getTotalQuizScore(c!.id), 0) / studentClassrooms.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Join Classroom Button */}
        <div className="mb-6">
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                      style={{ background: '#537791' }}>
                <Rocket className="w-4 h-4" />
                Join Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" style={{ background: '#F7F6E7' }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
                  <Sparkles className="w-5 h-5" style={{ color: '#537791' }} />
                  Join a Classroom
                </DialogTitle>
                <DialogDescription style={{ color: '#C1C0B9' }}>
                  Enter the classroom code provided by your teacher.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="classroom-code" style={{ color: '#537791' }}>Classroom Code</Label>
                  <Input
                    id="classroom-code"
                    placeholder="e.g., ABC123"
                    value={classroomCode}
                    onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wider border-0 focus:ring-2"
                    style={{ background: '#E7E6E1', color: '#537791' }}
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsJoinDialogOpen(false)}
                        style={{ borderColor: '#C1C0B9', color: '#537791' }}>
                  Cancel
                </Button>
                <Button onClick={handleJoinClassroom} className="text-white" style={{ background: '#537791' }}>
                  <Zap className="w-4 h-4 mr-2" />
                  Join Classroom
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classrooms Grid */}
        {studentClassrooms.length === 0 ? (
          <Card className="text-center py-16 border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
            <CardContent>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E7E6E1' }}>
                <Sparkles className="w-10 h-10" style={{ color: '#C1C0B9' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#537791' }}>No Classrooms Yet</h3>
              <p style={{ color: '#C1C0B9' }} className="mb-4">Join a classroom using the code from your teacher</p>
              <Button onClick={() => setIsJoinDialogOpen(true)} className="gap-2 text-white" style={{ background: '#537791' }}>
                <Rocket className="w-4 h-4" />
                Join Classroom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentClassrooms.map((classroom) => {
              // Quiz and feedback features temporarily disabled
              const feedbackSubmitted = false;
              const pendingQuizzes = getPendingQuizzes(classroom.id);
              const completedQuizzes = getCompletedQuizzes(classroom.id);
              const avgScore = getTotalQuizScore(classroom.id);
              
              return (
                <Card key={classroom.id} className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow" style={{ background: '#F7F6E7' }}>
                  <CardHeader className="pb-4" style={{ background: '#E7E6E1' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#537791' }}>
                          <Lightbulb className="w-5 h-5" style={{ color: '#537791' }} />
                          {classroom.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1" style={{ color: '#C1C0B9' }}>
                          <Bookmark className="w-3 h-3" />
                          {classroom.subject}
                        </CardDescription>
                      </div>
                      {feedbackSubmitted ? (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                          <CheckCircle className="w-5 h-5" style={{ color: '#537791' }} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E7E6E1' }}>
                          <Hourglass className="w-5 h-5" style={{ color: '#C1C0B9' }} />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: '#C1C0B9' }}>
                      {classroom.description || 'No description provided'}
                    </p>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: '#E7E6E1' }}>
                        <Users className="w-4 h-4" style={{ color: '#537791' }} />
                        <span style={{ color: '#537791' }}>{classroom.students.length}</span>
                      </div>
                      {pendingQuizzes > 0 && (
                        <Badge className="border-0" style={{ background: '#537791', color: 'white' }}>
                          <FileQuestion className="w-3 h-3 mr-1" />
                          {pendingQuizzes} Quiz{pendingQuizzes > 1 ? 'zes' : ''}
                        </Badge>
                      )}
                      {completedQuizzes > 0 && (
                        <Badge className="border-0" style={{ background: '#6a8fa3', color: 'white' }}>
                          <Trophy className="w-3 h-3 mr-1" />
                          {avgScore}%
                        </Badge>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 ${
                        feedbackSubmitted 
                          ? '' 
                          : ''
                      }`}
                      style={{ background: feedbackSubmitted ? '#E7E6E1' : '#F7F6E7', 
                               color: feedbackSubmitted ? '#537791' : '#C1C0B9',
                               border: '1px solid #E7E6E1' }}>
                        {feedbackSubmitted ? (
                          <><CheckSquare className="w-3 h-3" /> Feedback Done</>
                        ) : (
                          <><MessageCircle className="w-3 h-3" /> Feedback Pending</>
                        )}
                      </span>
                      {pendingQuizzes > 0 && (
                        <span className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1" 
                              style={{ background: '#E7E6E1', color: '#537791', border: '1px solid #C1C0B9' }}>
                          <Target className="w-3 h-3" /> {pendingQuizzes} Quiz Pending
                        </span>
                      )}
                    </div>

                    {/* Quizzes Preview */}
                    {classroom.quizzes.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {classroom.quizzes.slice(0, 2).map((quiz) => {
                          // Quiz attempt features temporarily disabled
                          return (
                            <div key={quiz.id} className="flex items-center justify-between p-2 rounded-lg text-sm" style={{ background: '#E7E6E1' }}>
                              <div className="flex items-center gap-2">
                                <FileQuestion className="w-4 h-4" style={{ color: '#C1C0B9' }} />
                                <span className="truncate max-w-[120px]" style={{ color: '#537791' }}>{quiz.title}</span>
                              </div>
                              <span className="text-xs" style={{ color: '#C1C0B9' }}>{quiz.questions.length} Qs</span>
                            </div>
                          );
                        })}
                        {classroom.quizzes.length > 2 && (
                          <p className="text-xs text-center" style={{ color: '#C1C0B9' }}>
                            +{classroom.quizzes.length - 2} more quizzes
                          </p>
                        )}
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-0 hover:shadow-sm transition-shadow"
                      style={{ background: '#E7E6E1', color: '#537791' }}
                      onClick={() => onClassroomSelect(classroom.id)}
                    >
                      {feedbackSubmitted && pendingQuizzes === 0 ? (
                        <><Gem className="w-4 h-4" /> View Details</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Take Action</>
                      )}
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
