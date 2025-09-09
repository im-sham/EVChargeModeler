import { projects, sowDocuments, type Project, type InsertProject, type SOWDocument, type InsertSOWDocument } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // SOW Document operations
  getSOWDocument(id: string): Promise<SOWDocument | undefined>;
  getSOWDocumentsByProject(projectId: string): Promise<SOWDocument[]>;
  createSOWDocument(document: InsertSOWDocument): Promise<SOWDocument>;
  updateSOWDocument(id: string, document: Partial<InsertSOWDocument>): Promise<SOWDocument>;
  deleteSOWDocument(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // SOW Document operations
  async getSOWDocument(id: string): Promise<SOWDocument | undefined> {
    const [document] = await db.select().from(sowDocuments).where(eq(sowDocuments.id, id));
    return document || undefined;
  }

  async getSOWDocumentsByProject(projectId: string): Promise<SOWDocument[]> {
    return await db.select().from(sowDocuments).where(eq(sowDocuments.projectId, projectId));
  }

  async createSOWDocument(insertDocument: InsertSOWDocument): Promise<SOWDocument> {
    const [document] = await db
      .insert(sowDocuments)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateSOWDocument(id: string, updateData: Partial<InsertSOWDocument>): Promise<SOWDocument> {
    const [document] = await db
      .update(sowDocuments)
      .set(updateData)
      .where(eq(sowDocuments.id, id))
      .returning();
    return document;
  }

  async deleteSOWDocument(id: string): Promise<void> {
    await db.delete(sowDocuments).where(eq(sowDocuments.id, id));
  }
}

export const storage = new DatabaseStorage();
