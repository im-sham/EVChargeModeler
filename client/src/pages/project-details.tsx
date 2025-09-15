import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { 
  ArrowLeft, 
  Download,
  FileText,
  TrendingUp,
  Percent,
  DollarSign,
  Zap,
  Calendar,
  BatteryCharging
} from "lucide-react";
import type { Project, SOWDocument } from "@shared/schema";

export default function ProjectDetails() {
  const params = useParams();
  const [, navigate] = useLocation();
  const projectId = params.id;

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: sowDocuments = [], isLoading: documentsLoading } = useQuery<SOWDocument[]>({
    queryKey: [`/api/projects/${projectId}/sow-documents`],
    enabled: !!projectId,
  });

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BatteryCharging className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "N/A";
    
    if (Math.abs(num) >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (Math.abs(num) >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "N/A";
    return `${num.toFixed(2)}%`;
  };

  const getChargerTypeLabel = (type: string) => {
    switch(type) {
      case 'dc-fast': return 'DC Fast (50-150kW)';
      case 'dc-ultra': return 'DC Ultra (350kW+)';
      case 'level-2': return 'Level 2 (7-19kW)';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="text-project-name">
                  {project.name}
                </h1>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">NPV</p>
                  <p className="text-2xl font-bold text-accent" data-testid="text-npv">
                    {formatCurrency(project.npv)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IRR</p>
                  <p className="text-2xl font-bold text-accent" data-testid="text-irr">
                    {formatPercentage(project.irr)}
                  </p>
                </div>
                <Percent className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">LCOC</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-lcoc">
                    ${project.lcoc ? parseFloat(project.lcoc).toFixed(3) : "N/A"}/kWh
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chargers</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-charger-count">
                    {project.chargerCount}
                  </p>
                </div>
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {project.cashFlows ? (
                  <CashFlowChart cashFlows={project.cashFlows} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No cash flow data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Financial Inputs */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CapEx per Charger</p>
                    <p className="font-semibold" data-testid="text-capex">
                      {formatCurrency(project.capex)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Annual OpEx (% of CapEx)</p>
                    <p className="font-semibold" data-testid="text-opex">
                      {formatPercentage(parseFloat(project.opex) * 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peak Utilization</p>
                    <p className="font-semibold" data-testid="text-utilization">
                      {formatPercentage(project.peakUtilization)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Charging Rate</p>
                    <p className="font-semibold" data-testid="text-rate">
                      ${project.chargingRate}/kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Project Life</p>
                    <p className="font-semibold" data-testid="text-life">
                      {project.projectLife || 10} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount Rate</p>
                    <p className="font-semibold" data-testid="text-discount">
                      {formatPercentage(project.discountRate || "10")}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Incentives & Credits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {project.lcfsCredits && (
                      <div>
                        <p className="text-sm text-muted-foreground">LCFS Credits</p>
                        <p className="font-semibold">${project.lcfsCredits}/tonne</p>
                      </div>
                    )}
                    {project.stateRebate && (
                      <div>
                        <p className="text-sm text-muted-foreground">State Rebate</p>
                        <p className="font-semibold">{formatCurrency(project.stateRebate)}</p>
                      </div>
                    )}
                    {project.energiizeRebate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Energiize Rebate</p>
                        <p className="font-semibold">{formatCurrency(project.energiizeRebate)}</p>
                      </div>
                    )}
                    {project.utilityRebate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Utility Rebate</p>
                        <p className="font-semibold">{formatCurrency(project.utilityRebate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Charger Type</p>
                  <p className="font-semibold">{getChargerTypeLabel(project.chargerType)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-semibold">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-semibold">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SOW Documents */}
            <Card>
              <CardHeader>
                <CardTitle>SOW Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                ) : sowDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {sowDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded-md hover-elevate"
                        data-testid={`card-document-${doc.id}`}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents uploaded yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}