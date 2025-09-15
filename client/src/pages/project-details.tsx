import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  BatteryCharging,
  Package,
  Receipt
} from "lucide-react";
import type { Project, SOWDocument } from "@shared/schema";

export default function ProjectDetails() {
  const params = useParams();
  const [, navigate] = useLocation();
  const projectId = params.id;
  const { toast } = useToast();

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

            {/* SOW Documents & Extracted Expenses */}
            {sowDocuments.length > 0 && sowDocuments.some(doc => doc.extractedExpenses) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    SOW Document Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sowDocuments.filter(doc => doc.extractedExpenses).map((doc) => (
                    <div key={doc.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm" data-testid={`text-sow-filename-${doc.id}`}>
                            {doc.filename}
                          </span>
                        </div>
                        <Badge variant="secondary" data-testid={`badge-sow-status-${doc.id}`}>
                          Processed
                        </Badge>
                      </div>
                      
                      {doc.extractedExpenses && Array.isArray(doc.extractedExpenses) && (doc.extractedExpenses as any[]).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Expense Breakdown:</p>
                          <div className="space-y-2">
                            {(doc.extractedExpenses as any[]).map((expense: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  <div>
                                    <span className="text-sm font-medium" data-testid={`text-expense-category-${doc.id}-${idx}`}>
                                      {expense.category}
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                      {expense.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm" data-testid={`text-expense-amount-${doc.id}-${idx}`}>
                                    {formatCurrency(expense.amount)}
                                  </p>
                                  {expense.quantity && (
                                    <p className="text-xs text-muted-foreground">
                                      {expense.quantity} {expense.unit || 'units'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="pt-3 mt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Total SOW Amount:</span>
                              <span className="font-bold text-accent" data-testid={`text-sow-total-${doc.id}`}>
                                {formatCurrency(
                                  (doc.extractedExpenses as any[]).reduce(
                                    (sum: number, exp: any) => sum + (exp.amount || 0),
                                    0
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Total from all SOW documents with Apply button */}
                  {(() => {
                    const totalSOWAmount = sowDocuments.reduce((total, doc) => {
                      if (doc.extractedExpenses && Array.isArray(doc.extractedExpenses)) {
                        return total + (doc.extractedExpenses as any[]).reduce(
                          (sum: number, exp: any) => sum + (exp.amount || 0),
                          0
                        );
                      }
                      return total;
                    }, 0);
                    const sowCapexPerCharger = totalSOWAmount / project.chargerCount;
                    const currentCapex = parseFloat(project.capex);
                    const isDifferent = Math.abs(sowCapexPerCharger - currentCapex) > 1;

                    const applySOWMutation = useMutation({
                      mutationFn: async () => {
                        return apiRequest(
                          "PUT",
                          `/api/projects/${projectId}`,
                          { capex: sowCapexPerCharger.toString() }
                        );
                      },
                      onSuccess: () => {
                        toast({
                          title: "Success",
                          description: "Project updated with SOW-extracted CapEx",
                        });
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
                      },
                      onError: () => {
                        toast({
                          title: "Error",
                          description: "Failed to update project",
                          variant: "destructive",
                        });
                      },
                    });

                    return (
                      <>
                        {sowDocuments.filter(doc => doc.extractedExpenses).length > 1 && (
                          <div className="pt-3 mt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Total from All SOW Documents:</span>
                              <span className="font-bold text-lg text-accent">
                                {formatCurrency(totalSOWAmount)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Comparison and Apply Button */}
                        <div className="pt-3 mt-3 border-t border-border space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">SOW CapEx per Charger:</span>
                              <span className="font-medium" data-testid="text-sow-capex-per-charger">
                                {formatCurrency(sowCapexPerCharger)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Current CapEx per Charger:</span>
                              <span className="font-medium">
                                {formatCurrency(currentCapex)}
                              </span>
                            </div>
                            {isDifferent && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Difference:</span>
                                <span className={`font-medium ${sowCapexPerCharger > currentCapex ? 'text-destructive' : 'text-accent'}`}>
                                  {sowCapexPerCharger > currentCapex ? '+' : ''}
                                  {formatCurrency(sowCapexPerCharger - currentCapex)}
                                  ({((sowCapexPerCharger - currentCapex) / currentCapex * 100).toFixed(1)}%)
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {isDifferent && (
                            <Button 
                              onClick={() => applySOWMutation.mutate()}
                              disabled={applySOWMutation.isPending}
                              className="w-full"
                              variant="default"
                              data-testid="button-apply-sow-capex"
                            >
                              {applySOWMutation.isPending ? "Applying..." : "Apply SOW CapEx to Project"}
                            </Button>
                          )}
                          
                          {!isDifferent && (
                            <p className="text-sm text-center text-muted-foreground py-2">
                              ✓ Project already using SOW-extracted CapEx
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

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
                    {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-semibold">
                    {new Date(project.updatedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SOW Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
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
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {new Date(doc.createdAt || Date.now()).toLocaleDateString()}
                              </p>
                              {doc.processed && (
                                <Badge variant="outline" className="text-xs h-4">
                                  Processed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
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