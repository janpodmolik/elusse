<script lang="ts">
  import { selectedSocialId, selectedSocial, deletePlacedSocial, selectSocial, updatePlacedSocial, isSocialPanelOpen, closeSocialPanel } from '../stores/builderStores';
  import { SOCIAL_SIZES, getSizeFromScale, getScaleFromSize, type SocialSize, DEFAULT_SOCIAL_SCALE } from '../types/SocialTypes';
  import { SOCIALS } from '../data/socials';
  import PixelButton from './PixelButton.svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  
  const ACCENT_COLOR = '#e67e22'; // Orange for socials
  
  // Get the selected social
  let currentSocial = $derived($selectedSocial);
  
  // Get current social size from scale
  let currentSize = $derived<SocialSize>(
    currentSocial ? getSizeFromScale(currentSocial.scale ?? DEFAULT_SOCIAL_SCALE) : 'M'
  );
  
  // Get current social definition for display
  let socialDef = $derived(
    currentSocial ? SOCIALS.find(s => s.key === currentSocial.socialKey) : null
  );
  
  function handleUrlChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!$selectedSocialId) return;
    updatePlacedSocial($selectedSocialId, { url: target.value || undefined });
  }
  
  function handleSocialSizeChange(size: SocialSize) {
    if (!$selectedSocialId) return;
    updatePlacedSocial($selectedSocialId, { scale: getScaleFromSize(size) });
  }
  
  function handleDelete() {
    if (!$selectedSocialId) return;
    deletePlacedSocial($selectedSocialId);
  }
  
  function handleClose() {
    closeSocialPanel();
    selectSocial(null);
  }
  
  // Style picker state
  let isStylePickerOpen = $state(false);
  let stylePickerElement = $state<HTMLDivElement | null>(null);
  let styleButtonElement = $state<HTMLButtonElement | null>(null);
  
  function handleSocialStyleChange(socialKey: string) {
    if (!$selectedSocialId) return;
    updatePlacedSocial($selectedSocialId, { socialKey });
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

{#if $isSocialPanelOpen && currentSocial}
  <DraggablePanel
    panelId="social-panel"
    title="Edit Social"
    initialRight={10}
    initialTop={160}
    width={280}
    height={350}
    minWidth={250}
    minHeight={300}
    maxWidth={400}
    maxHeight={500}
    resizable={true}
    showClose={true}
    onclose={handleClose}
  >
    <div class="panel-content">
      <!-- Social Size (S/M/L) -->
      <div class="social-size-row">
        <div class="social-size-section">
          <span class="section-label">Size</span>
          <div class="size-buttons">
            {#each Object.entries(SOCIAL_SIZES) as [size, { label }]}
              <button
                class="size-btn"
                class:active={currentSize === size}
                onclick={() => handleSocialSizeChange(size as SocialSize)}
                title={label}
              >
                {size}
              </button>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="panel-extras">
        <!-- URL Link input -->
        <div class="url-section">
          <label for="social-url">Link URL (opens on click)</label>
          <input 
            id="social-url"
            type="url"
            value={currentSocial.url ?? ''}
            oninput={handleUrlChange}
            placeholder="https://example.com"
          />
          {#if currentSocial.url}
            <a href={currentSocial.url} target="_blank" rel="noopener noreferrer" class="url-preview">
              Test link ↗
            </a>
          {/if}
        </div>
        
        <!-- Social Style Picker -->
        <div class="style-section">
          <span class="section-label">Social Icon</span>
          <button 
            class="style-button"
            bind:this={styleButtonElement}
            onclick={toggleStylePicker}
            title="Change social icon"
          >
            <img 
              src={socialDef?.path ?? ''} 
              alt="Current social" 
              class="style-preview"
            />
            <span class="style-label">{socialDef?.name ?? 'Select'}</span>
          </button>
          
          {#if isStylePickerOpen}
            <div class="style-picker" bind:this={stylePickerElement}>
              {#each SOCIALS as social}
                <button
                  class="style-item"
                  class:selected={currentSocial.socialKey === social.key}
                  onclick={() => handleSocialStyleChange(social.key)}
                  title={social.name}
                >
                  <img src={social.path} alt={social.name} />
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
      <div class="panel-footer">
        <PixelButton variant="orange" onclick={handleClose}>
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
  
  .panel-extras {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  
  .social-size-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    padding: 12px;
  }
  
  .social-size-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  
  .social-size-section .section-label,
  .style-section .section-label {
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
    border-color: #e67e22;
    background: rgba(230, 126, 34, 0.2);
  }
  
  .size-btn.active {
    background: #e67e22;
    border-color: #e67e22;
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
    border-color: #e67e22;
  }
  
  .url-preview {
    color: #e67e22;
    font-size: 9px;
    text-decoration: none;
    align-self: flex-start;
    transition: opacity 0.15s ease;
  }
  
  .url-preview:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
  
  .style-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .style-button {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .style-button:hover {
    border-color: #e67e22;
  }
  
  .style-preview {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  
  .style-label {
    color: white;
    font-size: 10px;
    font-family: 'Press Start 2P', monospace;
  }
  
  .style-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 6px;
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    padding: 8px;
    max-height: 150px;
    overflow-y: auto;
  }
  
  .style-item {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 40, 60, 0.8);
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    aspect-ratio: 1;
  }
  
  .style-item:hover {
    border-color: #e67e22;
    background: rgba(230, 126, 34, 0.2);
  }
  
  .style-item.selected {
    border-color: #e67e22;
    background: rgba(230, 126, 34, 0.3);
  }
  
  .style-item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  
  .panel-footer {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #333;
    margin-top: auto;
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .social-size-row {
      padding: 8px;
    }
    
    .panel-extras {
      padding: 0 8px 8px;
      gap: 10px;
    }
    
    .size-btn {
      font-size: 9px;
      padding: 8px 12px;
    }
    
    .panel-footer {
      padding: 8px;
    }
  }
</style>
