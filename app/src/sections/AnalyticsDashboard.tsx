import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';

interface MLAnalyticsData {
  email: string;
  overall_score: number;
  percentile_rank: number;
  tier: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  dimensions: {
    "Student Satisfaction": number;
    "Teaching Effectiveness": number;
    "Student Engagement": number;
    "Content Coverage": number;
    "Comment Sentiment": number;
    "Consistency": number;
  };
  suggestions: string[];
}

export function AnalyticsDashboard() {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<MLAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.email) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Try calling the local Python ML API or Production URL
        const API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001/api/analyze';
        console.log(`Fetching ML analytics from ${API_URL}/${currentUser.email}`);
        
        const response = await fetch(`${API_URL}/${currentUser.email}`);
        
        if (!response.ok) {
           throw new Error('ML API not responding or returned error');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          setAnalytics(result.data);
        } else {
            setError(result.message || 'No analytics data available yet. Collect more student feedback.');
        }
      } catch (err: any) {
        console.error('Error fetching ML analytics:', err);
        setError('Could not connect to the ML Analytics Engine. Ensure the Python API is running on port 5001.');
        
        // Fallback for demo purposes if backend isn't running
        setAnalytics({
           email: currentUser.email,
           overall_score: 72.4,
           percentile_rank: 68.0,
           tier: 'Good',
           dimensions: {
              "Student Satisfaction": 82.0,
              "Teaching Effectiveness": 68.5,
              "Student Engagement": 75.0,
              "Content Coverage": 60.0,
              "Comment Sentiment": 58.0,
              "Consistency": 90.0,
           },
           suggestions: [
               "Comment sentiment is average. Review recent free-text feedback.",
               "Content coverage is slightly low. Consider adding short quizzes."
           ]
        });
        setError('Showing fallback mock data because Python ML engine is offline.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentUser]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: '#537791' }} />
          <p style={{ color: '#537791' }} className="font-medium">Crunching behavioral data with ML...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
      return (
        <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 mb-4" style={{ color: '#e74c3c' }} />
            <p style={{ color: '#537791' }} className="font-medium text-lg">No Analytics Data Available</p>
            <p style={{ color: '#C1C0B9' }} className="mt-2 max-w-md">We need more data (feedbacks and quizzes) to generate meaningful ML insights for your profile.</p>
          </CardContent>
        </Card>
      );
  }

  const chartData = [
    {
      subject: 'Student Satisfaction',
      score: analytics.dimensions["Student Satisfaction"],
      peerAverage: 70,
      fullMark: 100,
    },
    {
      subject: 'Teaching Effectiveness',
      score: analytics.dimensions["Teaching Effectiveness"],
      peerAverage: 65,
      fullMark: 100,
    },
    {
      subject: 'Student Engagement',
      score: analytics.dimensions["Student Engagement"],
      peerAverage: 60,
      fullMark: 100,
    },
    {
      subject: 'Content Coverage',
      score: analytics.dimensions["Content Coverage"],
      peerAverage: 55,
      fullMark: 100,
    },
    {
      subject: 'Comment Sentiment',
      score: analytics.dimensions["Comment Sentiment"],
      peerAverage: 65,
      fullMark: 100,
    },
    {
      subject: 'Consistency',
      score: analytics.dimensions["Consistency"],
      peerAverage: 75,
      fullMark: 100,
    }
  ];

  const getTierColor = (tier: string) => {
      switch(tier) {
          case 'Excellent': return '#2ecc71';
          case 'Good': return '#3498db';
          case 'Average': return '#f39c12';
          case 'Needs Improvement': return '#e74c3c';
          default: return '#537791';
      }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Top Banner Overview */}
      <Card className="border-0 shadow-lg overflow-hidden" style={{ background: '#F7F6E7' }}>
        <div className="h-2 w-full" style={{ background: getTierColor(analytics.tier) }}></div>
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-md relative group"
                   style={{ background: getTierColor(analytics.tier) }}>
                 {Math.round(analytics.overall_score)}
                 {/* Sparkles for excellent tier */}
                 {analytics.tier === 'Excellent' && (
                     <Sparkles className="absolute -top-2 -right-2 text-yellow-400 w-8 h-8 animate-pulse" />
                 )}
              </div>
              <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#537791' }}>ML Behavior Analysis</h2>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: getTierColor(analytics.tier) }}>
                          {analytics.tier} Tier
                      </span>
                      <span className="text-sm font-medium" style={{ color: '#C1C0B9' }}>
                          Top {100 - Math.round(analytics.percentile_rank)}% of teachers
                      </span>
                  </div>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart Panel */}
        <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#537791' }}>
               <Brain className="w-5 h-5" />
               Behavioral Dimensions Map
            </CardTitle>
            <CardDescription style={{ color: '#C1C0B9' }}>
               AI-generated spider chart based on feedback, quiz data, and sentiment analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[350px] w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                   <PolarGrid stroke="#E7E6E1" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#537791', fontSize: 12, fontWeight: 600 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                   <Radar name="Your Profile" dataKey="score" stroke="#537791" fill="#537791" fillOpacity={0.3} strokeWidth={2} />
                   <Radar name="Peer Average" dataKey="peerAverage" stroke="#C1C0B9" fill="#C1C0B9" fillOpacity={0.2} strokeDasharray="5 5" strokeWidth={2} />
                   <RechartsTooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E7E6E1', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                   <RechartsLegend wrapperStyle={{ paddingTop: '20px' }} />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        {/* Breakdown & Suggestions Panel */}
        <div className="space-y-6">
            <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#537791' }}>
                    <TrendingUp className="w-5 h-5" />
                    Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {Object.entries(analytics.dimensions).map(([dim, score]) => (
                      <div key={dim} className="space-y-1">
                          <div className="flex justify-between text-sm">
                              <span className="font-medium" style={{ color: '#537791' }}>{dim}</span>
                              <span className="font-bold" style={{ color: '#537791' }}>{Math.round(score)}/100</span>
                          </div>
                          <Progress 
                            value={score} 
                            className="h-2 bg-[#E7E6E1]" 
                            indicatorClassName="transition-all duration-1000 ease-in-out"
                            style={{ 
                                '--progress-background': score > 70 ? '#2ecc71' : score > 40 ? '#3498db' : '#e74c3c' 
                            } as React.CSSProperties}
                          />
                      </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg" style={{ background: '#F7F6E7' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#537791' }}>
                    <Sparkles className="w-5 h-5" />
                    AI Actionable Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <ul className="space-y-3">
                      {analytics.suggestions.map((sug, idx) => (
                         <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#E7E6E1' }}>
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#537791' }} />
                            <span className="text-sm" style={{ color: '#537791' }}>{sug}</span>
                         </li>
                      ))}
                  </ul>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
