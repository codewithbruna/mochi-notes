import { Camera, PawPrint, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AccentColor, AppSettings, AuthStatus, LocalUser, ThemeMode } from "../types";
import { accentMap } from "../utils";

interface Props {
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (settings: Partial<AppSettings>) => Promise<void>;
  user: LocalUser;
  onProfileUpdate: (status: AuthStatus) => void;
}

const accents: AccentColor[] = ["pink", "lilac", "peach", "mint", "aurora"];
const themes: ThemeMode[] = ["light", "dark"];

export function SettingsPanel({ settings, onClose, onUpdate, user, onProfileUpdate }: Props) {
  const [name, setName] = useState(user.name);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => setName(user.name), [user.name]);

  const saveProfile = async () => {
    const status = await window.mochi.updateProfile({ name });
    onProfileUpdate(status);
    setProfileMessage("Perfil atualizado.");
  };

  const choosePhoto = async () => {
    const status = await window.mochi.chooseProfilePhoto();
    onProfileUpdate(status);
    if (status.user?.avatarData) setProfileMessage("Foto atualizada.");
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Settings</p>
            <h2>Make Mochi yours</h2>
          </div>
          <button className="icon-button ghost" onClick={onClose} title="Close settings">
            <X size={18} />
          </button>
        </header>

        <div className="setting-group profile-group">
          <span>Seu perfil</span>
          <div className="profile-edit-row">
            <ProfileAvatar user={user} />
            <button className="secondary-button" onClick={choosePhoto}><Camera size={16} /> Escolher foto</button>
          </div>
          <label className="profile-name-field"><span>Nome de exibição</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /></label>
          <button className="profile-save" onClick={saveProfile}><Save size={16} /> Salvar perfil</button>
          {profileMessage && <small className="profile-message">{profileMessage}</small>}
        </div>

        <div className="setting-group">
          <span>Theme</span>
          <div className="segmented">
            {themes.map((theme) => (
              <button className={settings.theme === theme ? "active" : ""} key={theme} onClick={() => onUpdate({ theme })}>
                {theme === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <span>Mascote Aurora</span>
          <label className="toggle-setting">
            <span><PawPrint size={17} /> Mostrar no painel principal</span>
            <input type="checkbox" checked={settings.showMascot} onChange={(event) => onUpdate({ showMascot: event.target.checked })} />
          </label>
        </div>

        <div className="setting-group">
          <span>Accent color</span>
          <div className="accent-options">
            {accents.map((accent) => (
              <button
                className={settings.accent === accent ? "active" : ""}
                key={accent}
                onClick={() => onUpdate({ accent, customAccent: undefined })}
                title={accent}
                style={{ background: accentMap[accent] }}
              />
            ))}
          </div>
          <label className="custom-color-control">
            <span>Cor personalizada</span>
            <input type="color" value={settings.customAccent ?? accentMap[settings.accent]} onChange={(event) => onUpdate({ accent: "aurora", customAccent: event.target.value })} />
          </label>
        </div>
      </section>
    </div>
  );
}

function ProfileAvatar({ user }: { user: LocalUser }) {
  return user.avatarData ? <img className="profile-avatar" src={user.avatarData} alt="Foto de perfil" /> : <span className="profile-avatar initials">{user.name.slice(0, 2).toUpperCase()}</span>;
}
