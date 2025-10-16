import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Wrench } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="container mx-auto max-w-5xl">
        <div className="absolute top-4 left-4">
          <div className="flex flex-col items-start gap-1">
            <ProjectLogo size="large" />
            <div className="text-sm text-muted-foreground font-medium leading-tight">
              <div>Ammonitrate Plant</div>
              <div>Nitrate Service</div>
            </div>
          </div>
        </div>

        <div className="text-center mb-12 mt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            Technical Shutdown AT2025
          </h1>
          <p className="text-muted-foreground text-lg">
            Maintenance Management Dashboard
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/maintenance")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Maintenance Module</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Daily work tracking and management system for maintenance operations
              </p>
              <Button className="w-full" onClick={() => navigate("/maintenance")}>
                Open Maintenance
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/summary")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Work Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View statistics, reports, and comprehensive overview of all maintenance works
              </p>
              <Button className="w-full" variant="secondary" onClick={() => navigate("/summary")}>
                View Summary
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
