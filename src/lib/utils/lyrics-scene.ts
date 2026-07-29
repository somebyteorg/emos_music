import { Application, Container, Sprite, Graphics, BlurFilter, Texture } from 'pixi.js';
import { AdjustmentFilter } from '@pixi/filter-adjustment';
import { TwistFilter } from '@pixi/filter-twist';

export class LyricsScene {
	private app: Application;
	private container!: Container;
	private reduceMotionQuery: MediaQueryList;
	private currentArtworkUrl: string | null = null;
	private tickerFn: (() => void) | null = null;
	private rotations = [0, 0, 0, 0];

	constructor(canvas: HTMLCanvasElement, artworkUrl?: string) {
		const { height, width } = canvas.getBoundingClientRect();

		this.app = new Application({
			width,
			height,
			view: canvas,
			powerPreference: 'low-power',
			backgroundAlpha: 0
		});

		const bg = new Graphics();
		bg.beginFill(0xffffff);
		bg.drawRect(0, 0, this.app.renderer.width, this.app.renderer.height);
		bg.endFill();
		this.app.stage.addChild(bg);

		this.reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		this.app.ticker.maxFPS = 15;

		this.initAnimation();

		if (artworkUrl) {
			this.updateArtwork(artworkUrl);
		}
	}

	private initAnimation(): void {
		this.container = new Container();
		this.app.stage.addChild(this.container);

		const s0 = new Sprite();
		const s1 = new Sprite();
		const s2 = new Sprite();
		const s3 = new Sprite();
		this.addSpritesToContainer(s0, s1, s2, s3);

		const blur1 = new BlurFilter();
		blur1.blur = 5;
		blur1.quality = 1;
		const blur2 = new BlurFilter();
		blur2.blur = 10;
		blur2.quality = 1;
		const blur3 = new BlurFilter();
		blur3.blur = 20;
		blur3.quality = 2;
		const blur4 = new BlurFilter();
		blur4.blur = 40;
		blur4.quality = 2;
		const blur5 = new BlurFilter();
		blur5.blur = 80;
		blur5.quality = 2;

		const twist = new TwistFilter();
		twist.angle = -3.25;
		twist.radius = 900;
		twist.offset.x = this.app.renderer.screen.width / 2;
		twist.offset.y = this.app.renderer.screen.height / 2;

		const adjustment = new AdjustmentFilter();
		adjustment.saturation = 2.75;
		adjustment.brightness = 0.7;
		adjustment.contrast = 1.9;

		this.container.filters = [twist, blur1, blur2, blur3, blur4, blur5, adjustment];

		const overlay = new Sprite();
		overlay.width = this.app.screen.width;
		overlay.height = this.app.screen.height;
		const darkRect = new Graphics();
		darkRect.beginFill(0x000000, 0.5);
		darkRect.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
		darkRect.endFill();
		overlay.addChild(darkRect);
		this.app.stage.addChild(overlay);

		const glow = new Sprite();
		glow.width = this.app.screen.width;
		glow.height = this.app.screen.height;
		const lightRect = new Graphics();
		lightRect.beginFill(0xffffff, 0.05);
		lightRect.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
		lightRect.endFill();
		glow.addChild(lightRect);
		this.app.stage.addChild(glow);
	}

	private addSpritesToContainer(s0: Sprite, s1: Sprite, s2: Sprite, s3: Sprite): void {
		s0.anchor.set(0.5, 0.5);
		s1.anchor.set(0.5, 0.5);
		s2.anchor.set(0.5, 0.5);
		s3.anchor.set(0.5, 0.5);

		s0.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
		s1.position.set(this.app.screen.width / 2.5, this.app.screen.height / 2.5);
		s2.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
		s3.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

		s0.width = this.app.screen.width * 1.25;
		s0.height = s0.width;
		s1.width = this.app.screen.width * 0.8;
		s1.height = s1.width;
		s2.width = this.app.screen.width * 0.5;
		s2.height = s2.width;
		s3.width = this.app.screen.width * 0.25;
		s3.height = s3.width;

		this.container.addChild(s0, s1, s2, s3);
	}

	updateArtwork(artworkUrl: string): void {
		if (!this.app || !artworkUrl) return;
		if (artworkUrl === this.currentArtworkUrl) return;
		this.currentArtworkUrl = artworkUrl;

		Texture.removeFromCache(artworkUrl);
		const texture = Texture.from(artworkUrl);
		const newSprites: Sprite[] = [];

		for (let i = 0; i < 4; i++) {
			const sprite = new Sprite(texture);
			sprite.alpha = 0;
			newSprites.push(sprite);
		}

		if (this.container.children.length > 4) {
			this.container.removeChildren(4);
		}

		this.addSpritesToContainer(newSprites[0], newSprites[1], newSprites[2], newSprites[3]);

		const oldSprites = this.container.children.slice(0, 4) as Sprite[];
		let fadeOutProgress = 1;

		if (this.tickerFn) {
			this.app.ticker.remove(this.tickerFn);
		}

		this.tickerFn = () => {
			const delta = this.app.ticker.deltaMS / 33.333333;

			fadeOutProgress -= 0.02 * delta;
			if (fadeOutProgress <= 0) {
				for (const s of oldSprites) {
					if (s.parent) this.container.removeChild(s);
				}
				fadeOutProgress = 0;
			}
			oldSprites.forEach((s) => {
				s.alpha = fadeOutProgress;
			});
			newSprites.forEach((s) => {
				s.alpha = 1 - fadeOutProgress;
			});

			if (this.reduceMotionQuery.matches) {
				this.rotations[0] += 0.001 * delta;
				this.rotations[1] += 0.001 * delta;
				this.rotations[2] += 0.001 * delta;
				this.rotations[3] += 0.001 * delta;
			} else {
				this.rotations[0] += 0.003 * delta;
				this.rotations[1] -= 0.008 * delta;
				this.rotations[2] -= 0.006 * delta;
				this.rotations[3] += 0.004 * delta;
			}

			if (newSprites[0]) newSprites[0].rotation = this.rotations[0];
			if (newSprites[1]) newSprites[1].rotation = this.rotations[1];
			if (newSprites[2]) {
				newSprites[2].rotation = -this.rotations[2];
				newSprites[2].x =
					this.app.screen.width / 2 +
					(this.app.screen.width / 4) * Math.cos(this.rotations[2] * 0.75);
				newSprites[2].y =
					this.app.screen.height / 2 +
					(this.app.screen.width / 4) * Math.sin(this.rotations[2] * 0.75);
			}
			if (newSprites[3]) {
				newSprites[3].rotation = -this.rotations[3];
				newSprites[3].x =
					this.app.screen.width / 2 +
					(this.app.screen.width / 2) * 0.1 +
					(this.app.screen.width / 4) * Math.cos(this.rotations[3] * 0.75);
				newSprites[3].y =
					this.app.screen.height / 2 +
					(this.app.screen.width / 2) * 0.1 +
					(this.app.screen.width / 4) * Math.sin(this.rotations[3] * 0.75);
			}
		};

		this.app.ticker.add(this.tickerFn);
	}

	resize(width: number, height: number): void {
		this.app.renderer.resize(width, height);
	}

	destroy(): void {
		if (this.app) {
			this.app.destroy(true, { children: true, texture: true, baseTexture: true });
		}
	}
}
