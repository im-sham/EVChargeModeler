import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertSOWDocumentSchema } from "@shared/schema";
// Remove import - will define locally
import multer from "multer";
import { parseSOWDocument } from "../client/src/lib/file-parser";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Simple DCF calculation for server-side use
function calculateDCF(inputs: {
  capex: number;
  opex: number;
  chargerCount: number;
  peakUtilization: number;
  chargingRate: number;
  lcfsCredits?: number;
  stateRebate?: number;
  projectLife?: number;
  discountRate?: number;
}) {
  const {
    capex,
    opex,
    chargerCount,
    peakUtilization,
    chargingRate,
    lcfsCredits = 0,
    stateRebate = 0,
    projectLife = 10,
    discountRate = 0.10,
  } = inputs;

  // Calculate cash flows
  const cashFlows: number[] = [];
  const annualKWh = chargerCount * peakUtilization * 365 * 1000; // kWh per year
  
  // Year 0: Initial investment minus rebates
  cashFlows.push(-(capex * chargerCount - stateRebate));

  // Years 1-N: Operating cash flows
  for (let year = 1; year <= projectLife; year++) {
    const revenue = annualKWh * chargingRate;
    const lcfsRevenue = annualKWh * 0.0004 * lcfsCredits; // rough LCFS calculation
    const costs = opex; // Annual OpEx
    cashFlows.push(revenue + lcfsRevenue - costs);
  }

  // Simple NPV calculation
  let npv = 0;
  cashFlows.forEach((cf, i) => {
    npv += cf / Math.pow(1 + discountRate, i);
  });

  // Simple IRR estimation (approximation)
  let irr = discountRate;
  for (let rate = 0.01; rate <= 0.5; rate += 0.01) {
    let testNpv = 0;
    cashFlows.forEach((cf, i) => {
      testNpv += cf / Math.pow(1 + rate, i);
    });
    if (Math.abs(testNpv) < Math.abs(npv)) {
      irr = rate;
      npv = testNpv;
    }
  }

  // LCOC calculation
  const totalCosts = capex * chargerCount + (opex * projectLife);
  const totalKWh = annualKWh * projectLife;
  const lcoc = totalCosts / totalKWh;

  return {
    npv: Math.round(npv),
    irr: Math.round(irr * 10000) / 100, // percentage with 2 decimal places
    lcoc: Math.round(lcoc * 1000) / 1000, // $/kWh with 3 decimal places
    cashFlows
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      
      // Ensure required numeric fields have defaults
      if (!projectData.chargerCount) projectData.chargerCount = 4;
      
      // Calculate DCF metrics
      const dcfResults = calculateDCF({
        capex: parseFloat(projectData.capex),
        opex: parseFloat(projectData.opex),
        chargerCount: projectData.chargerCount,
        peakUtilization: parseFloat(projectData.peakUtilization) / 100, // Convert percentage to decimal
        chargingRate: parseFloat(projectData.chargingRate),
        lcfsCredits: projectData.lcfsCredits ? parseFloat(projectData.lcfsCredits) : 0,
        stateRebate: projectData.stateRebate ? parseFloat(projectData.stateRebate) : 0,
        projectLife: projectData.projectLife || 10,
        discountRate: projectData.discountRate ? parseFloat(projectData.discountRate) / 100 : 0.10,
      });

      // Create project with calculated metrics
      const projectToCreate = {
        ...projectData,
        npv: dcfResults.npv.toString(),
        irr: dcfResults.irr.toString(),
        lcoc: dcfResults.lcoc.toString(),
        cashFlows: dcfResults.cashFlows,
      };
      
      const project = await storage.createProject(projectToCreate);
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const projectData = insertProjectSchema.partial().parse(req.body);
      
      // Recalculate DCF metrics if financial inputs changed
      let dcfResults;
      if (projectData.capex || projectData.opex || projectData.chargerCount || 
          projectData.peakUtilization || projectData.chargingRate || 
          projectData.lcfsCredits || projectData.stateRebate) {
        
        const existingProject = await storage.getProject(req.params.id);
        if (!existingProject) {
          return res.status(404).json({ message: "Project not found" });
        }

        const updatedData = { ...existingProject, ...projectData };
        dcfResults = calculateDCF({
          capex: parseFloat(updatedData.capex),
          opex: parseFloat(updatedData.opex),
          chargerCount: updatedData.chargerCount,
          peakUtilization: parseFloat(updatedData.peakUtilization) / 100, // Convert percentage to decimal
          chargingRate: parseFloat(updatedData.chargingRate),
          lcfsCredits: updatedData.lcfsCredits ? parseFloat(updatedData.lcfsCredits) : 0,
          stateRebate: updatedData.stateRebate ? parseFloat(updatedData.stateRebate) : 0,
          projectLife: updatedData.projectLife || 10,
          discountRate: updatedData.discountRate ? parseFloat(updatedData.discountRate) / 100 : 0.10,
        });
      }

      const updateData = dcfResults ? {
        ...projectData,
        npv: dcfResults.npv.toString(),
        irr: dcfResults.irr.toString(),
        lcoc: dcfResults.lcoc.toString(),
        cashFlows: dcfResults.cashFlows,
      } : projectData;

      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // SOW Document routes
  app.get("/api/projects/:projectId/sow-documents", async (req, res) => {
    try {
      const documents = await storage.getSOWDocumentsByProject(req.params.projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching SOW documents:", error);
      res.status(500).json({ message: "Failed to fetch SOW documents" });
    }
  });

  app.post("/api/projects/:projectId/sow-documents", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const documentData = insertSOWDocumentSchema.parse({
        projectId: req.params.projectId,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      });

      // Parse the document to extract expenses
      const extractedExpenses = await parseSOWDocument(req.file.buffer, req.file.mimetype);

      const document = await storage.createSOWDocument({
        ...documentData,
        extractedExpenses,
        processed: true,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading SOW document:", error);
      res.status(500).json({ message: "Failed to upload SOW document" });
    }
  });

  app.delete("/api/sow-documents/:id", async (req, res) => {
    try {
      await storage.deleteSOWDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SOW document:", error);
      res.status(500).json({ message: "Failed to delete SOW document" });
    }
  });

  // Dashboard statistics route
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      
      const totalProjects = projects.length;
      const totalChargers = projects.reduce((sum, p) => sum + p.chargerCount, 0);
      const avgNPV = projects.length > 0 
        ? projects.reduce((sum, p) => sum + (parseFloat(p.npv || "0")), 0) / projects.length
        : 0;
      const avgIRR = projects.length > 0
        ? projects.reduce((sum, p) => sum + (parseFloat(p.irr || "0")), 0) / projects.length
        : 0;

      res.json({
        totalProjects,
        totalChargers,
        avgNPV: avgNPV / 1000000, // Convert to millions
        avgIRR: avgIRR * 100, // Convert to percentage
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
