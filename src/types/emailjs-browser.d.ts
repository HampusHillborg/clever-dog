declare module '@emailjs/browser' {
  interface EmailJSResponseStatus {
    status: number;
    text: string;
  }

  interface SendOptions {
    publicKey?: string;
    privateKey?: string;
  }

  function send(
    serviceID: string,
    templateID: string,
    templateParams: Record<string, unknown>,
    publicKey: string | SendOptions
  ): Promise<EmailJSResponseStatus>;

  function init(publicKey: string): void;

  export default {
    send,
    init
  };
} 