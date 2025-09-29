import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Users, Clock, Save, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AssignedClass {
  class_id: string;
  grade: string;
  subject: string;
  class_label: string;
}

interface SyllabusEntry {
  id: string;
  date_taught: string;
  topics: string[];
  students_present: number | null;
  notes: string | null;
  duration_minutes: number | null;
  is_planned: boolean;
}

const MyClasses = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [syllabusEntries, setSyllabusEntries] = useState<Record<string, SyllabusEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<AssignedClass | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    date_taught: new Date().toISOString().split('T')[0],
    topics: '',
    students_present: '',
    notes: '',
    duration_minutes: '',
    is_planned: false,
  });

  useEffect(() => {
    const fetchMyClasses = async () => {
      if (!userProfile) return;

      try {
        // Fetch assigned classes
        const { data: assignments, error: assignError } = await supabase
          .from('class_assignments')
          .select(`
            class_id,
            classes (
              grade,
              subject,
              class_label
            )
          `)
          .eq('user_id', userProfile.id);

        if (assignError) throw assignError;

        const classes = assignments?.map(assignment => ({
          class_id: assignment.class_id,
          grade: (assignment.classes as any)?.grade || '',
          subject: (assignment.classes as any)?.subject || '',
          class_label: (assignment.classes as any)?.class_label || '',
        })) || [];

        setAssignedClasses(classes);

        // Fetch syllabus entries for each class
        if (classes.length > 0) {
          const classIds = classes.map(c => c.class_id);
          
          const { data: entries, error: entriesError } = await supabase
            .from('syllabus_entries')
            .select('*')
            .in('class_id', classIds)
            .eq('volunteer_id', userProfile.id)
            .order('date_taught', { ascending: false });

          if (entriesError) throw entriesError;

          // Group entries by class_id
          const groupedEntries = entries?.reduce((acc, entry) => {
            if (!acc[entry.class_id]) {
              acc[entry.class_id] = [];
            }
            acc[entry.class_id].push(entry);
            return acc;
          }, {} as Record<string, SyllabusEntry[]>) || {};

          setSyllabusEntries(groupedEntries);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch your classes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyClasses();
  }, [userProfile, toast]);

  const handleLogEntry = async () => {
    if (!selectedClass || !userProfile) return;

    if (!formData.topics.trim()) {
      toast({
        title: "Topics Required",
        description: "Please enter the topics covered",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const entry = {
        class_id: selectedClass.class_id,
        volunteer_id: userProfile.id,
        date_taught: formData.date_taught,
        topics: formData.topics.split(',').map(t => t.trim()).filter(t => t),
        students_present: formData.students_present ? parseInt(formData.students_present) : null,
        notes: formData.notes || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        is_planned: formData.is_planned,
      };

      const { data, error } = await supabase
        .from('syllabus_entries')
        .insert(entry)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setSyllabusEntries(prev => ({
        ...prev,
        [selectedClass.class_id]: [data, ...(prev[selectedClass.class_id] || [])],
      }));

      // Reset form
      setFormData({
        date_taught: new Date().toISOString().split('T')[0],
        topics: '',
        students_present: '',
        notes: '',
        duration_minutes: '',
        is_planned: false,
      });

      setDialogOpen(false);

      toast({
        title: "Entry Logged Successfully!",
        description: "Your teaching activity has been recorded",
      });
    } catch (error: any) {
      console.error('Error logging entry:', error);
      toast({
        title: "Failed to Log Entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTotalTopics = (classId: string) => {
    const entries = syllabusEntries[classId] || [];
    return entries.filter(e => !e.is_planned).reduce((total, entry) => total + (entry.topics?.length || 0), 0);
  };

  const getRecentEntry = (classId: string) => {
    const entries = syllabusEntries[classId] || [];
    return entries.find(e => !e.is_planned);
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
            My Classes
          </h1>
          <p className="text-muted-foreground mt-2">
            View your assigned classes and log teaching activities
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10">
          <BookOpen className="w-4 h-4 mr-1" />
          {assignedClasses.length} Classes
        </Badge>
      </div>

      {assignedClasses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">
              Contact an administrator to get assigned to classes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {assignedClasses.map((classItem) => {
            const entries = syllabusEntries[classItem.class_id] || [];
            const completedEntries = entries.filter(e => !e.is_planned);
            const plannedEntries = entries.filter(e => e.is_planned);
            const recentEntry = getRecentEntry(classItem.class_id);
            
            return (
              <Card key={classItem.class_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        {classItem.grade} - {classItem.subject}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Class ID: {classItem.class_label}
                      </CardDescription>
                    </div>
                    
                    <Dialog open={dialogOpen && selectedClass?.class_id === classItem.class_id} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => setSelectedClass(classItem)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Log Activity
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Log Teaching Activity</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              value={formData.date_taught}
                              onChange={(e) => setFormData(prev => ({ ...prev, date_taught: e.target.value }))}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="topics">Topics Covered *</Label>
                            <Textarea
                              id="topics"
                              placeholder="Enter topics separated by commas"
                              value={formData.topics}
                              onChange={(e) => setFormData(prev => ({ ...prev, topics: e.target.value }))}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="students">Students Present</Label>
                              <Input
                                id="students"
                                type="number"
                                placeholder="0"
                                value={formData.students_present}
                                onChange={(e) => setFormData(prev => ({ ...prev, students_present: e.target.value }))}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="duration">Duration (min)</Label>
                              <Input
                                id="duration"
                                type="number"
                                placeholder="60"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Additional notes or observations"
                              value={formData.notes}
                              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>
                          
                          <Button 
                            onClick={handleLogEntry}
                            disabled={saving}
                            className="w-full"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Log Activity
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{completedEntries.length}</div>
                      <div className="text-sm text-muted-foreground">Sessions Taught</div>
                    </div>
                    
                    <div className="text-center p-4 bg-secondary/5 rounded-lg">
                      <div className="text-2xl font-bold text-secondary">{getTotalTopics(classItem.class_id)}</div>
                      <div className="text-sm text-muted-foreground">Topics Covered</div>
                    </div>
                    
                    <div className="text-center p-4 bg-accent/5 rounded-lg">
                      <div className="text-2xl font-bold text-accent">{plannedEntries.length}</div>
                      <div className="text-sm text-muted-foreground">Planned Sessions</div>
                    </div>
                  </div>
                  
                  {recentEntry && (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Most Recent Session</span>
                        <Badge variant="outline" className="ml-auto">
                          {new Date(recentEntry.date_taught).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Topics:</strong> {recentEntry.topics?.join(', ')}</p>
                        {recentEntry.students_present && (
                          <p><strong>Students:</strong> {recentEntry.students_present}</p>
                        )}
                        {recentEntry.notes && (
                          <p><strong>Notes:</strong> {recentEntry.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {entries.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>No teaching activities logged yet</p>
                      <p className="text-xs">Click "Log Activity" to record your first session</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyClasses;