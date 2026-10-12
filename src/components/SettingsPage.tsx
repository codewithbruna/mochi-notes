import { Bell, Camera, Check, ChevronDown, Database, Eye, Grid2X2, LockKeyhole, Monitor, Moon, Palette, PawPrint, RotateCcw, Save, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { AccentColor, AppSettings, AuthStatus, LocalUser, PaletteName, ThemeCustomization, ThemeMode } from "../types";
import { accentMap } from "../utils";

interface Props {
  settings: AppSettings;
  user: LocalUser;
  onUpdate: (settings: Partial<AppSettings>) => Promise<void>;
  onProfileUpdate: (status: AuthStatus) => void;
}

type SettingsSection = "profile" | "appearance" | "space" | "mascot" | "notifications" | "privacy" | "data";

const sections: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: "profile", label: "Perfil", icon: UserRound },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "space", label: "Meu espaço", icon: Grid2X2 },
  { id: "mascot", label: "Mascote", icon: PawPrint },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "privacy", label: "Privacidade", icon: LockKeyhole },
  { id: "data", label: "Dados", icon: Database }
];

const accents: AccentColor[] = ["lilac", "mint", "pink", "aurora", "peach"];
const palettes: Array<{ id: PaletteName; name: string; description: string; colors: [string, string, string] }> = [
  { id: "aurora", name: "Aurora", description: "Azul-petróleo, roxo e menta", colors: ["#143b46", "#62d3bb", "#384b7b"] },
  { id: "lavender", name: "Lavanda", description: "Roxo suave e lilás", colors: ["#49356e", "#b7a0ee", "#806188"] },
  { id: "mint", name: "Menta", description: "Verde-petróleo e verde-menta", colors: ["#225b58", "#71dfbe", "#2c746b"] },
  { id: "autumn", name: "Outono", description: "Creme e terracota", colors: ["#765447", "#e89a70", "#d8b893"] },
  { id: "minimal", name: "Minimal", description: "Cinza e azul suave", colors: ["#3b5265", "#9bbcd1", "#b9ced9"] }
];

export function SettingsPage({ settings, user, onUpdate, onProfileUpdate }: Props) {
  const [section, setSection] = useState<SettingsSection>("appearance");
  const [name, setName] = useState(user.name);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => setName(user.name), [user.name]);

  const saveProfile = async () => {
    const status = await window.mochi.updateProfile({ name: name.trim() || user.name });
    onProfileUpdate(status);
    setProfileMessage("Perfil atualizado.");
  };

  const choosePhoto = async () => {
    const status = await window.mochi.chooseProfilePhoto();
    onProfileUpdate(status);
    if (status.user?.avatarData) setProfileMessage("Foto atualizada.");
  };

  return (
    <main className="settings-page">
      <div className="settings-page-inner">
        <header className="settings-page-heading">
          <span>MOCHI NOTES</span>
          <h1>Ajustes</h1>
          <p>Deixe seu espaço com a sua cara.</p>
        </header>

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Seções de ajustes">
            {sections.map(({ id, label, icon: Icon }) => (
              <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)} aria-current={section === id ? "page" : undefined}>
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <section className="settings-content">
            {section === "appearance" && <Appearance settings={settings} onUpdate={onUpdate} />}
            {section === "profile" && (
              <section className="settings-section">
                <div className="settings-section-title"><h2>Perfil</h2><p>Escolha como você aparece no Mochi.</p></div>
                <div className="settings-card profile-settings-card">
                  {user.avatarData ? <img className="settings-avatar" src={user.avatarData} alt="Foto de perfil" /> : <span className="settings-avatar">{user.name.slice(0, 2).toUpperCase()}</span>}
                  <div className="profile-settings-copy"><strong>Foto de perfil</strong><small>Uma imagem para deixar o espaço ainda mais seu.</small><button className="settings-secondary-button" onClick={choosePhoto}><Camera size={16} /> Escolher foto</button></div>
                </div>
                <label className="settings-field"><span>Nome de exibição</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /></label>
                <div className="settings-actions"><button className="settings-primary-button" onClick={saveProfile}><Save size={16} /> Salvar perfil</button>{profileMessage && <small>{profileMessage}</small>}</div>
              </section>
            )}
            {section === "mascot" && (
              <section className="settings-section"><div className="settings-section-title"><h2>Mascote Mochi</h2><p>Uma companhia suave para o seu painel.</p></div><label className="settings-card setting-toggle"><span><PawPrint size={19} /><span><strong>Mostrar o Mochi no BI</strong><small>Exibe o mascote nas mensagens e momentos do painel.</small></span></span><input type="checkbox" checked={settings.showMascot} onChange={(event) => onUpdate({ showMascot: event.target.checked })} /></label></section>
            )}
            {section !== "appearance" && section !== "profile" && section !== "mascot" && <ComingSoon section={section} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function Appearance({ settings, onUpdate }: Pick<Props, "settings" | "onUpdate">) {
  const currentAccent = settings.customAccent ?? accentMap[settings.accent];
  const updateCustomPalette = (updates: ThemeCustomization) => onUpdate({ customPalette: { ...settings.customPalette, ...updates } });
  return <section className="settings-section">
    <div className="settings-section-title"><h2>Aparência</h2><p>Personalize as cores e o estilo.</p></div>
    <div className="settings-card appearance-card">
      <span className="setting-label">Tema</span>
      <div className="theme-options">
        {(["light", "dark", "system"] as ThemeMode[]).map((theme) => <button key={theme} className={settings.theme === theme ? "active" : ""} onClick={() => onUpdate({ theme })}>{theme === "light" ? <Sun size={17} /> : theme === "dark" ? <Moon size={17} /> : <Monitor size={17} />}<span>{theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Automático"}</span></button>)}
      </div>
      <span className="setting-label">Paleta</span>
      <div className="palette-grid">
        {palettes.map((palette) => <button key={palette.id} className={`palette-option ${settings.palette === palette.id ? "active" : ""}`} onClick={() => onUpdate({ palette: palette.id, customPalette: undefined })} aria-pressed={settings.palette === palette.id}><span className="palette-swatch" style={{ background: palette.colors[0] }}><i style={{ background: palette.colors[1] }} /><i style={{ background: palette.colors[2] }} /></span><span><strong>{palette.name}</strong><small>{palette.description}</small></span></button>)}
      </div>
      <span className="setting-label">Cor de destaque</span>
      <div className="settings-accent-options">
        {accents.map((accent) => <button key={accent} className={settings.accent === accent && !settings.customAccent ? "active" : ""} onClick={() => onUpdate({ accent, customAccent: undefined })} style={{ backgroundColor: accentMap[accent] }} title={`Usar cor ${accent}`} aria-label={`Usar cor ${accent}`}><Check size={14} /></button>)}
        <label className="custom-accent" title="Escolher cor personalizada"><input type="color" value={currentAccent} onChange={(event) => onUpdate({ accent: "aurora", customAccent: event.target.value })} /><span>+</span></label>
      </div>
      <label className="hex-color-field"><span>Cor personalizada em hexadecimal</span><input defaultValue={currentAccent} key={currentAccent} maxLength={7} placeholder="#55CFA9" onBlur={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && onUpdate({ accent: "aurora", customAccent: event.target.value })} /></label>
    </div>
    <Preview accent={currentAccent} />
    <details className="advanced-customization"><summary><span><Palette size={16} /> Personalização avançada</span><ChevronDown size={16} /></summary><p>Ajuste superfícies principais sem perder a estrutura e a legibilidade da paleta.</p><div className="advanced-color-grid"><ColorControl label="Fundo" value={settings.customPalette?.appBackground} onChange={(appBackground) => updateCustomPalette({ appBackground })} /><ColorControl label="Header" value={settings.customPalette?.headerBackground} onChange={(headerBackground) => updateCustomPalette({ headerBackground })} /><ColorControl label="Sidebar" value={settings.customPalette?.sidebarBackground} onChange={(sidebarBackground) => updateCustomPalette({ sidebarBackground })} /><ColorControl label="Cards" value={settings.customPalette?.surfacePrimary} onChange={(surfacePrimary) => updateCustomPalette({ surfacePrimary })} /></div></details>
    <div className="preset-header"><div><h3>Preferências</h3><p>As mudanças são aplicadas e salvas imediatamente.</p></div><button className="settings-text-button" onClick={() => onUpdate({ theme: "dark", palette: "aurora", accent: "aurora", customAccent: undefined, customPalette: undefined, showMascot: true })}><RotateCcw size={15} /> Restaurar padrão</button></div>
  </section>;
}

function ColorControl({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <label className="advanced-color-control"><span>{label}</span><input type="color" value={value ?? "#ffffff"} onChange={(event) => onChange(event.target.value)} /><button type="button" onClick={() => onChange(undefined)} disabled={!value}>Padrão</button></label>;
}

function Preview({ accent }: { accent: string }) {
  return <section className="settings-preview"><div className="preview-title"><Eye size={16} /><span>Pré-visualização</span></div><div className="preview-app"><header><span>♡ Mochi Notes</span><i /></header><div><aside><b>Meu espaço</b><span>Tasks</span><span>Notas</span><span>BI</span><span>Ajustes</span></aside><main><section><strong>Seu cantinho</strong><small>Suas ideias têm espaço para crescer.</small><button style={{ backgroundColor: accent }}>Nova nota</button></section><div className="preview-metrics"><span><b>12</b>Notas</span><span><b>5</b>Tasks</span></div></main></div></div></section>;
}

function ComingSoon({ section }: { section: Exclude<SettingsSection, "profile" | "appearance" | "mascot"> }) {
  const copy = {
    space: ["Meu espaço", "Em breve, você poderá organizar widgets, densidade dos cards e a página inicial do BI."],
    notifications: ["Notificações", "Os lembretes e horários de silêncio aparecerão aqui quando estiverem prontos para você."],
    privacy: ["Privacidade", "As preferências de segurança e dados ficarão reunidas neste espaço."],
    data: ["Dados", "Exportação, importação, backups e lixeira serão organizados aqui."]
  }[section];
  return <section className="settings-section"><div className="settings-section-title"><h2>{copy[0]}</h2><p>{copy[1]}</p></div><div className="settings-card settings-coming-soon"><Palette size={22} /><span>Estamos preparando esta área com o mesmo cuidado do seu cantinho.</span></div></section>;
}
