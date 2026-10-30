import { LayoutDashboard, Monitor } from 'lucide-react';
import { useTheme, type Theme } from './ThemeContext';

const options: { id: Theme; label: string; icon: typeof Monitor }[] = [
  { id: 'classic', label: 'Early 2000s', icon: Monitor },
  { id: 'modern', label: 'Modern', icon: LayoutDashboard },
];

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Interface theme">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={theme === id ? 'on' : ''}
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
        >
          <Icon size={14} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
