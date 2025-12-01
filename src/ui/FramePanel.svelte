<script lang="ts">
  import { selectedFrameId, selectedFrame, deletePlacedFrame, selectFrame, updatePlacedFrame, builderPreviewLanguage, setBuilderPreviewLanguage, isFramePanelOpen, closeFramePanel } from '../stores/builderStores';
  import { FRAME_COLORS, TEXT_COLORS, TEXT_SIZES, TEXT_ALIGNMENTS, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_SIZE, DEFAULT_TEXT_ALIGN, FRAME_SIZES, getSizeFromScale, getScaleFromSize, type FrameSize, type TextAlign } from '../types/FrameTypes';
  import type { FrameLocalizedText } from '../types/FrameTypes';
  import type { Language } from '../types/Language';
  import { FRAMES } from '../data/frames';
  import PixelButton from './PixelButton.svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import LanguageTabs from './LanguageTabs.svelte';
  import ColorPicker from './ColorPicker.svelte';
  
  const ACCENT_COLOR = '#9b59b6'; // Purple for frames
  
  // Use shared builder preview language store
  let selectedLanguage = $derived($builderPreviewLanguage);
  
  // Get the selected frame
  let currentFrame = $derived($selectedFrame);
  
  // Get text for current language
  let currentText = $derived<FrameLocalizedText | null>(
    currentFrame?.texts.find(t => t.language === selectedLanguage) ?? null
  );
  
  // Get current frame size from scale
  let currentSize = $derived<FrameSize>(
    currentFrame ? getSizeFromScale(currentFrame.scale ?? 4) : 'M'
  );

  function handleTextChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!$selectedFrameId || !currentFrame) return;
    
    const newTexts = currentFrame.texts.map(t => 
      t.language === selectedLanguage ? { ...t, text: target.value } : t
    );
    
    // If language doesn't exist yet, add it
    if (!newTexts.some(t => t.language === selectedLanguage)) {
      newTexts.push({ language: selectedLanguage, text: target.value });
    }
    
    updatePlacedFrame($selectedFrameId, { texts: newTexts });
  }
  
  function handleUrlChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { url: target.value || undefined });
  }
  
  function handleBackgroundColorSelect(color: string) {
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { backgroundColor: color });
  }
  
  function handleTextColorSelect(color: string) {
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { textColor: color });
  }
  
  function handleTextSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { textSize: parseInt(target.value, 10) });
  }
  
  function handleFrameSizeChange(size: FrameSize) {
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { scale: getScaleFromSize(size) });
  }
  
  function handleTextAlignChange(align: TextAlign) {
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { textAlign: align });
  }

  function handleRotate() {
    if (!$selectedFrameId || !currentFrame) return;
    const currentRotation = currentFrame.rotation ?? 0;
    const newRotation = currentRotation === 0 ? 90 : 0;
    updatePlacedFrame($selectedFrameId, { rotation: newRotation });
  }
  
  function handleDelete() {
    if (!$selectedFrameId) return;
    deletePlacedFrame($selectedFrameId);
  }
  
  function handleClose() {
    closeFramePanel();
    selectFrame(null);
  }
  
  function handleLanguageSelect(lang: Language) {
    setBuilderPreviewLanguage(lang);
  }
  
  // Style picker state
  let isStylePickerOpen = $state(false);
  let stylePickerElement = $state<HTMLDivElement | null>(null);
  let styleButtonElement = $state<HTMLButtonElement | null>(null);
  
  function handleFrameStyleChange(frameKey: string) {
    if (!$selectedFrameId) return;
    updatePlacedFrame($selectedFrameId, { frameKey });
  }
  
  function toggleStylePicker() {
    isStylePickerOpen = !isStylePickerOpen;
  }
  
  // Scroll to style picker when it opens
  $effect(() => {
    if (isStylePickerOpen && stylePickerElement) {
      requestAnimationFrame(() => {
        stylePickerElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  });
  
  // Close style picker when clicking outside
  $effect(() => {
    if (!isStylePickerOpen) return;
    
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        stylePickerElement && !stylePickerElement.contains(target) &&
        styleButtonElement && !styleButtonElement.contains(target)
      ) {
        isStylePickerOpen = false;
      }
    }
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

{#if $isFramePanelOpen && currentFrame}
  <DraggablePanel
    panelId="frame-panel"
    title="Edit Frame"
    initialRight={10}
    initialTop={160}
    width={280}
    height={520}
    minWidth={250}
    minHeight={450}
    maxWidth={500}
    maxHeight={700}
    resizable={true}
    showClose={true}
    onclose={handleClose}
  >
    <div class="panel-content">
      <LanguageTabs 
        {selectedLanguage} 
        onselect={handleLanguageSelect}
        accentColor={ACCENT_COLOR}
      />
      
      <!-- Frame Size (S/M/L) + Rotation -->
      <div class="frame-size-row">
        <div class="frame-size-section">
          <span class="section-label">Frame Size</span>
          <div class="size-buttons">
            {#each Object.entries(FRAME_SIZES) as [size, { label }]}
              <button
                class="size-btn"
                class:active={currentSize === size}
                onclick={() => handleFrameSizeChange(size as FrameSize)}
                title={label}
              >
                {size}
              </button>
            {/each}
          </div>
        </div>
        
        <div class="rotate-section">
          <span class="section-label">Rotate</span>
          <button 
            class="rotate-btn" 
            onclick={handleRotate}
            title={currentFrame.rotation === 90 ? 'Portrait (click to rotate)' : 'Landscape (click to rotate)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="panel-extras">
        <!-- Single text input -->
        <div class="text-section">
          <label for="frame-text">Text</label>
          <textarea 
            id="frame-text"
            value={currentText?.text ?? ''}
            oninput={handleTextChange}
            placeholder="Enter text..."
            rows="3"
          ></textarea>
        </div>
        
        <!-- Text Size -->
        <div class="size-rotation-row">
          <div class="size-section">
            <label for="text-size">Text Size</label>
            <select 
              id="text-size" 
              value={currentFrame.textSize ?? DEFAULT_TEXT_SIZE}
              onchange={handleTextSizeChange}
            >
              {#each TEXT_SIZES as size}
                <option value={size}>{size}px</option>
              {/each}
            </select>
          </div>
        </div>
        
        <!-- Text Alignment -->
        <div class="text-align-section">
          <span class="section-label">Text Alignment</span>
          <div class="align-buttons">
            {#each TEXT_ALIGNMENTS as { value, label }}
              <button
                class="align-btn"
                class:active={( currentFrame.textAlign ?? DEFAULT_TEXT_ALIGN) === value}
                onclick={() => handleTextAlignChange(value)}
                title={label}
              >
                {label}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- URL Link input -->
        <div class="url-section">
          <label for="frame-url">Link URL (opens on click)</label>
          <input 
            id="frame-url"
            type="url"
            value={currentFrame.url ?? ''}
            oninput={handleUrlChange}
            placeholder="https://example.com"
          />
          {#if currentFrame.url}
            <a href={currentFrame.url} target="_blank" rel="noopener noreferrer" class="url-preview">
              Test link ↗
            </a>
          {/if}
        </div>
        
        <!-- Text Color -->
        <ColorPicker
          colors={TEXT_COLORS}
          selectedColor={currentFrame.textColor ?? DEFAULT_TEXT_COLOR}
          onselect={handleTextColorSelect}
          label="Text Color"
          accentColor={ACCENT_COLOR}
        />
        
        <!-- Background Color -->
        <ColorPicker
          colors={FRAME_COLORS}
          selectedColor={currentFrame.backgroundColor}
          onselect={handleBackgroundColorSelect}
          label="Background Color"
          accentColor={ACCENT_COLOR}
        />
        
        <!-- Frame Style Picker -->
        <div class="style-section">
          <span class="section-label">Frame Style</span>
          <button 
            class="style-button"
            bind:this={styleButtonElement}
            onclick={toggleStylePicker}
            title="Change frame style"
          >
            <img 
              src={FRAMES.find(f => f.key === currentFrame.frameKey)?.path ?? ''} 
              alt="Current frame" 
              class="style-preview"
            />
            <span class="style-label">Change Style</span>
          </button>
          
          {#if isStylePickerOpen}
            <div class="style-picker" bind:this={stylePickerElement}>
              {#each FRAMES as frame}
                <button
                  class="style-item"
                  class:selected={currentFrame.frameKey === frame.key}
                  onclick={() => handleFrameStyleChange(frame.key)}
                  title={frame.name}
                >
                  <img src={frame.path} alt={frame.name} />
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
      <div class="panel-footer">
        <PixelButton variant="purple" onclick={handleClose}>
          CONFIRM
        </PixelButton>
        <PixelButton variant="red" onclick={handleDelete}>
          DELETE
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
  
  .text-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .text-section label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .text-section textarea {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: inherit;
    font-size: 10px;
    padding: 8px;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 60px;
  }
  
  .text-section textarea:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  .panel-extras {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  
  .size-rotation-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }
  
  .frame-size-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    padding: 12px;
  }
  
  .frame-size-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  
  .frame-size-section .section-label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .size-buttons {
    display: flex;
    gap: 4px;
  }
  
  .size-btn {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    padding: 10px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 40px;
  }
  
  .size-btn:hover {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.2);
  }
  
  .size-btn.active {
    background: #9b59b6;
    border-color: #9b59b6;
  }
  
  .size-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  
  .size-section label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .size-section select {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: inherit;
    font-size: 10px;
    padding: 8px;
    cursor: pointer;
  }
  
  .size-section select:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  .text-align-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .text-align-section .section-label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .align-buttons {
    display: flex;
    flex-direction: row;
    gap: 4px;
  }
  
  .align-btn {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
    flex: 1;
  }
  
  .align-btn:hover {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.2);
  }
  
  .align-btn.active {
    background: #9b59b6;
    border-color: #9b59b6;
  }
  
  .rotate-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  
  .rotate-section .section-label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .rotate-btn {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    padding: 6px;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .rotate-btn:hover {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.2);
  }
  
  .rotate-btn svg {
    width: 20px;
    height: 20px;
  }
  
  .url-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .url-section label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .url-section input {
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
  
  .url-section input:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  .url-preview {
    color: #9b59b6;
    font-size: 9px;
    text-decoration: none;
    align-self: flex-start;
  }
  
  .url-preview:hover {
    text-decoration: underline;
    color: #c9a0dc;
  }
  
  .panel-footer {
    padding: 12px;
    border-top: 2px solid #4a4a5a;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  /* Frame Style Picker */
  .style-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .style-section .section-label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .style-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    color: white;
    font-family: inherit;
    font-size: 10px;
    transition: border-color 0.2s;
  }
  
  .style-button:hover {
    border-color: #9b59b6;
  }
  
  .style-preview {
    width: 24px;
    height: 24px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  
  .style-label {
    color: #aaa;
  }
  
  .style-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 6px;
    background: rgba(20, 20, 30, 0.9);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    padding: 8px;
    margin-top: 4px;
  }
  
  .style-item {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 40, 50, 0.8);
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    transition: all 0.2s;
    aspect-ratio: 1;
  }
  
  .style-item:hover {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.2);
  }
  
  .style-item.selected {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.3);
  }
  
  .style-item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }
</style>
