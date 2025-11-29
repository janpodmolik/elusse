<script lang="ts">
  import { LANGUAGES, type Language } from '../types/Language';
  
  interface Props {
    selectedLanguage: Language;
    onselect: (lang: Language) => void;
    /** Accent color for active tab (default: blue) */
    accentColor?: string;
  }
  
  let { selectedLanguage, onselect, accentColor = '#88ddff' }: Props = $props();
</script>

<div class="language-tabs">
  {#each LANGUAGES as lang}
    <button 
      class="lang-tab" 
      class:active={selectedLanguage === lang.code}
      onclick={() => onselect(lang.code)}
      style:--accent-color={accentColor}
    >
      {lang.label}
    </button>
  {/each}
</div>

<style>
  .language-tabs {
    display: flex;
    border-bottom: 2px solid #4a4a5a;
  }
  
  .lang-tab {
    flex: 1;
    padding: 8px;
    background: rgba(40, 40, 50, 0.8);
    border: none;
    color: #888;
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .lang-tab:hover {
    background: rgba(60, 60, 70, 0.8);
    color: #aaa;
  }
  
  .lang-tab.active {
    background: rgba(80, 80, 100, 0.8);
    color: var(--accent-color);
    border-bottom: 2px solid var(--accent-color);
    margin-bottom: -2px;
  }
</style>
