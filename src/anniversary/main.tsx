import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Journal, LoadState } from './Journal';
import { CardLoadError, loadCard } from './load';
import './story.css';

const root = createRoot(document.getElementById('story-root')!);
// Register the preview handshake before React renders, including when this iframe is cached.
const card = loadCard();
root.render(<LoadState />);
void card
  .then(({ card, demo }) =>
    root.render(
      <StrictMode>
        <Journal card={card} demo={demo} auto={location.hash === '#demo'} />
      </StrictMode>,
    ),
  )
  .catch((error) =>
    root.render(
      <LoadState
        error={error instanceof CardLoadError ? error.kind : 'network'}
      />,
    ),
  );
