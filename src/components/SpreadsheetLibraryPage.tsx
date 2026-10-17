import { Copy, FileSpreadsheet, FolderInput, Grid2X2, Heart, List, MoreHorizontal, Pencil, Plus, Search, Table2, Trash2, Upload } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { SpreadsheetFile } from "../types";
import { formatDate } from "../utils";

type DisplayMode = "grid" | "list";
type SortMode = "updated" | "created" | "name";

interface Props {
  spreadsheets: SpreadsheetFile[];
  onCreate: (name: string) => Promise<void>;
  onImport: () => Promise<boolean>;
  onImportPath: (path: string) => Promise<boolean>;
  onOpen: (id: string) => Promise<void>;
  onRename: (sheet: SpreadsheetFile, name: string) => Promise<void>;
  onDuplicate: (sheet: SpreadsheetFile) => Promise<void>;
  onDelete: (sheet: SpreadsheetFile) => Promise<void>;
  onToggleFavorite: (sheet: SpreadsheetFile) => Promise<void>;
}

export function SpreadsheetLibraryPage({ spreadsheets, onCreate, onImport, onImportPath, onOpen, onRename, onDuplicate, onDelete, onToggleFavorite }: Props) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("updated");
  const [display, setDisplay] = useState<DisplayMode>("grid");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const visibleSheets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spreadsheets.filter((sheet) => !query || sheet.name.toLowerCase().includes(query)).sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name, "pt-BR");
      const difference = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      return sort === "created" ? new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() : -difference;
    });
  }, [search, sort, spreadsheets]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setCreating(true); setMessage(null);
    try { await onCreate(name); setName(""); setMessage({ type: "success", text: "Planilha criada com carinho." }); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível criar a planilha." }); }
    finally { setCreating(false); }
  };

  const importWithDialog = async () => {
    setMessage(null);
    try { if (await onImport()) setMessage({ type: "success", text: "Planilha importada com sucesso." }); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível importar este arquivo." }); }
  };

  const drop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files[0] as (File & { path?: string }) | undefined;
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) { setMessage({ type: "error", text: "Escolha um arquivo XLSX ou CSV." }); return; }
    if (!file.path) { setMessage({ type: "error", text: "Não foi possível acessar o arquivo arrastado. Use Importar arquivo." }); return; }
    setMessage(null);
    try { if (await onImportPath(file.path)) setMessage({ type: "success", text: "Planilha importada com sucesso." }); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível importar este arquivo." }); }
  };

  const rename = async (sheet: SpreadsheetFile) => {
    const nextName = window.prompt("Novo nome da planilha", sheet.name)?.trim();
    if (!nextName || nextName === sheet.name) return;
    await onRename(sheet, nextName); setMessage({ type: "success", text: "Nome atualizado." });
  };
  const remove = async (sheet: SpreadsheetFile) => {
    if (!window.confirm(`Excluir “${sheet.name}”? O arquivo será removido do Mochi Notes.`)) return;
    await onDelete(sheet); setMessage({ type: "success", text: "Planilha excluída." });
  };

  return <section className="sheets-page">
    <header className="sheets-hero"><div><p>PLANILHAS</p><h1>Organize também em tabelas.</h1><span>Crie, importe e encontre seus arquivos sem sair do seu cantinho.</span></div><div className="sheets-hero-symbol"><Table2 size={27} /></div></header>
    <section className="sheets-create" aria-label="Criar ou importar planilhas"><form onSubmit={create}><label><span>Nome da nova planilha</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Controle mensal" /></label><button className="sheets-primary" disabled={creating}><Plus size={17} />{creating ? "Criando..." : "Criar planilha"}</button></form><button className={`sheets-import ${dragging ? "dragging" : ""}`} onClick={importWithDialog} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop}><span className="sheets-import-icon">{dragging ? <Upload size={19} /> : <FolderInput size={19} />}</span><span><strong>{dragging ? "Solte para importar" : "Importar arquivo"}</strong><small>Arraste ou escolha um arquivo .xlsx ou .csv</small></span></button></section>
    {message && <p className={`sheets-feedback ${message.type}`} role="status">{message.text}</p>}
    <section className="sheets-library"><header className="sheets-library-heading"><div><FileSpreadsheet size={18} /><h2>Suas planilhas</h2><span>{spreadsheets.length}</span></div></header>{spreadsheets.length > 0 && <div className="sheets-toolbar"><label className="sheets-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar planilhas..." aria-label="Pesquisar planilhas" /></label><div className="sheets-toolbar-actions"><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Ordenar planilhas"><option value="updated">Última edição</option><option value="created">Data de criação</option><option value="name">Nome</option></select><div className="sheets-display"><button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Visualizar em grade"><Grid2X2 size={16} /></button><button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="Visualizar em lista"><List size={17} /></button></div></div></div>}{spreadsheets.length === 0 ? <div className="sheets-empty"><Table2 size={27} /><h3>Nenhuma planilha por aqui ainda.</h3><p>Crie uma em branco ou importe um arquivo existente.</p></div> : visibleSheets.length === 0 ? <div className="sheets-empty compact"><Search size={24} /><h3>Nenhuma planilha encontrada.</h3><p>Tente buscar por outro nome.</p></div> : <div className={`sheets-grid ${display}`}>{visibleSheets.map((sheet) => <SpreadsheetCard key={sheet.id} sheet={sheet} menuOpen={openMenuId === sheet.id} onToggleMenu={() => setOpenMenuId((id) => id === sheet.id ? null : sheet.id)} onOpen={() => void onOpen(sheet.id)} onToggleFavorite={() => void onToggleFavorite(sheet)} onRename={() => void rename(sheet)} onDuplicate={() => void onDuplicate(sheet)} onDelete={() => void remove(sheet)} />)}</div>}</section>
  </section>;
}

function SpreadsheetCard({ sheet, menuOpen, onToggleMenu, onOpen, onToggleFavorite, onRename, onDuplicate, onDelete }: { sheet: SpreadsheetFile; menuOpen: boolean; onToggleMenu: () => void; onOpen: () => void; onToggleFavorite: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return <article className="sheet-card"><button className="sheet-card-open" onClick={onOpen} aria-label={`Abrir ${sheet.name}`}><span className={`sheet-card-icon ${sheet.type}`}><FileSpreadsheet size={22} /></span><span className="sheet-card-copy"><strong>{sheet.name}</strong><small>{sheet.type.toUpperCase()} · Editada {formatDate(sheet.updatedAt)}</small></span></button><button className={`sheet-favorite ${sheet.favorite ? "active" : ""}`} onClick={onToggleFavorite} title={sheet.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label={sheet.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart size={16} fill={sheet.favorite ? "currentColor" : "none"} /></button><div className="sheet-menu-wrap"><button className="sheet-menu-trigger" onClick={onToggleMenu} aria-label="Abrir opções da planilha" aria-expanded={menuOpen}><MoreHorizontal size={18} /></button>{menuOpen && <div className="sheet-menu"><button onClick={onOpen}><FileSpreadsheet size={15} />Abrir</button><button onClick={onRename}><Pencil size={15} />Renomear</button><button onClick={onDuplicate}><Copy size={15} />Duplicar</button><button className="danger" onClick={onDelete}><Trash2 size={15} />Excluir</button></div>}</div></article>;
}
