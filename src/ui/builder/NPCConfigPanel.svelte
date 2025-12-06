<script lang="ts">
  import { selectedNPC, updateNPCDialogText, deletePlacedNPC, updatePlacedNPC } from '../../stores/builderStores';
  import { clearSelection } from '../../stores/builderStores';
  import { isNPCConfigPanelOpen, closeNPCConfigPanel } from '../../stores/uiStores';
  import type { LocalizedText } from '../../types/DialogTypes';
  import { DEFAULT_LANGUAGE, type Language } from '../../types/Language';
  import { MAX_DIALOG_CONTENT_LENGTH } from '../../constants/uiConstants';
  import PixelButton from '../shared/PixelButton.svelte';
  import DraggablePanel from '../shared/DraggablePanel.svelte';
  import LanguageTabs from '../shared/LanguageTabs.svelte';
  import { getNPCDefinition } from '../../data/npcs/npcRegistry';
  
  const ACCENT_COLOR = '#e67e22'; // Orange for NPCs
  const DEFAULT_TRIGGER_RADIUS = 200;
  const MIN_TRIGGER_RADIUS = 100;
  const MAX_TRIGGER_RADIUS = 500;
  
  // Currently selected language tab
  let selectedLanguage = $state<Language>(DEFAULT_LANGUAGE);
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    $selectedNPC?.dialog?.find(t => t.language === selectedLanguage) ?? null
  );
  
  let npcName = $derived<string>(
    $selectedNPC ? (getNPCDefinition($selectedNPC.npcId)?.name ?? $selectedNPC.npcId) : 'NPC'
  );
  
  let triggerRadius = $derived<number>(
    $selectedNPC?.triggerRadius ?? DEFAULT_TRIGGER_RADIUS
  );
  
  function handleContentChange(event: Event) {
    if (!$selectedNPC) return;
    const target = event.target as HTMLTextAreaElement;
    updateNPCDialogText($selectedNPC.id, selectedLanguage, { content: target.value });
  }
  
  function handleTriggerRadiusChange(event: Event) {
    if (!$selectedNPC) return;
    const target = event.target as HTMLInputElement;
    updatePlacedNPC($selectedNPC.id, { triggerRadius: parseInt(target.value, 10) });
  }
  
  function handleDelete() {
    if (!$selectedNPC) return;
    deletePlacedNPC($selectedNPC.id);
  }
  
  function handleClose() {
    closeNPCConfigPanel();
    clearSelection();
  }
  
  function handleLanguageSelect(lang: Language) {
    selectedLanguage = lang;
  }
</script>

{#if $isNPCConfigPanelOpen && $selectedNPC}
  <DraggablePanel
    panelId="npc-config-panel"
    title={npcName}
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
      <LanguageTabs 
        {selectedLanguage} 
        onselect={handleLanguageSelect}
        accentColor={ACCENT_COLOR}
      />
      
      <div class="form-section" style:--accent-color={ACCENT_COLOR}>
        <div class="form-group">
          <label for="npc-content">Content (max {MAX_DIALOG_CONTENT_LENGTH} chars)</label>
          <textarea 
            id="npc-content"
            value={currentText?.content ?? ''}
            oninput={handleContentChange}
            placeholder="Enter dialog text..."
            rows="8"
            maxlength={MAX_DIALOG_CONTENT_LENGTH}
          ></textarea>
        </div>
        
        <div class="form-group slider-group">
          <label for="npc-trigger-radius">
            Trigger Radius
          </label>
          <input 
            type="range" 
            id="npc-trigger-radius"
            min={MIN_TRIGGER_RADIUS}
            max={MAX_TRIGGER_RADIUS}
            step="100"
            value={triggerRadius}
            oninput={handleTriggerRadiusChange}
          />
        </div>
      </div>
      
      <div class="panel-footer">
        <PixelButton variant="cyan" onclick={handleClose}>
          CONFIRM
        </PixelButton>
        <PixelButton 
          variant="red" 
          onclick={handleDelete}
        >
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
    gap: 12px;
    height: 100%;
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
    flex: 1;
    min-height: 0;
  }
  
  .form-group label {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .form-group textarea {
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    color: white;
    font-family: inherit;
    font-size: 12px;
    padding: 8px;
    resize: none;
    flex: 1;
    min-height: 100px;
  }
  
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  .slider-group {
    flex: 0 0 auto;
    min-height: auto;
  }
  
  .form-group input[type="range"] {
    width: 100%;
    height: 8px;
    background: rgba(20, 20, 30, 0.8);
    border-radius: 4px;
    appearance: none;
    cursor: pointer;
  }
  
  .form-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--accent-color);
    border-radius: 2px;
    cursor: pointer;
  }
  
  .form-group input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--accent-color);
    border-radius: 2px;
    border: none;
    cursor: pointer;
  }
  
  .panel-footer {
    margin-top: auto;
    padding: 12px;
    border-top: 2px solid #333;
    display: flex;
    justify-content: center;
    gap: 8px;
  }
</style>
