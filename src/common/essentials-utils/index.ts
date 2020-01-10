export class EssentialsUtils {

    // Format seconds
    public static formatSecs(seconds: number) {
        return Math.floor(seconds / 60) + ':' + ('0' + Math.floor(seconds % 60)).slice(-2);
    }

    public static multibarStartProgress(multibars: any, multibarKey: string, multibar: any, label: string): NodeJS.Timer {
        if (!multibar) {
            return null;
        }
        let dotsNb = 0;
        const interval = setInterval(() => {
            const progressLbl = label + '.'.repeat(dotsNb);
            multibars[multibarKey].update(null, { file: progressLbl });
            multibar.update();
            dotsNb++;
            if (dotsNb === 3) {
                dotsNb = 0;
            }
        }, 1000);
        return interval;
    }
    public static multibarStopProgress(interval: NodeJS.Timer) {
        if (interval) {
            clearInterval(interval);
        }
    }
}

module.exports = EssentialsUtils;
