<script lang="ts">
  import { selectedDialogZoneId, dialogZones, updateDialogZoneText, deleteDialogZone, selectDialogZone, updateDialogZone } from '../stores/builderStores';
  import type { DialogZone, LocalizedText } from '../types/DialogTypes';
  import { ZONE_COLORS } from '../types/DialogTypes';
  import PixelButton from './PixelButton.svelte';
  import { EventBus, EVENTS } from '../events/EventBus';
  
  // Available languages
  const LANGUAGES = [
    { code: 'cs', label: 'CZ' },
    { code: 'en', label: 'EN' },
  ];
  
  // Currently selected language tab
  let selectedLanguage = $state('cs');
  
  // Panel minimized state
  let isMinimized = $state(false);
  
  // Color picker open state
  let isColorPickerOpen = $state(false);
  
  // Get the selected zone
  let selectedZone = $derived<DialogZone | null>(
    $dialogZones.find(z => z.id === $selectedDialogZoneId) ?? null
  );
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    selectedZone?.texts.find(t => t.language === selectedLanguage) ?? null
  );
  
  function handleTitleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!$selectedDialogZoneId) return;
    updateDialogZoneText($selectedDialogZoneId, selectedLanguage, { title: target.value });
  }
  
  function handleContentChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!$selectedDialogZoneId) return;
    updateDialogZoneText($selectedDialogZoneId, selectedLanguage, { content: target.value });
  }
  
  function handleDelete() {
    if (!$selectedDialogZoneId) return;
    deleteDialogZone($selectedDialogZoneId);
  }
  
  function handleClose() {
    selectDialogZone(null);
    isMinimized = false;
  }
  
  function handleCreateZone() {
    EventBus.emit(EVENTS.DIALOG_ZONE_CREATE);
  }
  
  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
  
  function handleColorSelect(color: string) {
    if (!$selectedDialogZoneId) return;
    updateDialogZone($selectedDialogZoneId, { color });
    isColorPickerOpen = false;
  }
  
  function toggleColorPicker() {
    isColorPickerOpen = !isColorPickerOpen;
  }
  
  /** Stop all pointer events from propagating to canvas */
  function stopPropagation(event: Event) {
    event.stopPropagation();
  }
</script>

<!-- Create zone button - always visible in dialogs mode -->
<PixelButton 
  position="stack-3"
  variant="green"
  onclick={handleCreateZone}
  title="Create new dialog zone at center of view"
>
  + ZONE
</PixelButton>

{#if selectedZone}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div 
    class="dialog-panel" 
    class:minimized={isMinimized}
    onpointerdown={stopPropagation}
    onclick={stopPropagation}
  >
    <div class="panel-header">
      <span class="panel-title">Dialog Zone</span>
      <div class="header-buttons">
        <button class="minimize-btn" onclick={toggleMinimize} title={isMinimized ? 'Expand panel' : 'Minimize panel'}>
          {isMinimized ? '▲' : '▼'}
        </button>
        <button class="close-btn" onclick={handleClose}>×</button>
      </div>
    </div>
    
    {#if !isMinimized}
    <div class="language-tabs">
      {#each LANGUAGES as lang}
        <button 
          class="lang-tab" 
          class:active={selectedLanguage === lang.code}
          onclick={() => selectedLanguage = lang.code}
        >
          {lang.label}
        </button>
      {/each}
    </div>
    
    <!-- Content form -->
    <div class="panel-content">
      <div class="form-group">
        <label for="dialog-title">Title</label>
        <input 
          id="dialog-title"
          type="text" 
          value={currentText?.title ?? ''}
          oninput={handleTitleChange}
          placeholder="Enter title..."
        />
      </div>
      
      <div class="form-group">
        <label for="dialog-content">Content</label>
        <textarea 
          id="dialog-content"
          value={currentText?.content ?? ''}
          oninput={handleContentChange}
          placeholder="Enter dialog text..."
          rows="6"
        ></textarea>
      </div>
      
      <!-- Color picker -->
      <div class="color-section">
        <span class="color-label-title">Color</span>
        <button 
          class="color-button"
          onclick={toggleColorPicker}
          title="Change zone color"
        >
          <span class="zone-color" style="background: {selectedZone.color}"></span>
          <span class="color-label">Change</span>
        </button>
        
        {#if isColorPickerOpen}
          <div class="color-picker">
            {#each ZONE_COLORS as color}
              <button
                class="color-swatch"
                class:selected={selectedZone.color === color}
                style="background: {color}"
                onclick={() => handleColorSelect(color)}
                title={color}
              ></button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Delete button -->
    <div class="panel-footer">
      <PixelButton variant="red" onclick={handleDelete}>
        DELETE ZONE
      </PixelButton>
    </div>
    {/if}
  </div>
{/if}

<style>
  .dialog-panel {
    position: fixed;
    top: calc(60px + env(safe-area-inset-top));
    right: calc(10px + env(safe-area-inset-right));
    width: 280px;
    background: rgba(30, 30, 40, 0.95);
    border: 3px solid #4a4a5a;
    border-radius: 8px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    user-select: none;
    -webkit-user-select: none;
  }
  
  /* Allow text selection in input fields */
  .dialog-panel input,
  .dialog-panel textarea {
    user-select: text;
    -webkit-user-select: text;
  }
  
  .dialog-panel.minimized {
    width: auto;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 2px solid #4a4a5a;
    background: rgba(50, 50, 60, 0.5);
  }
  
  .minimized .panel-header {
    border-bottom: none;
  }
  
  .header-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .panel-title {
    font-size: 11px;
    color: #88ddff;
  }
  
  .minimize-btn {
    background: none;
    border: none;
    color: #88ddff;
    font-size: 12px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  
  .minimize-btn:hover {
    color: #aaeeff;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #ff6666;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  
  .close-btn:hover {
    color: #ff8888;
  }
  
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
    color: #88ddff;
    border-bottom: 2px solid #88ddff;
    margin-bottom: -2px;
  }
  
  .panel-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .form-group label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .form-group input,
  .form-group textarea {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: inherit;
    font-size: 10px;
    padding: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #88ddff;
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  /* Color picker section */
  .color-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .color-label-title {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .color-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(40, 40, 50, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.2s;
    font-family: inherit;
  }
  
  .color-button:hover {
    border-color: #88ddff;
  }
  
  .zone-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  
  .color-label {
    color: #888;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
  }
  
  .color-picker {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 8px;
    background: rgba(20, 20, 30, 0.9);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    margin-top: 4px;
  }
  
  .color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border: 3px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  
  .color-swatch:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.5);
  }
  
  .color-swatch.selected {
    border-color: white;
    box-shadow: 0 0 0 2px rgba(136, 221, 255, 0.5);
  }
  
  .panel-footer {
    padding: 12px;
    border-top: 2px solid #4a4a5a;
    display: flex;
    justify-content: center;
  }
  
  @media (max-width: 500px) {
    .dialog-panel {
      width: calc(100% - 20px - env(safe-area-inset-left) - env(safe-area-inset-right));
      right: calc(10px + env(safe-area-inset-right));
      top: auto;
      bottom: calc(10px + env(safe-area-inset-bottom));
      max-height: 50vh;
      overflow-y: auto;
    }
  }
</style>
