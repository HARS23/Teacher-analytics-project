
import { supabase } from '../supabase';
import type { Classroom, Feedback, Quiz, QuizAttempt, FeedbackQuestion } from '@/types';

export const classroomService = {
  async getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*)),
        quizAttempts:quiz_attempts(*)
      `)
      .eq('teacher_id', teacherId);

    if (error || !classrooms) {
      console.error('Error fetching teacher classrooms:', error);
      return [];
    }

    return classrooms.map(normalizeClassroom);
  },

  async getStudentClassrooms(studentId: string): Promise<Classroom[]> {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('classroom_id')
      .eq('student_id', studentId);

    if (error || !enrollments) return [];

    const classroomIds = enrollments.map(e => e.classroom_id);
    if (classroomIds.length === 0) return [];

    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*)),
        quizAttempts:quiz_attempts(*)
      `)
      .in('id', classroomIds);

    if (classroomsError || !classrooms) {
      console.error('Error fetching student classrooms:', classroomsError);
      return [];
    }

    return classrooms.map(normalizeClassroom);
  },

  async getClassroomById(id: string): Promise<Classroom | null> {
    const { data: classroom, error } = await supabase
      .from('classrooms')
      .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*)),
        quizAttempts:quiz_attempts(*)
      `)
      .eq('id', id)
      .single();

    if (error || !classroom) return null;

    return normalizeClassroom(classroom);
  }
};

function normalizeClassroom(data: any): Classroom {
  return {
    id: data.id,
    name: data.name || '',
    code: data.code || '',
    teacherId: data.teacher_id,
    teacherName: data.teacher_name || 'Unknown Teacher', // Assuming teacher_name is joined or available, otherwise might need fetching user or keeping it simple
    description: data.description || '',
    subject: data.subject || '',
    students: Array.isArray(data.students) 
      ? data.students.map((s: any) => s.student_id) 
      : [],
    feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks.map(normalizeFeedback) : [],
    feedbackQuestions: Array.isArray(data.feedbackQuestions) ? data.feedbackQuestions.map(normalizeFeedbackQuestion) : [],
    quizzes: Array.isArray(data.quizzes) ? data.quizzes.map(normalizeQuiz) : [],
    quizAttempts: Array.isArray(data.quizAttempts) ? data.quizAttempts.map(normalizeQuizAttempt) : [],
    createdAt: new Date(data.created_at || Date.now()),
  };
}

function normalizeFeedback(data: any): Feedback {
  return {
    id: data.id,
    studentId: data.student_id,
    classroomId: data.classroom_id,
    answers: data.answers || {},
    comment: data.comment || '',
    submittedAt: new Date(data.submitted_at || Date.now()),
  };
}

function normalizeFeedbackQuestion(data: any): FeedbackQuestion {
  return {
    id: data.id,
    text: data.text || '',
    order: data.order || 0,
  };
}

function normalizeQuiz(data: any): Quiz {
  return {
    id: data.id,
    title: data.title || '',
    description: data.description || '',
    questions: Array.isArray(data.questions) ? data.questions : [], // Assuming questions are fetched correctly or need further normalization if strictly typed
    timeLimit: data.time_limit || 15,
    createdAt: new Date(data.created_at || Date.now()),
  };
}

function normalizeQuizAttempt(data: any): QuizAttempt {
  return {
    id: data.id,
    studentId: data.student_id,
    quizId: data.quiz_id,
    answers: data.answers || [],
    score: data.score || 0,
    totalQuestions: data.total_questions || 0,
    submittedAt: new Date(data.submitted_at || Date.now()),
  };
}
