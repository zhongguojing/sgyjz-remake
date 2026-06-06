// ============================================================
// 三国志英杰传 重制版 - 启动场景（资源加载）
// ============================================================

import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }
  
  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    // 进度条
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(w / 2 - 160, h / 2 - 25, 320, 50);
    
    const loadingText = this.make.text({
      x: w / 2,
      y: h / 2 - 50,
      text: '加载中...',
      style: { font: '18px Arial', fill: '#c9a84c' },
    }).setOrigin(0.5);
    
    const percentText = this.make.text({
      x: w / 2,
      y: h / 2,
      text: '0%',
      style: { font: '16px Arial', fill: '#fff' },
    }).setOrigin(0.5);
    
    this.load.on('progress', (v) => {
      percentText.setText(parseInt(v * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xc9a84c, 1);
      progressBar.fillRect(w / 2 - 150, h / 2 - 15, 300 * v, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
    
    // 加载武将头像
    const heroes = [
      { id: 0, name: '刘备' }, { id: 1, name: '关羽' }, { id: 2, name: '张飞' },
      { id: 3, name: '赵云' }, { id: 4, name: '诸葛亮' }, { id: 5, name: '马超' },
      { id: 6, name: '黄忠' }, { id: 7, name: '姜维' }, { id: 8, name: '魏延' },
      { id: 9, name: '庞统' }, { id: 20, name: '曹操' }, { id: 21, name: '夏侯惇' },
      { id: 22, name: '夏侯渊' }, { id: 23, name: '典韦' }, { id: 24, name: '许褚' },
      { id: 25, name: '张辽' }, { id: 26, name: '徐晃' }, { id: 27, name: '曹仁' },
      { id: 28, name: '司马懿' }, { id: 29, name: '郭嘉' }, { id: 30, name: '荀彧' },
      { id: 31, name: '张郃' }, { id: 32, name: '于禁' }, { id: 33, name: '乐进' },
      { id: 34, name: '庞德' }, { id: 35, name: '孙权' }, { id: 36, name: '孙策' },
      { id: 37, name: '周瑜' }, { id: 38, name: '陆逊' }, { id: 39, name: '太史慈' },
      { id: 40, name: '甘宁' }, { id: 41, name: '吕蒙' }, { id: 42, name: '黄盖' },
      { id: 43, name: '程普' }, { id: 44, name: '鲁肃' }, { id: 45, name: '吕布' },
      { id: 46, name: '貂蝉' }, { id: 47, name: '董卓' }, { id: 48, name: '袁绍' },
      { id: 49, name: '公孙瓒' },
    ];
    
    for (const h of heroes) {
      this.load.image(`face_${h.id}`, `assets/faces/${h.id.toString().padStart(3, '0')}.png`);
    }
  }
  
  create() {
    this.time.delayedCall(500, () => {
      this.scene.start('TitleScene');
    });
  }
}
