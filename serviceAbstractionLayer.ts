/**
 * SERVICE ABSTRACTION LAYER
 * Provides single interface for all data/auth/storage operations
 * Allows swapping between Base44 and alternative providers (Prisma, etc.)
 * 
 * Usage:
 *   const users = await dataService.list('User');
 *   const auth = await authService.getMe();
 */

// ============================================================================
// AUTHENTICATION SERVICE INTERFACE
// ============================================================================

export interface IAuthService {
  getMe(): Promise<any | null>;
  isAuthenticated(): Promise<boolean>;
  logout(redirectUrl?: string): Promise<void>;
  redirectToLogin(nextUrl?: string): Promise<void>;
  updateProfile(data: Record<string, any>): Promise<any>;
}

// ============================================================================
// ENTITY DATA SERVICE INTERFACE
// ============================================================================

export interface IDataService {
  list<T = any>(entityName: string, sort?: string, limit?: number): Promise<T[]>;
  filter<T = any>(
    entityName: string,
    query: Record<string, any>,
    sort?: string,
    limit?: number
  ): Promise<T[]>;
  create<T = any>(entityName: string, data: Record<string, any>): Promise<T>;
  update<T = any>(entityName: string, id: string, data: Record<string, any>): Promise<T>;
  delete(entityName: string, id: string): Promise<void>;
  subscribe<T = any>(
    entityName: string,
    callback: (event: any) => void
  ): () => void;
}

// ============================================================================
// FILE STORAGE SERVICE INTERFACE
// ============================================================================

export interface IStorageService {
  upload(file: File): Promise<{ url: string; uri: string }>;
  getSignedUrl(uri: string, expiresIn?: number): Promise<string>;
  delete(uri: string): Promise<void>;
}

// ============================================================================
// EMAIL SERVICE INTERFACE
// ============================================================================

export interface IEmailService {
  send(to: string, subject: string, html: string): Promise<void>;
  sendBulk(recipients: string[], subject: string, html: string): Promise<void>;
}

// ============================================================================
// LLM SERVICE INTERFACE
// ============================================================================

export interface ILLMService {
  invoke(prompt: string, jsonSchema?: Record<string, any>): Promise<string | Record<string, any>>;
  generateImage(prompt: string): Promise<{ url: string }>;
}

// ============================================================================
// PAYMENT SERVICE INTERFACE
// ============================================================================

export interface IPaymentService {
  createInvoice(data: Record<string, any>): Promise<{ invoice_id: string; url: string }>;
  getInvoiceUrl(invoiceId: string): Promise<string>;
}

// ============================================================================
// BASE44 IMPLEMENTATION (LEGACY - TO BE REPLACED)
// ============================================================================

/**
 * Base44AuthService
 * Current implementation using Base44 SDK
 * TO BE REPLACED: Will be swapped out for NextAuthService
 */
export class Base44AuthService implements IAuthService {
  constructor(private base44: any) {}

  async getMe() {
    try {
      return await this.base44.auth.me();
    } catch (err) {
      console.error("[Base44AuthService] Error getting user:", err);
      return null;
    }
  }

  async isAuthenticated() {
    try {
      return await this.base44.auth.isAuthenticated();
    } catch (err) {
      console.error("[Base44AuthService] Error checking auth:", err);
      return false;
    }
  }

  async logout(redirectUrl?: string) {
    try {
      await this.base44.auth.logout(redirectUrl);
    } catch (err) {
      console.error("[Base44AuthService] Error logging out:", err);
    }
  }

  async redirectToLogin(nextUrl?: string) {
    try {
      await this.base44.auth.redirectToLogin(nextUrl);
    } catch (err) {
      console.error("[Base44AuthService] Error redirecting to login:", err);
    }
  }

  async updateProfile(data: Record<string, any>) {
    try {
      return await this.base44.auth.updateMe(data);
    } catch (err) {
      console.error("[Base44AuthService] Error updating profile:", err);
      throw err;
    }
  }
}

/**
 * Base44DataService
 * Current implementation using Base44 SDK for entity operations
 * TO BE REPLACED: Will be swapped out for PrismaDataService
 */
export class Base44DataService implements IDataService {
  constructor(private base44: any) {}

  async list<T = any>(entityName: string, sort?: string, limit?: number): Promise<T[]> {
    try {
      return await this.base44.entities[entityName].list(sort, limit);
    } catch (err) {
      console.error(`[Base44DataService] Error listing ${entityName}:`, err);
      throw err;
    }
  }

  async filter<T = any>(
    entityName: string,
    query: Record<string, any>,
    sort?: string,
    limit?: number
  ): Promise<T[]> {
    try {
      return await this.base44.entities[entityName].filter(query, sort, limit);
    } catch (err) {
      console.error(`[Base44DataService] Error filtering ${entityName}:`, err);
      throw err;
    }
  }

  async create<T = any>(entityName: string, data: Record<string, any>): Promise<T> {
    try {
      return await this.base44.entities[entityName].create(data);
    } catch (err) {
      console.error(`[Base44DataService] Error creating ${entityName}:`, err);
      throw err;
    }
  }

  async update<T = any>(entityName: string, id: string, data: Record<string, any>): Promise<T> {
    try {
      return await this.base44.entities[entityName].update(id, data);
    } catch (err) {
      console.error(`[Base44DataService] Error updating ${entityName}:`, err);
      throw err;
    }
  }

  async delete(entityName: string, id: string): Promise<void> {
    try {
      await this.base44.entities[entityName].delete(id);
    } catch (err) {
      console.error(`[Base44DataService] Error deleting from ${entityName}:`, err);
      throw err;
    }
  }

  subscribe<T = any>(entityName: string, callback: (event: any) => void): () => void {
    try {
      return this.base44.entities[entityName].subscribe(callback);
    } catch (err) {
      console.error(`[Base44DataService] Error subscribing to ${entityName}:`, err);
      return () => {}; // No-op unsubscribe
    }
  }
}

/**
 * Base44StorageService
 * Current implementation using Base44 file upload API
 */
export class Base44StorageService implements IStorageService {
  constructor(private base44: any) {}

  async upload(file: File): Promise<{ url: string; uri: string }> {
    try {
      const { file_url } = await this.base44.integrations.Core.UploadFile({ file });
      return { url: file_url, uri: file_url };
    } catch (err) {
      console.error("[Base44StorageService] Error uploading file:", err);
      throw err;
    }
  }

  async getSignedUrl(uri: string, expiresIn?: number): Promise<string> {
    try {
      const { signed_url } = await this.base44.integrations.Core.CreateFileSignedUrl({
        file_uri: uri,
        expires_in: expiresIn || 3600,
      });
      return signed_url;
    } catch (err) {
      console.error("[Base44StorageService] Error getting signed URL:", err);
      throw err;
    }
  }

  async delete(uri: string): Promise<void> {
    console.warn("[Base44StorageService] Delete not implemented for Base44");
  }
}

/**
 * Base44EmailService
 * Current implementation using Base44 email integration
 */
export class Base44EmailService implements IEmailService {
  constructor(private base44: any) {}

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.base44.integrations.Core.SendEmail({
        to,
        subject,
        body: html,
      });
    } catch (err) {
      console.error("[Base44EmailService] Error sending email:", err);
      throw err;
    }
  }

  async sendBulk(recipients: string[], subject: string, html: string): Promise<void> {
    try {
      await Promise.all(
        recipients.map((to) =>
          this.base44.integrations.Core.SendEmail({
            to,
            subject,
            body: html,
          })
        )
      );
    } catch (err) {
      console.error("[Base44EmailService] Error sending bulk emails:", err);
      throw err;
    }
  }
}

/**
 * Base44LLMService
 * Current implementation using Base44 LLM integration
 */
export class Base44LLMService implements ILLMService {
  constructor(private base44: any) {}

  async invoke(prompt: string, jsonSchema?: Record<string, any>) {
    try {
      return await this.base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: jsonSchema,
        add_context_from_internet: false,
      });
    } catch (err) {
      console.error("[Base44LLMService] Error invoking LLM:", err);
      throw err;
    }
  }

  async generateImage(prompt: string): Promise<{ url: string }> {
    try {
      return await this.base44.integrations.Core.GenerateImage({ prompt });
    } catch (err) {
      console.error("[Base44LLMService] Error generating image:", err);
      throw err;
    }
  }
}

// ============================================================================
// SERVICE FACTORY & SINGLETON
// ============================================================================

/**
 * ServiceContainer
 * Single point to access all services
 * Allows easy swapping of implementations without changing component code
 */
class ServiceContainer {
  private authService: IAuthService | null = null;
  private dataService: IDataService | null = null;
  private storageService: IStorageService | null = null;
  private emailService: IEmailService | null = null;
  private llmService: ILLMService | null = null;

  setAuthService(service: IAuthService) {
    this.authService = service;
  }

  setDataService(service: IDataService) {
    this.dataService = service;
  }

  setStorageService(service: IStorageService) {
    this.storageService = service;
  }

  setEmailService(service: IEmailService) {
    this.emailService = service;
  }

  setLLMService(service: ILLMService) {
    this.llmService = service;
  }

  getAuthService(): IAuthService {
    if (!this.authService) {
      throw new Error("AuthService not initialized");
    }
    return this.authService;
  }

  getDataService(): IDataService {
    if (!this.dataService) {
      throw new Error("DataService not initialized");
    }
    return this.dataService;
  }

  getStorageService(): IStorageService {
    if (!this.storageService) {
      throw new Error("StorageService not initialized");
    }
    return this.storageService;
  }

  getEmailService(): IEmailService {
    if (!this.emailService) {
      throw new Error("EmailService not initialized");
    }
    return this.emailService;
  }

  getLLMService(): ILLMService {
    if (!this.llmService) {
      throw new Error("LLMService not initialized");
    }
    return this.llmService;
  }
}

// Global singleton
export const serviceContainer = new ServiceContainer();

/**
 * INITIALIZATION (in _app.tsx or main entry point)
 *
 * // Current: Using Base44
 * import { base44 } from "@/api/base44Client";
 * serviceContainer.setAuthService(new Base44AuthService(base44));
 * serviceContainer.setDataService(new Base44DataService(base44));
 * serviceContainer.setStorageService(new Base44StorageService(base44));
 * serviceContainer.setEmailService(new Base44EmailService(base44));
 * serviceContainer.setLLMService(new Base44LLMService(base44));
 *
 * // After migration: Using Prisma + NextAuth
 * import { NextAuthService } from "@/services/auth/NextAuthService";
 * import { PrismaDataService } from "@/services/data/PrismaDataService";
 * import { S3StorageService } from "@/services/storage/S3StorageService";
 * // ... etc
 * serviceContainer.setAuthService(new NextAuthService());
 * serviceContainer.setDataService(new PrismaDataService());
 * // ... etc
 */

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const getAuthService = () => serviceContainer.getAuthService();
export const getDataService = () => serviceContainer.getDataService();
export const getStorageService = () => serviceContainer.getStorageService();
export const getEmailService = () => serviceContainer.getEmailService();
export const getLLMService = () => serviceContainer.getLLMService();