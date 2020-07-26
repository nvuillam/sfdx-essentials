import { performance } from 'perf_hooks';

export const hook = async (options: any) => {
    globalThis.startElapse = performance.now();
};
