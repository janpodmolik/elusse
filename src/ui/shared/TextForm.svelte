<script lang="ts">
  import { MAX_DIALOG_CONTENT_LENGTH } from '../../constants/uiConstants';
  
  interface Props {
    /** Current content value */
    content: string;
    /** Callback when content changes */
    oncontentchange: (value: string) => void;
    /** Content placeholder */
    contentPlaceholder?: string;
    /** ID prefix for accessibility */
    idPrefix?: string;
    /** Accent color for focus (default: blue) */
    accentColor?: string;
  }
  
  let { 
    content, 
    oncontentchange,
    contentPlaceholder = 'Enter text...',
    idPrefix = 'text-form',
    accentColor = '#88ddff'
  }: Props = $props();
  
  function handleContentInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    oncontentchange(target.value);
  }
</script>

<div class="form-section" style:--accent-color={accentColor}>
  <div class="form-group">
    <label for="{idPrefix}-content">Content (max {MAX_DIALOG_CONTENT_LENGTH} chars)</label>
    <textarea 
      id="{idPrefix}-content"
      value={content}
      oninput={handleContentInput}
      placeholder={contentPlaceholder}
      rows="6"
      maxlength={MAX_DIALOG_CONTENT_LENGTH}
    ></textarea>
  </div>
</div>

<style>
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
    resize: none;
    min-height: 80px;
    flex: 1;
  }
  
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  /* Content textarea group should grow */
  .form-group:has(textarea) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
