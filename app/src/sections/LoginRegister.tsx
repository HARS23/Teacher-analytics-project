import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Mail, Lock, User, BookOpen, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function LoginRegister() {
  const { login, register } = useAuth();
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [name, setName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    const result = login(loginEmail, loginPassword);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (registerPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    const result = register(registerEmail, registerPassword, role, name);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg" 
               style={{ background: 'linear-gradient(135deg, #537791 0%, #3d5a6e 100%)' }}>
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#537791' }}>
            Faculty Teaching Outcome
          </h1>
          <p style={{ color: '#537791', opacity: 0.8 }}>Sensitivity Analyzer</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 p-1" style={{ background: '#E7E6E1' }}>
            <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#537791]"
                         style={{ color: '#C1C0B9' }}>
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#537791]"
                         style={{ color: '#C1C0B9' }}>
              New User
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center" style={{ color: '#537791' }}>Welcome Back</CardTitle>
                <CardDescription className="text-center" style={{ color: '#C1C0B9' }}>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" style={{ color: '#537791' }}>Gmail Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your.email@gmail.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" style={{ color: '#537791' }}>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                    style={{ background: '#537791' }}
                  >
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card className="border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center" style={{ color: '#537791' }}>Create Account</CardTitle>
                <CardDescription className="text-center" style={{ color: '#C1C0B9' }}>
                  Register as a new teacher or student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" style={{ color: '#537791' }}>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email" style={{ color: '#537791' }}>Gmail Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your.email@gmail.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" style={{ color: '#537791' }}>I am a</Label>
                    <div className="relative">
                      <Select value={role} onValueChange={(value: 'teacher' | 'student') => setRole(value)}>
                        <SelectTrigger className="pl-10 border-0 focus:ring-2" style={{ background: '#E7E6E1', color: '#537791' }}>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent style={{ background: '#F7F6E7' }}>
                          <SelectItem value="teacher">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" style={{ color: '#537791' }} />
                              Teacher
                            </div>
                          </SelectItem>
                          <SelectItem value="student">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" style={{ color: '#537791' }} />
                              Student
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" style={{ color: '#537791' }}>Create Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" style={{ color: '#537791' }}>Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 border-0 focus:ring-2"
                        style={{ background: '#E7E6E1', color: '#537791' }}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                    style={{ background: '#537791' }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: '#C1C0B9' }}>
          Analyze teaching outcomes and improve educational quality
        </p>
      </div>
    </div>
  );
}
