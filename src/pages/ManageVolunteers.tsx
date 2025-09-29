import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function ManageVolunteers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithClasses[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithClasses[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [updating, setUpdating] = useState<string>("");

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

  // Fetch all users with their assigned classes
  useEffect(() => {
    async function fetchUsers() {
      try {
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        // Fetch class assignments for all users
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('class_assignments')
          .select(`
            user_id,
            class_id,
            classes (
              id,
              subject,
              grade,
              class_label
            )
          `);

        if (assignmentsError) throw assignmentsError;

        // Combine users with their assigned classes
        const usersWithClasses: UserWithClasses[] = usersData.map(user => ({
          ...user,
          role: user.role as 'admin' | 'volunteer' | 'viewer',
          assignedClasses: assignmentsData
            .filter(assignment => assignment.user_id === user.id && assignment.classes)
            .map(assignment => {
              const classData = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
              return {
                class_id: assignment.class_id,
                subject: classData?.subject || '',
                grade: classData?.grade || '',
                class_label: classData?.class_label || ''
              };
            })
        }));

        setUsers(usersWithClasses);
        setFilteredUsers(usersWithClasses);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole, toast]);

  // Filter users based on search query
  useEffect(() => {
    const filtered = users.filter(user =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.programme?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Update user role
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole as 'admin' | 'volunteer' | 'viewer' } : user
      ));

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setUpdating("");
    }
  };

  // Get role badge variant
  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { emoji: "👑", variant: "destructive" as const, label: "Admin" },
      volunteer: { emoji: "🧑‍🏫", variant: "default" as const, label: "Volunteer" },
      viewer: { emoji: "🎓", variant: "secondary" as const, label: "Student" }
    };
    return badges[role as keyof typeof badges] || badges.viewer;
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
            Manage Volunteers
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            <Users className="w-4 h-4 mr-1" />
            {users.length} Users
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Volunteers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'volunteer').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'viewer').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Volunteers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users & Role Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or programme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Classes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => {
                  const badge = getRoleBadge(user.role);
                  return (
                    <TableRow 
                      key={user.id} 
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/20 hover:bg-muted/30"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage src={user.photo_url} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.name || 'Unknown'}</p>
                              <span className="text-lg">{badge.emoji}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/10 text-secondary">
                          {user.programme || 'Not specified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className="font-semibold">
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.assignedClasses.length > 0 ? (
                            user.assignedClasses.map((cls) => (
                              <Badge 
                                key={cls.class_id} 
                                variant="outline" 
                                className="text-xs bg-accent/10 text-accent"
                              >
                                {cls.grade} {cls.subject}
                                {cls.class_label && ` (${cls.class_label})`}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No classes assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleUpdate(user.id, value)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className="w-32 bg-background border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-primary/20">
                            <SelectItem value="viewer">🎓 Student</SelectItem>
                            <SelectItem value="volunteer">🧑‍🏫 Volunteer</SelectItem>
                            <SelectItem value="admin">👑 Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found matching your search.' : 'No users found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}