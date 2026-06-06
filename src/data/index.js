// ============================================================
// 三国志英杰传 重制版 - 战斗数据模块统一导出
// ============================================================

// 常量定义
export {
  GAME_STATE,
  TERRAIN, TERRAIN_NAMES, TERRAIN_COLORS, TERRAIN_ICONS,
  TERRAIN_DEF_MODIFIER, TERRAIN_RECOVERY,
  UNIT_CLASS, CLASS_DATA,
  ATTACK_RANGE,
  AI_TYPE,
  WEATHER, WEATHER_NAMES,
  WAR_ACTION,
  WAR_CONSTANTS,
  HEX_DIRS,
  bzSuper,
  CLASS_ADVANTAGE_MULT,
  CLASS_DISADVANTAGE_MULT,
  CLASS_TERRAIN_COST,
  getMoveCost,
  isTerrainHpRecovery,
  isTerrainMoraleRecovery,
  limitX,
  between,
} from './WarConst.js';

// 战斗计算
export {
  warAtkHurt,
  warAddExp,
  warRest,
  checkZOC,
  getAtkFW,
} from './WarCalc.js';

// 移动系统
export {
  calMoveStep,
  canExistXY,
  getMoveRange,
  searchMovePath,
  getHexDirections,
  getHexNeighbors,
} from './WarMove.js';

// AI系统
export {
  runAI,
  aiSub,
} from './WarAI.js';

// 策略系统
export {
  MAGIC_TYPE,
  EFFECT_RANGE,
  MAGIC_DATA,
  warMagicHitRatio,
  warMagicHurt,
  warMagicCheck,
  getMagicEffectRange,
  getAvailableMagics,
} from './WarMagic.js';
