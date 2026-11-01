import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from './Editor';
import { themes } from './themes';
import './styles/editor.css';
import './styles/react.css';
import './styles/anniversary-editor.css';

const element = document.getElementById('root');
const theme = themes.find((item) => item.id === element?.dataset.theme);
if (!element || !theme) throw new Error('Unknown card editor');
document.body.dataset.theme = theme.id;

createRoot(element).render(
  <StrictMode>
    <Editor theme={theme} />
  </StrictMode>,
);
