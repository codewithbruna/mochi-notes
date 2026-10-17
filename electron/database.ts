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
  NewFolderInput,
  NewTagInput,
  Note,
  NoteRevision,
  SignUpInput,
  SpreadsheetFile,
  UpdateProfileInput,
  UpdateCategoryInput,
  UpdateChecklistInput,
  UpdateFolderInput,
  UpdateNoteInput,
  UpdateTagInput
} from "../src/types";

const defaultSettings: AppSettings = {
  theme: "light",
  palette: "aurora",
  accent: "pink",
  notesView: "split",
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
const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

interface DbNote {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  folder_id: string | null;
  favorite: number;
  is_quick: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  archived_at: string | null;
}

interface DbNoteRevision {
  id: string;
  note_id: string;
  title: string;
  content: string;
  category_id: string | null;
  favorite: number;
  is_quick: number;
  created_at: string;
}

interface DbCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface DbFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface DbTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface DbChecklistItem {
  id: string;
  note_id: string;
  text: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_at: string | null;
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
  updated_at: string;
  favorite: number;
}

export class MochiDatabase {
  private db: Database.Database;
  private databasePath: string;
  private existingDatabase: boolean;

  constructor(private appDataPath: string) {
    fs.mkdirSync(appDataPath, { recursive: true });
    this.databasePath = path.join(appDataPath, "mochi-notes.sqlite");
    this.existingDatabase = fs.existsSync(this.databasePath);
    this.db = new Database(this.databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
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
      trash: this.getDeletedNotes(),
      archived: this.getArchivedNotes(),
      categories: this.getCategories(),
      folders: this.getFolders(),
      tags: this.getTags(),
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
    const timestamp = now();
    this.db.prepare("INSERT INTO spreadsheets (id, name, path, type, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, title, filePath, "xlsx", 0, timestamp, timestamp);
    return this.getSpreadsheet(id);
  }

  importSpreadsheet(sourcePath: string): SpreadsheetFile {
    const id = randomUUID();
    const extension = path.extname(sourcePath).replace(".", "").toLowerCase();
    if (extension !== "xlsx" && extension !== "csv") throw new Error("Formato de planilha não suportado.");
    const name = path.basename(sourcePath, path.extname(sourcePath));
    const filePath = path.join(this.spreadsheetsPath, `${id}-${path.basename(sourcePath).replace(/[^\w.\- ]/g, "_")}`);
    fs.copyFileSync(sourcePath, filePath);
    const timestamp = now();
    this.db.prepare("INSERT INTO spreadsheets (id, name, path, type, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, name, filePath, extension, 0, timestamp, timestamp);
    return this.getSpreadsheet(id);
  }

  updateSpreadsheet(input: { id: string; name?: string; favorite?: boolean }): SpreadsheetFile {
    const current = this.getSpreadsheet(input.id);
    const name = input.name === undefined ? current.name : input.name.trim() || current.name;
    const favorite = input.favorite === undefined ? current.favorite : input.favorite;
    this.db.prepare("UPDATE spreadsheets SET name = ?, favorite = ?, updated_at = ? WHERE id = ?").run(name, favorite ? 1 : 0, now(), input.id);
    return this.getSpreadsheet(input.id);
  }

  duplicateSpreadsheet(id: string): SpreadsheetFile {
    const source = this.getSpreadsheet(id);
    const newId = randomUUID();
    const extension = path.extname(source.path) || `.${source.type}`;
    const title = `${source.name} (cópia)`;
    const destination = path.join(this.spreadsheetsPath, `${newId}-${title.replace(/[^\w.\- ]/g, "_").slice(0, 60)}${extension}`);
    fs.copyFileSync(source.path, destination);
    const timestamp = now();
    this.db.prepare("INSERT INTO spreadsheets (id, name, path, type, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(newId, title, destination, source.type, 0, timestamp, timestamp);
    return this.getSpreadsheet(newId);
  }

  deleteSpreadsheet(id: string): void {
    const spreadsheet = this.getSpreadsheet(id);
    if (fs.existsSync(spreadsheet.path)) fs.unlinkSync(spreadsheet.path);
    this.db.prepare("DELETE FROM spreadsheets WHERE id = ?").run(id);
  }

  openSpreadsheet(id: string): SpreadsheetFile {
    const spreadsheet = this.getSpreadsheet(id);
    this.db.prepare("UPDATE spreadsheets SET updated_at = ? WHERE id = ?").run(now(), id);
    return this.getSpreadsheet(id);
  }

  private createNoteOfType(quick: boolean): Note {
    const id = randomUUID();
    const timestamp = now();
    const category = this.db.prepare("SELECT id FROM categories ORDER BY created_at LIMIT 1").get() as { id: string } | undefined;
    this.db
      .prepare(
        "INSERT INTO notes (id, title, content, category_id, folder_id, favorite, is_quick, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(id, quick ? "Nota rápida" : "Sem título", "", category?.id ?? null, category?.id ?? null, 0, quick ? 1 : 0, timestamp, timestamp);
    return this.getNote(id);
  }

  updateNote(input: UpdateNoteInput): Note {
    const current = this.getNote(input.id);
    if (current.deletedAt) throw new Error("Esta nota está na Lixeira.");
    const next = {
      title: input.title ?? current.title,
      content: input.content ?? current.content,
      categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
      folderId: input.folderId === undefined ? current.folderId : input.folderId,
      favorite: input.favorite === undefined ? current.favorite : input.favorite
    };
    const changed = next.title !== current.title || next.content !== current.content || next.categoryId !== current.categoryId || next.folderId !== current.folderId || next.favorite !== current.favorite;
    if (changed) this.createRevision(current);
    this.db.transaction(() => {
      this.db
        .prepare("UPDATE notes SET title = ?, content = ?, category_id = ?, folder_id = ?, favorite = ?, updated_at = ? WHERE id = ?")
        .run(next.title, next.content, next.categoryId, next.folderId, next.favorite ? 1 : 0, now(), input.id);
      if (input.tagIds !== undefined) {
        const tagIds = [...new Set(input.tagIds)];
        tagIds.forEach((tagId) => this.getTag(tagId));
        this.db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(input.id);
        const insert = this.db.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)");
        tagIds.forEach((tagId) => insert.run(input.id, tagId));
      }
    })();
    return this.getNote(input.id);
  }

  deleteNote(id: string): void {
    const current = this.getNote(id);
    if (current.deletedAt) return;
    this.createRevision(current);
    this.db.prepare("UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now(), now(), id);
  }

  restoreNote(id: string): Note {
    const current = this.getNote(id);
    if (!current.deletedAt) return current;
    this.db.prepare("UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?").run(now(), id);
    return this.getNote(id);
  }

  archiveNote(id: string): Note {
    const current = this.getNote(id);
    if (current.deletedAt) throw new Error("Restaure a nota da Lixeira antes de arquivá-la.");
    if (!current.archivedAt) this.db.prepare("UPDATE notes SET archived_at = ?, updated_at = ? WHERE id = ?").run(now(), now(), id);
    return this.getNote(id);
  }

  restoreArchivedNote(id: string): Note {
    const current = this.getNote(id);
    if (!current.archivedAt) return current;
    this.db.prepare("UPDATE notes SET archived_at = NULL, updated_at = ? WHERE id = ?").run(now(), id);
    return this.getNote(id);
  }

  permanentlyDeleteNote(id: string): void {
    const current = this.getNote(id);
    if (!current.deletedAt) throw new Error("Mova a nota para a Lixeira antes de apagá-la definitivamente.");
    const attachments = this.getAttachments(id);
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM note_revisions WHERE note_id = ?").run(id);
      this.db.prepare("DELETE FROM checklist_items WHERE note_id = ?").run(id);
      this.db.prepare("DELETE FROM attachments WHERE note_id = ?").run(id);
      this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    })();
    attachments.forEach((attachment) => this.removeFileQuietly(attachment.path));
  }

  getNoteRevisions(noteId: string): NoteRevision[] {
    this.getNote(noteId);
    const rows = this.db.prepare("SELECT * FROM note_revisions WHERE note_id = ? ORDER BY created_at DESC").all(noteId) as DbNoteRevision[];
    return rows.map((row) => this.mapRevision(row));
  }

  restoreNoteRevision(revisionId: string): Note {
    const revision = this.db.prepare("SELECT * FROM note_revisions WHERE id = ?").get(revisionId) as DbNoteRevision | undefined;
    if (!revision) throw new Error("Versão não encontrada.");
    const current = this.getNote(revision.note_id);
    if (current.deletedAt) throw new Error("Restaure a nota antes de recuperar uma versão.");
    this.createRevision(current);
    this.db.prepare("UPDATE notes SET title = ?, content = ?, category_id = ?, favorite = ?, updated_at = ? WHERE id = ?")
      .run(revision.title, revision.content, revision.category_id, revision.favorite, now(), revision.note_id);
    return this.getNote(revision.note_id);
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

  createFolder(input: NewFolderInput) {
    const id = randomUUID();
    const name = input.name.trim();
    if (!name) throw new Error("Informe um nome para a pasta.");
    if (input.parentId) this.getFolder(input.parentId);
    this.db.prepare("INSERT INTO folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)").run(id, name, input.parentId ?? null, now());
    return this.getFolder(id);
  }

  updateFolder(input: UpdateFolderInput) {
    const current = this.getFolder(input.id);
    const name = input.name.trim();
    if (!name) throw new Error("Informe um nome para a pasta.");
    const parentId = input.parentId === undefined ? current.parentId : input.parentId;
    if (parentId === input.id) throw new Error("Uma pasta não pode ser filha dela mesma.");
    if (parentId) this.getFolder(parentId);
    this.db.prepare("UPDATE folders SET name = ?, parent_id = ? WHERE id = ?").run(name, parentId ?? null, input.id);
    return this.getFolder(input.id);
  }

  deleteFolder(id: string): void {
    this.getFolder(id);
    this.db.transaction(() => {
      this.db.prepare("UPDATE folders SET parent_id = NULL WHERE parent_id = ?").run(id);
      this.db.prepare("UPDATE notes SET folder_id = NULL, updated_at = ? WHERE folder_id = ?").run(now(), id);
      this.db.prepare("DELETE FROM folders WHERE id = ?").run(id);
    })();
  }

  createTag(input: NewTagInput) {
    const id = randomUUID();
    const name = input.name.trim();
    if (!name) throw new Error("Informe um nome para a etiqueta.");
    if (!isHexColor(input.color)) throw new Error("Escolha uma cor válida.");
    this.db.prepare("INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)").run(id, name, input.color, now());
    return this.getTag(id);
  }

  updateTag(input: UpdateTagInput) {
    const name = input.name.trim();
    if (!name) throw new Error("Informe um nome para a etiqueta.");
    if (!isHexColor(input.color)) throw new Error("Escolha uma cor válida.");
    this.db.prepare("UPDATE tags SET name = ?, color = ? WHERE id = ?").run(name, input.color, input.id);
    return this.getTag(input.id);
  }

  deleteTag(id: string): void {
    this.getTag(id);
    this.db.prepare("DELETE FROM tags WHERE id = ?").run(id);
  }

  createChecklistItem(input: CreateChecklistInput): ChecklistItem {
    const id = randomUUID();
    const positionRow = this.db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM checklist_items WHERE note_id = ?").get(input.noteId) as { position: number };
    this.db
      .prepare("INSERT INTO checklist_items (id, note_id, text, description, priority, due_at, completed, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, input.noteId, input.text, input.description?.trim() ?? "", input.priority ?? "medium", input.dueAt ?? null, 0, positionRow.position);
    this.touchNote(input.noteId);
    return this.getChecklistItem(id);
  }

  updateChecklistItem(input: UpdateChecklistInput): ChecklistItem {
    const current = this.getChecklistItem(input.id);
    const text = input.text ?? current.text;
    const description = input.description === undefined ? current.description : input.description.trim();
    const priority = input.priority ?? current.priority;
    const dueAt = input.dueAt === undefined ? current.dueAt : input.dueAt;
    const completed = input.completed === undefined ? current.completed : input.completed;
    this.db.prepare("UPDATE checklist_items SET text = ?, description = ?, priority = ?, due_at = ?, completed = ? WHERE id = ?").run(text, description, priority, dueAt, completed ? 1 : 0, input.id);
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
    if (settings.customAccent !== undefined) next.customAccent = isHexColor(settings.customAccent) ? settings.customAccent : undefined;
    if (settings.customPalette) {
      next.customPalette = Object.fromEntries(
        Object.entries(settings.customPalette).filter(([, value]) => isHexColor(value))
      );
    }
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

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
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
        folder_id TEXT,
        favorite INTEGER NOT NULL DEFAULT 0,
        is_quick INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        archived_at TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        text TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        due_at TEXT,
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

      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
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
        favorite INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const recoveryMigration = this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get("2026-10-recovery-v1");
    if (this.existingDatabase && !recoveryMigration) this.backupBeforeMigration();
    const noteColumns = this.db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
    if (!noteColumns.some((column) => column.name === "is_quick")) {
      this.db.exec("ALTER TABLE notes ADD COLUMN is_quick INTEGER NOT NULL DEFAULT 0");
    }
    const userColumns = this.db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!userColumns.some((column) => column.name === "avatar_path")) {
      this.db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT");
    }
    this.applyRecoveryMigration();
    this.applyTaskMetadataMigration();
    this.applyNotesOrganizationMigration();
    this.applySpreadsheetLibraryMigration();
  }

  private applyRecoveryMigration(): void {
    const migrationId = "2026-10-recovery-v1";
    const applied = this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(migrationId);
    if (applied) return;
    this.db.transaction(() => {
      const noteColumns = this.db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
      if (!noteColumns.some((column) => column.name === "deleted_at")) {
        this.db.exec("ALTER TABLE notes ADD COLUMN deleted_at TEXT");
      }
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS note_revisions (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category_id TEXT,
          favorite INTEGER NOT NULL,
          is_quick INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_note_revisions_note_created ON note_revisions(note_id, created_at DESC);
      `);
      this.db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(migrationId, now());
    })();
  }

  private applyTaskMetadataMigration(): void {
    const migrationId = "2026-10-task-metadata-v1";
    if (this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(migrationId)) return;
    this.db.transaction(() => {
      const columns = this.db.prepare("PRAGMA table_info(checklist_items)").all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === "description")) this.db.exec("ALTER TABLE checklist_items ADD COLUMN description TEXT NOT NULL DEFAULT ''");
      if (!columns.some((column) => column.name === "priority")) this.db.exec("ALTER TABLE checklist_items ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
      if (!columns.some((column) => column.name === "due_at")) this.db.exec("ALTER TABLE checklist_items ADD COLUMN due_at TEXT");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_checklist_items_due_at ON checklist_items(due_at)");
      this.db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(migrationId, now());
    })();
  }

  private applyNotesOrganizationMigration(): void {
    const migrationId = "2026-10-notes-organization-v1";
    if (this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(migrationId)) return;
    this.db.transaction(() => {
      const noteColumns = this.db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
      if (!noteColumns.some((column) => column.name === "folder_id")) this.db.exec("ALTER TABLE notes ADD COLUMN folder_id TEXT");
      if (!noteColumns.some((column) => column.name === "archived_at")) this.db.exec("ALTER TABLE notes ADD COLUMN archived_at TEXT");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_notes_archived_at ON notes(archived_at); CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);");
      const categories = this.db.prepare("SELECT * FROM categories").all() as DbCategory[];
      const insertFolder = this.db.prepare("INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES (?, ?, NULL, ?)");
      categories.forEach((category) => insertFolder.run(category.id, category.name, category.created_at));
      this.db.prepare("UPDATE notes SET folder_id = category_id WHERE folder_id IS NULL AND category_id IS NOT NULL").run();
      this.db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(migrationId, now());
    })();
  }

  private applySpreadsheetLibraryMigration(): void {
    const migrationId = "2026-10-spreadsheet-library-v1";
    if (this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(migrationId)) return;
    this.db.transaction(() => {
      const columns = this.db.prepare("PRAGMA table_info(spreadsheets)").all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === "favorite")) this.db.exec("ALTER TABLE spreadsheets ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0");
      if (!columns.some((column) => column.name === "updated_at")) this.db.exec("ALTER TABLE spreadsheets ADD COLUMN updated_at TEXT");
      this.db.prepare("UPDATE spreadsheets SET updated_at = created_at WHERE updated_at IS NULL").run();
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_spreadsheets_updated_at ON spreadsheets(updated_at)");
      this.db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(migrationId, now());
    })();
  }

  private backupBeforeMigration(): void {
    const backupDir = path.join(this.appDataPath, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    this.db.pragma("wal_checkpoint(TRUNCATE)");
    const timestamp = now().replace(/[:.]/g, "-");
    fs.copyFileSync(this.databasePath, path.join(backupDir, `mochi-notes-pre-recovery-${timestamp}.sqlite`));
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
    const rows = this.db.prepare("SELECT * FROM notes WHERE deleted_at IS NULL AND archived_at IS NULL ORDER BY updated_at DESC").all() as DbNote[];
    return rows.map((row) => this.mapNote(row));
  }

  private getDeletedNotes(): Note[] {
    const rows = this.db.prepare("SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all() as DbNote[];
    return rows.map((row) => this.mapNote(row));
  }

  private getArchivedNotes(): Note[] {
    const rows = this.db.prepare("SELECT * FROM notes WHERE deleted_at IS NULL AND archived_at IS NOT NULL ORDER BY archived_at DESC").all() as DbNote[];
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

  private getFolders() {
    const rows = this.db.prepare("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC").all() as DbFolder[];
    return rows.map((row) => ({ id: row.id, name: row.name, parentId: row.parent_id, createdAt: row.created_at }));
  }

  private getFolder(id: string) {
    const row = this.db.prepare("SELECT * FROM folders WHERE id = ?").get(id) as DbFolder | undefined;
    if (!row) throw new Error("Pasta não encontrada.");
    return { id: row.id, name: row.name, parentId: row.parent_id, createdAt: row.created_at };
  }

  private getTags() {
    const rows = this.db.prepare("SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC").all() as DbTag[];
    return rows.map((row) => ({ id: row.id, name: row.name, color: row.color, createdAt: row.created_at }));
  }

  private getTag(id: string) {
    const row = this.db.prepare("SELECT * FROM tags WHERE id = ?").get(id) as DbTag | undefined;
    if (!row) throw new Error("Etiqueta não encontrada.");
    return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
  }

  private getNoteTags(noteId: string) {
    const rows = this.db.prepare("SELECT tags.* FROM tags INNER JOIN note_tags ON note_tags.tag_id = tags.id WHERE note_tags.note_id = ? ORDER BY tags.name COLLATE NOCASE ASC").all(noteId) as DbTag[];
    return rows.map((row) => ({ id: row.id, name: row.name, color: row.color, createdAt: row.created_at }));
  }

  getSpreadsheet(id: string): SpreadsheetFile {
    const row = this.db.prepare("SELECT * FROM spreadsheets WHERE id = ?").get(id) as DbSpreadsheet | undefined;
    if (!row) throw new Error("Planilha não encontrada.");
    return { id: row.id, name: row.name, path: row.path, type: row.type, favorite: Boolean(row.favorite), createdAt: row.created_at, updatedAt: row.updated_at };
  }

  private getSpreadsheets(): SpreadsheetFile[] {
    const rows = this.db.prepare("SELECT * FROM spreadsheets ORDER BY created_at DESC").all() as DbSpreadsheet[];
    return rows.map((row) => ({ id: row.id, name: row.name, path: row.path, type: row.type, favorite: Boolean(row.favorite), createdAt: row.created_at, updatedAt: row.updated_at }));
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
      folderId: row.folder_id,
      favorite: Boolean(row.favorite),
      quick: Boolean(row.is_quick),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      archivedAt: row.archived_at,
      tags: this.getNoteTags(row.id),
      checklist: this.getChecklist(row.id),
      attachments: this.getAttachments(row.id)
    };
  }

  private mapRevision(row: DbNoteRevision): NoteRevision {
    return {
      id: row.id,
      noteId: row.note_id,
      title: row.title,
      content: row.content,
      categoryId: row.category_id,
      favorite: Boolean(row.favorite),
      quick: Boolean(row.is_quick),
      createdAt: row.created_at
    };
  }

  private createRevision(note: Note): void {
    this.db.prepare(
      "INSERT INTO note_revisions (id, note_id, title, content, category_id, favorite, is_quick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), note.id, note.title, note.content, note.categoryId, note.favorite ? 1 : 0, note.quick ? 1 : 0, now());
    this.db.prepare(
      "DELETE FROM note_revisions WHERE id IN (SELECT id FROM note_revisions WHERE note_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 50)"
    ).run(note.id);
  }

  private mapChecklistItem(row: DbChecklistItem): ChecklistItem {
    return {
      id: row.id,
      noteId: row.note_id,
      text: row.text,
      description: row.description ?? "",
      priority: row.priority ?? "medium",
      dueAt: row.due_at,
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
