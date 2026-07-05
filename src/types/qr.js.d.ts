declare module 'qr.js' {
  interface QRCode {
    modules: boolean[][];
  }
  interface QROptions {
    typeNumber?: number;
    errorCorrectLevel?: number;
  }
  function qr(data: string, opt?: QROptions): QRCode;
  export default qr;
}
