// ============================================================
// 三国志英杰传 重制版 - 游戏主文件 v0.2
// 新增：兵种系统、行动菜单、策略值、经验值、敌方AI
// ============================================================

// ==================== 兵种定义 ====================
const CLASS_TYPES = {
  infantry:  { name:'步兵', atk:25, def:20, mov:3, special:'无' },
  cavalry:   { name:'骑兵', atk:30, def:18, mov:4, special:'克步兵' },
  archer:    { name:'弓兵', atk:22, def:15, mov:2, special:'克骑兵' },
  mage:      { name:'军师', atk:15, def:12, mov:2, special:'策略' },
  musician:  { name:'军乐队', atk:5,  def:10, mov:2, special:'回MP' },
  transport: { name:'运输队', atk:5,  def:10, mov:2, special:'补给' },
};

// 兵种相克表：attacker → defender → 攻击倍率
const CLASS_ADVANTAGE = {
  cavalry:   { infantry: 1.5 },
  infantry:  { archer:   1.5 },
  archer:    { cavalry:  1.5 },
};

// 地形防御加成
const TERRAIN_DEF_BONUS = { 0:0, 1:5, 2:3, 3:2 };

// 策略定义
const TACTICS = {
  fire:   { name:'火计',   mp:8,  range:2, desc:'对目标及相邻格造成伤害' },
  water: { name:'水计',   mp:8,  range:2, desc:'对目标及相邻格造成伤害' },
  heal:  { name:'医疗',   mp:5,  range:1, desc:'恢复目标HP 30点' },
  chaos: { name:'混乱',   mp:6,  range:2, desc:'使敌方下回合无法行动' },
};

// ==================== BootScene ====================
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(w/2-160, h/2-25, 320, 50);
    const loadingText = this.make.text({ x:w/2, y:h/2-50, text:'加载中...', style:{font:'18px Arial',fill:'#c9a84c'} });
    loadingText.setOrigin(0.5);
    const percentText = this.make.text({ x:w/2, y:h/2, text:'0%', style:{font:'16px Arial',fill:'#fff'} });
    percentText.setOrigin(0.5);
    this.load.on('progress', v => {
      percentText.setText(parseInt(v*100)+'%');
      progressBar.clear();
      progressBar.fillStyle(0xc9a84c,1);
      progressBar.fillRect(w/2-150, h/2-15, 300*v, 30);
    });
    this.load.on('complete', () => {
      progressBar.destroy(); progressBox.destroy(); loadingText.destroy(); percentText.destroy();
    });
    // 加载武将头像
    const heroes = [
      {id:0, name:'刘备'}, {id:1, name:'关羽'}, {id:2, name:'张飞'},
      {id:3, name:'赵云'}, {id:4, name:'诸葛亮'}, {id:5, name:'马超'},
      {id:6, name:'黄忠'}, {id:7, name:'姜维'}, {id:8, name:'魏延'},
      {id:9, name:'庞统'}, {id:20, name:'曹操'}, {id:21, name:'夏侯惇'},
      {id:22, name:'夏侯渊'}, {id:23, name:'典韦'}, {id:24, name:'许褚'},
      {id:25, name:'张辽'}, {id:26, name:'徐晃'}, {id:27, name:'曹仁'},
      {id:28, name:'司马懿'}, {id:29, name:'郭嘉'}, {id:30, name:'荀彧'},
      {id:31, name:'张郃'}, {id:32, name:'于禁'}, {id:33, name:'乐进'},
      {id:34, name:'庞德'}, {id:35, name:'孙权'}, {id:36, name:'孙策'},
      {id:37, name:'周瑜'}, {id:38, name:'陆逊'}, {id:39, name:'太史慈'},
      {id:40, name:'甘宁'}, {id:41, name:'吕蒙'}, {id:42, name:'黄盖'},
      {id:43, name:'程普'}, {id:44, name:'鲁肃'}, {id:45, name:'吕布'},
      {id:46, name:'貂蝉'}, {id:47, name:'董卓'}, {id:48, name:'袁绍'},
      {id:49, name:'公孙瓒'},
    ];
    for (const h of heroes) {
      this.load.image(`face_${h.id}`, `assets/faces/${h.id.toString().padStart(3,'0')}.png`);
    }
  }

  create() {
    this.time.delayedCall(500, () => this.scene.start('TitleScene'));
  }
}

// ==================== TitleScene ====================
class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.rectangle(0, 0, w, h, 0x0d1b2a).setOrigin(0);
    const title = this.add.text(w/2, 110, '三国志英杰传', {
      font: 'bold 48px serif', fill: '#c9a84c', stroke: '#000', strokeThickness: 4,
    });
    title.setOrigin(0.5);
    this.add.text(w/2, 170, '重制版 · REMAKE v0.2', { font:'18px Arial', fill:'#aaaaaa' }).setOrigin(0.5);
    const line = this.add.graphics();
    line.lineStyle(1, 0xc9a84c, 0.4);
    line.lineBetween(w/2-140, 200, w/2+140, 200);

    const menus = [
      { text:'开始游戏（汜水关之战）', action:() => this.scene.start('BattleScene') },
      { text:'读取存档', action:() => this.showMsg('存档功能开发中...') },
      { text:'游戏设置', action:() => this.showMsg('设置功能开发中...') },
    ];
    menus.forEach((m, i) => {
      const y = 290 + i * 55;
      const txt = this.add.text(w/2, y, m.text, { font:'22px Arial', fill:'#e0d5b0' });
      txt.setOrigin(0.5); txt.setInteractive({ useHandCursor:true });
      txt.on('pointerover', () => { txt.setFill('#fff'); txt.setScale(1.08); });
      txt.on('pointerout',  () => { txt.setFill('#e0d5b0'); txt.setScale(1); });
      txt.on('pointerdown', m.action);
    });

    this.add.text(w-10, h-10, 'v0.2.0 · 2026 · 含兵种/策略/AI', { font:'11px Arial', fill:'#555' }).setOrigin(1);
  }

  showMsg(msg) {
    const w = this.cameras.main.width;
    const t = this.add.text(w/2, 480, msg, { font:'15px Arial', fill:'#ffcc00', stroke:'#000', strokeThickness:2 });
    t.setOrigin(0.5); t.setDepth(200);
    this.tweens.add({ targets:t, alpha:0, duration:2000, delay:1000, onComplete:()=>t.destroy() });
  }
}

// ==================== BattleScene ====================
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.tiles = []; this.units = []; this.selectedUnit = null;
    this.moveRange = []; this.turn = 'player'; this.turnCount = 1;
    this.actionMenu = null;   // 当前行动菜单
    this.actedUnits = [];    // 本回合已行动单位
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1b2a');
    this.hexSize = 26;
    this.hexWidth = this.hexSize * 2;
    this.hexHeight = Math.sqrt(3) * this.hexSize;
    this.mapCols = 12; this.mapRows = 10;
    this.mapOffsetX = 40; this.mapOffsetY = 65;

    this.generateTerrain();
    this.drawHexMap();

    // 汜水关之战 初始单位（带兵种）
    this.createUnit(1, 4, '刘备', 'player', 0x2196F3, 'infantry', 28, 100, 4, 0);
    this.createUnit(2, 4, '关羽', 'player', 0x2196F3, 'infantry', 30, 100, 4, 1);
    this.createUnit(2, 5, '张飞', 'player', 0x2196F3, 'infantry', 26, 100, 3, 2);
    this.createUnit(9, 4, '华雄', 'enemy', 0xf44336, 'infantry', 32, 120, 4, 34);
    this.createUnit(8, 3, '步兵', 'enemy', 0xf44336, 'infantry', 18, 60, 3);
    this.createUnit(8, 5, '弓手', 'enemy', 0xf44336, 'archer', 16, 50, 2);

    this.createUI();
    this.showTurnNotice();
  }

  // -------- 地形生成 --------
  generateTerrain() {
    this.terrain = [];
    for (let y = 0; y < this.mapRows; y++) {
      this.terrain[y] = [];
      for (let x = 0; x < this.mapCols; x++) {
        if (x===0||x===this.mapCols-1||y===0||y===this.mapRows-1) { this.terrain[y][x]=1; }
        else {
          const r=Math.random();
          this.terrain[y][x] = r<0.12 ? 2 : r<0.24 ? 3 : 0;
        }
      }
    }
  }

  // -------- 六角格渲染 --------
  drawHexMap() {
    this.tiles = [];
    for (let y=0; y<this.mapRows; y++)
      for (let x=0; x<this.mapCols; x++) {
        const pos = this.hexToPixel(x, y);
        this.tiles.push(this.createHexTile(pos.x, pos.y, x, y));
      }
  }

  hexToPixel(col, row) {
    return {
      x: this.mapOffsetX + this.hexWidth*0.75*col,
      y: this.mapOffsetY + this.hexHeight*(row + 0.5*(col%2))
    };
  }

  getHexPoints(cx, cy, size) {
    // 返回扁平坐标数组 [x1,y1,x2,y2,...] 供 add.polygon 使用
    const pts = [];
    for (let i=0; i<6; i++) {
      const a = (Math.PI/180)*(60*i);
      pts.push(cx + size*Math.cos(a), cy + size*Math.sin(a));
    }
    return pts;
  }

  getTerrainColor(t) { return [0x4a7c3f, 0x777777, 0x8B7355, 0x2d5a27][t] || 0x4a7c3f; }
  getTerrainName(t) { return ['平地','城墙','山地','树林'][t] || '平地'; }

  createHexTile(x, y, col, row) {
    const tt = this.terrain[row][col];
    const color = this.getTerrainColor(tt);
    const pts = this.getHexPoints(x, y, this.hexSize);
    const hex = this.add.polygon(0, 0, pts, color).setStrokeStyle(1, 0x333333).setOrigin(0).setDepth(1);

    const icons = ['','城','山','林'];
    if (icons[tt]) {
      this.add.text(x, y, icons[tt], { font:'11px Arial', fill:'#fff', alpha:0.5 }).setOrigin(0.5).setDepth(2);
    }

    // 点击区域
    const hit = this.add.circle(x, y, this.hexSize*0.75, 0, 0).setInteractive().setDepth(3);
    hit.hexRef = hex; hit.col=col; hit.row=row;
    hit.on('pointerdown', () => this.onTileClick(col, row));
    hit.on('pointerover', () => { if(!hex._hl) hex.setStrokeStyle(2,0x888); });
    hit.on('pointerout',  () => { if(!hex._hl) hex.setStrokeStyle(1,0x333); });

    Object.assign(hex, { col, row, terrainType:tt, isBlocked:(tt===1), _hl:false });
    return hex;
  }

  // -------- 单位创建 --------
  createUnit(col, row, name, side, color, classType, atk, hp, mov, faceId) {
    const pos = this.hexToPixel(col, row);
    const unit = this.add.container(pos.x, pos.y).setDepth(10);

    // 兵种数据
    const cls = CLASS_TYPES[classType] || CLASS_TYPES.infantry;

    // 头像
    const faceKey = faceId !== undefined ? `face_${faceId}` : null;
    let faceImg = null;
    if (faceKey && this.textures.exists(faceKey)) {
      faceImg = this.add.image(0, -4, faceKey).setDisplaySize(32, 40);
      faceImg.setInteractive();
      faceImg.on('pointerdown', () => this.onUnitClick(unit));
    } else {
      faceImg = this.add.circle(0,0,18,color,0.85).setStrokeStyle(2, side==='player'?0x64b5f6:0xef9a9a);
      faceImg.setInteractive();
      faceImg.on('pointerdown', () => this.onUnitClick(unit));
    }

    // 兵种标签
    const classLabel = this.add.text(0, -30, cls.name.substring(0,1), {
      font:'9px Arial', fill:'#fff', stroke:'#000', strokeThickness:1,
      backgroundColor:`#${color.toString(16).padStart(6,'0')}`
    }).setOrigin(0.5).setAlpha(0.9);

    const label = this.add.text(0,23, name.slice(0,3), { font:'10px Arial',fill:'#fff',stroke:'#000',strokeThickness:2 }).setOrigin(0.5);
    const hpBg = this.add.rectangle(0,-22,30,3,0x000,0.6).setOrigin(0.5);
    const hpBar = this.add.rectangle(-15,-22,30,3, side==='player'?0x4caf50:0xf44336).setOrigin(0,0.5);

    // MP条（军师/策略单位）
    const mpBar = this.add.rectangle(-15,-20,30,2, 0x9c27b0).setOrigin(0,0.5);
    mpBar.visible = (classType === 'mage');

    unit.add([faceImg, classLabel, label, hpBg, hpBar, mpBar]);
    Object.assign(unit, {
      col, row, name, side, hp, maxHp:hp,
      classType,  // 兵种
      atk,        // 基础攻击
      def: cls.def,  // 防御
      mov,        // 基础移动力
      mp: 10, maxMp: 30,  // 策略值
      level: 1, exp: 0,   // 等级/经验
      acted: false,       // 本回合是否已行动
      confused: false,    // 混乱状态
      circle: faceImg, hpBar, mpBar, classLabel
    });

    this.units.push(unit);
    return unit;
  }

  updateHpBar(u) {
    const pct = Math.max(0, u.hp / u.maxHp);
    u.hpBar.width = 30 * pct;
    u.hpBar.x = -15;
  }

  updateMpBar(u) {
    if (!u.mpBar) return;
    const pct = Math.max(0, u.mp / u.maxMp);
    u.mpBar.width = 30 * pct;
    u.mpBar.x = -15;
    u.mpBar.visible = (u.classType === 'mage');
  }

  // -------- 点击处理 --------
  onTileClick(col, row) {
    // 如果有行动菜单打开，先处理菜单点击
    if (this.actionMenu) { this.closeActionMenu(); }

    if (this.selectedUnit && this.isInMoveRange(col, row)) {
      this.moveUnit(this.selectedUnit, col, row); return;
    }
    const u = this.getUnitAt(col, row);
    if (u && u.side===this.turn && !u.acted) this.selectUnit(u);
    else this.clearSelection();
  }

  onUnitClick(unit) {
    if (this.actionMenu) { this.closeActionMenu(); }
    if (unit.side===this.turn && !unit.acted) this.selectUnit(unit);
    else if (this.selectedUnit) this.tryAttack(this.selectedUnit, unit);
  }

  selectUnit(unit) {
    this.clearSelection();
    this.selectedUnit = unit;
    if (unit.circle instanceof Phaser.GameObjects.Image) {
      unit.circle.setTint(0xffffaa);
    } else {
      unit.circle.setStrokeStyle(3, 0xffff00);
    }
    this.moveRange = this.getMoveRange(unit);
    this.highlight(this.moveRange, 0x66bb6a);
  }

  clearSelection() { this.clearHL(); this.selectedUnit=null; this.moveRange=[]; }

  // -------- BFS 移动范围 --------
  getMoveRange(unit) {
    const maxMov = this.getActualMov(unit);
    const visited = {}; const queue = [{col:unit.col,row:unit.row,cost:0}]; const result = [];
    visited[`${unit.col},${unit.row}`] = true;
    while (queue.length) {
      const cur = queue.shift(); result.push(cur);
      if (cur.cost >= maxMov) continue;
      for (const n of this.getNeighbors(cur.col,cur.row)) {
        const key = `${n.col},${n.row}`;
        if (visited[key]||n.col<0||n.col>=this.mapCols||n.row<0||n.row>=this.mapRows) continue;
        const cost = this.getMoveCost(n.col, n.row, unit);
        if (cost>=99) continue;
        if (cur.cost+cost <= maxMov && !this.isOccupied(n.col,n.row)) {
          visited[key]=true; queue.push({col:n.col,row:n.row,cost:cur.cost+cost});
        }
      }
    }
    return result.slice(1);
  }

  getActualMov(unit) {
    // 地形影响实际移动力
    return unit.mov;
  }

  getNeighbors(col,row) {
    const off = col%2===1
      ? [{c:0,r:-1},{c:1,r:-1},{c:1,r:0},{c:0,r:1},{c:-1,r:0},{c:-1,r:-1}]
      : [{c:0,r:-1},{c:1,r:0},{c:1,r:1},{c:0,r:1},{c:-1,r:1},{c:-1,r:0}];
    return off.map(o=>({col:col+o.c, row:row+o.r}));
  }

  getMoveCost(col, row, unit) {
    const tt = this.terrain[row][col];
    const costs = [1, 99, 2, 2];  // 平地/城墙/山地/树林
    let cost = costs[tt] || 1;
    // 弓兵在树林中移动消耗+1
    if (unit.classType === 'archer' && tt === 3) cost += 1;
    return cost;
  }

  isOccupied(c,r) { return this.units.some(u=>u.col===c&&u.row===r); }
  isInMoveRange(c,r) { return this.moveRange.some(m=>m.col===c&&m.row===r); }

  // -------- 移动 --------
  moveUnit(unit, col, row) {
    const pos = this.hexToPixel(col, row);
    this.tweens.add({ targets:unit, x:pos.x, y:pos.y, duration:300, onComplete:()=>{
      unit.col=col; unit.row=row;
      this.clearSelection();
      // 移动后显示行动菜单
      this.showActionMenu(unit);
    }});
  }

  // -------- 行动菜单 --------
  showActionMenu(unit) {
    this.closeActionMenu();

    const enemiesInRange = this.getEnemiesInAttackRange(unit);
    const canAttack = enemiesInRange.length > 0;
    const canUseTactic = (unit.classType === 'mage' && unit.mp >= 5);
    const menuItems = [];

    if (canAttack) menuItems.push({ text:'攻击', color:0xf44336, action:() => this.enterAttackMode(unit) });
    if (canUseTactic) menuItems.push({ text:'策略', color:0x9c27b0, action:() => this.enterTacticMode(unit) });
    menuItems.push({ text:'待机', color:0x888888, action:() => this.unitActed(unit) });

    const menuWidth = menuItems.length * 60 + 20;
    const menuH = 36;
    const menuX = Math.min(Math.max(unit.x - menuWidth/2, 5), this.cameras.main.width - menuWidth - 5);
    const menuY = unit.y - 50;

    this.actionMenu = this.add.container(menuX, menuY).setDepth(200);
    const bg = this.add.rectangle(menuWidth/2, menuH/2, menuWidth, menuH, 0x000000, 0.85).setStrokeStyle(1, 0xc9a84c);
    this.actionMenu.add(bg);

    menuItems.forEach((item, i) => {
      const bx = 10 + i * 60 + 30;
      const btn = this.add.rectangle(bx, menuH/2, 56, 30, item.color, 0.7).setStrokeStyle(1, 0xffffff);
      btn.setInteractive({ useHandCursor:true });
      const txt = this.add.text(bx, menuH/2, item.text, { font:'13px Arial', fill:'#fff' }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFill(item.color));
      btn.on('pointerout',  () => btn.setFill(item.color, 0.7));
      btn.on('pointerdown', () => { this.closeActionMenu(); item.action(); });
      this.actionMenu.add([btn, txt]);
    });
  }

  closeActionMenu() {
    if (this.actionMenu) { this.actionMenu.destroy(); this.actionMenu = null; }
  }

  enterAttackMode(unit) {
    // 高亮可攻击的敌方单位
    const enemies = this.getEnemiesInAttackRange(unit);
    this.attackModeEnemies = enemies;
    enemies.forEach(e => {
      e.circle.setStrokeStyle(3, 0xff0000);
      e._attackMode = true;
    });
    this.showFloat('点击敌方单位进行攻击（点空白处取消）', 0xffcc00);

    // 临时覆盖点击处理
    this._attackMode = true;
    this._attackModeUnit = unit;
  }

  getEnemiesInAttackRange(unit) {
    return this.units.filter(u => u.side !== unit.side && u.hp > 0 && this.canAttack(unit, u));
  }

  canAttack(attacker, defender) {
    return this.getHexDist(attacker.col, attacker.row, defender.col, defender.row) <= 1;
  }

  // -------- 攻击 --------
  tryAttack(attacker, defender) {
    // 如果在攻击选择模式，清理高亮
    if (this._attackMode) {
      this.cleanupAttackMode();
    }

    if (this.getHexDist(attacker.col, attacker.row, defender.col, defender.row) > 1) {
      this.showFloat('不在攻击范围内！', 0xff6666); return;
    }

    // 兵种相克
    let atkMultiplier = 1.0;
    const adv = CLASS_ADVANTAGE[attacker.classType];
    if (adv && adv[defender.classType]) {
      atkMultiplier = adv[defender.classType];
    }

    // 地形防御加成
    const terrainDef = TERRAIN_DEF_BONUS[this.terrain[defender.row][defender.col]] || 0;

    // 伤害计算
    const baseDmg = attacker.atk - (defender.def + terrainDef);
    const dmg = Math.max(1, Math.floor(baseDmg * atkMultiplier + (Math.random()*10 - 4)));

    defender.hp = Math.max(0, defender.hp - dmg);

    // 攻击者获得经验
    if (defender.hp <= 0) {
      this.addExp(attacker, 20 + 5);  // 击杀经验
    } else {
      this.addExp(attacker, 5);
    }
    this.addExp(defender, 3);  // 被攻击获得经验

    // 飘字动画
    const pos = this.hexToPixel(defender.col, defender.row);
    this.showDmg(pos.x, pos.y-25, dmg);

    // 兵种相克提示
    if (atkMultiplier > 1) {
      this.showFloat('兵种优势！', 0x66ff66);
    }

    // 受击闪烁
    this.tweens.add({ targets:defender, alpha:0.3, duration:80, yoyo:true, repeat:3, onComplete:()=>defender.alpha=1 });

    this.updateHpBar(defender);

    // 检查死亡
    if (defender.hp <= 0) {
      this.time.delayedCall(400, () => {
        this.units = this.units.filter(u=>u!==defender);
        defender.destroy();
        this.checkEnd();
      });
    }

    // 攻击后进入待机
    this.unitActed(attacker);
  }

  cleanupAttackMode() {
    if (this._attackModeEnemies) {
      this._attackModeEnemies.forEach(e => { if (e.active) e.circle.setStrokeStyle(2, e.side==='player'?0x64b5f6:0xef9a9a); });
    }
    this._attackMode = false;
    this._attackModeUnit = null;
    this._attackModeEnemies = null;
  }

  // -------- 策略系统 --------
  enterTacticMode(unit) {
    this.showFloat('策略功能开发中...', 0xffcc00);
    // TODO: 实现策略施法范围选择
    this.time.delayedCall(1000, () => this.unitActed(unit));
  }

  // -------- 经验值 --------
  addExp(unit, amount) {
    unit.exp += amount;
    // 检查升级
    const expNeeded = 100 * (unit.level - 1);
    if (unit.exp >= expNeeded + 100) {
      unit.level++;
      unit.exp -= (expNeeded + 100);
      // 随机提升属性
      unit.atk += Math.floor(Math.random()*3) + 1;
      unit.def += Math.floor(Math.random()*2) + 1;
      unit.maxHp += Math.floor(Math.random()*5) + 3;
      unit.hp = unit.maxHp;
      this.showFloat(`${unit.name} 升级到 Lv${unit.level}！`, 0x66ff66);
      this.updateHpBar(unit);
    }
  }

  // -------- 单位行动完毕 --------
  unitActed(unit) {
    unit.acted = true;
    this.clearSelection();
    this.closeActionMenu();

    // 每回合回复MP
    if (unit.classType === 'mage') {
      unit.mp = Math.min(unit.maxMp, unit.mp + 5);
      this.updateMpBar(unit);
    }

    // 检查是否所有我方单位都已行动
    const allActed = this.units.filter(u=>u.side===this.turn).every(u=>u.acted);
    if (allActed) {
      this.time.delayedCall(600, () => this.endTurn());
    }
  }

  endTurn() {
    if (this.turn === 'player') {
      this.turn = 'enemy';
      this.turnCount++;
      this.resetActed();
      this.showTurnNotice();
      // 敌方AI
      this.time.delayedCall(1000, () => this.runEnemyAI());
    } else {
      this.turn = 'player';
      this.resetActed();
      this.showTurnNotice();
    }
  }

  resetActed() {
    this.units.forEach(u => {
      if (u.side === this.turn) u.acted = false;
      // 解除混乱
      u.confused = false;
    });
  }

  // -------- 敌方AI --------
  runEnemyAI() {
    const enemies = this.units.filter(u => u.side === 'enemy' && u.hp > 0);
    let delay = 0;

    enemies.forEach((unit, idx) => {
      this.time.delayedCall(delay, () => {
        if (unit.hp <= 0) return;
        this.aiAction(unit);
      });
      delay += 800;  // 每个敌人行动间隔800ms
    });

    // 所有敌人行动完毕后切换回我方
    this.time.delayedCall(delay + 600, () => {
      if (this.turn === 'enemy') {
        this.endTurn();
      }
    });
  }

  aiAction(unit) {
    // 找到最近的玩家单位
    const players = this.units.filter(u => u.side === 'player' && u.hp > 0);
    if (players.length === 0) return;

    // 找攻击范围内血量最少的敌人
    let target = null;
    let minDist = 99;
    for (const p of players) {
      const d = this.getHexDist(unit.col, unit.row, p.col, p.row);
      if (d <= 1 && p.hp < (target ? target.hp : 999)) {
        target = p;
      }
      if (d < minDist) minDist = d;
    }

    if (target) {
      // 攻击！
      this.tryAttackAI(unit, target);
      return;
    }

    // 没有可攻击的目标，向最近的玩家移动
    let closest = null;
    let closestDist = 99;
    for (const p of players) {
      const d = this.getHexDist(unit.col, unit.row, p.col, p.row);
      if (d < closestDist) { closestDist = d; closest = p; }
    }

    if (closest) {
      // 计算移动范围，向目标移动
      const range = this.getMoveRange(unit);
      if (range.length > 0) {
        // 找移动范围内离目标最近的位置
        let best = null, bestDist = 99;
        for (const r of range) {
          const d = this.getHexDist(r.col, r.row, closest.col, closest.row);
          if (d < bestDist) { bestDist = d; best = r; }
        }
        if (best) {
          const pos = this.hexToPixel(best.col, best.row);
          this.tweens.add({ targets:unit, x:pos.x, y:pos.y, duration:400, onComplete:()=>{
            unit.col=best.col; unit.row=best.row;
            // 移动后看能不能攻击
            const canAtk = this.units.filter(u=>u.side==='player'&&u.hp>0).some(p => this.canAttack(unit, p));
            if (canAtk) {
              const t = this.units.filter(u=>u.side==='player'&&u.hp>0).find(p => this.canAttack(unit, p));
              if (t) this.tryAttackAI(unit, t);
            }
            unit.acted = true;
          }});
          return;
        }
      }
    }

    // 什么都不做，待机
    unit.acted = true;
  }

  tryAttackAI(attacker, defender) {
    // AI攻击，和玩家攻击逻辑一样
    let atkMultiplier = 1.0;
    const adv = CLASS_ADVANTAGE[attacker.classType];
    if (adv && adv[defender.classType]) atkMultiplier = adv[defender.classType];

    const terrainDef = TERRAIN_DEF_BONUS[this.terrain[defender.row][defender.col]] || 0;
    const baseDmg = attacker.atk - (defender.def + terrainDef);
    const dmg = Math.max(1, Math.floor(baseDmg * atkMultiplier + (Math.random()*10 - 4)));

    defender.hp = Math.max(0, defender.hp - dmg);
    this.updateHpBar(defender);

    // 飘字
    const pos = this.hexToPixel(defender.col, defender.row);
    this.showDmg(pos.x, pos.y-25, dmg);

    if (defender.hp <= 0) {
      this.time.delayedCall(300, () => {
        this.units = this.units.filter(u=>u!==defender);
        defender.destroy();
        this.checkEnd();
      });
    }

    attacker.acted = true;
  }

  // -------- 距离计算 --------
  getHexDist(ca,ra,cb,rb) {
    const a=this.o2c(ca,ra), b=this.o2c(cb,rb);
    return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.z-b.z));
  }

  o2c(col,row) { const x=col,z=row-(col-(col&1))/2; return {x,y:-x-z,z}; }

  // -------- 高亮 --------
  highlight(range,color) {
    for (const r of range) {
      const t=this.getTile(r.col,r.row);
      if(t){t.setFill(color);t._hl=true;t.setStrokeStyle(2,0xaaa);}
    }
  }

  clearHL() {
    this.tiles.forEach(t=>{
      t.setFill(this.getTerrainColor(t.terrainType));
      t._hl=false; t.setStrokeStyle(1,0x333);
    });
    this.units.forEach(u=>{
      if (u.active) {
        if (u.circle instanceof Phaser.GameObjects.Image) { u.circle.clearTint(); }
        else { u.circle.setStrokeStyle(2, u.side==='player'?0x64b5f6:0xef9a9a); }
      }
    });
  }

  getTile(c,r) { return this.tiles.find(t=>t.col===c&&t.row===r); }
  getUnitAt(c,r) { return this.units.find(u=>u.col===c&&u.row===r); }

  // -------- UI --------
  createUI() {
    const w=this.cameras.main.width, h=this.cameras.main.height;
    this.add.rectangle(0,h-38,w,38,0x000000,0.75).setOrigin(0).setDepth(100);
    this.turnText=this.add.text(15,h-25,'',{font:'13px Arial',fill:'#fff'}).setDepth(101);
    // 结束回合按钮
    const endBtn=this.add.text(w-120,h-25,'结束回合',{font:'13px Arial',fill:'#c9a84c'}).setDepth(101).setInteractive({useHandCursor:true});
    endBtn.on('pointerdown', ()=>this.endTurn());
    const backBtn=this.add.text(w-60,h-25,'返回',{font:'13px Arial',fill:'#c9a84c'}).setDepth(101).setInteractive({useHandCursor:true});
    backBtn.on('pointerdown', ()=>this.scene.start('TitleScene'));
  }

  showTurnNotice() {
    const txt=this.turn==='player'?'我方回合':'敌方回合';
    const color=this.turn==='player'?'#64b5f6':'#ef9a9a';
    const n=this.add.text(this.cameras.main.width/2,this.cameras.main.height/2,txt,{
      font:'bold 32px Arial',fill:color,stroke:'#000',strokeThickness:4
    }).setOrigin(0.5).setAlpha(0).setDepth(200);
    this.tweens.add({targets:n,alpha:1,duration:400,yoyo:true,hold:600,onComplete:()=>n.destroy()});
    this.turnText.setText(`回合 ${this.turnCount}  ·  ${txt}`);
  }

  showDmg(x,y,dmg) {
    const t=this.add.text(x,y,`-${dmg}`,{font:'bold 18px Arial',fill:'#f44',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(150);
    this.tweens.add({targets:t,y:y-35,alpha:0,duration:700,onComplete:()=>t.destroy()});
  }

  showFloat(msg,colorHex) {
    const colorStr = `#${colorHex.toString(16).padStart(6,'0')}`;
    const t=this.add.text(this.cameras.main.width/2,80,msg,{
      font:'14px Arial',fill:colorStr,stroke:'#000',strokeThickness:2
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({targets:t,alpha:0,y:60,duration:1200,onComplete:()=>t.destroy()});
  }

  checkEnd() {
    const e=this.units.filter(u=>u.side==='enemy'&&u.hp>0).length;
    const p=this.units.filter(u=>u.side==='player'&&u.hp>0).length;
    if(!e) this.showEnd('胜利！所有敌军已被击破',0x66ff66);
    else if(!p) this.showEnd('败北...我军全军覆没',0xff6666);
  }

  showEnd(msg,color) {
    const w=this.cameras.main.width, h=this.cameras.main.height;
    this.add.rectangle(0,0,w,h,0x000000,0.7).setOrigin(0).setDepth(300);
    this.add.text(w/2,h/2,msg,{
      font:'bold 36px Arial',fill:`#${color.toString(16).padStart(6,'0')}`,stroke:'#000',strokeThickness:4
    }).setOrigin(0.5).setDepth(301);
  }
}

// ==================== 启动游戏 ====================
const GAME_W=960, GAME_H=640;
const config = {
  type: Phaser.AUTO,
  width: GAME_W, height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0d1b2a',
  scene: [BootScene, TitleScene, BattleScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
  input: { activePointers: 1 },
};

window.addEventListener('load', () => {
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.querySelector('#loading-bar').style.width='100%'; setTimeout(()=>ls.style.display='none', 500); }
  new Phaser.Game(config);
});
