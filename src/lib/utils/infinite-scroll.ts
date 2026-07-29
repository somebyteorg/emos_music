import { PAGINATION } from '$lib/utils/constants';

interface InfiniteScrollParams {
	hasMore: boolean;
	loading: boolean;
	onLoadMore: () => void;
}

export function infiniteScroll(_node: HTMLElement, params: InfiniteScrollParams): { update: (newParams: InfiniteScrollParams) => void; destroy: () => void } {
	let currentParams = params;

	const isMobile = window.innerWidth < 484;
	const scrollEl = isMobile ? window : document.querySelector('.scrollable-page') as HTMLElement | null;
	if (!scrollEl) return { update() {}, destroy() {} };

	function onScroll(): void {
		let scrollTop: number, scrollHeight: number, clientHeight: number;
		if (isMobile) {
			scrollTop = window.scrollY;
			scrollHeight = document.documentElement.scrollHeight;
			clientHeight = window.innerHeight;
		} else {
			scrollTop = (scrollEl as HTMLElement).scrollTop;
			scrollHeight = (scrollEl as HTMLElement).scrollHeight;
			clientHeight = (scrollEl as HTMLElement).clientHeight;
		}
		if (scrollHeight - scrollTop - clientHeight < PAGINATION.SCROLL_THRESHOLD) {
			if (currentParams.hasMore && !currentParams.loading) {
				currentParams.onLoadMore();
			}
		}
	}

	scrollEl.addEventListener('scroll', onScroll, { passive: true });

	return {
		update(newParams: InfiniteScrollParams) {
			currentParams = newParams;
		},
		destroy() {
			scrollEl!.removeEventListener('scroll', onScroll);
		}
	};
}
