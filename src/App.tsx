import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              {/* Volunteer routes */}
              <Route path="classes" element={<div>My Classes (Coming Soon)</div>} />
              <Route path="syllabus" element={<div>My Syllabus (Coming Soon)</div>} />
              <Route path="analytics" element={<div>Analytics (Coming Soon)</div>} />
              <Route path="announcements" element={<div>Announcements (Coming Soon)</div>} />
              {/* Admin routes */}
              <Route path="admin/volunteers" element={<div>Manage Volunteers (Coming Soon)</div>} />
              <Route path="admin/classes" element={<div>Manage Classes (Coming Soon)</div>} />
              <Route path="admin/syllabus" element={<div>Approve Syllabus (Coming Soon)</div>} />
              <Route path="admin/announcements" element={<div>Post Announcements (Coming Soon)</div>} />
              <Route path="admin/reports" element={<div>Reports (Coming Soon)</div>} />
              <Route path="admin/settings" element={<div>Settings (Coming Soon)</div>} />
              {/* Public routes */}
              <Route path="public/syllabus" element={<div>Public Syllabus (Coming Soon)</div>} />
              <Route path="public/announcements" element={<div>Public Announcements (Coming Soon)</div>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
