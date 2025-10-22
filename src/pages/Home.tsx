import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Wrench, Calendar, Database } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('selectedYear') || new Date().getFullYear().toString();
  });

  const availableYears = ['2025', '2026', '2027'];

  useEffect(() => {
    localStorage.setItem('selectedYear', selectedYear);
  }, [selectedYear]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-gray-100">
      <Navbar />
      <div className="pt-20 pb-12 px-6">
        <div className="container mx-auto max-w-5xl">
           {/* Logo positioned at top left */}
        <div className="absolute top-20 left-6">
          <div className="flex flex-col items-start gap-1">
            <ProjectLogo size="large" />
            <div className="text-sm text-muted-foreground font-medium leading-tight">
              <div>Ammonitrate Plant</div>
              <div>Nitrate Service</div>
            </div>
          </div>
        </div>
          <div className="text-center mb-8">
            <div className="mb-8"></div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
              Management Nitrate Service 
            </h1>
            <p className="text-slate-600 text-lg">
              Management Dashboard
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Ammonitrate Plant - Nitrate Service
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <Calendar className="h-5 w-5 text-slate-600" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px] bg-white border-slate-300 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    Year {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card
            className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-slate-200 hover:border-blue-400 hover:scale-105"
            onClick={() => navigate(`/maintenance?year=${selectedYear}`)}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                  <Wrench className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Maintenance</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Manage daily maintenance operations
              </CardDescription>
            </CardHeader>
            <CardContent>
			{/* <p className="text-muted-foreground text-sm mb-4">
                Daily work tracking and management system for maintenance operations
			</p>*/}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/maintenance?year=${selectedYear}`);
                }}
              >
                Open Module
              </Button>
            </CardContent>
          </Card>

          <Card
            className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-slate-200 hover:border-green-400 hover:scale-105"
            onClick={() => toast({ title: "Coming Soon", description: "This module will be available soon" })}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-sm">
                  <BarChart3 className="h-7 w-7 text-green-600" />
                </div>
                <CardTitle className="text-xl">Production</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Manage daily production operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/*<p className="text-muted-foreground text-sm mb-4">
                View statistics, reports, and comprehensive overview of all Production 
              </p>*/}
              <Button
                className="w-full"
                variant="outline"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card
            className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-slate-200 hover:border-slate-400 hover:scale-105"
            onClick={() => toast({ title: "Coming Soon", description: "This module will be available soon" })}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-sm">
                  <Database className="h-7 w-7 text-slate-600" />
                </div>
                <CardTitle className="text-xl">Data Management</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Import, export, and archive data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/*<p className="text-muted-foreground text-sm mb-4">
                Manage your historical data and perform bulk operations
              </p>*/}
              <Button
                className="w-full"
                variant="outline"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

          <div className="mt-12 max-w-6xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Calendar className="h-5 w-5" />
                  Year Selection: {selectedYear}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  All modules will use data from the selected year. Change the year using the selector above.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
