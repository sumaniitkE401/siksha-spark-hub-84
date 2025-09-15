import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Calendar, 
  Award,
  Clock,
  Target
} from 'lucide-react';

interface DashboardStats {
  totalVolunteers: number;
  totalClasses: number;
  totalAnnouncements: number;
  mySyllabusEntries: number;
  pendingApprovals: number;
  completionRate: number;
}

interface UserProfile {
  role: string;
  name: string;
  programme: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalVolunteers: 0,
    totalClasses: 0,
    totalAnnouncements: 0,
    mySyllabusEntries: 0,
    pendingApprovals: 0,
    completionRate: 0,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('role, name, programme')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }

        // Fetch dashboard stats
        const [volunteersRes, classesRes, announcementsRes, syllabusRes] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }).neq('role', 'viewer'),
          supabase.from('classes').select('id', { count: 'exact', head: true }),
          supabase.from('announcements').select('id', { count: 'exact', head: true }),
          supabase.from('syllabus_entries').select('id, approved', { count: 'exact' }).eq('volunteer_id', user.id),
        ]);

        const pendingApprovals = syllabusRes.data?.filter(entry => !entry.approved).length || 0;
        const completionRate = syllabusRes.data?.length ? 
          (syllabusRes.data.filter(entry => entry.approved).length / syllabusRes.data.length) * 100 : 0;

        setStats({
          totalVolunteers: volunteersRes.count || 0,
          totalClasses: classesRes.count || 0,
          totalAnnouncements: announcementsRes.count || 0,
          mySyllabusEntries: syllabusRes.count || 0,
          pendingApprovals,
          completionRate,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin';
  const isVolunteer = userProfile?.role === 'volunteer';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome back, {userProfile?.name || 'User'}! 👋
        </h1>
        <p className="text-muted-foreground">
          {isAdmin && "Manage your volunteer community and track progress"}
          {isVolunteer && "Continue making a difference in students' lives"}
          {!isAdmin && !isVolunteer && "Explore our educational resources"}
        </p>
        {userProfile?.programme && (
          <Badge variant="secondary" className="mt-2">
            {userProfile.programme}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Volunteers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalVolunteers}</div>
            <p className="text-xs text-muted-foreground">Making a difference</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Available for teaching</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/5 to-green-500/10 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalAnnouncements}</div>
            <p className="text-xs text-muted-foreground">Community updates</p>
          </CardContent>
        </Card>

        {(isVolunteer || isAdmin) && (
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/5 to-purple-500/10 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isAdmin ? 'Pending Approvals' : 'My Entries'}
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {isAdmin ? stats.pendingApprovals : stats.mySyllabusEntries}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Awaiting review' : 'Syllabus entries'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Jump into your most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdmin && (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Volunteers
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Award className="mr-2 h-4 w-4" />
                  Approve Syllabus Entries
                </Button>
              </>
            )}
            {isVolunteer && (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Log Today's Teaching
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View My Analytics
                </Button>
              </>
            )}
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              View Latest Announcements
            </Button>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        {isVolunteer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Impact
              </CardTitle>
              <CardDescription>
                Track your teaching progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syllabus Completion</span>
                  <span>{Math.round(stats.completionRate)}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.mySyllabusEntries}</div>
                  <div className="text-xs text-muted-foreground">Total Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{stats.pendingApprovals}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message for Public Users */}
        {!isAdmin && !isVolunteer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Explore Our Resources
              </CardTitle>
              <CardDescription>
                Discover what our volunteers are teaching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Syllabus Progress
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Read Announcements
              </Button>
              <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                💡 Interested in volunteering? Contact our administrators to learn how you can contribute to our mission.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Stay up to date with the latest happenings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Activity feed coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;