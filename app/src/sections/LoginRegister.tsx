import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Mail, Lock, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingScreen } from '@/components/Loading';

export function LoginRegister() {
  const { login, sendVerificationEmail, completeProfile, isProfileIncomplete, loading } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register (Verification) form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  // Profile completion state
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState<'teacher' | 'student'>('student');
  const [profilePassword, setProfilePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    const normalizedEmail = loginEmail.trim().toLowerCase();
    const result = await login(normalizedEmail, loginPassword);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail) {
      toast.error('Please enter your email');
      return;
    }
    const normalizedEmail = registerEmail.trim().toLowerCase();
    const result = await sendVerificationEmail(normalizedEmail);
    if (result.success) {
      setRegisterEmail(normalizedEmail); // Keep the trimmed version
      setVerificationSent(true);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profilePassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (profilePassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (profilePassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await completeProfile(profileName, profileRole, profilePassword);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (isProfileIncomplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #537791 0%, #3d5a6e 100%)' }}>
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#537791' }}>Complete Your Profile</h1>
            <p style={{ color: '#537791', opacity: 0.8 }}>Just a few more details to get started</p>
          </div>

          <Card className="border-0 shadow-xl" style={{ background: '#F7F6E7' }}>
            <CardContent className="pt-6">
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ color: '#537791' }}>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                    <Input
                      placeholder="Enter your full name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="pl-10 border-0 focus:ring-2"
                      style={{ background: '#E7E6E1', color: '#537791' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#537791' }}>I am a</Label>
                  <Select value={profileRole} onValueChange={(value: 'teacher' | 'student') => setProfileRole(value)}>
                    <SelectTrigger className="border-0 focus:ring-2" style={{ background: '#E7E6E1', color: '#537791' }}>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#F7F6E7' }}>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#537791' }}>Set Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                    <Input
                      type="password"
                      placeholder="Create a password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="pl-10 border-0 focus:ring-2"
                      style={{ background: '#E7E6E1', color: '#537791' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#537791' }}>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                    <Input
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
                  className="w-full text-white font-semibold"
                  style={{ background: '#537791' }}
                >
                  Save & Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                        placeholder="email@gmail.com"
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
                  <div className="flex flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                      style={{ background: '#537791' }}
                    >
                      Sign In
                    </Button>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" style={{ borderColor: '#E7E6E1' }} />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#F7F6E7] px-2 text-muted-foreground" style={{ color: '#C1C0B9' }}>Or</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2"
                      style={{ borderColor: '#537791', color: '#537791' }}
                      onClick={async () => {
                        if (!loginEmail) {
                          toast.error('Please enter your email first');
                          return;
                        }
                        const result = await sendVerificationEmail(loginEmail);
                        if (result.success) {
                          toast.success('Magic link sent to ' + loginEmail);
                        } else {
                          toast.error(result.message);
                        }
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Login with Magic Link
                    </Button>
                  </div>
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
                  We'll send you a verification link to your email
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationSent ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ color: '#537791' }}>Check Your Email</h3>
                    <p style={{ color: '#537791', opacity: 0.8 }}>
                      We've sent a verification link to <strong>{registerEmail}</strong>.
                      Click the link to continue your registration.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setVerificationSent(false)}
                      className="mt-4"
                    >
                      Use a different email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendVerification} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email" style={{ color: '#537791' }}>Gmail Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: '#537791' }} />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="youremail@gmail.com"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
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
                      Send Verification Link
                    </Button>
                  </form>
                )}
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
