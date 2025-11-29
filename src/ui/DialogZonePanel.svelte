<script lang="ts">
  import { selectedDialogZoneId, dialogZones, updateDialogZoneText, deleteDialogZone, selectDialogZone, updateDialogZone } from '../stores/builderStores';
  import type { DialogZone, LocalizedText } from '../types/DialogTypes';
  import { ZONE_COLORS } from '../types/DialogTypes';
  import { DEFAULT_LANGUAGE, type Language } from '../types/Language';
  import PixelButton from './PixelButton.svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import LanguageTabs from './LanguageTabs.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import TextForm from './TextForm.svelte';
  
  const ACCENT_COLOR = '#88ddff'; // Blue for dialogs
  
  // Currently selected language tab
  let selectedLanguage = $state<Language>(DEFAULT_LANGUAGE);
  
  // Get the selected zone
  let selectedZone = $derived<DialogZone | null>(
    $dialogZones.find(z => z.id === $selectedDialogZoneId) ?? null
  );
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    selectedZone?.texts.find(t => t.language === selectedLanguage) ?? null
  );
  
  function handleTitleChange(value: string) {
    if (!$selectedDialogZoneId) return;
    updateDialogZoneText($selectedDialogZoneId, selectedLanguage, { title: value });
  }
  
  function handleContentChange(value: string) {
    if (!$selectedDialogZoneId) return;
    updateDialogZoneText($selectedDialogZoneId, selectedLanguage, { content: value });
  }
  
  function handleDelete() {
    if (!$selectedDialogZoneId) return;
    deleteDialogZone($selectedDialogZoneId);
  }
  
  function handleClose() {
    selectDialogZone(null);
  }
  
  function handleColorSelect(color: string) {
    if (!$selectedDialogZoneId) return;
    updateDialogZone($selectedDialogZoneId, { color });
  }
  
  function handleLanguageSelect(lang: Language) {
    selectedLanguage = lang;
  }
</script>

{#if selectedZone}
  <DraggablePanel
    panelId="dialog-zone-panel"
    title="Dialog Zone"
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
      
      <TextForm
        title={currentText?.title ?? ''}
        content={currentText?.content ?? ''}
        ontitlechange={handleTitleChange}
        oncontentchange={handleContentChange}
        titlePlaceholder="Enter title..."
        contentPlaceholder="Enter dialog text..."
        idPrefix="dialog"
        accentColor={ACCENT_COLOR}
      />
      
      <div class="panel-extras">
        <ColorPicker
          colors={ZONE_COLORS}
          selectedColor={selectedZone.color}
          onselect={handleColorSelect}
          label="Zone Color"
          accentColor={ACCENT_COLOR}
        />
      </div>
      
      <div class="panel-footer">
        <PixelButton variant="red" onclick={handleDelete}>
          DELETE ZONE
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
  }
  
  .panel-footer {
    padding: 12px;
    border-top: 2px solid #4a4a5a;
    display: flex;
    justify-content: center;
  }
</style>
