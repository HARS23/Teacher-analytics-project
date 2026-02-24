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
    const normalizedEmail = supabaseUser.email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      console.log('User profile not found for:', normalizedEmail);
      setIsProfileIncomplete(true);
      setCurrentUser(null);
    } else {
      setCurrentUser(data);
      setIsProfileIncomplete(false);
    }
    setLoading(false);
  };

  // ================= AUTH =================

  const sendVerificationEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
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

    const normalizedEmail = user.email?.trim().toLowerCase();
    if (!normalizedEmail) return { success: false, message: 'Email not found in auth session' };

    // Update password in Supabase Auth if provided
    if (password) {
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError && !pwError.message.includes('different from the old password')) {
        console.error('Failed to update Supabase Auth password:', pwError);
        return { success: false, message: 'Failed to set password: ' + pwError.message };
      }
    }

    // Upsert into our users table
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        email: normalizedEmail,
        password: password || 'auth-user',
        role,
        name
      }], { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error('ERROR in completeProfile (profile upsert):', error);
      return { success: false, message: 'Failed to create profile: ' + error.message };
    }

    console.log('Profile completion success:', data);
    setCurrentUser(data);
    setIsProfileIncomplete(false);
    return { success: true, message: 'Profile completed successfully!' };
  };

  const register = async (email: string, password: string, role: UserRole, name: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError) return { success: false, message: authError.message };

    const { data, error } = await supabase
      .from('users')
      .upsert([{ email: normalizedEmail, password, role, name }], { onConflict: 'email' })
      .select();

    if (error || !data) return { success: false, message: 'Registration failed in users table' };

    setCurrentUser(data[0]);
    return { success: true, message: 'Registration successful!' };
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try standard Supabase Auth login
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      console.error('DEBUG: Supabase Login Error:', authError);

      // 2. Check for "Rate Limit Exceeded"
      if (authError.message.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          message: 'Rate limit exceeded. Please wait a few minutes or use "Login with Magic Link".'
        };
      }

      // 3. Fallback: Check public.users for legacy plain-text credentials
      // This helps users migrate from old insecure logic to secure Supabase Auth.
      const { data: legacyUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('password', password) // Checking the plain-text field from your screenshot
        .single();

      if (!dbError && legacyUser) {
        return {
          success: false,
          message: 'Legacy account detected! For security, please use "Login with Magic Link" once to activate your secure session.'
        };
      }

      return { success: false, message: authError.message };
    }

    // 4. Auth success, get table data for profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return { success: false, message: 'User profile not found. Please complete your registration.' };
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
