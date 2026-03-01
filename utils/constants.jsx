import { 
  Droplets, 
  HardHat, 
  ClipboardCheck, 
  Building2, 
  Shield, 
  TrendingUp,
  Bell,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar
} from "lucide-react";

export const PROJECT_TYPE_ICONS = {
  "SWPPP": Droplets,
  "Construction": HardHat,
  "Inspections": ClipboardCheck,
  "Engineering": Building2,
  "Special Inspections": Shield,
  "Multiple Services": TrendingUp
};

export const STATUS_COLORS = {
  "Planning": "bg-gray-100 text-gray-700 border-gray-300",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-300",
  "On Hold": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Under Review": "bg-purple-100 text-purple-700 border-purple-300",
  "Completed": "bg-green-100 text-green-700 border-green-300",
  "Closed": "bg-gray-100 text-gray-500 border-gray-200",
  "Pending Client Approval": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Approved": "bg-green-100 text-green-700 border-green-300",
  "Rejected": "bg-red-100 text-red-700 border-red-300"
};

export const PRIORITY_COLORS = {
  "Low": "text-gray-600 bg-gray-100",
  "Medium": "text-blue-600 bg-blue-100",
  "High": "text-orange-600 bg-orange-100",
  "Urgent": "text-red-600 bg-red-100",
  "Critical": "text-red-700 bg-red-200"
};

export const NOTIFICATION_ICONS = {
  message: MessageSquare,
  approval: CheckCircle,
  task: CheckCircle,
  invoice: DollarSign,
  project_update: AlertTriangle,
  milestone: CheckCircle,
  document: FileText,
  milestone_approval: AlertTriangle,
  change_order: AlertTriangle,
  document_upload: FileText,
  proposal: FileText,
  proposal_sent: FileText,
  new_message: MessageSquare
};

export const NOTIFICATION_PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  low: 'bg-gray-100 text-gray-700 border-gray-300'
};

export const DOCUMENT_TYPE_COLORS = {
  "SWPPP Plan": "bg-blue-100 text-blue-700",
  "Inspection Report": "bg-green-100 text-green-700",
  "Test Results": "bg-purple-100 text-purple-700",
  "Engineering Drawing": "bg-orange-100 text-orange-700",
  "Contract": "bg-red-100 text-red-700",
  "Photo": "bg-cyan-100 text-cyan-700",
  "Invoice": "bg-yellow-100 text-yellow-700",
  "Permit": "bg-indigo-100 text-indigo-700",
  "Other": "bg-gray-100 text-gray-700"
};

export const CHART_COLORS = [
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444"  // red
];