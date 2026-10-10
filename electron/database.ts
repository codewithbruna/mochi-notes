import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import type {
  AppData,
  AppSettings,
  Attachment,
  AuthStatus,
  Category,
  ChecklistItem,
  CredentialsInput,
  LocalUser,
  CreateChecklistInput,
  NewCategoryInput,
  Note,
  SignUpInput,
  SpreadsheetFile,
  UpdateProfileInput,
  UpdateCategoryInput,
  UpdateChecklistInput,
  UpdateNoteInput
} from "../src/types";

const defaultSettings: AppSettings = {
  theme: "light",
  accent: "pink",
  customAccent: undefined,
  sidebarCollapsed: false,
  showMascot: true
};

const starterCategories = [
  { name: "General", color: "#f4a7c8" },
  { name: "Work", color: "#9edec2" },
  { name: "Ideas", color: "#f7d981" }
];

const now = () => new Date().toISOString();

interface DbNote {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  favorite: number;
  is_quick: number;
  created_at: string;
  updated_at: string;
}

interface DbCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface DbChecklistItem {
  id: string;
  note_id: string;
  text: string;
  completed: number;
  position: number;
}

interface DbAttachment {
  id: string;
  note_id: string;
  name: string;
  path: string;
  type: string;
  created_at: string;
}

interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_path: string | null;
  created_at: string;
}

interface DbSpreadsheet {
  id: string;
  name: string;
  path: string;
  type: "xlsx" | "csv";
  created_at: string;
}

export class MochiDatabase {
  private db: Database.Database;

  constructor(private appDataPath: string) {
    fs.mkdirSync(appDataPath, { recursive: true });
    this.db = new Database(path.join(appDataPath, "mochi-notes.sqlite"));
    this.db.pragma("journal_mode = WAL");
    this.migrate();
    this.seed();
  }

  get attachmentsPath() {
    const dir = path.join(this.appDataPath, "attachments");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  get spreadsheetsPath() {
    const dir = path.join(this.appDataPath, "spreadsheets");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getAppData(): AppData {
    return {
      notes: this.getNotes(),
      categories: this.getCategories(),
      spreadsheets: this.getSpreadsheets(),
      settings: this.getSettings()
    };
  }

  getAuthStatus(): AuthStatus {
    const session = this.db.prepare("SELECT value FROM settings WHERE key = 'session_user_id'").get() as { value: string } | undefined;
    if (!session) return { authenticated: false, user: null };
    const user = this.findUserById(session.value);
    if (!user) {
      this.db.prepare("DELETE FROM settings WHERE key = 'session_user_id'").run();
      return { authenticated: false, user: null };
    }
    return { authenticated: true, user };
  }

  signUp(input: SignUpInput): AuthStatus {
    const name = input.name.trim();
    const email = this.normalizeEmail(input.email);
    this.validateCredentials(name, email, input.password);
    const exists = this.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (exists) throw new Error("Já existe uma conta com este e-mail.");
    const id = randomUUID();
    this.db.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, email, this.hashPassword(input.password), now());
    this.setSession(id);
    return this.getAuthStatus();
  }

  signIn(input: CredentialsInput): AuthStatus {
    const email = this.normalizeEmail(input.email);
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as DbUser | undefined;
    if (!row || !this.verifyPassword(input.password, row.password_hash)) {
      throw new Error("E-mail ou senha incorretos.");
    }
    this.setSession(row.id);
    return this.getAuthStatus();
  }

  signOut(): AuthStatus {
    this.db.prepare("DELETE FROM settings WHERE key = 'session_user_id'").run();
    return { authenticated: false, user: null };
  }

  updateProfile(input: UpdateProfileInput): AuthStatus {
    const status = this.getAuthStatus();
    if (!status.user) throw new Error("Sessão não encontrada.");
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Informe um nome com pelo menos 2 caracteres.");
    this.db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, status.user.id);
    return this.getAuthStatus();
  }

  updateProfilePhoto(sourcePath: string): AuthStatus {
    const status = this.getAuthStatus();
    if (!status.user) throw new Error("Sessão não encontrada.");
    const extension = path.extname(sourcePath).toLowerCase() || ".png";
    const profileDir = path.join(this.appDataPath, "profile");
    fs.mkdirSync(profileDir, { recursive: true });
    const destination = path.join(profileDir, `${status.user.id}${extension}`);
    fs.copyFileSync(sourcePath, destination);
    this.db.prepare("UPDATE users SET avatar_path = ? WHERE id = ?").run(destination, status.user.id);
    return this.getAuthStatus();
  }

  createNote(): Note {
    return this.createNoteOfType(false);
  }

  createQuickNote(): Note {
    return this.createNoteOfType(true);
  }

  createSpreadsheet(name: string): SpreadsheetFile {
    const title = name.trim() || "Nova planilha";
    const id = randomUUID();
    const fileName = `${title.replace(/[\\/:*?\"<>|]/g, "-").slice(0, 60) || "Nova planilha"}.xlsx`;
    const filePath = path.join(this.spreadsheetsPath, `${id}-${fileName}`);
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["Item", "Descrição", "Valor", "Data"]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Planilha 1");
    XLSX.writeFile(workbook, filePath);
    this.db.prepare("INSERT INTO spreadsheets (id, name, path, type, created_at) VALUES (?, ?, ?, ?, ?)").run(id, title, filePath, "xlsx", now());
    return this.getSpreadsheet(id);
  }

  importSpreadsheet(sourcePath: string): SpreadsheetFile {
    const id = randomUUID();
    const extension = path.extname(sourcePath).replace(".", "").toLowerCase();
    if (extension !== "xlsx" && extension !== "csv") throw new Error("Formato de planilha não suportado.");
    const name = path.basename(sourcePath, path.extname(sourcePath));
    const filePath = path.join(this.spreadsheetsPath, `${id}-${path.basename(sourcePath).replace(/[^\w.\- ]/g, "_")}`);
    fs.copyFileSync(sourcePath, filePath);
    this.db.prepare("INSERT INTO spreadsheets (id, name, path, type, created_at) VALUES (?, ?, ?, ?, ?)").run(id, name, filePath, extension, now());
    return this.getSpreadsheet(id);
  }

  private createNoteOfType(quick: boolean): Note {
    const id = randomUUID();
    const timestamp = now();
    const category = this.db.prepare("SELECT id FROM categories ORDER BY created_at LIMIT 1").get() as { id: string } | undefined;
    this.db
      .prepare(
        "INSERT INTO notes (id, title, content, category_id, favorite, is_quick, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(id, quick ? "Quick note" : "Untitled note", "", category?.id ?? null, 0, quick ? 1 : 0, timestamp, timestamp);
    return this.getNote(id);
  }

  updateNote(input: UpdateNoteInput): Note {
    const current = this.getNote(input.id);
    const next = {
      title: input.title ?? current.title,
      content: input.content ?? current.content,
      categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
      favorite: input.favorite === undefined ? current.favorite : input.favorite
    };
    this.db
      .prepare("UPDATE notes SET title = ?, content = ?, category_id = ?, favorite = ?, updated_at = ? WHERE id = ?")
      .run(next.title, next.content, next.categoryId, next.favorite ? 1 : 0, now(), input.id);
    return this.getNote(input.id);
  }

  deleteNote(id: string): void {
    const attachments = this.getAttachments(id);
    this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    attachments.forEach((attachment) => this.removeFileQuietly(attachment.path));
  }

  createCategory(input: NewCategoryInput): Category {
    const id = randomUUID();
    this.db.prepare("INSERT INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)").run(id, input.name, input.color, now());
    return this.getCategory(id);
  }

  updateCategory(input: UpdateCategoryInput): Category {
    this.db.prepare("UPDATE categories SET name = ?, color = ? WHERE id = ?").run(input.name, input.color, input.id);
    return this.getCategory(input.id);
  }

  deleteCategory(id: string): void {
    const fallback = this.db.prepare("SELECT id FROM categories WHERE id != ? ORDER BY created_at LIMIT 1").get(id) as { id: string } | undefined;
    this.db.prepare("UPDATE notes SET category_id = ?, updated_at = ? WHERE category_id = ?").run(fallback?.id ?? null, now(), id);
    this.db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  }

  createChecklistItem(input: CreateChecklistInput): ChecklistItem {
    const id = randomUUID();
    const positionRow = this.db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM checklist_items WHERE note_id = ?").get(input.noteId) as { position: number };
    this.db
      .prepare("INSERT INTO checklist_items (id, note_id, text, completed, position) VALUES (?, ?, ?, ?, ?)")
      .run(id, input.noteId, input.text, 0, positionRow.position);
    this.touchNote(input.noteId);
    return this.getChecklistItem(id);
  }

  updateChecklistItem(input: UpdateChecklistInput): ChecklistItem {
    const current = this.getChecklistItem(input.id);
    const text = input.text ?? current.text;
    const completed = input.completed === undefined ? current.completed : input.completed;
    this.db.prepare("UPDATE checklist_items SET text = ?, completed = ? WHERE id = ?").run(text, completed ? 1 : 0, input.id);
    this.touchNote(current.noteId);
    return this.getChecklistItem(input.id);
  }

  deleteChecklistItem(id: string): void {
    const current = this.getChecklistItem(id);
    this.db.prepare("DELETE FROM checklist_items WHERE id = ?").run(id);
    this.touchNote(current.noteId);
  }

  addAttachment(noteId: string, sourcePath: string): Attachment {
    const id = randomUUID();
    const name = path.basename(sourcePath);
    const type = path.extname(sourcePath).replace(".", "").toLowerCase() || "file";
    const safeName = `${id}-${name.replace(/[^\w.\- ]/g, "_")}`;
    const destination = path.join(this.attachmentsPath, safeName);
    fs.copyFileSync(sourcePath, destination);
    this.db
      .prepare("INSERT INTO attachments (id, note_id, name, path, type, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, noteId, name, destination, type, now());
    this.touchNote(noteId);
    return this.getAttachment(id);
  }

  deleteAttachment(id: string): void {
    const attachment = this.getAttachment(id);
    this.db.prepare("DELETE FROM attachments WHERE id = ?").run(id);
    this.touchNote(attachment.noteId);
    this.removeFileQuietly(attachment.path);
  }

  getAttachment(id: string): Attachment {
    const row = this.db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as DbAttachment | undefined;
    if (!row) throw new Error("Attachment not found");
    return this.mapAttachment(row);
  }

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const next: AppSettings = { ...current, ...settings };
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('app', ?)").run(JSON.stringify(next));
    return next;
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id TEXT,
        favorite INTEGER NOT NULL DEFAULT 0,
        is_quick INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar_path TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS spreadsheets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    const noteColumns = this.db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
    if (!noteColumns.some((column) => column.name === "is_quick")) {
      this.db.exec("ALTER TABLE notes ADD COLUMN is_quick INTEGER NOT NULL DEFAULT 0");
    }
    const userColumns = this.db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!userColumns.some((column) => column.name === "avatar_path")) {
      this.db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT");
    }
  }

  private seed(): void {
    const categoryCount = this.db.prepare("SELECT COUNT(*) AS count FROM categories").get() as { count: number };
    if (categoryCount.count === 0) {
      const stmt = this.db.prepare("INSERT INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)");
      starterCategories.forEach((category) => stmt.run(randomUUID(), category.name, category.color, now()));
    }
    const settings = this.db.prepare("SELECT value FROM settings WHERE key = 'app'").get() as { value: string } | undefined;
    if (!settings) {
      this.updateSettings(defaultSettings);
    }
  }

  private getNotes(): Note[] {
    const rows = this.db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as DbNote[];
    return rows.map((row) => this.mapNote(row));
  }

  private getNote(id: string): Note {
    const row = this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as DbNote | undefined;
    if (!row) throw new Error("Note not found");
    return this.mapNote(row);
  }

  private getCategories(): Category[] {
    const rows = this.db.prepare("SELECT * FROM categories ORDER BY created_at ASC").all() as DbCategory[];
    return rows.map((row) => ({ id: row.id, name: row.name, color: row.color, createdAt: row.created_at }));
  }

  getSpreadsheet(id: string): SpreadsheetFile {
    const row = this.db.prepare("SELECT * FROM spreadsheets WHERE id = ?").get(id) as DbSpreadsheet | undefined;
    if (!row) throw new Error("Planilha não encontrada.");
    return { id: row.id, name: row.name, path: row.path, type: row.type, createdAt: row.created_at };
  }

  private getSpreadsheets(): SpreadsheetFile[] {
    const rows = this.db.prepare("SELECT * FROM spreadsheets ORDER BY created_at DESC").all() as DbSpreadsheet[];
    return rows.map((row) => ({ id: row.id, name: row.name, path: row.path, type: row.type, createdAt: row.created_at }));
  }

  private getCategory(id: string): Category {
    const row = this.db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as DbCategory | undefined;
    if (!row) throw new Error("Category not found");
    return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
  }

  private getChecklist(noteId: string): ChecklistItem[] {
    const rows = this.db.prepare("SELECT * FROM checklist_items WHERE note_id = ? ORDER BY position ASC").all(noteId) as DbChecklistItem[];
    return rows.map((row) => this.mapChecklistItem(row));
  }

  private getChecklistItem(id: string): ChecklistItem {
    const row = this.db.prepare("SELECT * FROM checklist_items WHERE id = ?").get(id) as DbChecklistItem | undefined;
    if (!row) throw new Error("Checklist item not found");
    return this.mapChecklistItem(row);
  }

  private getAttachments(noteId: string): Attachment[] {
    const rows = this.db.prepare("SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at DESC").all(noteId) as DbAttachment[];
    return rows.map((row) => this.mapAttachment(row));
  }

  private getSettings(): AppSettings {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'app'").get() as { value: string } | undefined;
    if (!row) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(row.value) } as AppSettings;
  }

  private findUserById(id: string): LocalUser | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
    return row ? { id: row.id, name: row.name, email: row.email, avatarData: this.readAvatarData(row.avatar_path), createdAt: row.created_at } : null;
  }

  private readAvatarData(filePath: string | null): string | null {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const extension = path.extname(filePath).replace(".", "").toLowerCase() || "png";
    const mime = extension === "jpg" ? "jpeg" : extension;
    return `data:image/${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
  }

  private setSession(userId: string): void {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('session_user_id', ?)").run(userId);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validateCredentials(name: string, email: string, password: string): void {
    if (name.length < 2) throw new Error("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Informe um e-mail válido.");
    if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, savedHash] = stored.split(":");
    if (!salt || !savedHash) return false;
    const computed = scryptSync(password, salt, 64);
    const saved = Buffer.from(savedHash, "hex");
    return saved.length === computed.length && timingSafeEqual(saved, computed);
  }

  private mapNote(row: DbNote): Note {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      categoryId: row.category_id,
      favorite: Boolean(row.favorite),
      quick: Boolean(row.is_quick),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      checklist: this.getChecklist(row.id),
      attachments: this.getAttachments(row.id)
    };
  }

  private mapChecklistItem(row: DbChecklistItem): ChecklistItem {
    return {
      id: row.id,
      noteId: row.note_id,
      text: row.text,
      completed: Boolean(row.completed),
      position: row.position
    };
  }

  private mapAttachment(row: DbAttachment): Attachment {
    return {
      id: row.id,
      noteId: row.note_id,
      name: row.name,
      path: row.path,
      type: row.type,
      createdAt: row.created_at
    };
  }

  private touchNote(noteId: string): void {
    this.db.prepare("UPDATE notes SET updated_at = ? WHERE id = ?").run(now(), noteId);
  }

  private removeFileQuietly(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Attachment records should still be removable if the file is already gone.
    }
  }
}
