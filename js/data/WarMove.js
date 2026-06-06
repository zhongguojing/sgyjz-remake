// ============================================================
// 三国志英杰传 重制版 - 移动系统模块
// 从Lua jymain.lua WarSearchMove()/calMoveStep() 翻译
// ============================================================

import { CLASS_TERRAIN_COST, HEX_DIRS } from './WarConst.js';

// ============================================================
// BFS移动范围计算 (Lua WarSearchMove)
// ============================================================

/**
 * 计算单位的移动范围（BFS）
 * @param {Object} unit - 单位 {col, row, mov, classType}
 * @param {Array} terrain - 地形地图 [row][col]
 * @param {Array} units - 所有单位
 * @param {boolean} ignoreZOC - 是否忽略ZOC
 * @returns {Array} 可移动位置列表 [{col, row, cost, path}]
 */
export function getMoveRange(unit, terrain, units, ignoreZOC = false) {
  const maxMov = unit.mov || 3;
  const classId = getClassId(unit.classType);
  
  const visited = {};
  const queue = [{ col: unit.col, row: unit.row, cost: 0, path: [] }];
  const result = [];
  
  visited[`${unit.col},${unit.row}`] = true;
  
  while (queue.length > 0) {
    const cur = queue.shift();
    
    // 不把起始位置加入结果
    if (cur.cost > 0) {
      result.push({ col: cur.col, row: cur.row, cost: cur.cost, path: cur.path });
    }
    
    // 已达到最大移动力，不再扩展
    if (cur.cost >= maxMov) continue;
    
    // 获取邻居
    const neighbors = getHexNeighbors(cur.col, cur.row);
    
    for (const n of neighbors) {
      const key = `${n.col},${n.row}`;
      
      // 已访问
      if (visited[key]) continue;
      
      // 超出地图范围
      if (!isValidPos(n.col, n.row, terrain)) continue;
      
      // 获取地形移动消耗
      const cost = getMoveCost(classId, terrain[n.row][n.col]);
      
      // 无法通过（消耗99）
      if (cost >= 99) continue;
      
      // 已有单位占据
      if (isOccupied(n.col, n.row, units)) continue;
      
      // ZOC检测
      if (!ignoreZOC && checkZOC(n.col, n.row, unit.side, units)) {
        // ZOC: 剩余移动力减为0，但仍可进入该格
        visited[key] = true;
        result.push({ 
          col: n.col, 
          row: n.row, 
          cost: maxMov, 
          path: [...cur.path, { col: n.col, row: n.row }] 
        });
        continue;
      }
      
      // 总消耗不超过最大移动力
      if (cur.cost + cost <= maxMov) {
        visited[key] = true;
        queue.push({
          col: n.col,
          row: n.row,
          cost: cur.cost + cost,
          path: [...cur.path, { col: n.col, row: n.row }],
        });
      }
    }
  }
  
  return result;
}

// ============================================================
// 路径搜索 (Lua searchMovePath)
// ============================================================

/**
 * 搜索到目标位置的路径
 * @param {Object} unit - 单位
 * @param {number} targetCol - 目标列
 * @param {number} targetRow - 目标行
 * @param {Array} terrain - 地形地图
 * @param {Array} units - 所有单位
 * @returns {Array|null} 路径 [{col, row}] 或 null
 */
export function searchMovePath(unit, targetCol, targetRow, terrain, units) {
  const range = getMoveRange(unit, terrain, units, false);
  const target = range.find(r => r.col === targetCol && r.row === targetRow);
  
  if (target) {
    return [unit, ...target.path];
  }
  
  return null;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 获取六角格邻居（扁平顶六边形）
 */
export function getHexNeighbors(col, row) {
  // 奇数行偏移
  const oddRow = row % 2 === 1;
  
  const dirs = oddRow
    ? [{ c: 0, r: -1 }, { c: 1, r: -1 }, { c: 1, r: 0 }, { c: 0, r: 1 }, { c: -1, r: 0 }, { c: -1, r: -1 }]
    : [{ c: 0, r: -1 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }, { c: -1, r: 1 }, { c: -1, r: 0 }];
  
  return dirs.map(d => ({ col: col + d.c, row: row + d.r }));
}

/**
 * 六角格距离
 */
export function getHexDist(ca, ra, cb, rb) {
  // 转换为立方坐标
  const a = offsetToCube(ca, ra);
  const b = offsetToCube(cb, rb);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function offsetToCube(col, row) {
  const x = col;
  const z = row - (col - (col & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}

/**
 * 兵种名称转ID
 */
function getClassId(classType) {
  const map = {
    'infantry': 0, 'cavalry': 1, 'archer': 2, 'mage': 3,
    'musician': 4, 'transport': 5, 'knight': 6, 'elephant': 7,
    'navy': 8, 'assassin': 9, 'monk': 10, 'taoist': 11,
    'imperial': 12, 'general': 13, 'strategist': 14, 'guard': 15,
    'nomad': 16, 'crossbow': 17, 'berserker': 18, 'hero': 19,
  };
  return map[classType] || 0;
}

/**
 * 获取移动消耗
 */
function getMoveCost(classId, terrainId) {
  const costs = CLASS_TERRAIN_COST[classId];
  if (costs && costs[terrainId] !== undefined) {
    return costs[terrainId];
  }
  return 1;
}

/**
 * 检查位置是否有效
 */
function isValidPos(col, row, terrain) {
  if (!terrain || !terrain[0]) return false;
  return row >= 0 && row < terrain.length && col >= 0 && col < terrain[0].length;
}

/**
 * 检查位置是否被占据
 */
function isOccupied(col, row, units) {
  return units.some(u => u.col === col && u.row === row && u.hp > 0);
}

/**
 * ZOC检测
 */
function checkZOC(col, row, side, units) {
  const neighbors = getHexNeighbors(col, row);
  
  for (const n of neighbors) {
    const enemy = units.find(u => 
      u.col === n.col && 
      u.row === n.row && 
      u.side !== side && 
      u.hp > 0
    );
    
    if (enemy) return true;
  }
  
  return false;
}
