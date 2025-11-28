<script lang="ts">
  import { selectedFrameId, selectedFrame, updateFrameText, deletePlacedFrame, selectFrame, updateFrameColor } from '../stores/builderStores';
  import type { PlacedFrame } from '../types/FrameTypes';
  import type { LocalizedText } from '../types/DialogTypes';
  import { FRAME_COLORS } from '../types/FrameTypes';
  import { LANGUAGES, DEFAULT_LANGUAGE } from '../types/Language';
  import PixelButton from './PixelButton.svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import { MAX_DIALOG_TITLE_LENGTH, MAX_DIALOG_CONTENT_LENGTH } from '../constants/uiConstants';
  
  // Use shared constants for consistency
  const MAX_TITLE_LENGTH = MAX_DIALOG_TITLE_LENGTH;
  const MAX_CONTENT_LENGTH = MAX_DIALOG_CONTENT_LENGTH;
  
  // Currently selected language tab
  let selectedLanguage = $state(DEFAULT_LANGUAGE);
  
  // Color picker open state
  let isColorPickerOpen = $state(false);
  
  // Get the selected frame
  let currentFrame = $derived<PlacedFrame | null>($selectedFrame);
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    currentFrame?.texts.find(t => t.language === selectedLanguage) ?? null
  );
  
  function handleTitleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!$selectedFrameId) return;
    updateFrameText($selectedFrameId, selectedLanguage, { title: target.value });
  }
  
  function handleContentChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!$selectedFrameId) return;
    updateFrameText($selectedFrameId, selectedLanguage, { content: target.value });
  }
  
  function handleDelete() {
    if (!$selectedFrameId) return;
    deletePlacedFrame($selectedFrameId);
  }
  
  function handleClose() {
    selectFrame(null);
  }
  
  function handleColorSelect(color: string) {
    if (!$selectedFrameId) return;
    updateFrameColor($selectedFrameId, color);
    isColorPickerOpen = false;
  }
  
  function toggleColorPicker() {
    isColorPickerOpen = !isColorPickerOpen;
  }
</script>

{#if currentFrame}
  <DraggablePanel
    panelId="frame-panel"
    title="Edit Frame"
    initialRight={10}
    initialTop={160}
    width={280}
    height={450}
    minWidth={250}
    minHeight={370}
    maxWidth={500}
    maxHeight={700}
    resizable={true}
    showClose={true}
    onclose={handleClose}
  >
    <div class="panel-content">
      <!-- Language tabs -->
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
      <div class="form-section">
        <div class="form-group">
          <label for="frame-title">Title (max {MAX_TITLE_LENGTH} chars)</label>
          <input 
            id="frame-title"
            type="text" 
            value={currentText?.title ?? ''}
            oninput={handleTitleChange}
            placeholder="Enter title..."
            maxlength={MAX_TITLE_LENGTH}
          />
        </div>
        
        <div class="form-group">
          <label for="frame-content">Content (max {MAX_CONTENT_LENGTH} chars)</label>
          <textarea 
            id="frame-content"
            value={currentText?.content ?? ''}
            oninput={handleContentChange}
            placeholder="Enter frame text..."
            rows="6"
            maxlength={MAX_CONTENT_LENGTH}
          ></textarea>
        </div>
        
        <!-- Color picker -->
        <div class="color-section">
          <span class="color-label-title">Background Color</span>
          <button 
            class="color-button"
            onclick={toggleColorPicker}
            title="Change frame background color"
          >
            <span class="frame-color" style="background: {currentFrame.backgroundColor}"></span>
            <span class="color-label">Change</span>
          </button>
          
          {#if isColorPickerOpen}
            <div class="color-picker">
              {#each FRAME_COLORS as color}
                <button
                  class="color-swatch"
                  class:selected={currentFrame.backgroundColor === color}
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
          DELETE FRAME
        </PixelButton>
      </div>
    </div>
  </DraggablePanel>
{/if}

<style>
  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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
    color: #c9a0dc;
    border-bottom: 2px solid #9b59b6;
    margin-bottom: -2px;
  }
  
  .form-section {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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
    border-color: #9b59b6;
  }
  
  .form-group textarea {
    resize: none;
    min-height: 80px;
    flex: 1;
  }
  
  /* Content textarea group should grow */
  .form-group:has(textarea) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
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
    border-color: #9b59b6;
  }
  
  .frame-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid rgba(0, 0, 0, 0.3);
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
    border-color: rgba(0, 0, 0, 0.3);
  }
  
  .color-swatch.selected {
    border-color: #9b59b6;
    box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.5);
  }
  
  .panel-footer {
    padding: 12px;
    border-top: 2px solid #4a4a5a;
    display: flex;
    justify-content: center;
  }
</style>
