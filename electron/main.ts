import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { MochiDatabase } from "./database";
import type {
  AppSettings,
  CredentialsInput,
  CreateChecklistInput,
  NewFolderInput,
  NewTagInput,
  NewCategoryInput,
  SignUpInput,
  UpdateProfileInput,
  UpdateCategoryInput,
  UpdateChecklistInput,
  UpdateFolderInput,
  UpdateNoteInput,
  UpdateTagInput
} from "../src/types";

let mainWindow: BrowserWindow | null = null;
let database: MochiDatabase;
const useDevServer = process.argv.includes("--dev");
const appIcon = app.isPackaged
  ? path.join(process.resourcesPath, "app-icon.ico")
  : path.join(process.cwd(), "resources", "app-icon.ico");

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "Mochi Notes",
    backgroundColor: "#0b252d",
    icon: appIcon,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  if (useDevServer) {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
};

app.whenReady().then(async () => {
  const dataPath = app.isPackaged ? app.getPath("userData") : path.join(process.cwd(), ".mochi-data");
  database = new MochiDatabase(dataPath);
  registerIpc();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function registerIpc() {
  ipcMain.handle("auth:status", () => database.getAuthStatus());
  ipcMain.handle("auth:sign-up", (_event, input: SignUpInput) => database.signUp(input));
  ipcMain.handle("auth:sign-in", (_event, input: CredentialsInput) => database.signIn(input));
  ipcMain.handle("auth:sign-out", () => database.signOut());
  ipcMain.handle("auth:update-profile", (_event, input: UpdateProfileInput) => database.updateProfile(input));
  ipcMain.handle("auth:choose-profile-photo", async () => {
    if (!mainWindow) return database.getAuthStatus();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Escolher foto de perfil",
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    });
    return result.canceled || !result.filePaths[0] ? database.getAuthStatus() : database.updateProfilePhoto(result.filePaths[0]);
  });
  ipcMain.handle("app:get-data", () => database.getAppData());
  ipcMain.handle("notes:create", () => database.createNote());
  ipcMain.handle("notes:create-quick", () => database.createQuickNote());
  ipcMain.handle("spreadsheets:create", (_event, name: string) => database.createSpreadsheet(name));
  ipcMain.handle("spreadsheets:import", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Importar planilha",
      properties: ["openFile"],
      filters: [{ name: "Planilhas", extensions: ["xlsx", "csv"] }]
    });
    return result.canceled || !result.filePaths[0] ? null : database.importSpreadsheet(result.filePaths[0]);
  });
  ipcMain.handle("spreadsheets:open", async (_event, id: string) => {
    await shell.openPath(database.getSpreadsheet(id).path);
    return { ok: true };
  });
  ipcMain.handle("notes:update", (_event, input: UpdateNoteInput) => database.updateNote(input));
  ipcMain.handle("notes:delete", (_event, id: string) => {
    database.deleteNote(id);
    return { ok: true };
  });
  ipcMain.handle("notes:restore", (_event, id: string) => database.restoreNote(id));
  ipcMain.handle("notes:archive", (_event, id: string) => database.archiveNote(id));
  ipcMain.handle("notes:restore-archived", (_event, id: string) => database.restoreArchivedNote(id));
  ipcMain.handle("notes:permanently-delete", (_event, id: string) => {
    database.permanentlyDeleteNote(id);
    return { ok: true };
  });
  ipcMain.handle("notes:revisions", (_event, noteId: string) => database.getNoteRevisions(noteId));
  ipcMain.handle("notes:restore-revision", (_event, revisionId: string) => database.restoreNoteRevision(revisionId));

  ipcMain.handle("categories:create", (_event, input: NewCategoryInput) => database.createCategory(input));
  ipcMain.handle("categories:update", (_event, input: UpdateCategoryInput) => database.updateCategory(input));
  ipcMain.handle("categories:delete", (_event, id: string) => {
    database.deleteCategory(id);
    return { ok: true };
  });
  ipcMain.handle("folders:create", (_event, input: NewFolderInput) => database.createFolder(input));
  ipcMain.handle("folders:update", (_event, input: UpdateFolderInput) => database.updateFolder(input));
  ipcMain.handle("folders:delete", (_event, id: string) => {
    database.deleteFolder(id);
    return { ok: true };
  });
  ipcMain.handle("tags:create", (_event, input: NewTagInput) => database.createTag(input));
  ipcMain.handle("tags:update", (_event, input: UpdateTagInput) => database.updateTag(input));
  ipcMain.handle("tags:delete", (_event, id: string) => {
    database.deleteTag(id);
    return { ok: true };
  });

  ipcMain.handle("checklist:create", (_event, input: CreateChecklistInput) => database.createChecklistItem(input));
  ipcMain.handle("checklist:update", (_event, input: UpdateChecklistInput) => database.updateChecklistItem(input));
  ipcMain.handle("checklist:delete", (_event, id: string) => {
    database.deleteChecklistItem(id);
    return { ok: true };
  });

  ipcMain.handle("attachments:add", async (_event, noteId: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Add attachment",
      properties: ["openFile"],
      filters: [
        { name: "Supported files", extensions: ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "md", "doc", "docx", "xlsx", "csv"] },
        { name: "All files", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return database.addAttachment(noteId, result.filePaths[0]);
  });

  ipcMain.handle("attachments:delete", (_event, id: string) => {
    database.deleteAttachment(id);
    return { ok: true };
  });

  ipcMain.handle("attachments:open", async (_event, id: string) => {
    const attachment = database.getAttachment(id);
    await shell.openPath(attachment.path);
    return { ok: true };
  });

  ipcMain.handle("settings:update", (_event, settings: Partial<AppSettings>) => database.updateSettings(settings));
}
