export type ThemeMode = "light" | "dark";
export type AccentColor = "pink" | "lilac" | "peach" | "mint" | "aurora";
export type ViewMode = "notes" | "quick" | "tasks" | "favorites" | "category" | "insights" | "spreadsheets";

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  noteId: string;
  text: string;
  completed: boolean;
  position: number;
}

export interface Attachment {
  id: string;
  noteId: string;
  name: string;
  path: string;
  type: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  favorite: boolean;
  quick: boolean;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistItem[];
  attachments: Attachment[];
}

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentColor;
  customAccent?: string;
  sidebarCollapsed: boolean;
  showMascot: boolean;
}

export interface AppData {
  notes: Note[];
  categories: Category[];
  spreadsheets: SpreadsheetFile[];
  settings: AppSettings;
}

export interface SpreadsheetFile {
  id: string;
  name: string;
  path: string;
  type: "xlsx" | "csv";
  createdAt: string;
}

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  avatarData: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  name: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: LocalUser | null;
}

export interface CredentialsInput {
  email: string;
  password: string;
}

export interface SignUpInput extends CredentialsInput {
  name: string;
}

export interface NewCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  color: string;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  categoryId?: string | null;
  favorite?: boolean;
}

export interface CreateChecklistInput {
  noteId: string;
  text: string;
}

export interface UpdateChecklistInput {
  id: string;
  text?: string;
  completed?: boolean;
}

export interface MochiApi {
  getAuthStatus: () => Promise<AuthStatus>;
  signUp: (input: SignUpInput) => Promise<AuthStatus>;
  signIn: (input: CredentialsInput) => Promise<AuthStatus>;
  signOut: () => Promise<AuthStatus>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthStatus>;
  chooseProfilePhoto: () => Promise<AuthStatus>;
  getAppData: () => Promise<AppData>;
  createNote: () => Promise<Note>;
  createQuickNote: () => Promise<Note>;
  createSpreadsheet: (name: string) => Promise<SpreadsheetFile>;
  importSpreadsheet: () => Promise<SpreadsheetFile | null>;
  openSpreadsheet: (id: string) => Promise<{ ok: true }>;
  updateNote: (input: UpdateNoteInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<{ ok: true }>;
  createCategory: (input: NewCategoryInput) => Promise<Category>;
  updateCategory: (input: UpdateCategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<{ ok: true }>;
  createChecklistItem: (input: CreateChecklistInput) => Promise<ChecklistItem>;
  updateChecklistItem: (input: UpdateChecklistInput) => Promise<ChecklistItem>;
  deleteChecklistItem: (id: string) => Promise<{ ok: true }>;
  addAttachment: (noteId: string) => Promise<Attachment | null>;
  deleteAttachment: (id: string) => Promise<{ ok: true }>;
  openAttachment: (id: string) => Promise<{ ok: true }>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}
