import { useGame } from './game/useGame';
import { ClassicShell } from './shells/ClassicShell';
import { ModernShell } from './shells/ModernShell';
import { useTheme } from './theme/ThemeContext';

export default function App() {
  const g = useGame();
  const { theme } = useTheme();
  return theme === 'classic' ? <ClassicShell g={g} /> : <ModernShell g={g} />;
}
