declare module 'fontfaceobserver' {
    interface FontFaceObserverDescriptors {
        stretch?: string;
        style?: string;
        weight?: string | number;
    }

    export default class FontFaceObserver {
        constructor(family: string, descriptors?: FontFaceObserverDescriptors);

        load(testString?: string | null, timeout?: number): Promise<void>;
    }
}
