export type NPCCategory = 'humans' | 'fantasy';

export interface NPCDefinition {
  id: string;
  name: string;
  path: string;
  category: NPCCategory;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  /** 
   * Offset from top of frame where actual content starts (in pixels before scale).
   * Used for more accurate hitbox and dialog bubble positioning.
   * Default is 0 (no offset).
   */
  topOffset?: number;
  animations?: {
    idle: {
      startFrame: number;
      endFrame: number;
      frameRate: number;
    };
    interact?: {
      startFrame: number;
      endFrame: number;
      frameRate: number;
    };
  };
}

export const NPC_REGISTRY: NPCDefinition[] = [
  // HUMANS
  {
    id: 'beggar',
    name: 'Beggar',
    path: 'assets/npcs/humans/beggar.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'crusader',
    name: 'Crusader',
    path: 'assets/npcs/humans/crusader.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'dealer',
    name: 'Dealer',
    path: 'assets/npcs/humans/dealer.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'female_wizard',
    name: 'Female Wizard',
    path: 'assets/npcs/humans/female_wizard.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 9, frameRate: 8 }
    }
  },
  {
    id: 'lady_christmas',
    name: 'Lady Christmas',
    path: 'assets/npcs/humans/lady_christmas.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'lady_drunk',
    name: 'Lady Drunk',
    path: 'assets/npcs/humans/lady_drunk.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 5, frameRate: 8 }
    }
  },
  {
    id: 'lovers',
    name: 'Lovers',
    path: 'assets/npcs/humans/lovers.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 6, frameRate: 8 }
    }
  },
  {
    id: 'mage',
    name: 'Mage',
    path: 'assets/npcs/humans/mage.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'medieval_servant',
    name: 'Medieval Servant',
    path: 'assets/npcs/humans/medieval_servant.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'town_crier',
    name: 'Town Crier',
    path: 'assets/npcs/humans/town_crier.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 8, frameRate: 8 }
    }
  },
  {
    id: 'wounded_knight',
    name: 'Wounded Knight',
    path: 'assets/npcs/humans/wounded_knight.png',
    category: 'humans',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  // FANTASY
  {
    id: 'demon_old',
    name: 'Demon',
    path: 'assets/npcs/fantasy/demon_old.png',
    category: 'fantasy',
    frameWidth: 80,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 6, frameRate: 8 }
    }
  },
  {
    id: 'fairy',
    name: 'Fairy',
    path: 'assets/npcs/fantasy/fairy.png',
    category: 'fantasy',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 7, frameRate: 8 }
    }
  },
  {
    id: 'snowman_couple',
    name: 'Snowman Couple',
    path: 'assets/npcs/fantasy/snowman_couple.png',
    category: 'fantasy',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 9, frameRate: 8 }
    }
  },
  {
    id: 'toad',
    name: 'Toad',
    path: 'assets/npcs/fantasy/toad.png',
    category: 'fantasy',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 11, frameRate: 8 }
    }
  },
  {
    id: 'toad_wizard',
    name: 'Toad Wizard',
    path: 'assets/npcs/fantasy/toad_wizard.png',
    category: 'fantasy',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    topOffset: 28,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  }
];

export function getNPCDefinition(id: string): NPCDefinition | undefined {
  return NPC_REGISTRY.find(npc => npc.id === id);
}
