import Debug from 'debug';
import minimist = require('minimist');
import { performance } from 'perf_hooks';
import { recordAnonymousEvent } from '../../common/analytics';
const debug = Debug('sfdx-essentials');

export const hook = async (data: any) => {
    const elapsedTimeMs = performance.now() - globalThis.startElapse;
    globalThis.startElapse = null;
    const eventType = data.id;
    if (eventType == null) {
        debug('analytics-send: skipped (no command id)');
        return;
    }
    const argss = minimist(data.argv);
    if (argss.noinsight === true || globalThis.noinsight === true) {
        debug('analytics-send: skipped (user request)');
        return;
    }
    const analyticsData = { options: argss, elapsedTimeMs };
    await recordAnonymousEvent(eventType, analyticsData);
    return;
};
