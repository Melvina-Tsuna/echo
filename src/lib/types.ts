export type Role = "parent" | "teacher" | "school" | "structure";
export type Scope = "class" | "school" | "national";
export type Category =
  | "devoir"
  | "examen"
  | "reunion"
  | "bourse"
  | "urgence"
  | "info";

export interface School {
  id: string;
  name: string;
  city: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  school_id: string | null;
  class_id: string | null;
}

export interface Child {
  id: string;
  parent_id: string;
  full_name: string;
  school_id: string | null;
  class_id: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  scope: Scope;
  school_id: string | null;
  class_id: string | null;
  category: Category;
  title: string;
  body: string;
  audio_url: string | null;
  created_at: string;
}

export interface EcosystemLink {
  id: string;
  category: string;
  name: string;
  description: string;
  url: string;
  sort_order: number;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
  recorded_by: string;
}

export interface Grade {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  score: number;
  max_score: number;
  evaluated_at: string;
}

export type AlertType = "absenteisme" | "chute_notes";

export interface Alert {
  id: string;
  student_id: string;
  class_id: string;
  type: AlertType;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
  acknowledged: boolean;
}

export const ALERT_LABELS: Record<AlertType, { label: string; icon: string }> = {
  absenteisme: { label: "Absentéisme", icon: "📉" },
  chute_notes: { label: "Chute de notes", icon: "⚠️" },
};

export const CATEGORY_LABELS: Record<Category, { label: string; icon: string }> = {
  devoir: { label: "Devoir", icon: "📘" },
  examen: { label: "Examen", icon: "📝" },
  reunion: { label: "Réunion", icon: "👥" },
  bourse: { label: "Bourse", icon: "🎓" },
  urgence: { label: "Urgent", icon: "🚨" },
  info: { label: "Information", icon: "ℹ️" },
};

export const SCOPE_LABELS: Record<Scope, string> = {
  class: "Ma classe",
  school: "Toute l'école",
  national: "National / régional",
};

export const ROLE_LABELS: Record<Role, string> = {
  parent: "Parent / Élève",
  teacher: "Enseignant",
  school: "École",
  structure: "Structure (ministère, ONG)",
};
