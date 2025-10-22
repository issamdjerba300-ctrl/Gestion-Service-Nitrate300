import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Wrench, BarChart3,Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ChangePassword from "@/components/ChangePassword";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const isActive = (paths: string[]) => {
  return paths.includes(location.pathname);
};

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className={cn(
                "gap-2 transition-colors",
                isActive("/home")
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "hover:bg-slate-100"
              )}
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/maintenance")}
              className={cn(
                "gap-2 transition-colors",
                isActive(["/maintenance", "/summary"])
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "hover:bg-slate-100"
              )}
            >
              <Wrench className="h-4 w-4" />
              Maintenance
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast({ title: "Coming Soon", description: "This module will be available soon" })}
            >
              <BarChart3 className="h-4 w-4" />
              Production
            </Button>
			 <Button
              variant="ghost"
              onClick={() => toast({ title: "Coming Soon", description: "This module will be available soon" })}
            >
              <Database className="h-4 w-4" />
              Data Management
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <ChangePassword />
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
