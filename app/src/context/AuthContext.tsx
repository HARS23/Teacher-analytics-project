import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, Classroom, Feedback, FeedbackQuestion, Quiz, QuizQuestion, QuizAttempt } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  classrooms: Classroom[];
  login: (email: string, password: string) => { success: boolean; message: string };
  register: (email: string, password: string, role: UserRole, name: string) => { success: boolean; message: string };
  logout: () => void;
  createClassroom: (name: string, subject: string, description: string) => { success: boolean; classroom?: Classroom; message: string };
  joinClassroom: (code: string, studentId: string) => { success: boolean; message: string };
  submitFeedback: (classroomId: string, studentId: string, answers: Record<string, number>, comment: string) => { success: boolean; message: string };
  addFeedbackQuestion: (classroomId: string, question: string) => { success: boolean; message: string };
  removeFeedbackQuestion: (classroomId: string, questionId: string) => { success: boolean; message: string };
  createQuiz: (classroomId: string, title: string, description: string, questions: Omit<QuizQuestion, 'id'>[], timeLimit: number) => { success: boolean; quiz?: Quiz; message: string };
  submitQuizAttempt: (classroomId: string, quizId: string, studentId: string, answers: number[]) => { success: boolean; score?: number; message: string };
  getClassroomById: (id: string) => Classroom | undefined;
  getClassroomByCode: (code: string) => Classroom | undefined;
  getTeacherClassrooms: (teacherId: string) => Classroom[];
  getStudentClassrooms: (studentId: string) => Classroom[];
  hasStudentSubmittedFeedback: (classroomId: string, studentId: string) => boolean;
  hasStudentAttemptedQuiz: (classroomId: string, quizId: string, studentId: string) => boolean;
  getQuizAttempt: (classroomId: string, quizId: string, studentId: string) => QuizAttempt | undefined;
  generateClassroomCode: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate a random 6-character classroom code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Default feedback questions
const DEFAULT_FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { id: 'q1', text: 'How clear were the course objectives and expectations?', order: 0 },
  { id: 'q2', text: 'How effective was the teaching methodology?', order: 1 },
  { id: 'q3', text: 'How approachable was the instructor for questions?', order: 2 },
  { id: 'q4', text: 'How well-organized were the course materials?', order: 3 },
  { id: 'q5', text: 'How would you rate the overall learning experience?', order: 4 },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const storedUsers = localStorage.getItem('ftosa_users');
    const storedClassrooms = localStorage.getItem('ftosa_classrooms');
    const storedCurrentUser = localStorage.getItem('ftosa_currentUser');
    
    if (storedUsers) setUsers(JSON.parse(storedUsers));
    if (storedClassrooms) setClassrooms(JSON.parse(storedClassrooms));
    if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ftosa_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ftosa_classrooms', JSON.stringify(classrooms));
  }, [classrooms]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ftosa_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ftosa_currentUser');
    }
  }, [currentUser]);

  const login = (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, message: 'Login successful!' };
    }
    return { success: false, message: 'Invalid email or password' };
  };

  const register = (email: string, password: string, role: UserRole, name: string) => {
    if (users.some(u => u.email === email)) {
      return { success: false, message: 'Email already registered' };
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      email,
      password,
      role,
      name: name || email.split('@')[0],
      createdAt: new Date(),
    };
    
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    return { success: true, message: 'Registration successful!' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const generateClassroomCode = () => {
    let code = generateCode();
    while (classrooms.some(c => c.code === code)) {
      code = generateCode();
    }
    return code;
  };

  const createClassroom = (name: string, subject: string, description: string) => {
    if (!currentUser || currentUser.role !== 'teacher') {
      return { success: false, message: 'Only teachers can create classrooms' };
    }

    const code = generateClassroomCode();
    const newClassroom: Classroom = {
      id: Date.now().toString(),
      name,
      code,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      description,
      subject,
      students: [],
      feedbacks: [],
      feedbackQuestions: [...DEFAULT_FEEDBACK_QUESTIONS],
      quizzes: [],
      quizAttempts: [],
      createdAt: new Date(),
    };

    setClassrooms([...classrooms, newClassroom]);
    return { success: true, classroom: newClassroom, message: 'Classroom created successfully!' };
  };

  const joinClassroom = (code: string, studentId: string) => {
    const classroom = classrooms.find(c => c.code === code);
    if (!classroom) {
      return { success: false, message: 'Invalid classroom code' };
    }
    
    if (classroom.students.includes(studentId)) {
      return { success: false, message: 'You have already joined this classroom' };
    }

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroom.id 
        ? { ...c, students: [...c.students, studentId] }
        : c
    );
    
    setClassrooms(updatedClassrooms);
    return { success: true, message: 'Successfully joined classroom!' };
  };

  const addFeedbackQuestion = (classroomId: string, questionText: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      return { success: false, message: 'Classroom not found' };
    }

    const newQuestion: FeedbackQuestion = {
      id: `fq_${Date.now()}`,
      text: questionText,
      order: classroom.feedbackQuestions.length,
    };

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroomId 
        ? { ...c, feedbackQuestions: [...c.feedbackQuestions, newQuestion] }
        : c
    );

    setClassrooms(updatedClassrooms);
    return { success: true, message: 'Question added successfully!' };
  };

  const removeFeedbackQuestion = (classroomId: string, questionId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      return { success: false, message: 'Classroom not found' };
    }

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroomId 
        ? { ...c, feedbackQuestions: c.feedbackQuestions.filter(q => q.id !== questionId) }
        : c
    );

    setClassrooms(updatedClassrooms);
    return { success: true, message: 'Question removed successfully!' };
  };

  const createQuiz = (classroomId: string, title: string, description: string, questions: Omit<QuizQuestion, 'id'>[], timeLimit: number) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      return { success: false, message: 'Classroom not found' };
    }

    const quizQuestions: QuizQuestion[] = questions.map((q, index) => ({
      ...q,
      id: `quiz_q_${Date.now()}_${index}`,
    }));

    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title,
      description,
      questions: quizQuestions,
      timeLimit,
      createdAt: new Date(),
    };

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroomId 
        ? { ...c, quizzes: [...c.quizzes, newQuiz] }
        : c
    );

    setClassrooms(updatedClassrooms);
    return { success: true, quiz: newQuiz, message: 'Quiz created successfully!' };
  };

  const submitQuizAttempt = (classroomId: string, quizId: string, studentId: string, answers: number[]) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      return { success: false, message: 'Classroom not found' };
    }

    const quiz = classroom.quizzes.find(q => q.id === quizId);
    if (!quiz) {
      return { success: false, message: 'Quiz not found' };
    }

    // Check if student already attempted
    const existingAttempt = classroom.quizAttempts.find(
      a => a.quizId === quizId && a.studentId === studentId
    );
    if (existingAttempt) {
      return { success: false, message: 'You have already attempted this quiz' };
    }

    // Calculate score
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (quiz.questions[index] && answer === quiz.questions[index].correctAnswer) {
        correctCount++;
      }
    });

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}`,
      studentId,
      quizId,
      answers,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      submittedAt: new Date(),
    };

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroomId 
        ? { ...c, quizAttempts: [...c.quizAttempts, attempt] }
        : c
    );

    setClassrooms(updatedClassrooms);
    return { 
      success: true, 
      score: correctCount, 
      message: `Quiz submitted! You scored ${correctCount}/${quiz.questions.length}` 
    };
  };

  const submitFeedback = (
    classroomId: string, 
    studentId: string, 
    answers: Record<string, number>,
    comment: string
  ) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      return { success: false, message: 'Classroom not found' };
    }

    // Check if student already submitted feedback
    const existingFeedback = classroom.feedbacks.find(f => f.studentId === studentId);
    if (existingFeedback) {
      return { success: false, message: 'You have already submitted feedback for this classroom' };
    }

    const newFeedback: Feedback = {
      id: Date.now().toString(),
      studentId,
      classroomId,
      answers,
      comment,
      submittedAt: new Date(),
    };

    const updatedClassrooms = classrooms.map(c => 
      c.id === classroomId 
        ? { ...c, feedbacks: [...c.feedbacks, newFeedback] }
        : c
    );
    
    setClassrooms(updatedClassrooms);
    return { success: true, message: 'Feedback submitted successfully!' };
  };

  const getClassroomById = (id: string) => classrooms.find(c => c.id === id);
  const getClassroomByCode = (code: string) => classrooms.find(c => c.code === code);
  const getTeacherClassrooms = (teacherId: string) => classrooms.filter(c => c.teacherId === teacherId);
  const getStudentClassrooms = (studentId: string) => classrooms.filter(c => c.students.includes(studentId));
  
  const hasStudentSubmittedFeedback = (classroomId: string, studentId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.feedbacks.some(f => f.studentId === studentId) : false;
  };

  const hasStudentAttemptedQuiz = (classroomId: string, quizId: string, studentId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.quizAttempts.some(a => a.quizId === quizId && a.studentId === studentId) : false;
  };

  const getQuizAttempt = (classroomId: string, quizId: string, studentId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom?.quizAttempts.find(a => a.quizId === quizId && a.studentId === studentId);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      users,
      classrooms,
      login,
      register,
      logout,
      createClassroom,
      joinClassroom,
      submitFeedback,
      addFeedbackQuestion,
      removeFeedbackQuestion,
      createQuiz,
      submitQuizAttempt,
      getClassroomById,
      getClassroomByCode,
      getTeacherClassrooms,
      getStudentClassrooms,
      hasStudentSubmittedFeedback,
      hasStudentAttemptedQuiz,
      getQuizAttempt,
      generateClassroomCode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
