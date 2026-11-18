import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles.css';
import { startApp } from './app';

import { registerSW } from 'virtual:pwa-register';

startApp(document.getElementById('app')!);

// 'prompt' mode: a new SW installs in the background and activates on next app open.
registerSW({ immediate: true });
