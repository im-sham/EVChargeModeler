import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { Trash2, X } from "lucide-react";
import { z } from "zod";

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  isNew: boolean;
}

const formSchema = insertProjectSchema.extend({
  capex: z.string().min(1, "CapEx is required"),
  opex: z.string().min(1, "OpEx is required"),
  peakUtilization: z.string().min(1, "Peak utilization is required"),
  chargingRate: z.string().min(1, "Charging rate is required"),
  projectLife: z.number().min(5).max(20).optional(),
  discountRate: z.string().optional(),
  lcfsCredits: z.string().optional(),
  stateRebate: z.string().optional(),
  energiizeRebate: z.string().optional(),
  utilityRebate: z.string().optional(),
});

// Real-time DCF calculation function
function calculateRealtimeDCF(values: any) {
  const capex = parseFloat(values.capex || "0");
  const opex = parseFloat(values.opex || "0");
  const chargerCount = values.chargerCount || 4;
  const peakUtilization = parseFloat(values.peakUtilization || "0") / 100;
  const chargingRate = parseFloat(values.chargingRate || "0");
  const lcfsCredits = parseFloat(values.lcfsCredits || "0");
  const stateRebate = parseFloat(values.stateRebate || "0");
  const projectLife = values.projectLife || 10;
  const discountRate = parseFloat(values.discountRate || "10") / 100;

  if (!capex || !opex || !peakUtilization || !chargingRate) {
    return { npv: 0, irr: 0, lcoc: 0, cashFlows: [] };
  }

  // Calculate cash flows
  const cashFlows: number[] = [];
  const chargerPowerKW = 350;
  const hoursPerDay = 16;
  const daysPerYear = 365;
  const annualKWhPerCharger = chargerPowerKW * hoursPerDay * daysPerYear * peakUtilization;
  const totalAnnualKWh = annualKWhPerCharger * chargerCount;
  
  // Year 0: Initial investment
  const initialInvestment = capex * chargerCount - stateRebate;
  cashFlows.push(-initialInvestment);

  // Years 1-N: Operating cash flows
  for (let year = 1; year <= projectLife; year++) {
    const revenue = totalAnnualKWh * chargingRate;
    const lcfsRevenue = totalAnnualKWh * 0.0004 * lcfsCredits;
    const annualOpex = opex * capex * chargerCount; // OpEx as % of CapEx
    const netCashFlow = revenue + lcfsRevenue - annualOpex;
    cashFlows.push(netCashFlow);
  }

  // NPV calculation
  let npv = 0;
  cashFlows.forEach((cf, i) => {
    npv += cf / Math.pow(1 + discountRate, i);
  });

  // IRR calculation using Newton-Raphson
  let irr = 0.10;
  const maxIterations = 50;
  const tolerance = 0.00001;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let f = 0;
    let df = 0;
    
    cashFlows.forEach((cf, t) => {
      const divisor = Math.pow(1 + irr, t);
      f += cf / divisor;
      if (t > 0) {
        df -= t * cf / Math.pow(1 + irr, t + 1);
      }
    });
    
    const newIrr = irr - f / df;
    
    if (Math.abs(newIrr - irr) < tolerance) {
      irr = newIrr;
      break;
    }
    irr = newIrr;
    
    if (irr < -0.99) irr = -0.99;
    if (irr > 10) irr = 10;
  }

  // LCOC calculation
  const totalCapex = capex * chargerCount;
  const totalOpex = opex * capex * chargerCount * projectLife;
  const totalCosts = totalCapex + totalOpex - stateRebate;
  const totalKWh = totalAnnualKWh * projectLife;
  const lcoc = totalKWh > 0 ? totalCosts / totalKWh : 0;

  return {
    npv: Math.round(npv),
    irr: Math.round(irr * 10000) / 100, // percentage
    lcoc: Math.round(lcoc * 1000) / 1000, // $/kWh
    cashFlows
  };
}

export function ProjectModal({ open, onOpenChange, project, isNew }: ProjectModalProps) {
  const [activeTab, setActiveTab] = useState("inputs");
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    npv: 0,
    irr: 0,
    lcoc: 0,
    cashFlows: [] as number[]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      chargerCount: project?.chargerCount || 4,
      chargerType: project?.chargerType || "dc-fast",
      capex: project?.capex || "",
      opex: project?.opex || "",
      peakUtilization: project?.peakUtilization || "",
      chargingRate: project?.chargingRate || "",
      projectLife: project?.projectLife || 10,
      discountRate: project?.discountRate || "",
      lcfsCredits: project?.lcfsCredits || "",
      stateRebate: project?.stateRebate || "",
      energiizeRebate: project?.energiizeRebate || "",
      utilityRebate: project?.utilityRebate || "",
    },
  });

  // Watch form values for real-time calculation
  const watchedValues = form.watch();

  // Calculate real-time metrics when form values change
  useEffect(() => {
    if (isNew) {
      const metrics = calculateRealtimeDCF(watchedValues);
      setRealtimeMetrics(metrics);
    }
  }, [watchedValues, isNew]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/projects", {
        ...data,
        // Keep decimal fields as strings to match server expectations
        capex: data.capex,
        opex: data.opex,
        peakUtilization: data.peakUtilization,
        chargingRate: data.chargingRate,
        discountRate: data.discountRate || undefined,
        lcfsCredits: data.lcfsCredits || undefined,
        stateRebate: data.stateRebate || undefined,
        energiizeRebate: data.energiizeRebate || undefined,
        utilityRebate: data.utilityRebate || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PUT", `/api/projects/${project!.id}`, {
        ...data,
        // Keep decimal fields as strings to match server expectations
        capex: data.capex,
        opex: data.opex,
        peakUtilization: data.peakUtilization,
        chargingRate: data.chargingRate,
        discountRate: data.discountRate || undefined,
        lcfsCredits: data.lcfsCredits || undefined,
        stateRebate: data.stateRebate || undefined,
        energiizeRebate: data.energiizeRebate || undefined,
        utilityRebate: data.utilityRebate || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${project!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | null | undefined) => {
    if (!value) return "N/A";
    const num = parseFloat(value) * 100;
    return `${num.toFixed(1)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="text-modal-title">
              {isNew ? "New Project" : project?.name || "Project Details"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inputs" data-testid="tab-inputs">Inputs</TabsTrigger>
            <TabsTrigger value="calculations" data-testid="tab-calculations">Calculations</TabsTrigger>
            <TabsTrigger value="outputs" data-testid="tab-outputs">Outputs</TabsTrigger>
            <TabsTrigger value="comparisons" data-testid="tab-comparisons">Comparisons</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-96 p-1">
            <TabsContent value="inputs" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-project-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Charger Configuration</h3>
                      
                      <FormField
                        control={form.control}
                        name="chargerCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Chargers</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-charger-count">
                                  <SelectValue placeholder="Select charger count" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="4">4 Chargers</SelectItem>
                                <SelectItem value="5">5 Chargers</SelectItem>
                                <SelectItem value="6">6 Chargers</SelectItem>
                                <SelectItem value="7">7 Chargers</SelectItem>
                                <SelectItem value="8">8 Chargers</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="chargerType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Charger Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-charger-type">
                                  <SelectValue placeholder="Select charger type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="dc-fast">DC Fast Charging (150kW)</SelectItem>
                                <SelectItem value="dc-ultra">DC Ultra Fast (350kW)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Financial Inputs</h3>
                      
                      <FormField
                        control={form.control}
                        name="capex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total CapEx ($)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="1200000" data-testid="input-capex" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="opex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual OpEx ($)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="180000" data-testid="input-opex" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Utilization & Revenue</h3>
                      
                      <FormField
                        control={form.control}
                        name="peakUtilization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Peak Utilization Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="65" data-testid="input-peak-utilization" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="chargingRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Charging Rate ($/kWh)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.45" data-testid="input-charging-rate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">CA Incentives</h3>
                      
                      <FormField
                        control={form.control}
                        name="lcfsCredits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LCFS Credits ($/tonne)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="180" data-testid="input-lcfs-credits" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stateRebate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State Rebate ($)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="50000" data-testid="input-state-rebate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Project Parameters</h3>
                      
                      <FormField
                        control={form.control}
                        name="projectLife"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Horizon (years)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-project-life">
                                  <SelectValue placeholder="Select project life" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="10">10 years</SelectItem>
                                <SelectItem value="15">15 years</SelectItem>
                                <SelectItem value="20">20 years</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.1" placeholder="10.0" data-testid="input-discount-rate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Additional Incentives</h3>
                      
                      <FormField
                        control={form.control}
                        name="energiizeRebate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EnergIIZE Rebate ($)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="100000" data-testid="input-energiize-rebate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="utilityRebate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Utility Rebate (PG&E/SCE) ($)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="25000" data-testid="input-utility-rebate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="calculations" className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-foreground mb-2">DCF Calculation Details</h3>
                <p className="text-muted-foreground">Advanced financial modeling calculations will be displayed here</p>
              </div>
            </TabsContent>

            <TabsContent value="outputs" className="space-y-6">
              {(isNew || project) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Net Present Value</p>
                        <p className="text-2xl font-bold text-accent" data-testid="text-npv">
                          {isNew 
                            ? formatCurrency(realtimeMetrics.npv.toString())
                            : formatCurrency(project?.npv || "0")}
                        </p>
                        {isNew && (
                          <Badge variant="secondary" className="mt-2">Live Preview</Badge>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Internal Rate of Return</p>
                        <p className="text-2xl font-bold text-accent" data-testid="text-irr">
                          {isNew 
                            ? `${realtimeMetrics.irr.toFixed(2)}%`
                            : formatPercentage(project?.irr || "0")}
                        </p>
                        {isNew && (
                          <Badge variant="secondary" className="mt-2">Live Preview</Badge>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Levelized Cost of Charging</p>
                        <p className="text-2xl font-bold text-foreground" data-testid="text-lcoc">
                          {isNew
                            ? `$${realtimeMetrics.lcoc.toFixed(3)}/kWh`
                            : project?.lcoc ? `$${parseFloat(project.lcoc).toFixed(3)}/kWh` : "N/A"}
                        </p>
                        {isNew && (
                          <Badge variant="secondary" className="mt-2">Live Preview</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="h-64">
                    <CashFlowChart cashFlows={isNew ? realtimeMetrics.cashFlows : project?.cashFlows || []} />
                  </div>
                  
                  {isNew && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">
                        These values update in real-time as you change the input parameters. Save the project to finalize calculations.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="comparisons" className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-foreground mb-2">Project Comparisons</h3>
                <p className="text-muted-foreground">Compare this project with others in your portfolio</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-4">
            {!isNew && (
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:text-destructive"
                data-testid="button-delete-project"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isNew
                ? "Create Project"
                : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
