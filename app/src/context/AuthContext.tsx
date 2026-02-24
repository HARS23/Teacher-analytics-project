import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { classroomService } from '@/services/classroomService';
import type { User, UserRole, Classroom } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isProfileIncomplete: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, role: UserRole, name: string) => Promise<{ success: boolean; message: string }>;
  sendVerificationEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  completeProfile: (name: string, role: UserRole, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  createClassroom: (name: string, subject: string, description: string) => Promise<{ success: boolean; classroom?: Classroom; message: string }>;
  joinClassroom: (code: string) => Promise<{ success: boolean; message: string }>;
  getTeacherClassrooms: () => Promise<Classroom[]>;
  getStudentClassrooms: () => Promise<Classroom[]>;
  getClassroomById: (id: string) => Promise<Classroom | null>;
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
  const [loading, setLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setCurrentUser(null);
      setIsProfileIncomplete(false);
      setLoading(false);
      return;
    }

    // Check if user exists in our 'users' table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', supabaseUser.email)
      .single();

    if (error || !data) {
      // User is authenticated via Supabase but has no profile in our table
      setIsProfileIncomplete(true);
      setCurrentUser(null); // Don't allow access yet
    } else {
      setCurrentUser(data);
      setIsProfileIncomplete(false);
    }
    setLoading(false);
  };

  // ================= AUTH =================

  const sendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Verification email sent! Please check your inbox.' };
  };

  const completeProfile = async (name: string, role: UserRole, password?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'User not found' };

    // Update password if provided
    if (password) {
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) return { success: false, message: pwError.message };
    }

    // Insert into our users table
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: user.email,
        password: password || 'verified-via-magic-link', // Keep for backward compatibility if needed
        role,
        name
      }])
      .select()
      .single();

    if (error) return { success: false, message: 'Failed to create profile: ' + error.message };

    setCurrentUser(data);
    setIsProfileIncomplete(false);
    return { success: true, message: 'Profile completed successfully!' };
  };

  const register = async (email: string, password: string, role: UserRole, name: string) => {
    // Legacy register - creating both auth and table entries
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { success: false, message: authError.message };

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, role, name }])
      .select();

    if (error || !data) return { success: false, message: 'Registration failed in users table' };

    setCurrentUser(data[0]);
    return { success: true, message: 'Registration successful!' };
  };

  const login = async (email: string, password: string) => {
    // Sign in to Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) return { success: false, message: authError.message };

    // Get table data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { success: false, message: 'User profile not found' };
    }

    setCurrentUser(data);
    return { success: true, message: 'Login successful!' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // ================= CLASSROOM =================

  const createClassroom = async (name: string, subject: string, description: string) => {
    if (!currentUser) return { success: false, message: 'Unauthorized' };

    const code = generateCode();

    const { data, error } = await supabase
      .from('classrooms')
      .insert([{ name, subject, description, code, teacher_id: currentUser.email }])
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
      { classroom_id: classroom.id, student_id: currentUser.email }
    ]);

    return { success: true, message: 'Joined classroom successfully!' };
  };

  const getTeacherClassrooms = async () => {
    if (!currentUser) return [];
    return classroomService.getTeacherClassrooms(currentUser.email);
  };

  const getStudentClassrooms = async () => {
    if (!currentUser) return [];
    return classroomService.getStudentClassrooms(currentUser.email);
  };

  const getClassroomById = async (id: string) => {
    if (!currentUser) return null;
    return classroomService.getClassroomById(id);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isProfileIncomplete,
      loading,
      login,
      register,
      sendVerificationEmail,
      completeProfile,
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
