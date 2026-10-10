import { FileSpreadsheet, FolderInput, Plus, Table2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { SpreadsheetFile } from "../types";
import { formatDate } from "../utils";

interface Props {
  spreadsheets: SpreadsheetFile[];
  onCreate: (name: string) => Promise<void>;
  onImport: () => Promise<void>;
  onOpen: (id: string) => Promise<void>;
}

export function SpreadsheetsPage({ spreadsheets, onCreate, onImport, onOpen }: Props) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    await onCreate(name);
    setName("");
    setCreating(false);
  };

  return (
    <section className="spreadsheets-page">
      <header className="spreadsheet-heading">
        <div>
          <p>Planilhas locais</p>
          <h1>Organize também em tabelas.</h1>
          <span>Crie uma planilha em branco ou traga arquivos do seu computador.</span>
        </div>
        <div className="spreadsheet-symbol"><Table2 size={30} /></div>
      </header>

      <div className="spreadsheet-actions">
        <form onSubmit={create}>
          <label>
            <span>Nome da nova planilha</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Controle mensal" />
          </label>
          <button className="aurora-primary" disabled={creating}><Plus size={18} /> {creating ? "Criando..." : "Criar planilha"}</button>
        </form>
        <button className="spreadsheet-import" onClick={onImport}><FolderInput size={19} /><span>Importar arquivo</span><small>.xlsx ou .csv</small></button>
      </div>

      <div className="spreadsheet-library-title"><FileSpreadsheet size={18} /><span>Suas planilhas</span></div>
      <div className="spreadsheet-library">
        {spreadsheets.length === 0 ? (
          <div className="spreadsheet-empty"><Table2 size={26} /><h2>Nenhuma planilha por aqui ainda.</h2><p>Crie uma em branco ou importe um arquivo existente.</p></div>
        ) : spreadsheets.map((sheet) => (
          <button className="spreadsheet-card" key={sheet.id} onClick={() => onOpen(sheet.id)}>
            <span className={`sheet-file-icon ${sheet.type}`}><FileSpreadsheet size={21} /></span>
            <span><strong>{sheet.name}</strong><small>{sheet.type.toUpperCase()} · {formatDate(sheet.createdAt)}</small></span>
          </button>
        ))}
      </div>
    </section>
  );
}
