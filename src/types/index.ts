// ==================== SHARED TYPES ====================

export type StatusType = 
  | 'active' | 'pending' | 'completed' | 'overdue' | 'expired' 
  | 'draft' | 'archived' | 'in-progress' | 'scheduled'
  | 'investigating' | 'action-required' | 'resolved'
  | 'valid' | 'expiring' | 'coached' | 'follow-up' | 'closed';

export type PriorityType = 'low' | 'medium' | 'high' | 'critical';

export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface MediaFile {
  _id?: string;
  fileUrl: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document' | 'pdf' | 'excel' | 'word';
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
  size?: number;
  description?: string;
}

export interface ProgressNote {
  _id?: string;
  date: string;
  note: string;
  enteredBy: string;
  enteredByName?: string;
}

// ==================== INCIDENT MANAGEMENT ====================

export interface WitnessStatement {
  _id?: string;
  witnessName: string;
  witnessRole: string;
  witnessContact?: string;
  statement: string;
  signedDate: string;
  documentUrl?: string;
}

export interface InvestigationTool {
  type: '5-why' | 'fishbone' | 'timeline' | 'swot';
  rootCause: string;
  findings: string[];
  analysis: string;
  contributingFactors?: string[];
}

export interface InjuryRecord {
  _id?: string;
  injuredWorker: string;
  injuredWorkerId?: string;
  injuryDate: string;
  injuryTime?: string;
  injuryType: string;
  bodyPart: string;
  severity: SeverityType;
  treatmentProvided?: string;
  hospitalVisit?: boolean;
  hospitalName?: string;
  modifiedDutyPlan?: string;
  doctorRestrictions?: string;
  returnToWorkDate?: string;
  fullDutyDate?: string;
  progressNotes: ProgressNote[];
  wcbClaimNumber?: string;
  wcbDocuments?: MediaFile[];
  fitnessCertificate?: MediaFile;
}

export interface EmergencyContact {
  _id?: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  department: string;
  isPrimary: boolean;
  available24_7?: boolean;
  alternatePhone?: string;
}

export interface EmergencyProcedure {
  _id?: string;
  title: string;
  type: 'medical' | 'fire' | 'spill' | 'collision' | 'breakdown' | 'violence' | 'evacuation' | 'other';
  procedure: string;
  responsiblePerson?: string;
  lastUpdated: string;
  updatedBy?: string;
  documentUrl?: string;
  quickReferenceSteps?: string[];
}

export interface FirstAidLog {
  _id?: string;
  date: string;
  time: string;
  location: string;
  locationType?: string;
  injuredPerson: string;
  injuredPersonId?: string;
  injuryDescription: string;
  firstAidProvided: string;
  treatedBy: string;
  treatedById?: string;
  witnessPresent?: boolean;
  witnessName?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  followUpDate?: string;
  returnedToWork?: boolean;
  photoEvidence?: MediaFile[];
}

export interface Incident {
  _id: string;
  incidentNumber: string;
  date: string;
  time: string;
  location: string;
  locationType: 'warehouse' | 'yard' | 'shop' | 'highway' | 'office' | 'customer-site' | 'other';
  type: 'Driver Injury' | 'Vehicle Accident' | 'Workplace Incident' | 'Near Miss' | 'Property Damage' | 'Environmental';
  severity: SeverityType;
  status: StatusType;
  reportedBy: string;
  reportedById?: string;
  reportedByRole: string;
  reportedDate?: string;
  description: string;
  immediateActionTaken?: string;
  hasInjury: boolean;
  hasDamage?: boolean;
  estimatedCost?: number;
  
  // Evidence & Documentation
  photoEvidence?: MediaFile[];
  videoEvidence?: MediaFile[];
  workerStatements?: WitnessStatement[];
  witnessReports?: WitnessStatement[];
  policeReportNumber?: string;
  policeReportFile?: MediaFile;
  
  // Investigation
  investigation?: {
    _id?: string;
    lead: string;
    leadId?: string;
    startDate: string;
    completedDate?: string;
    targetCompletionDate?: string;
    rootCauseAnalysis?: InvestigationTool;
    findings: string;
    recommendations?: string[];
    lessonsLearned?: string;
    status: 'not-started' | 'in-progress' | 'completed';
  };
  
  // CAPA Link
  capa?: CAPA;
  
  // Injury Management
  injuryRecord?: InjuryRecord;
  
  // WCB/WSIB
  wcbClaimNumber?: string;
  wcbDocuments?: MediaFile[];
  
  // Notifications
  managementNotified?: boolean;
  familyNotified?: boolean;
  insuranceNotified?: boolean;
  
  // Audit Trail
  createdAt?: string;
  updatedAt?: string;
  closedDate?: string;
  closedBy?: string;
}

// ==================== HAZARD CONTROL ====================

export interface Hazard {
  _id: string;
  hazardId: string;
  dateReported: string;
  reportedTime?: string;
  reporter: string;
  reporterId?: string;
  reporterRole?: string;
  location: string;
  locationType?: string;
  type: 'Unsafe Equipment' | 'Yard Hazard' | 'Weather' | 'Ergonomic' | 'Chemical' | 'Fire' | 'Electrical' | 'Other';
  description: string;
  immediateAction?: string;
  
  // Risk Assessment
  likelihood: 1 | 2 | 3 | 4 | 5; // 1=Rare, 5=Almost Certain
  severity: 1 | 2 | 3 | 4 | 5; // 1=Negligible, 5=Catastrophic
  riskScore: number; // Calculated: likelihood × severity
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  
  // Status & Actions
  status: 'reported' | 'in-assessment' | 'action-required' | 'in-progress' | 'resolved' | 'rejected';
  priority: PriorityType;
  
  // Corrective Action
  capaAssigned?: boolean;
  capaId?: string;
  controlMeasures?: string[];
  residualRisk?: number;
  
  // Media
  photoEvidence?: MediaFile[];
  
  // Tracking
  assignedTo?: string;
  targetResolutionDate?: string;
  actualResolutionDate?: string;
  verifiedBy?: string;
  verificationDate?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverObservation {
  _id: string;
  observationId: string;
  date: string;
  time?: string;
  driver: string;
  driverId?: string;
  observer: string;
  observerId?: string;
  observerRole?: string;
  location?: string;
  vehicleNumber?: string;
  
  // Observation Type
  type: 'on-road' | 'yard-driving' | 'pre-trip' | 'loading' | 'unloading';
  
  // Checklist Items (scored 0-1)
  seatbeltUse: number;
  speedCompliance: number;
  signalUse: number;
  followingDistance: number;
  lanePositioning: number;
  distractionLevel: number; // Reverse scored
  ppeCompliance: number;
  vehicleCondition: number;
  
  // Calculated
  score: number; // Percentage
  maxScore: number;
  
  // Status & Follow-up
  status: 'pending' | 'coached' | 'follow-up' | 'closed';
  strengthsNoted?: string;
  areasForImprovement?: string;
  coachingProvided?: string;
  coachingDate?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  
  // Media
  photoEvidence?: MediaFile[];
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

// ==================== TRAINING & COMPETENCY ====================

export interface TrainingRecord {
  _id?: string;
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  department?: string;
  trainingName: string;
  trainingCategory: 'Safety' | 'Regulatory' | 'Operational' | 'HR' | 'Technical';
  trainingProvider?: string;
  instructorName?: string;
  issueDate: string;
  expiryDate: string;
  renewalCycle?: number; // Months
  status: 'valid' | 'expiring' | 'expired';
  certificateUrl?: string;
  certificateNumber?: string;
  score?: number;
  passingScore?: number;
  hoursCompleted?: number;
  
  // Reminders
  remindersSent?: {
    days: number;
    sentDate: string;
    sentTo: string[];
  }[];
  
  // Verification
  verifiedBy?: string;
  verificationDate?: string;
  
  // Audit
  uploadedBy?: string;
  uploadedDate?: string;
  notes?: string;
}

export interface TrainingModule {
  _id: string;
  moduleId: string;
  title: string;
  description: string;
  category: 'Safety' | 'Regulatory' | 'Operational' | 'HR' | 'Technical';
  type: 'video' | 'document' | 'quiz' | 'interactive' | 'in-person';
  duration: number; // Minutes
  validityPeriod?: number; // Months
  
  // Content
  contentUrl?: string;
  materialFiles?: MediaFile[];
  quizQuestions?: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  passingScore?: number;
  
  // Assignment
  assignedRoles?: string[];
  mandatory: boolean;
  prerequisiteModules?: string[];
  
  // Tracking
  completionCount: number;
  averageScore?: number;
  
  // Status
  status: 'active' | 'draft' | 'archived';
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
}

// ==================== POLICIES & COMPLIANCE ====================

export interface Policy {
  _id: string;
  policyNumber: string;
  title: string;
  category: 'Safety' | 'HR/Conduct' | 'Driver-Specific' | 'Wellness' | 'Shop/Yard' | 'Environmental' | 'Quality';
  version: string;
  effectiveDate: string;
  reviewDate: string;
  renewalCycle: 12 | 24 | 36 | 48 | 60; // Months
  status: 'active' | 'draft' | 'archived' | 'under-review' | 'expired';
  documentType: 'Policy' | 'Procedure' | 'SOP' | 'Form' | 'Guideline' | 'Standard';
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'HTML';
  fileUrl: string;
  fileSize?: number;
  
  // Ownership & Assignment
  owner: string;
  ownerId?: string;
  ownerDepartment: string;
  assignedRoles: string;
  autoAssignOnHire?: boolean;
  
  // Acknowledgment Tracking
  acknowledged: number;
  totalEmployees: number;
  acknowledgmentRequired: boolean;
  acknowledgmentDeadlineDays?: number;
  
  // Quiz (if required)
  requiresQuiz?: boolean;
  quizPassScore?: number;
  quizAttempts?: number;
  
  // Linked Content
  linkedTrainingId?: string;
  linkedPolicies?: string[];
  relatedForms?: string[];
  
  // Notifications
  notificationSchedule?: number[]; // Days before expiry
  lastNotificationSent?: string;
  
  // Version History
  previousVersions?: {
    version: string;
    effectiveDate: string;
    fileUrl: string;
    archivedBy: string;
    archivedDate: string;
  }[];
  changeLog?: string;
  
  // Audit
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  lastUpdatedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface PolicyAcknowledgment {
  _id: string;
  policyId: string;
  policyNumber: string;
  policyTitle: string;
  policyVersion: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  acknowledgedDate: string;
  signature?: string;
  ipAddress?: string;
  quizScore?: number;
  quizPassed?: boolean;
  notes?: string;
}

// ==================== COMMITTEE & CAPA ====================

export interface CommitteeMember {
  _id: string;
  employeeId: string;
  name: string;
  role: 'Chairperson (Supervisor)' | 'Employee Representative' | 'H&S Representative' | 'Management Representative' | 'Alternate';
  department: string;
  email: string;
  phone: string;
  termStart: string;
  termEnd?: string;
  isActive: boolean;
  photoUrl?: string;
}

export interface MeetingMinute {
  _id: string;
  meetingNumber: string;
  date: string;
  time?: string;
  location?: string;
  meetingType: 'Monthly H&S' | 'Quarterly Review' | 'Incident Review' | 'Special' | 'Training' | 'Audit Follow-up';
  title: string;
  
  // Attendance
  attendees: string[]; // Employee IDs or names
  attendeeDetails?: {
    id: string;
    name: string;
    role: string;
    present: boolean;
  }[];
  absentees?: string[];
  
  // Meeting Content
  agendaItems: string;
  discussionNotes: string;
  notesSummary: string;
  decisionsMode?: string;
  safetyTopicsDiscussed?: string[];
  
  // Action Items
  actionItems?: {
    id: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    status: StatusType;
    linkedCapaId?: string;
  }[];
  actionItemsCount: number;
  
  // Follow-up
  nextMeetingDate?: string;
  followUpRequired?: boolean;
  
  // Documents
  attachments?: MediaFile[];
  minutesDocument?: MediaFile;
  
  // Approval
  preparedBy: string;
  approvedBy?: string;
  approvalDate?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface CAPA {
  _id?: string;
  capaNumber: string;
  title: string;
  description: string;
  type: 'corrective' | 'preventive';
  
  // Source
  source: 'Incident' | 'Hazard' | 'Audit' | 'Inspection' | 'Complaint' | 'Near Miss' | 'Committee Meeting' | 'Management Review';
  sourceId?: string;
  sourceReference?: string;
  
  // Assignment
  assignedTo: string;
  assignedToId?: string;
  assignedToName?: string;
  department?: string;
  
  // Dates
  issueDate: string;
  dueDate: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  
  // Status & Priority
  status: 'open' | 'in-progress' | 'pending-verification' | 'completed' | 'overdue' | 'closed' | 'cancelled';
  priority: PriorityType;
  
  // Implementation
  proposedAction?: string;
  implementationPlan?: string;
  resourcesRequired?: string;
  costEstimate?: number;
  actualCost?: number;
  
  // Verification
  followUpDate?: string;
  followUpVerification?: string;
  verifiedDate?: string;
  verifiedBy?: string;
  verifiedById?: string;
  effectiveness?: 'effective' | 'partially-effective' | 'ineffective';
  
  // Escalation
  reminderSent: boolean;
  reminderDates?: string[];
  escalationLevel: number;
  escalatedTo?: string[];
  escalationDate?: string;
  
  // Progress Tracking
  progressNotes?: ProgressNote[];
  percentComplete?: number;
  
  // Attachments
  attachments?: MediaFile[];
  
  // Audit
  createdBy: string;
  createdDate: string;
  lastUpdated?: string;
  closedBy?: string;
  closedDate?: string;
}

// ==================== TRUCKING OPERATIONS ====================

export interface LoadSecurementLog {
  _id: string;
  logNumber: string;
  date: string;
  time: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  trailerNumber?: string;
  
  // Load Details
  loadType: string;
  loadWeight?: number;
  loadDescription?: string;
  destination?: string;
  
  // Securement Method
  securedBy: 'straps' | 'chains' | 'tarps' | 'combination' | 'bulkhead' | 'other';
  numberOfStraps?: number;
  numberOfChains?: number;
  tarpUsed?: boolean;
  
  // Checklist
  checklistComplete: boolean;
  checklistItems?: {
    item: string;
    checked: boolean;
    notes?: string;
  }[];
  
  // Verification
  verifiedBy?: string;
  verificationTime?: string;
  photoEvidence?: MediaFile[];
  
  // Compliance
  meetsStandards: boolean;
  standardsReference?: string; // e.g., FMCSA, CVSA
  deficienciesNoted?: string;
  
  // Signatures
  driverSignature?: string;
  supervisorSignature?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface ReeferFoodSafetyLog {
  _id: string;
  logNumber: string;
  date: string;
  time: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  trailerNumber: string;
  
  // Temperature Monitoring
  temperatureRecorded: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  targetTemperature: number;
  withinRange: boolean;
  
  // Cleanliness Inspection
  interiorCleanliness: 'excellent' | 'good' | 'fair' | 'poor';
  odorDetected: boolean;
  odorDescription?: string;
  visibleContamination: boolean;
  contaminationDetails?: string;
  
  // Sanitation
  lastSanitized?: string;
  sanitationMethod?: string;
  sanitationVerified: boolean;
  
  // Deficiencies
  deficienciesFound: boolean;
  deficiencyList?: string[];
  correctiveActionTaken?: string;
  
  // Documentation
  photoEvidence?: MediaFile[];
  
  // Signatures
  driverSignature?: string;
  inspectorSignature?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface WinterSafetyChecklist {
  _id: string;
  checklistNumber: string;
  date: string;
  time?: string;
  location: string;
  performedBy: string;
  performedById?: string;
  
  // Vehicle/Area Inspected
  vehicleNumber?: string;
  areaInspected?: string;
  
  // Checklist Items
  snowIceRemoved: boolean;
  walkwaysCleared: boolean;
  saltApplied: boolean;
  tiresInspected: boolean;
  tireChainCondition?: 'good' | 'fair' | 'replacement-needed' | 'n/a';
  heatingSystemFunctional: boolean;
  defrostFunctional: boolean;
  wipersCondition: 'good' | 'fair' | 'replacement-needed';
  antifreezeLevels: 'adequate' | 'low' | 'empty';
  emergencyKitPresent: boolean;
  
  // Additional Items
  additionalItems?: {
    item: string;
    status: boolean;
    notes?: string;
  }[];
  
  // Hazards Identified
  hazardsIdentified: boolean;
  hazardDetails?: string;
  correctiveAction?: string;
  
  // Weather Conditions
  temperature?: number;
  weatherConditions?: string;
  
  // Signatures
  signature?: string;
  supervisorApproval?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface TireChainTrainingRecord {
  _id: string;
  trainingNumber: string;
  employeeId: string;
  employeeName: string;
  trainingDate: string;
  trainerId: string;
  trainerName: string;
  
  // Training Components
  theoryCompleted: boolean;
  practicalCompleted: boolean;
  assessmentPassed: boolean;
  assessmentScore?: number;
  
  // Competency Checklist
  competencyItems?: {
    skill: string;
    demonstrated: boolean;
    notes?: string;
  }[];
  
  // Certification
  certificationIssued: boolean;
  certificationNumber?: string;
  expiryDate?: string;
  
  // Documents
  certificateUrl?: string;
  trainingMaterials?: MediaFile[];
  
  // Signatures
  employeeSignature?: string;
  trainerSignature?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface FuelingSpillPreventionLog {
  _id: string;
  logNumber: string;
  date: string;
  time: string;
  location: string;
  performedBy: string;
  performedById?: string;
  vehicleNumber?: string;
  
  // Pre-Fueling Checklist
  vehicleParked: boolean;
  engineOff: boolean;
  parkingBrakeSet: boolean;
  spillKitPresent: boolean;
  areaInspected: boolean;
  
  // Fueling Process
  fuelType: 'diesel' | 'gasoline' | 'DEF' | 'propane' | 'natural-gas';
  quantityDispensed?: number;
  nozzleSecured: boolean;
  overflowPrevented: boolean;
  
  // Spill Incident
  spillOccurred: boolean;
  spillDetails?: {
    quantity: number;
    causeOfSpill: string;
    responseActions: string;
    cleanupMethod: string;
    disposalMethod: string;
    reportFiled: boolean;
    incidentNumber?: string;
  };
  
  // DEF Handling (if applicable)
  defHandling?: {
    containerClean: boolean;
    noCrossFuelContamination: boolean;
    properStorage: boolean;
  };
  
  // Post-Fueling
  capsSecured: boolean;
  noLeaksDetected: boolean;
  areaClean: boolean;
  
  // Signatures
  signature?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface DangerousGoodsLog {
  _id: string;
  logNumber: string;
  date: string;
  time: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  trailerNumber?: string;
  
  // Shipment Details
  shippingDocument: string;
  unNumber: string;
  properShippingName: string;
  class: string;
  packingGroup?: string;
  quantity: string;
  
  // Placarding
  placardingRequired: boolean;
  placardingComplete: boolean;
  placardsInspected: boolean;
  
  // Documentation
  emergencyResponseInfo: boolean;
  tdgCertificateCurrent: boolean;
  securityPlan?: boolean;
  
  // Incident/Spill
  incidentOccurred: boolean;
  incidentDetails?: {
    type: 'spill' | 'leak' | 'release' | 'accident' | 'theft' | 'other';
    description: string;
    quantity: string;
    location: string;
    timeOfIncident: string;
    emergencyResponseCalled: boolean;
    containmentActions: string;
    canutecCalled: boolean;
    canutecNumber?: string;
    reportFiled: boolean;
    incidentReportNumber?: string;
  };
  
  // Compliance
  segregationCorrect: boolean;
  packagingIntact: boolean;
  labelsLegible: boolean;
  
  // Photos
  photoEvidence?: MediaFile[];
  
  // Signatures
  driverSignature?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}

// ==================== SAFETY INSPECTIONS ====================

export interface Inspection {
  _id: string;
  inspectionNumber: string;
  date: string;
  time?: string;
  type: 'Yard Inspection' | 'Shop Safety' | 'Fire Extinguisher' | 'PPE' | 'Emergency Exit' | 'Eyewash Station' | 'Trailer Cleanliness' | 'Office Ergonomics' | 'Custom';
  inspector: string;
  inspectorId?: string;
  inspectorRole?: string;
  location: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  
  // Results
  findings: number;
  hazards: number;
  passStatus?: 'pass' | 'pass-with-conditions' | 'fail';
  overallScore?: number;
  
  // Checklist
  checklistItems?: {
    item: string;
    category?: string;
    status: 'pass' | 'fail' | 'n/a';
    notes?: string;
    photoUrl?: string;
  }[];
  
  // Issues Found
  issuesIdentified?: {
    description: string;
    severity: SeverityType;
    immediateAction: string;
    capaRequired: boolean;
    capaId?: string;
    photoEvidence?: MediaFile[];
  }[];
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  followUpCompletedBy?: string;
  
  // Documentation
  attachments?: MediaFile[];
  reportUrl?: string;
  
  // Signatures
  inspectorSignature?: string;
  managerSignature?: string;
  
  // Schedule
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  nextScheduledDate?: string;
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
  completedDate?: string;
}

// ==================== COMPLIANCE RECORDS ====================

export interface ComplianceDocument {
  _id: string;
  docId: string;
  title: string;
  type: 'Safety Meeting' | 'Toolbox Talk' | 'Safety Bulletin' | 'Investigation' | 'Policy' | 'Inspection' | 'Training Record' | 'First Aid Record' | 'Audit Report' | 'Other';
  category?: string;
  date: string;
  requiredRetention: '24 months' | 'Permanent' | '5 years' | '7 years' | 'Other';
  retentionEndDate?: string;
  status: 'Active' | 'Archived' | 'Expired' | 'Under Review';
  fileUrl: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'IMAGE' | 'OTHER';
  fileSize?: number;
  
  // Metadata
  relatedTo?: string; // Link to incident, training, etc.
  relatedToType?: string;
  tags?: string[];
  description?: string;
  
  // Access Control
  confidentialityLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  accessibleTo?: string[];
  
  // Version Control
  version?: string;
  previousVersions?: string[];
  
  // Audit
  uploadedBy: string;
  uploadedDate: string;
  lastAccessed?: string;
  accessCount?: number;
  archivedBy?: string;
  archivedDate?: string;
}

// ==================== REPORTS & ANALYTICS ====================

export interface Report {
  _id: string;
  reportId: string;
  title: string;
  type: 'Incident Summary' | 'Training Compliance' | 'CAPA Status' | 'Policy Acknowledgment' | 'Inspection Results' | 'WCB Summary' | 'Custom';
  category: 'Compliance' | 'Safety' | 'Operations' | 'HR' | 'Financial';
  
  // Parameters
  dateFrom: string;
  dateTo: string;
  departments?: string[];
  locations?: string[];
  filters?: Record<string, any>;
  
  // Results
  generatedDate: string;
  generatedBy: string;
  fileUrl?: string;
  fileType?: 'PDF' | 'EXCEL' | 'CSV';
  
  // Schedule
  isScheduled?: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  scheduledRecipients?: string[];
  
  // Status
  status: 'draft' | 'final' | 'archived';
  
  // Audit
  createdAt?: string;
  updatedAt?: string;
}