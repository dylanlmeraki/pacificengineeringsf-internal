/**
 * TypeScript Type Definitions for Core Domain Models
 * Replaces implicit Base44 entity types with explicit, type-safe definitions
 * Use throughout the app instead of `any`
 */

// ============================================================================
// AUTH & USERS
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  company_name?: string | null;
  role: "admin" | "user" | "client";
  onboarding_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// PROJECTS
// ============================================================================

export interface Project {
  id: string;
  project_name: string;
  project_number?: string | null;
  description?: string | null;
  status: "Planning" | "In Progress" | "On Hold" | "Under Review" | "Completed" | "Closed";
  project_type?: "SWPPP" | "Construction" | "Inspections" | "Engineering" | "Special Inspections" | "Multiple Services" | null;
  client_email: string;
  budget?: number | null;
  progress_percentage: number;
  created_date: Date;
  updated_date: Date;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  task_name: string;
  description?: string | null;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  progress_percentage: number;
  assigned_to: string[];
  estimated_cost?: number | null;
  created_date: Date;
  updated_date: Date;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  milestone_name: string;
  status: "Pending" | "Pending Client Approval" | "Completed" | "Rejected";
  amount?: number | null;
  created_date: Date;
  updated_date: Date;
}

// ============================================================================
// COMMUNICATION
// ============================================================================

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  project_id: string;
  sender_email: string;
  sender_name: string;
  message: string;
  attachments?: any[] | null;
  mentions: string[];
  read_by?: any[] | null;
  created_date: Date;
  updated_date: Date;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_name: string;
  file_url: string;
  uploaded_by: string;
  uploaded_date: Date;
  created_date: Date;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  client_email: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  created_date: Date;
}

// Continue adding types as needed...