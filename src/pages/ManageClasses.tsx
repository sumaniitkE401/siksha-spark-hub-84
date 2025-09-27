import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { BookOpen, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserWithClasses {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'volunteer' | 'viewer';
  programme: string;
  photo_url?: string;
  created_at: string;
  assignedClasses: Array<{
    class_id: string;
    subject: string;
    grade: string;
    class_label?: string;
  }>;
}

export default function ManageClasses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<UserWithClasses[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [classAssignments, setClassAssignments] = useState<Record<string, { grade: string; subject: string }>>({});
  const [assigning, setAssigning] = useState<string>("");
  const [removing, setRemoving] = useState<string>("");

  // Check if current user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }
      
      setUserRole(data.role);
    }
    
    checkAdminStatus();
  }, [user]);

  // Fetch volunteers for class assignment
  useEffect(() => {
    async function fetchVolunteers() {
      if (userRole !== 'admin') return;
      
      try {
        const { data: volunteersData, error } = await supabase
          .from('users')
          .select(`
            *,
            class_assignments (
              class_id,
              classes (
                id,
                subject,
                grade,
                class_label
              )
            )
          `)
          .eq('role', 'volunteer')
          .order('name');

        if (error) throw error;

        const volunteersWithClasses: UserWithClasses[] = volunteersData.map(user => ({
          ...user,
          role: user.role as 'admin' | 'volunteer' | 'viewer',
          assignedClasses: user.class_assignments?.map((assignment: any) => ({
            class_id: assignment.class_id,
            subject: assignment.classes.subject,
            grade: assignment.classes.grade,
            class_label: assignment.classes.class_label
          })) || []
        }));

        setVolunteers(volunteersWithClasses);
      } catch (error) {
        console.error('Error fetching volunteers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch volunteers data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchVolunteers();
  }, [userRole, toast]);

  // Get subject options based on grade
  const getSubjectOptions = (grade: string) => {
    const gradeNum = parseInt(grade.replace(/\D/g, ''));
    if (gradeNum >= 6 && gradeNum <= 9) {
      return ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Extra Curricular'];
    } else if (gradeNum >= 10 && gradeNum <= 12) {
      return ['Physics', 'Chemistry', 'Biology', 'English', 'Maths', 'Social Science', 'Extra Curricular'];
    }
    return [];
  };

  // Handle class assignment
  const handleClassAssignment = async (userId: string) => {
    const assignment = classAssignments[userId];
    if (!assignment || !assignment.grade || !assignment.subject) {
      toast({
        title: "Error",
        description: "Please select both grade and subject",
        variant: "destructive",
      });
      return;
    }

    setAssigning(userId);
    try {
      // First, check if class exists or create it
      const classLabel = `${assignment.grade}-${assignment.subject}`;
      let classId;

      const { data: existingClass, error: findError } = await supabase
        .from('classes')
        .select('id')
        .eq('grade', assignment.grade)
        .eq('subject', assignment.subject)
        .maybeSingle();

      if (findError) throw findError;

      if (existingClass) {
        classId = existingClass.id;
      } else {
        // Create new class
        const { data: newClass, error: createError } = await supabase
          .from('classes')
          .insert({
            grade: assignment.grade,
            subject: assignment.subject,
            class_label: classLabel
          })
          .select('id')
          .single();

        if (createError) throw createError;
        classId = newClass.id;
      }

      // Create assignment (with conflict handling)
      const { error: assignError } = await supabase
        .from('class_assignments')
        .upsert({
          user_id: userId,
          class_id: classId
        }, {
          onConflict: 'user_id,class_id'
        });

      if (assignError) throw assignError;

      // Update local state
      setVolunteers(prev => prev.map(vol => {
        if (vol.id === userId) {
          const newClass = {
            class_id: classId,
            subject: assignment.subject,
            grade: assignment.grade,
            class_label: classLabel
          };
          return {
            ...vol,
            assignedClasses: [...vol.assignedClasses.filter(c => c.class_id !== classId), newClass]
          };
        }
        return vol;
      }));

      // Clear assignment form
      setClassAssignments(prev => ({ ...prev, [userId]: { grade: '', subject: '' } }));

      toast({
        title: "Success",
        description: `Assigned ${assignment.grade} ${assignment.subject} successfully`,
      });
    } catch (error) {
      console.error('Error assigning class:', error);
      toast({
        title: "Error",
        description: "Failed to assign class",
        variant: "destructive",
      });
    } finally {
      setAssigning("");
    }
  };

  // Handle class removal
  const handleRemoveAssignment = async (userId: string, classId: string) => {
    setRemoving(`${userId}-${classId}`);
    try {
      const { error } = await supabase
        .from('class_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('class_id', classId);

      if (error) throw error;

      // Update local state
      setVolunteers(prev => prev.map(vol => {
        if (vol.id === userId) {
          return {
            ...vol,
            assignedClasses: vol.assignedClasses.filter(c => c.class_id !== classId)
          };
        }
        return vol;
      }));

      toast({
        title: "Success",
        description: "Class assignment removed successfully",
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Error",
        description: "Failed to remove class assignment",
        variant: "destructive",
      });
    } finally {
      setRemoving("");
    }
  };

  // Redirect if not admin
  if (userRole && userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Manage Classes
          </h1>
          <p className="text-muted-foreground mt-2">
            Assign classes and subjects to volunteers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            <BookOpen className="w-4 h-4 mr-1" />
            {volunteers.length} Volunteers
          </Badge>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Active Volunteers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {volunteers.length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-accent">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {volunteers.reduce((total, vol) => total + vol.assignedClasses.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Classes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Volunteer Class Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Current Classes</TableHead>
                  <TableHead>Assign Grade</TableHead>
                  <TableHead>Assign Subject</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((volunteer, index) => {
                  const assignment = classAssignments[volunteer.id] || { grade: '', subject: '' };
                  const subjectOptions = getSubjectOptions(assignment.grade);
                  
                  return (
                    <TableRow 
                      key={volunteer.id}
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/20 hover:bg-muted/30"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage src={volunteer.photo_url} alt={volunteer.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {volunteer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{volunteer.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{volunteer.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {volunteer.assignedClasses.length > 0 ? (
                            volunteer.assignedClasses.map((cls) => (
                              <div key={cls.class_id} className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-accent/10 text-accent"
                                >
                                  {cls.grade} {cls.subject}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveAssignment(volunteer.id, cls.class_id)}
                                  disabled={removing === `${volunteer.id}-${cls.class_id}`}
                                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  {removing === `${volunteer.id}-${cls.class_id}` ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border border-destructive border-t-transparent"></div>
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No classes assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignment.grade}
                          onValueChange={(value) => 
                            setClassAssignments(prev => ({
                              ...prev,
                              [volunteer.id]: { ...assignment, grade: value, subject: '' }
                            }))
                          }
                        >
                          <SelectTrigger className="w-28 bg-background border-primary/20">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-primary/20">
                            <SelectItem value="6th">6th</SelectItem>
                            <SelectItem value="7th">7th</SelectItem>
                            <SelectItem value="8th">8th</SelectItem>
                            <SelectItem value="9th">9th</SelectItem>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="11th">11th</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignment.subject}
                          onValueChange={(value) => 
                            setClassAssignments(prev => ({
                              ...prev,
                              [volunteer.id]: { ...assignment, subject: value }
                            }))
                          }
                          disabled={!assignment.grade}
                        >
                          <SelectTrigger className="w-36 bg-background border-primary/20">
                            <SelectValue placeholder="Subject" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-primary/20">
                            {subjectOptions.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleClassAssignment(volunteer.id)}
                          disabled={!assignment.grade || !assignment.subject || assigning === volunteer.id}
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          {assigning === volunteer.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {volunteers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No volunteers found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}