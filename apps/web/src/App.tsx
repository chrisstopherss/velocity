import { useEffect, useState } from 'react';
import { useGame } from './game/useGame';
import { RoadEditor } from './roads/RoadEditor';
import { ClassicShell } from './shells/ClassicShell';
import { ModernShell } from './shells/ModernShell';
import { useTheme } from './theme/ThemeContext';

const inEditor = () => window.location.hash === '#roads';

function Game() {
  const g = useGame();
  const { theme } = useTheme();
  return theme === 'classic' ? <ClassicShell g={g} /> : <ModernShell g={g} />;
}

export default function App() {
  const [editor, setEditor] = useState(inEditor);

  useEffect(() => {
    const onHash = () => setEditor(inEditor());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return editor ? <RoadEditor /> : <Game />;
}
