export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "pink" | "lilac" | "peach" | "mint" | "aurora";
export type PaletteName = "aurora" | "lavender" | "mint" | "autumn" | "minimal";
export type NotesViewMode = "split" | "library" | "focus";

export interface ThemeCustomization {
  appBackground?: string;
  headerBackground?: string;
  sidebarBackground?: string;
  surfacePrimary?: string;
  accent?: string;
}
export type ViewMode = "notes" | "quick" | "tasks" | "favorites" | "category" | "insights" | "spreadsheets" | "settings" | "trash" | "archived";

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  noteId: string;
  text: string;
  description: string;
  priority: TaskPriority;
  dueAt: string | null;
  completed: boolean;
  position: number;
}

export type TaskPriority = "low" | "medium" | "high";

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
  folderId: string | null;
  favorite: boolean;
  quick: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  archivedAt: string | null;
  tags: Tag[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
}

export interface NoteRevision {
  id: string;
  noteId: string;
  title: string;
  content: string;
  categoryId: string | null;
  favorite: boolean;
  quick: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  palette: PaletteName;
  accent: AccentColor;
  notesView: NotesViewMode;
  customAccent?: string;
  customPalette?: ThemeCustomization;
  sidebarCollapsed: boolean;
  showMascot: boolean;
}

export interface AppData {
  notes: Note[];
  trash: Note[];
  archived: Note[];
  categories: Category[];
  folders: Folder[];
  tags: Tag[];
  spreadsheets: SpreadsheetFile[];
  settings: AppSettings;
}

export interface SpreadsheetFile {
  id: string;
  name: string;
  path: string;
  type: "xlsx" | "csv";
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}

export interface UpdateSpreadsheetInput {
  id: string;
  name?: string;
  favorite?: boolean;
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
  folderId?: string | null;
  tagIds?: string[];
  favorite?: boolean;
}

export interface NewFolderInput {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput extends NewFolderInput {
  id: string;
}

export interface NewTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput extends NewTagInput {
  id: string;
}

export interface CreateChecklistInput {
  noteId: string;
  text: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
}

export interface UpdateChecklistInput {
  id: string;
  text?: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
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
  importSpreadsheetPath: (path: string) => Promise<SpreadsheetFile>;
  openSpreadsheet: (id: string) => Promise<{ ok: true }>;
  updateSpreadsheet: (input: UpdateSpreadsheetInput) => Promise<SpreadsheetFile>;
  duplicateSpreadsheet: (id: string) => Promise<SpreadsheetFile>;
  deleteSpreadsheet: (id: string) => Promise<{ ok: true }>;
  updateNote: (input: UpdateNoteInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<{ ok: true }>;
  restoreNote: (id: string) => Promise<Note>;
  archiveNote: (id: string) => Promise<Note>;
  restoreArchivedNote: (id: string) => Promise<Note>;
  permanentlyDeleteNote: (id: string) => Promise<{ ok: true }>;
  getNoteRevisions: (noteId: string) => Promise<NoteRevision[]>;
  restoreNoteRevision: (revisionId: string) => Promise<Note>;
  createCategory: (input: NewCategoryInput) => Promise<Category>;
  updateCategory: (input: UpdateCategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<{ ok: true }>;
  createFolder: (input: NewFolderInput) => Promise<Folder>;
  updateFolder: (input: UpdateFolderInput) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<{ ok: true }>;
  createTag: (input: NewTagInput) => Promise<Tag>;
  updateTag: (input: UpdateTagInput) => Promise<Tag>;
  deleteTag: (id: string) => Promise<{ ok: true }>;
  createChecklistItem: (input: CreateChecklistInput) => Promise<ChecklistItem>;
  updateChecklistItem: (input: UpdateChecklistInput) => Promise<ChecklistItem>;
  deleteChecklistItem: (id: string) => Promise<{ ok: true }>;
  addAttachment: (noteId: string) => Promise<Attachment | null>;
  deleteAttachment: (id: string) => Promise<{ ok: true }>;
  openAttachment: (id: string) => Promise<{ ok: true }>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}
