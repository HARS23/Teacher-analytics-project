import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { User, UserRole, Classroom } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, role: UserRole, name: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  createClassroom: (name: string, subject: string, description: string) => Promise<{ success: boolean; classroom?: Classroom; message: string }>;
  joinClassroom: (code: string) => Promise<{ success: boolean; message: string }>;
  getTeacherClassrooms: () => Promise<Classroom[]>;
  getStudentClassrooms: () => Promise<Classroom[]>;
  getClassroomById: (id: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('ftosa_currentUser');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ftosa_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ftosa_currentUser');
    }
  }, [currentUser]);

  // ================= AUTH =================

  const register = async (email: string, password: string, role: UserRole, name: string) => {
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, role, name }])
      .select();

    if (error || !data) return { success: false, message: 'Registration failed' };

    setCurrentUser(data[0]);
    return { success: true, message: 'Registration successful!' };
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password);

    if (error || !data || data.length === 0) {
      return { success: false, message: 'Invalid email or password' };
    }

    setCurrentUser(data[0]);
    return { success: true, message: 'Login successful!' };
  };

  const logout = () => setCurrentUser(null);

  // ================= CLASSROOM =================

  const createClassroom = async (name: string, subject: string, description: string) => {
    if (!currentUser) return { success: false, message: 'Unauthorized' };

    const code = generateCode();

    const { data, error } = await supabase
      .from('classrooms')
      .insert([{ name, subject, description, code, teacher_id: currentUser.id }])
      .select();

    if (error || !data) return { success: false, message: 'Failed to create classroom' };

    return { success: true, classroom: data[0], message: 'Classroom created successfully!' };
  };

  const joinClassroom = async (code: string) => {
    if (!currentUser) return { success: false, message: 'Unauthorized' };

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('code', code)
      .single();

    if (!classroom) return { success: false, message: 'Invalid code' };

    await supabase.from('enrollments').insert([
      { classroom_id: classroom.id, student_id: currentUser.id }
    ]);

    return { success: true, message: 'Joined classroom successfully!' };
  };

  const getTeacherClassrooms = async () => {
    if (!currentUser) return [];
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', currentUser.id);
    return data || [];
  };

  const getStudentClassrooms = async () => {
    if (!currentUser) return [];

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('classroom_id')
      .eq('student_id', currentUser.id);

    if (!enrollments) return [];

    const ids = enrollments.map(e => e.classroom_id);

    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('*')
      .in('id', ids);

    return classrooms || [];
  };

  const getClassroomById = async (id: string) => {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single();

    if (!classroom) return null;

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('classroom_id', id);

    return {
      ...classroom,
      students: enrollments?.map(e => e.student_id) || [],
      feedbacks: [],
      feedbackQuestions: [],
      quizzes: [],
      quizAttempts: [],
    };
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      register,
      logout,
      createClassroom,
      joinClassroom,
      getTeacherClassrooms,
      getStudentClassrooms,
      getClassroomById
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
