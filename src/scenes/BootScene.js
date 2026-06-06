// BootScene - 资源预加载
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(w / 2 - 160, h / 2 - 25, 320, 50);

    const loadingText = this.make.text({
      x: w / 2, y: h / 2 - 50,
      text: '加载中...',
      style: { font: '18px Arial', fill: '#c9a84c' }
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.make.text({
      x: w / 2, y: h / 2,
      text: '0%',
      style: { font: '16px Arial', fill: '#ffffff' }
    });
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xc9a84c, 1);
      progressBar.fillRect(w / 2 - 150, h / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // TODO: 加载实际游戏资源
    // this.load.image('tile_grass', 'assets/tiles/grass.png');
  }

  create() {
    this.scene.start('TitleScene');
  }
}

// 注册到全局
window.BootScene = BootScene;
