export type UserRole = 'ISMS_Owner' | 'Contributor' | 'Reviewer' | 'Auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  orgSector: string;
  orgSize: string;
  city?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  lastLogin?: string;
}

export type StepStatus = 'Complete' | 'In Progress' | 'Locked' | 'Not Started';

export interface ISMSStep {
  stepNumber: number;
  title: string;
  description: string;
  status: StepStatus;
  completedDate?: string;
  assignedTo?: string;
  progress?: number;
}

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskTreatment = 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid';

export interface Risk {
  id: string;
  asset: string;
  threat: string;
  vulnerability: string;
  likelihood: number;
  impact: number;
  score: number;
  level: RiskLevel;
  treatment: RiskTreatment;
  owner: string;
  status: 'Open' | 'In Treatment' | 'Closed';
  mitigationPlan?: string;
}

export interface SoAControl {
  id: string;
  category: string;
  control: string;
  description: string;
  applicable: boolean;
  justification?: string;
  implementation?: string;
  status?: 'Not Started' | 'In Progress' | 'Implemented';
}

export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Closed';
  priority: 'High' | 'Medium' | 'Low';
  relatedTo?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  reportedBy: string;
  reportedDate: string;
  status: 'Open' | 'Under Investigation' | 'Resolved' | 'Closed';
}

export interface Audit {
  id: string;
  title: string;
  type: 'Internal' | 'External' | 'Certification';
  scheduledDate: string;
  auditor: string;
  scope: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: 'Ready' | 'Needs Update' | 'Not Generated';
  lastUpdated?: string;
  version?: string;
}
