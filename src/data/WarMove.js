// ============================================================
// 三国志英杰传 重制版 - 移动系统
// 翻译自 Lua War_CalMoveStep() (jymain.lua:6729) + CheckZOC() (jymain.lua:6792)
//       + War_CanMoveXY() (jymain.lua:6810) + WarSearchMove() (jymain.lua:6495)
// ============================================================

import { getMoveCost, limitX, between } from './WarConst.js';
import { checkZOC } from './WarCalc.js';

// ==================== 计算可移动范围 ====================
// 翻译自 War_CalMoveStep() (jymain.lua:6729-6754)
//
// 参数:
//   unit: { col, row, classId, moveStep }
//   stepMax: 最大步数 (= unit.moveStep)
//   terrainMap: 2D数组, terrainMap[y][x] = 地形ID
//   units: 所有战场单位数组
//   mapWidth, mapHeight: 地图尺寸
//   flag: 0=正常移动, 1=不考虑挡路(用毒/医疗等)
//
// 返回: stepArray[step] = { positions: [{col, row, remaining}], count }
export function calMoveStep(unit, stepMax, terrainMap, units, mapWidth, mapHeight, flag = 0) {
  // 初始化层数据
  const stepArray = [];
  for (let i = 0; i <= stepMax; i++) {
    stepArray[i] = { positions: [], count: 0 };
  }

  // 记录已访问格子及其剩余步数（用于防止重复访问）
  const visited = {};  // key: "col,row" -> remaining steps + 1

  // 起点
  const startKey = `${unit.col},${unit.row}`;
  visited[startKey] = stepMax + 1;
  stepArray[0].positions.push({ col: unit.col, row: unit.row, remaining: stepMax });
  stepArray[0].count = 1;

  // BFS扩散
  for (let step = 0; step < stepMax; step++) {
    const current = stepArray[step];
    if (current.count === 0) break;

    const nextCount = findNextStep(stepArray, step, unit, terrainMap, units, mapWidth, mapHeight, visited, flag);
    if (nextCount === 0) break;
  }

  return stepArray;
}

// ==================== BFS下一步搜索 ====================
// 翻译自 War_FindNextStep() (jymain.lua:6756-6790)
function findNextStep(stepArray, step, unit, terrainMap, units, mapWidth, mapHeight, visited, flag) {
  let num = 0;
  const step1 = step + 1;
  const classId = unit.classId;

  // 六角格6方向
  const directions = getHexDirections();

  for (let i = 0; i < stepArray[step].count; i++) {
    const pos = stepArray[step].positions[i];
    if (pos.remaining <= 0) continue;

    for (const dir of directions) {
      const nx = pos.col + dir.dc;
      const ny = pos.row + dir.dr;

      // 边界检查
      if (!between(nx, 0, mapWidth - 1) || !between(ny, 0, mapHeight - 1)) continue;

      const key = `${nx},${ny}`;
      const terrainId = terrainMap[ny][nx];

      // 获取兵种地形消耗
      const terrainCost = getMoveCost(classId, terrainId);
      if (terrainCost === 0) continue; // 不可通行

      // 是否可以通过
      if (!canMoveXY(nx, ny, unit, units, flag)) continue;

      // 检查是否已访问或有更优路径
      const prevVisited = visited[key] || 0;
      if (prevVisited > 0 && prevVisited >= pos.remaining - terrainCost + 1) continue;

      // 消耗检查
      if (pos.remaining < terrainCost) continue;

      // ZOC检查：在敌方ZOC中则剩余步数归0
      let remaining;
      if (!flag && checkZOC(unit, nx, ny, units)) {
        remaining = 0; // ZOC拦截，只能到此不能再移动
      } else {
        remaining = pos.remaining - terrainCost;
      }

      num++;
      stepArray[step1].positions.push({ col: nx, row: ny, remaining });
      visited[key] = remaining + 1;
    }
  }

  stepArray[step1].count = num;
  return num;
}

// ==================== 坐标是否可通过 ====================
// 翻译自 War_CanMoveXY() (jymain.lua:6810-6823)
function canMoveXY(x, y, unit, units, flag) {
  const occupant = units.find(u => u.col === x && u.row === y && u.hp > 0);

  if (!occupant) return true; // 空格子

  // flag=true时允许穿过友军（用毒/医疗等）
  if (flag && occupant.side === unit.side) return true;

  // 不能移动到有人的格子（除非是自己）
  if (occupant === unit) return true;

  return false;
}

// ==================== 坐标是否可停留 ====================
// 翻译自 WarCanExistXY() (jymain.lua:6824-6836)
export function canExistXY(x, y, unit, units) {
  const occupant = units.find(u => u.col === x && u.row === y && u.hp > 0);
  if (!occupant) return true;
  if (occupant === unit) return true;
  // 友军可以停留在同一格？不，原版不允许
  return false;
}

// ==================== 获取移动范围（简化接口） ====================
// 返回所有可移动到的格子坐标列表（不含起点）
export function getMoveRange(unit, terrainMap, units, mapWidth, mapHeight) {
  const stepMax = unit.moveStep || unit.mov || 3;
  const stepArray = calMoveStep(unit, stepMax, terrainMap, units, mapWidth, mapHeight);

  const result = [];
  const seen = {};

  // 收集所有步数可达的格子
  for (let step = 1; step <= stepMax; step++) {
    for (const pos of stepArray[step].positions) {
      const key = `${pos.col},${pos.row}`;
      if (!seen[key] && canExistXY(pos.col, pos.row, unit, units)) {
        seen[key] = true;
        result.push({ col: pos.col, row: pos.row });
      }
    }
  }

  return result;
}

// ==================== 搜索移动到目标的路径 ====================
// 翻译自 WarSearchMove() (jymain.lua:6495-6518)
// 返回从unit当前位置到(targetX, targetY)的路径
export function searchMovePath(unit, targetX, targetY, terrainMap, units, mapWidth, mapHeight) {
  const stepMax = unit.moveStep || unit.mov || 3;
  const stepArray = calMoveStep(unit, stepMax, terrainMap, units, mapWidth, mapHeight);

  // 从目标位置回溯找路径
  const path = [];
  let found = false;

  for (let step = stepMax; step >= 0; step--) {
    for (const pos of stepArray[step].positions) {
      if (pos.col === targetX && pos.row === targetY) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // 简化：直接返回起点到终点的路径
  // 完整实现需要回溯visited数据重建路径
  path.push({ col: unit.col, row: unit.row });
  if (found && (targetX !== unit.col || targetY !== unit.row)) {
    path.push({ col: targetX, row: targetY });
  }

  return path;
}

// ==================== 六角格方向 ====================
// flat-top hexagon的6个方向偏移
// 奇数列和偶数列有不同的邻居偏移
export function getHexDirections() {
  return [
    { dc: 0, dr: -1 },   // 上
    { dc: 1, dr: 0 },    // 右上/右
    { dc: 1, dr: 1 },    // 右下/右（简化，实际取决于奇偶列）
    { dc: 0, dr: 1 },    // 下
    { dc: -1, dr: 1 },   // 左下/左
    { dc: -1, dr: 0 },   // 左上/左
  ];
}

// 获取指定列的六角格邻居（考虑奇偶列偏移）
export function getHexNeighbors(col, row) {
  const isOdd = col % 2 === 1;
  const offsets = isOdd
    ? [{ dc: 0, dr: -1 }, { dc: 1, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: -1, dr: -1 }]
    : [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 1, dr: 1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 1 }, { dc: -1, dr: 0 }];
  return offsets.map(o => ({ col: col + o.dc, row: row + o.dr }));
}
