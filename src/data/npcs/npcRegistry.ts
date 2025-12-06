export interface NPCDefinition {
  id: string;
  name: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
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
  {
    id: 'beggar',
    name: 'Beggar',
    path: 'assets/npcs/humans/beggar.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'crusader',
    name: 'Crusader',
    path: 'assets/npcs/humans/crusader.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'dealer',
    name: 'Dealer',
    path: 'assets/npcs/humans/dealer.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'female_wizard',
    name: 'Female Wizard',
    path: 'assets/npcs/humans/female_wizard.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 9, frameRate: 8 }
    }
  },
  {
    id: 'lady_christmas',
    name: 'Lady Christmas',
    path: 'assets/npcs/humans/lady_christmas.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'lady_drunk',
    name: 'Lady Drunk',
    path: 'assets/npcs/humans/lady_drunk.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 5, frameRate: 8 }
    }
  },
  {
    id: 'lovers',
    name: 'Lovers',
    path: 'assets/npcs/humans/lovers.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 6, frameRate: 8 }
    }
  },
  {
    id: 'mage',
    name: 'Mage',
    path: 'assets/npcs/humans/mage.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'medieval_servant',
    name: 'Medieval Servant',
    path: 'assets/npcs/humans/medieval_servant.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  },
  {
    id: 'town_crier',
    name: 'Town Crier',
    path: 'assets/npcs/humans/town_crier.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 8, frameRate: 8 }
    }
  },
  {
    id: 'wounded_knight',
    name: 'Wounded Knight',
    path: 'assets/npcs/humans/wounded_knight.png',
    frameWidth: 64,
    frameHeight: 64,
    scale: 4,
    animations: {
      idle: { startFrame: 0, endFrame: 4, frameRate: 8 }
    }
  }
];

export function getNPCDefinition(id: string): NPCDefinition | undefined {
  return NPC_REGISTRY.find(npc => npc.id === id);
}
