//this file is used for importing images and json files
declare module '*.png';
declare module '*.jpg';
declare module '*.json';
// declare module '*.svg';
declare module '*.svg' {
    const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
};