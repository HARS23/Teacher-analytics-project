import { useAuth } from '@/context/AuthContext';
import { LoginRegister } from '@/sections/LoginRegister';
import { TeacherDashboard } from '@/sections/TeacherDashboard';
import { StudentDashboard } from '@/sections/StudentDashboard';
import { ClassroomPage } from '@/sections/ClassroomPage';
import { useState, useEffect } from 'react';

export type View = 'login' | 'teacher-dashboard' | 'student-dashboard' | 'classroom';

function App() {
  const { isAuthenticated, currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<View>('login');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'teacher') {
        setCurrentView('teacher-dashboard');
      } else {
        setCurrentView('student-dashboard');
      }
    } else {
      setCurrentView('login');
    }
  }, [isAuthenticated, currentUser]);

  const handleClassroomSelect = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setCurrentView('classroom');
  };

  const handleBack = () => {
    if (currentUser?.role === 'teacher') {
      setCurrentView('teacher-dashboard');
    } else {
      setCurrentView('student-dashboard');
    }
    setSelectedClassroomId(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <LoginRegister />;
      case 'teacher-dashboard':
        return <TeacherDashboard onClassroomSelect={handleClassroomSelect} />;
      case 'student-dashboard':
        return <StudentDashboard onClassroomSelect={handleClassroomSelect} />;
      case 'classroom':
        if (selectedClassroomId) {
          return <ClassroomPage classroomId={selectedClassroomId} onBack={handleBack} />;
        }
        return currentUser?.role === 'teacher' 
          ? <TeacherDashboard onClassroomSelect={handleClassroomSelect} />
          : <StudentDashboard onClassroomSelect={handleClassroomSelect} />;
      default:
        return <LoginRegister />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F6E7 0%, #E7E6E1 100%)' }}>
      {renderView()}
    </div>
  );
}

export default App;
