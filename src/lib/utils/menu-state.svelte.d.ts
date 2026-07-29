import type { MenuGroupDef, MenuItemDef } from '$lib/utils/constants';

export interface MenuPoint {
	x: number;
	y: number;
}

export interface MenuState<T = number> {
	readonly clientPos: MenuPoint | null;
	readonly target: T | null;
	readonly isOpen: boolean;
	open(e: MouseEvent, value: T): void;
	close(): void;
}

export interface SongMenuState {
	readonly clientPos: MenuPoint | null;
	readonly songId: number | null;
	readonly items: MenuGroupDef[];
	open(e: MouseEvent, value: number): void;
	close(): void;
}

export function createMenuState<T = number>(): MenuState<T>;

export function createIndexMenuState(): MenuState<number>;

export function createSongMenuState(
	getUrlFn: () => string,
	extraItemsFn?: () => Pick<MenuItemDef, 'label' | 'icon' | 'action'>[] | undefined
): SongMenuState;
