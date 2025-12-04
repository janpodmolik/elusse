<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Phaser from 'phaser';
  import PixelButton from '../shared/PixelButton.svelte';
  import {
    type Gender,
    type ModularCategory,
    type ModularItem,
    type ModularCharacterSelection,
    type ClothingSubcategory,
    LAYER_ORDER,
    CLOTHING_UI_ORDER,
    getItemsForGender,
    getClothingBySubcategory,
    createDefaultSelection,
    getModularAssetPath,
    getItemById,
  } from '../../data/modularConfig';
  import { getSavedCharacterSelection } from '../../data/CharacterStorage';
  import CharacterPreviewScene from '../../scenes/CharacterPreviewScene';
  
  // ============================================================================
  // State
  // ============================================================================
  
  let phaserGame: Phaser.Game | null = $state(null);
  let gameContainer: HTMLDivElement | null = $state(null);
  
  // Character selection state
  let selection: ModularCharacterSelection = $state(createDefaultSelection('male'));
  
  // UI state
  let activeCategory: ModularCategory = $state('skins');
  let activeClothingSubcategory: ClothingSubcategory = $state('chest');
  
  // Computed items for current gender
  let currentItems = $derived(getItemsForGender(selection.gender));
  let currentClothingBySubcategory = $derived(getClothingBySubcategory(selection.gender));
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  onMount(() => {
    loadSavedSelection();
    initPhaser();
  });
  
  onDestroy(() => {
    phaserGame?.destroy(true);
    phaserGame = null;
  });
  
  // ============================================================================
  // Phaser initialization
  // ============================================================================
  
  function initPhaser() {
    if (!gameContainer) return;
    
    // Get container size for responsive canvas
    const rect = gameContainer.getBoundingClientRect();
    const width = Math.floor(rect.width) || 400;
    const height = Math.floor(rect.height) || 400;
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: gameContainer,
      transparent: true,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [CharacterPreviewScene],
    };
    
    phaserGame = new Phaser.Game(config);
    
    // Pass initial selection to scene
    phaserGame.events.once('ready', () => {
      updatePreview();
    });
  }
  
  // ============================================================================
  // Selection management
  // ============================================================================
  
  function setGender(gender: Gender) {
    if (selection.gender === gender) return;
    // Reset selection for new gender
    selection = createDefaultSelection(gender);
    updatePreview();
  }
  
  function selectSkin(item: ModularItem) {
    selection.skin = item.id;
    updatePreview();
  }
  
  function selectHair(item: ModularItem) {
    // Toggle off if already selected
    selection.hair = selection.hair === item.id ? null : item.id;
    updatePreview();
  }

  function selectClothing(item: ModularItem) {
    // Only one item per subcategory allowed
    // Remove any existing item from same subcategory, then add this one (or toggle off)
    const isCurrentlySelected = selection.clothing.includes(item.id);
    
    // Filter out items from the same subcategory
    const filtered = selection.clothing.filter(id => {
      const existing = getItemById(id);
      return existing?.subcategory !== item.subcategory;
    });
    
    if (isCurrentlySelected) {
      // Toggle off - just use filtered list
      selection.clothing = filtered;
    } else {
      // Select this item
      selection.clothing = [...filtered, item.id];
    }
    updatePreview();
  }
  
  function getSelectedClothingForSubcategory(subcategory: ClothingSubcategory): string | null {
    for (const id of selection.clothing) {
      const item = getItemById(id);
      if (item?.subcategory === subcategory) {
        return id;
      }
    }
    return null;
  }
  
  function isSelected(item: ModularItem): boolean {
    switch (item.category) {
      case 'skins':
        return selection.skin === item.id;
      case 'hair':
        return selection.hair === item.id;
      case 'clothing':
        return selection.clothing.includes(item.id);
      default:
        return false;
    }
  }
  
  function handleItemClick(item: ModularItem) {
    switch (item.category) {
      case 'skins':
        selectSkin(item);
        break;
      case 'hair':
        selectHair(item);
        break;
      case 'clothing':
        selectClothing(item);
        break;
    }
  }
  
  // Get preview image path for an item (first frame)
  function getItemPreviewPath(item: ModularItem): string {
    return getModularAssetPath(item);
  }  // ============================================================================
  // Preview & Persistence
  // ============================================================================
  
  function updatePreview() {
    if (!phaserGame) return;
    const scene = phaserGame.scene.getScene('CharacterPreviewScene') as CharacterPreviewScene;
    if (scene && scene.updateCharacter) {
      scene.updateCharacter(selection);
    }
  }
  
  function saveSelection() {
    localStorage.setItem('characterSelection', JSON.stringify(selection));
  }
  
  function loadSavedSelection() {
    const saved = getSavedCharacterSelection();
    if (saved) {
      selection = saved;
    }
  }
  
  function handleSaveAndPlay() {
    saveSelection();
    // Mark that we want to use the modular player
    localStorage.setItem('useModularPlayer', 'true');
    // Navigate back to character/background selection
    window.location.href = '/';
  }
  
  // ============================================================================
  // Animation controls
  // ============================================================================
  
  let currentAnimation = $state('idle');
  const animations = ['idle', 'run'];
  
  function playAnimation(animName: string) {
    currentAnimation = animName;
    if (!phaserGame) return;
    const scene = phaserGame.scene.getScene('CharacterPreviewScene') as CharacterPreviewScene;
    if (scene && scene.playAnimation) {
      scene.playAnimation(animName);
    }
  }
</script>

<div class="character-builder">
  <!-- Header -->
  <header class="header">
    <h1>Character Builder</h1>
    <PixelButton variant="green" onclick={handleSaveAndPlay}>
      SAVE & PLAY
    </PixelButton>
  </header>
  
  <div class="main-content">
    <!-- Preview section (always visible, on top on mobile) -->
    <div class="preview-section">
      <div class="preview-container" bind:this={gameContainer}></div>
      
      <!-- Animation buttons -->
      <div class="animation-controls">
        {#each animations as anim}
          <button 
            class="anim-btn"
            class:active={currentAnimation === anim}
            onclick={() => playAnimation(anim)}
          >
            {anim}
          </button>
        {/each}
      </div>
    </div>
    
    <!-- Selection panel -->
    <div class="selection-panel">
      <!-- Gender toggle -->
        <div class="gender-toggle">
          <button 
            class="gender-btn"
            class:active={selection.gender === 'male'}
            onclick={() => setGender('male')}
          >
            Male
          </button>
          <button 
            class="gender-btn"
            class:active={selection.gender === 'female'}
            onclick={() => setGender('female')}
          >
            Female
          </button>
        </div>
        
        <!-- Category tabs -->
        <div class="category-tabs">
          {#each LAYER_ORDER as category}
            <button 
              class="category-tab"
              class:active={activeCategory === category}
              onclick={() => activeCategory = category}
            >
              {category}
            </button>
          {/each}
        </div>
        
        <!-- Clothing subcategory tabs (only shown when clothing is active) -->
        {#if activeCategory === 'clothing'}
          <div class="subcategory-tabs">
            {#each CLOTHING_UI_ORDER as subcategory}
              <button 
                class="subcategory-tab"
                class:active={activeClothingSubcategory === subcategory}
                onclick={() => activeClothingSubcategory = subcategory}
              >
                {subcategory}
              </button>
            {/each}
          </div>
        {/if}
        
        <!-- Items grid -->
        <div class="items-grid">
          {#if activeCategory === 'clothing'}
            {#each currentClothingBySubcategory[activeClothingSubcategory] as item}
              <button 
                class="item-btn"
                class:selected={isSelected(item)}
                onclick={() => handleItemClick(item)}
                title={item.name}
              >
                <div class="item-preview">
                  <img src={getItemPreviewPath(item)} alt={item.name} class="preview-img" />
                </div>
                <span class="item-name">{item.name}</span>
              </button>
            {/each}
          {:else}
            {#each currentItems[activeCategory] as item}
              <button 
                class="item-btn"
                class:selected={isSelected(item)}
                onclick={() => handleItemClick(item)}
                title={item.name}
              >
                <div class="item-preview">
                  <img src={getItemPreviewPath(item)} alt={item.name} class="preview-img" />
                </div>
                <span class="item-name">{item.name}</span>
              </button>
            {/each}
          {/if}
        </div>
    </div>
  </div>
</div>

<style>
  .character-builder {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    font-family: 'Press Start 2P', monospace;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 3px solid #333;
    flex-shrink: 0;
  }
  
  .header h1 {
    font-size: 16px;
    margin: 0;
    text-shadow: 2px 2px 0 #000;
  }
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 15px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  /* Selection panel (now on top) */
  .selection-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
  }
  
  .gender-toggle {
    display: flex;
    gap: 10px;
  }
  
  .gender-btn {
    flex: 1;
    padding: 12px;
    background: #2a2a4a;
    border: 3px solid #444;
    color: #aaa;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .gender-btn:hover {
    background: #3a3a5a;
    color: white;
  }
  
  .gender-btn.active {
    background: #9b59b6;
    border-color: #8e44ad;
    color: white;
  }
  
  .category-tabs {
    display: flex;
    gap: 8px;
  }
  
  .category-tab {
    flex: 1;
    padding: 10px 8px;
    background: #2a2a4a;
    border: 2px solid #444;
    color: #aaa;
    font-family: inherit;
    font-size: 10px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .category-tab:hover {
    background: #3a3a5a;
    color: white;
  }
  
  .category-tab.active {
    background: #27ae60;
    border-color: #229954;
    color: white;
  }
  
  .subcategory-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .subcategory-tab {
    flex: 1;
    padding: 8px 6px;
    background: #1a1a3a;
    border: 2px solid #383858;
    color: #888;
    font-family: inherit;
    font-size: 9px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 55px;
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .subcategory-tab:hover {
    background: #2a2a4a;
    color: #bbb;
  }
  
  .subcategory-tab.active {
    background: #e67e22;
    border-color: #d35400;
    color: white;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 2px solid #333;
    border-radius: 4px;
    max-height: 280px;
    overflow-y: auto;
    align-content: start;
  }
  
  .item-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: #2a2a4a;
    border: 2px solid #444;
    color: #ccc;
    font-family: inherit;
    font-size: 7px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
    height: fit-content;
  }
  
  .item-btn:hover {
    background: #3a3a5a;
    border-color: #555;
    color: white;
  }
  
  .item-btn.selected {
    background: #3498db;
    border-color: #2980b9;
    color: white;
  }
  
  .item-preview {
    width: 80px;
    height: 64px;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    image-rendering: pixelated;
  }
  
  .preview-img {
    width: 800px;
    height: 448px;
    object-fit: none;
    object-position: 0 0;
    transform: scale(1);
    transform-origin: top left;
    image-rendering: pixelated;
  }
  
  .item-name {
    word-break: break-word;
    line-height: 1.3;
    max-width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  /* Preview section */
  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }
  
  .preview-container {
    height: 200px;
    background: 
      linear-gradient(to right, #2a2a4a 1px, transparent 1px),
      linear-gradient(to bottom, #2a2a4a 1px, transparent 1px),
      #1a1a2e;
    background-size: 16px 16px;
    border: 4px solid #333;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .animation-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .anim-btn {
    padding: 6px 10px;
    background: #2a2a4a;
    border: 2px solid #444;
    color: #aaa;
    font-family: inherit;
    font-size: 9px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .anim-btn:hover {
    background: #3a3a5a;
    color: white;
  }
  
  .anim-btn.active {
    background: #4a90e2;
    border-color: #357abd;
    color: white;
  }
  
  /* Scrollbar styling */
  .items-grid::-webkit-scrollbar,
  .main-content::-webkit-scrollbar {
    width: 8px;
  }
  
  .items-grid::-webkit-scrollbar-track,
  .main-content::-webkit-scrollbar-track {
    background: #1a1a2e;
  }
  
  .items-grid::-webkit-scrollbar-thumb,
  .main-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  
  .items-grid::-webkit-scrollbar-thumb:hover,
  .main-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  /* Desktop: side by side layout */
  @media (min-width: 900px) {
    .main-content {
      flex-direction: row;
      overflow: hidden;
    }
    
    .selection-panel {
      flex: 1;
      max-width: 550px;
      overflow-y: auto;
    }
    
    .items-grid {
      flex: 1;
      max-height: none;
    }
    
    .preview-section {
      width: 300px;
      flex-shrink: 0;
    }
    
    .preview-container {
      flex: 1;
      height: auto;
      min-height: 200px;
    }
    
    .selection-toggle {
      display: none !important;
    }
  }
  
  /* Mobile */
  @media (max-width: 899px) {
    .header h1 {
      font-size: 12px;
    }
    
    .items-grid {
      max-height: 200px;
    }
  }
  
  /* Very small screens */
  @media (max-width: 500px) {
    .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    }
    
    .item-preview {
      width: 64px;
      height: 52px;
    }
    
    .preview-img {
      transform: scale(0.8);
    }
    
    .subcategory-tab {
      min-width: 45px;
      font-size: 8px;
      padding: 6px 4px;
    }
  }
</style>
