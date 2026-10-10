export type ThemeMode = "light" | "dark";
export type AccentColor = "pink" | "lilac" | "peach" | "mint";
export type ViewMode = "notes" | "tasks" | "favorites" | "category";
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
    createdAt: string;
    updatedAt: string;
    checklist: ChecklistItem[];
    attachments: Attachment[];
}
export interface AppSettings {
    theme: ThemeMode;
    accent: AccentColor;
    sidebarCollapsed: boolean;
}
export interface AppData {
    notes: Note[];
    categories: Category[];
    settings: AppSettings;
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
    getAppData: () => Promise<AppData>;
    createNote: () => Promise<Note>;
    updateNote: (input: UpdateNoteInput) => Promise<Note>;
    deleteNote: (id: string) => Promise<{
        ok: true;
    }>;
    createCategory: (input: NewCategoryInput) => Promise<Category>;
    updateCategory: (input: UpdateCategoryInput) => Promise<Category>;
    deleteCategory: (id: string) => Promise<{
        ok: true;
    }>;
    createChecklistItem: (input: CreateChecklistInput) => Promise<ChecklistItem>;
    updateChecklistItem: (input: UpdateChecklistInput) => Promise<ChecklistItem>;
    deleteChecklistItem: (id: string) => Promise<{
        ok: true;
    }>;
    addAttachment: (noteId: string) => Promise<Attachment | null>;
    deleteAttachment: (id: string) => Promise<{
        ok: true;
    }>;
    openAttachment: (id: string) => Promise<{
        ok: true;
    }>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}
