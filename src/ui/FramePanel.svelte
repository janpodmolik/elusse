<script lang="ts">
  import { selectedFrameId, selectedFrame, updateFrameText, deletePlacedFrame, selectFrame, updateFrameColor } from '../stores/builderStores';
  import type { LocalizedText } from '../types/DialogTypes';
  import { FRAME_COLORS } from '../types/FrameTypes';
  import { DEFAULT_LANGUAGE, type Language } from '../types/Language';
  import PixelButton from './PixelButton.svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import LanguageTabs from './LanguageTabs.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import TextForm from './TextForm.svelte';
  
  const ACCENT_COLOR = '#9b59b6'; // Purple for frames
  
  // Currently selected language tab
  let selectedLanguage = $state<Language>(DEFAULT_LANGUAGE);
  
  // Get the selected frame
  let currentFrame = $derived($selectedFrame);
  
  // Get text for current language
  let currentText = $derived<LocalizedText | null>(
    currentFrame?.texts.find(t => t.language === selectedLanguage) ?? null
  );
  
  function handleTitleChange(value: string) {
    if (!$selectedFrameId) return;
    updateFrameText($selectedFrameId, selectedLanguage, { title: value });
  }
  
  function handleContentChange(value: string) {
    if (!$selectedFrameId) return;
    updateFrameText($selectedFrameId, selectedLanguage, { content: value });
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
  }
  
  function handleLanguageSelect(lang: Language) {
    selectedLanguage = lang;
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
        contentPlaceholder="Enter frame text..."
        idPrefix="frame"
        accentColor={ACCENT_COLOR}
      />
      
      <div class="panel-extras">
        <ColorPicker
          colors={FRAME_COLORS}
          selectedColor={currentFrame.backgroundColor}
          onselect={handleColorSelect}
          label="Background Color"
          accentColor={ACCENT_COLOR}
        />
      </div>
      
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
