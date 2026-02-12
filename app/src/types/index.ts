export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

export interface FeedbackQuestion {
  id: string;
  text: string;
  order: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit: number; // in minutes
  createdAt: Date;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  quizId: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  submittedAt: Date;
}

export interface Feedback {
  id: string;
  studentId: string;
  classroomId: string;
  answers: Record<string, number>; // questionId -> rating
  comment: string;
  submittedAt: Date;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  description: string;
  subject: string;
  students: string[];
  feedbacks: Feedback[];
  feedbackQuestions: FeedbackQuestion[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  createdAt: Date;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}
