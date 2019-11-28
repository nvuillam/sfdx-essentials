// Refer to the TypeScript documentation at
// https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require
// to understand common workarounds for this limitation of ES6 modules.

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */
export = EssentialsUtils;

/*~ Write your module's methods and properties in this class */
declare class EssentialsUtils {
    public static formatSecs(seconds: number): number;
    public static multibarStartProgress(multibars: any, multibarKey: string, multibar: any, label: string): NodeJS.Timer;
    public static multibarStopProgress(interval: NodeJS.Timer): void;
}
