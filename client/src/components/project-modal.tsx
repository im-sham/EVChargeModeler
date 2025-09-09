import { useState } from "react";
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

export function ProjectModal({ open, onOpenChange, project, isNew }: ProjectModalProps) {
  const [activeTab, setActiveTab] = useState("inputs");
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

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/projects", {
        ...data,
        capex: parseFloat(data.capex),
        opex: parseFloat(data.opex),
        peakUtilization: parseFloat(data.peakUtilization),
        chargingRate: parseFloat(data.chargingRate),
        discountRate: data.discountRate ? parseFloat(data.discountRate) : undefined,
        lcfsCredits: data.lcfsCredits ? parseFloat(data.lcfsCredits) : undefined,
        stateRebate: data.stateRebate ? parseFloat(data.stateRebate) : undefined,
        energiizeRebate: data.energiizeRebate ? parseFloat(data.energiizeRebate) : undefined,
        utilityRebate: data.utilityRebate ? parseFloat(data.utilityRebate) : undefined,
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
        capex: parseFloat(data.capex),
        opex: parseFloat(data.opex),
        peakUtilization: parseFloat(data.peakUtilization),
        chargingRate: parseFloat(data.chargingRate),
        discountRate: data.discountRate ? parseFloat(data.discountRate) : undefined,
        lcfsCredits: data.lcfsCredits ? parseFloat(data.lcfsCredits) : undefined,
        stateRebate: data.stateRebate ? parseFloat(data.stateRebate) : undefined,
        energiizeRebate: data.energiizeRebate ? parseFloat(data.energiizeRebate) : undefined,
        utilityRebate: data.utilityRebate ? parseFloat(data.utilityRebate) : undefined,
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
              {project && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Net Present Value</p>
                        <p className="text-2xl font-bold text-accent" data-testid="text-npv">
                          {formatCurrency(project.npv)}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Internal Rate of Return</p>
                        <p className="text-2xl font-bold text-accent" data-testid="text-irr">
                          {formatPercentage(project.irr)}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Levelized Cost of Charging</p>
                        <p className="text-2xl font-bold text-foreground" data-testid="text-lcoc">
                          {project.lcoc ? `$${parseFloat(project.lcoc).toFixed(2)}/kWh` : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="h-64">
                    <CashFlowChart cashFlows={project.cashFlows} />
                  </div>
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
