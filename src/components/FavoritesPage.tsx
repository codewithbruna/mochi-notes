import { Grid2X2, Heart, List, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import appIcon from "../assets/app-icon-256.png";
import type { Category, Note } from "../types";
import { formatDate, getCategory, plainPreview } from "../utils";
import { CategoryBadge } from "./CategoryBadge";

type DisplayMode = "grid" | "list";
type SortMode = "recent" | "oldest" | "title";

interface Props {
  notes: Note[];
  categories: Category[];
  showMascot: boolean;
  onOpenNote: (id: string) => void;
  onRemoveFavorite: (note: Note) => Promise<void>;
  onExploreNotes: () => void;
}

export function FavoritesPage({ notes, categories, showMascot, onOpenNote, onRemoveFavorite, onExploreNotes }: Props) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [display, setDisplay] = useState<DisplayMode>("grid");

  const favorites = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes
      .filter((note) => note.favorite)
      .filter((note) => categoryId === "all" || note.categoryId === categoryId)
      .filter((note) => !query || note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query))
      .sort((left, right) => {
        if (sort === "title") return (left.title || "Sem título").localeCompare(right.title || "Sem título", "pt-BR");
        const difference = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
        return sort === "oldest" ? difference : -difference;
      });
  }, [categoryId, notes, search, sort]);

  const hasFavorites = notes.some((note) => note.favorite);

  return (
    <section className="favorites-page">
      <header className="favorites-header">
        <div>
          <span className="favorites-eyebrow"><Heart size={13} fill="currentColor" /> FAVORITOS</span>
          <h1>♡ Meus favoritos</h1>
          <p>Suas notas especiais, sempre por perto.</p>
        </div>
      </header>

      {hasFavorites ? (
        <>
          <div className="favorites-toolbar">
            <label className="favorites-search">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar favoritos..." aria-label="Pesquisar favoritos" />
            </label>
            <div className="favorites-filters">
              <label className="favorites-select"><SlidersHorizontal size={15} /><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filtrar por categoria"><option value="all">Todas as categorias</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
              <label className="favorites-select"><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Ordenar favoritos"><option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option><option value="title">Título</option></select></label>
              <div className="favorites-display" aria-label="Alternar visualização">
                <button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} title="Visualizar em grade" aria-label="Visualizar em grade"><Grid2X2 size={16} /></button>
                <button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} title="Visualizar em lista" aria-label="Visualizar em lista"><List size={17} /></button>
              </div>
            </div>
          </div>

          {favorites.length ? (
            <div className={`favorites-collection ${display}`}>
              {favorites.map((note) => <FavoriteCard key={note.id} note={note} categories={categories} layout={display} onOpen={() => onOpenNote(note.id)} onRemove={() => void onRemoveFavorite(note)} />)}
            </div>
          ) : (
            <div className="favorites-no-results"><Search size={22} /><h2>Nenhum favorito encontrado</h2><p>Tente ajustar sua busca ou os filtros escolhidos.</p></div>
          )}
        </>
      ) : (
        <div className="favorites-empty">
          {showMascot && <img src={appIcon} alt="Mascote Mochi" />}
          <h2>Seu cantinho de favoritos está esperando ♡</h2>
          <p>Marque suas notas com um coração para encontrá-las facilmente aqui.</p>
          <button className="favorites-primary" onClick={onExploreNotes}>Explorar minhas notas</button>
        </div>
      )}
    </section>
  );
}

function FavoriteCard({ note, categories, layout, onOpen, onRemove }: { note: Note; categories: Category[]; layout: DisplayMode; onOpen: () => void; onRemove: () => void }) {
  const category = getCategory(categories, note.categoryId);
  return <article className={`favorite-card ${layout}`}>
    <button className="favorite-card-open" onClick={onOpen} aria-label={`Abrir nota ${note.title || "Sem título"}`}>
      <div className="favorite-card-heading"><h2>{note.title || "Sem título"}</h2><Heart size={17} fill="currentColor" aria-hidden="true" /></div>
      <p>{plainPreview(note) || "Sem conteúdo por enquanto."}</p>
      <footer><CategoryBadge category={category} /><time>Atualizada {formatDate(note.updatedAt)}</time></footer>
    </button>
    <button className="favorite-remove" onClick={onRemove} title="Remover dos favoritos" aria-label={`Remover ${note.title || "nota"} dos favoritos`}><Heart size={16} fill="currentColor" /></button>
  </article>;
}
