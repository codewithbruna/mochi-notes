import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  CredentialsInput,
  CreateChecklistInput,
  NewCategoryInput,
  SignUpInput,
  UpdateProfileInput,
  UpdateCategoryInput,
  UpdateChecklistInput,
  UpdateNoteInput
} from "../src/types";

contextBridge.exposeInMainWorld("mochi", {
  getAuthStatus: () => ipcRenderer.invoke("auth:status"),
  signUp: (input: SignUpInput) => ipcRenderer.invoke("auth:sign-up", input),
  signIn: (input: CredentialsInput) => ipcRenderer.invoke("auth:sign-in", input),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  updateProfile: (input: UpdateProfileInput) => ipcRenderer.invoke("auth:update-profile", input),
  chooseProfilePhoto: () => ipcRenderer.invoke("auth:choose-profile-photo"),
  getAppData: () => ipcRenderer.invoke("app:get-data"),
  createNote: () => ipcRenderer.invoke("notes:create"),
  createQuickNote: () => ipcRenderer.invoke("notes:create-quick"),
  createSpreadsheet: (name: string) => ipcRenderer.invoke("spreadsheets:create", name),
  importSpreadsheet: () => ipcRenderer.invoke("spreadsheets:import"),
  openSpreadsheet: (id: string) => ipcRenderer.invoke("spreadsheets:open", id),
  updateNote: (input: UpdateNoteInput) => ipcRenderer.invoke("notes:update", input),
  deleteNote: (id: string) => ipcRenderer.invoke("notes:delete", id),
  createCategory: (input: NewCategoryInput) => ipcRenderer.invoke("categories:create", input),
  updateCategory: (input: UpdateCategoryInput) => ipcRenderer.invoke("categories:update", input),
  deleteCategory: (id: string) => ipcRenderer.invoke("categories:delete", id),
  createChecklistItem: (input: CreateChecklistInput) => ipcRenderer.invoke("checklist:create", input),
  updateChecklistItem: (input: UpdateChecklistInput) => ipcRenderer.invoke("checklist:update", input),
  deleteChecklistItem: (id: string) => ipcRenderer.invoke("checklist:delete", id),
  addAttachment: (noteId: string) => ipcRenderer.invoke("attachments:add", noteId),
  deleteAttachment: (id: string) => ipcRenderer.invoke("attachments:delete", id),
  openAttachment: (id: string) => ipcRenderer.invoke("attachments:open", id),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", settings)
});
