<script lang="ts">
  import { selectedNPC, updatePlacedNPC, updateNPCDialogText, deletePlacedNPC } from '../../stores/builderStores';
  import { clearSelection } from '../../stores/builderStores';
  import type { LocalizedText } from '../../types/DialogTypes';
  import { DEFAULT_LANGUAGE, type Language } from '../../types/Language';
  import PixelButton from '../shared/PixelButton.svelte';
  import DraggablePanel from '../shared/DraggablePanel.svelte';
  import LanguageTabs from '../shared/LanguageTabs.svelte';
  import TextForm from '../shared/TextForm.svelte';
  import { getNPCDefinition } from '../../data/npcs/npcRegistry';
  
  const ACCENT_COLOR = '#e67e22'; // Orange for NPCs
  
  // Currently selected language tab
  let selectedLanguage = $state<Language>(DEFAULT_LANGUAGE);
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    $selectedNPC?.dialog?.find(t => t.language === selectedLanguage) ?? null
  );
  
  let npcName = $derived<string>(
    $selectedNPC ? (getNPCDefinition($selectedNPC.npcId)?.name ?? $selectedNPC.npcId) : 'NPC'
  );
  
  function handleTitleChange(value: string) {
    if (!$selectedNPC) return;
    updateNPCDialogText($selectedNPC.id, selectedLanguage, { title: value });
  }
  
  function handleContentChange(value: string) {
    if (!$selectedNPC) return;
    updateNPCDialogText($selectedNPC.id, selectedLanguage, { content: value });
  }
  
  function handleFlipChange() {
    if (!$selectedNPC) return;
    updatePlacedNPC($selectedNPC.id, { flipX: !$selectedNPC.flipX });
  }
  
  function handleDelete() {
    if (!$selectedNPC) return;
    deletePlacedNPC($selectedNPC.id);
  }
  
  function handleClose() {
    clearSelection();
  }
  
  function handleLanguageSelect(lang: Language) {
    selectedLanguage = lang;
  }
</script>

{#if $selectedNPC}
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
      <div class="controls-row">
        <PixelButton 
          variant="blue" 
          width="100%" 
          onclick={handleFlipChange}
        >
          FLIP: {$selectedNPC.flipX ? 'YES' : 'NO'}
        </PixelButton>
      </div>

      <div class="divider"></div>

      <LanguageTabs 
        {selectedLanguage} 
        onselect={handleLanguageSelect}
        accentColor={ACCENT_COLOR}
      />
      
      <TextForm
        title={currentText?.title ?? ''}
        content={currentText?.content ?? ''}
        ontitlechange={handleTitleChange}
        oncontentchange={handleContentChange}
        titlePlaceholder="Enter name/title..."
        contentPlaceholder="Enter dialog text..."
        idPrefix="npc"
        accentColor={ACCENT_COLOR}
      />
      
      <div class="panel-footer">
        <PixelButton 
          variant="red" 
          width="100%" 
          onclick={handleDelete}
        >
          DELETE NPC
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
  
  .controls-row {
    display: flex;
    gap: 8px;
  }
  
  .divider {
    height: 2px;
    background: #333;
    margin: 4px 0;
  }
  
  .panel-footer {
    margin-top: auto;
    padding-top: 12px;
    border-top: 2px solid #333;
  }
</style>
