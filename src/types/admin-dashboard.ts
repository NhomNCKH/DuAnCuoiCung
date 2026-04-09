export interface AdminDashboardCountBucket {
  key: string;
  count: number;
}

export interface AdminDashboardPartCoverage {
  part: string;
  groupCount: number;
  questionCount: number;
}

export interface AdminDashboardRecentUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AdminDashboardRecentCredential {
  id: string;
  serialNumber: string;
  status: string;
  issuedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminDashboardRecentAttempt {
  id: string;
  attemptNo: number;
  status: string;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  startedAt: string;
  submittedAt?: string | null;
  durationSec?: number | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  template: {
    id: string;
    name: string;
    mode: string;
  } | null;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  activeUsers: number;
  totalTemplates: number;
  publishedTemplates: number;
  totalQuestionGroups: number;
  publishedQuestionGroups: number;
  totalQuestions: number;
  totalCredentials: number;
  issuedCredentials: number;
  totalAttempts: number;
  gradedAttempts: number;
  inProgressAttempts: number;
  averageTotalScore: number;
}

export interface AdminDashboardActivity {
  newUsersLast7Days: number;
  attemptsLast7Days: number;
  credentialsLast30Days: number;
}

export interface AdminDashboardData {
  latestUpdatedAt: string;
  summary: AdminDashboardSummary;
  activity: AdminDashboardActivity;
  templateModes: AdminDashboardCountBucket[];
  attemptStatuses: AdminDashboardCountBucket[];
  questionCoverage: AdminDashboardPartCoverage[];
  recentUsers: AdminDashboardRecentUser[];
  recentCredentials: AdminDashboardRecentCredential[];
  recentAttempts: AdminDashboardRecentAttempt[];
}
