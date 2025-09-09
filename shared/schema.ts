import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  chargerCount: integer("charger_count").notNull().default(4),
  chargerType: text("charger_type").notNull().default("dc-fast"),
  capex: decimal("capex", { precision: 12, scale: 2 }).notNull(),
  opex: decimal("opex", { precision: 12, scale: 2 }).notNull(),
  peakUtilization: decimal("peak_utilization", { precision: 5, scale: 2 }).notNull(),
  chargingRate: decimal("charging_rate", { precision: 5, scale: 3 }).notNull(),
  projectLife: integer("project_life").default(10),
  discountRate: decimal("discount_rate", { precision: 5, scale: 3 }).default("0.10"),
  lcfsCredits: decimal("lcfs_credits", { precision: 8, scale: 2 }),
  stateRebate: decimal("state_rebate", { precision: 12, scale: 2 }),
  energiizeRebate: decimal("energiize_rebate", { precision: 12, scale: 2 }),
  utilityRebate: decimal("utility_rebate", { precision: 12, scale: 2 }),
  npv: decimal("npv", { precision: 12, scale: 2 }),
  irr: decimal("irr", { precision: 5, scale: 3 }),
  lcoc: decimal("lcoc", { precision: 5, scale: 3 }),
  cashFlows: jsonb("cash_flows"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sowDocuments = pgTable("sow_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  extractedExpenses: jsonb("extracted_expenses"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSOWDocumentSchema = createInsertSchema(sowDocuments).omit({
  id: true,
  processed: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertSOWDocument = z.infer<typeof insertSOWDocumentSchema>;
export type SOWDocument = typeof sowDocuments.$inferSelect;
