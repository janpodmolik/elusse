/**
 * Builder Entry Point
 * 
 * Separate page for the modular character builder.
 */

import { mount } from 'svelte';
import CharacterBuilder from './ui/builder/CharacterBuilder.svelte';

// Wait for DOM to be ready
const builderRoot = document.getElementById('builder-root');

if (!builderRoot) {
  throw new Error('builder-root element not found!');
}

// Mount the CharacterBuilder component
mount(CharacterBuilder, {
  target: builderRoot,
});
