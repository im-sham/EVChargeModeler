import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectModal } from "@/components/project-modal";
import { UploadModal } from "@/components/upload-modal";
import { PortfolioChart } from "@/components/portfolio-chart";
import { 
  BatteryCharging, 
  Plus, 
  Bell, 
  ChevronDown, 
  Folder, 
  TrendingUp, 
  Percent, 
  Wand2,
  Upload,
  BarChart3
} from "lucide-react";
import type { Project } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isNewProject, setIsNewProject] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalProjects: number;
    totalChargers: number;
    avgNPV: number;
    avgIRR: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsNewProject(true);
    setShowProjectModal(true);
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setIsNewProject(false);
    setShowProjectModal(true);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BatteryCharging className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-foreground">EVChargeModeler</h1>
              </div>
              <span className="text-muted-foreground text-sm">Financial Modeling for EV Charging Stations</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                  JD
                </div>
                <span className="hidden sm:block">John Doe</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Project Dashboard</h2>
              <p className="text-muted-foreground mt-1">Manage and analyze your EV charging station financial models</p>
            </div>
            <Button 
              onClick={handleCreateProject}
              className="mt-4 sm:mt-0"
              data-testid="button-new-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-projects">
                      {statsLoading ? "..." : stats?.totalProjects || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Folder className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg NPV</p>
                    <p className="text-2xl font-bold text-accent" data-testid="text-avg-npv">
                      {statsLoading ? "..." : formatCurrency((stats?.avgNPV || 0) * 1000000)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg IRR</p>
                    <p className="text-2xl font-bold text-accent" data-testid="text-avg-irr">
                      {statsLoading ? "..." : formatPercentage(stats?.avgIRR || 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Percent className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Chargers</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-chargers">
                      {statsLoading ? "..." : stats?.totalChargers || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <BatteryCharging className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Recent Projects</h3>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </div>
              <CardContent className="p-6">
                {projectsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : (projects as Project[]).length === 0 ? (
                  <div className="text-center py-8">
                    <BatteryCharging className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first EV charging station financial model</p>
                    <Button onClick={handleCreateProject} data-testid="button-create-first-project">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(projects as Project[]).slice(0, 5).map((project: Project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer hover-elevate"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        data-testid={`card-project-${project.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <BatteryCharging className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{project.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {project.chargerCount} Chargers • Created {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-accent">
                            NPV: {project.npv ? formatCurrency(parseFloat(project.npv)) : "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            IRR: {project.irr ? formatPercentage(parseFloat(project.irr)) : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover-elevate"
                    onClick={handleCreateProject}
                    data-testid="button-input-wizard"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <Wand2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Input Wizard</p>
                      <p className="text-sm text-muted-foreground">Start new model</p>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover-elevate"
                    onClick={() => setShowUploadModal(true)}
                    data-testid="button-upload-sow"
                  >
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center mr-3">
                      <Upload className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Upload SOW</p>
                      <p className="text-sm text-muted-foreground">Parse contractor docs</p>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover-elevate"
                    data-testid="button-compare-models"
                  >
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="h-4 w-4 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Compare Models</p>
                      <p className="text-sm text-muted-foreground">Side-by-side analysis</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Performance</h3>
                <div className="h-48">
                  <PortfolioChart projects={projects} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProjectModal
        open={showProjectModal}
        onOpenChange={setShowProjectModal}
        project={selectedProject}
        isNew={isNewProject}
      />

      <UploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
      />
    </div>
  );
}
