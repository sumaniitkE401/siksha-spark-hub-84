import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, Calendar, FileText, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyllabusEntry {
  id: string;
  class_id: string;
  date_taught: string;
  topics: string[];
  students_present: number | null;
  notes: string | null;
  duration_minutes: number | null;
  is_planned: boolean;
  approved: boolean;
  created_at: string;
  class_info: {
    grade: string;
    subject: string;
    class_label: string;
  };
}

interface ClassProgress {
  class_id: string;
  grade: string;
  subject: string;
  class_label: string;
  completedTopics: number;
  totalSessions: number;
  plannedSessions: number;
  pendingApproval: number;
  approvedSessions: number;
  lastSession?: string;
}

const MySyllabus = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [syllabusEntries, setSyllabusEntries] = useState<SyllabusEntry[]>([]);
  const [classProgress, setClassProgress] = useState<ClassProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchSyllabusData = async () => {
      if (!userProfile) return;

      try {
        // Fetch all syllabus entries for the volunteer
        const { data: entries, error: entriesError } = await supabase
          .from('syllabus_entries')
          .select(`
            *,
            classes (
              grade,
              subject,
              class_label
            )
          `)
          .eq('volunteer_id', userProfile.id)
          .order('date_taught', { ascending: false });

        if (entriesError) throw entriesError;

        const formattedEntries = entries?.map(entry => ({
          ...entry,
          class_info: {
            grade: (entry.classes as any)?.grade || '',
            subject: (entry.classes as any)?.subject || '',
            class_label: (entry.classes as any)?.class_label || '',
          }
        })) || [];

        setSyllabusEntries(formattedEntries);

        // Calculate class progress
        const progressMap = new Map<string, ClassProgress>();

        formattedEntries.forEach(entry => {
          const classId = entry.class_id;
          
          if (!progressMap.has(classId)) {
            progressMap.set(classId, {
              class_id: classId,
              grade: entry.class_info.grade,
              subject: entry.class_info.subject,
              class_label: entry.class_info.class_label,
              completedTopics: 0,
              totalSessions: 0,
              plannedSessions: 0,
              pendingApproval: 0,
              approvedSessions: 0,
            });
          }

          const progress = progressMap.get(classId)!;

          if (entry.is_planned) {
            progress.plannedSessions++;
          } else {
            progress.totalSessions++;
            progress.completedTopics += entry.topics?.length || 0;
            
            if (entry.approved) {
              progress.approvedSessions++;
            } else {
              progress.pendingApproval++;
            }

            if (!progress.lastSession || entry.date_taught > progress.lastSession) {
              progress.lastSession = entry.date_taught;
            }
          }
        });

        setClassProgress(Array.from(progressMap.values()));

      } catch (error) {
        console.error('Error fetching syllabus data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch syllabus data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSyllabusData();
  }, [userProfile, toast]);

  const getFilteredEntries = () => {
    if (!selectedClass) return syllabusEntries;
    return syllabusEntries.filter(entry => entry.class_id === selectedClass);
  };

  const getApprovalRate = (progress: ClassProgress) => {
    if (progress.totalSessions === 0) return 0;
    return Math.round((progress.approvedSessions / progress.totalSessions) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Syllabus Progress
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your teaching progress and syllabus completion
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10">
          <FileText className="w-4 h-4 mr-1" />
          {syllabusEntries.length} Total Entries
        </Badge>
      </div>

      {/* Class Progress Overview */}
      <div className="grid gap-4">
        {classProgress.map((progress) => (
          <Card 
            key={progress.class_id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedClass === progress.class_id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedClass(
              selectedClass === progress.class_id ? null : progress.class_id
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {progress.grade} - {progress.subject}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Class ID: {progress.class_label}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={progress.pendingApproval > 0 ? "secondary" : "default"}
                    className="flex items-center gap-1"
                  >
                    {progress.pendingApproval > 0 ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    {progress.approvedSessions}/{progress.totalSessions} Approved
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <div className="text-xl font-bold text-primary">{progress.completedTopics}</div>
                  <div className="text-xs text-muted-foreground">Topics Taught</div>
                </div>
                
                <div className="text-center p-3 bg-secondary/5 rounded-lg">
                  <div className="text-xl font-bold text-secondary">{progress.totalSessions}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                
                <div className="text-center p-3 bg-accent/5 rounded-lg">
                  <div className="text-xl font-bold text-accent">{progress.plannedSessions}</div>
                  <div className="text-xs text-muted-foreground">Planned</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{getApprovalRate(progress)}%</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Approval Progress</span>
                  <span>{progress.approvedSessions}/{progress.totalSessions}</span>
                </div>
                <Progress 
                  value={getApprovalRate(progress)} 
                  className="h-2"
                />
              </div>
              
              {progress.lastSession && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Last session: {new Date(progress.lastSession).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {classProgress.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Syllabus Entries Yet</h3>
            <p className="text-muted-foreground">
              Start by logging your first teaching session in "My Classes".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Entry List */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Session Details
            </CardTitle>
            <CardDescription>
              Detailed view of all sessions for the selected class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getFilteredEntries().map((entry) => (
                <div 
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(entry.date_taught).toLocaleDateString()}
                      </span>
                      {entry.is_planned && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Planned
                        </Badge>
                      )}
                    </div>
                    
                    <Badge 
                      variant={entry.approved ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {entry.approved ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {entry.approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Topics Covered:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.topics?.map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {(entry.students_present !== null || entry.duration_minutes !== null) && (
                      <div className="flex gap-4 text-muted-foreground">
                        {entry.students_present !== null && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {entry.students_present} students
                          </div>
                        )}
                        {entry.duration_minutes !== null && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.duration_minutes} minutes
                          </div>
                        )}
                      </div>
                    )}
                    
                    {entry.notes && (
                      <div>
                        <strong>Notes:</strong>
                        <p className="text-muted-foreground mt-1">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MySyllabus;