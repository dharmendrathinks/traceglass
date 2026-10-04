import type { CDPSession } from "@playwright/test";

type Reply = {
  result?: {
    result?: { value?: unknown };
    exceptionDetails?: { text: string };
  };
  error?: { message: string };
};
/** Test-only bridge: Playwright deliberately omits devtools:// pages from context.pages(). */
export class DevToolsTarget {
  private id = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: Reply) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private constructor(
    private cdp: CDPSession,
    private sessionId: string,
  ) {
    cdp.on("Target.receivedMessageFromTarget", ({ sessionId, message }) => {
      if (sessionId !== this.sessionId) return;
      const reply = JSON.parse(message);
      const pending = this.pending.get(reply.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(reply.id);
        pending.resolve(reply);
      }
    });
  }
  static async attach(cdp: CDPSession, targetId: string) {
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: false,
    });
    return new DevToolsTarget(cdp, sessionId);
  }
  async evaluate<T = unknown>(expression: string): Promise<T> {
    const reply = await new Promise<Reply>((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("DevTools automation command timed out"));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      void this.cdp
        .send("Target.sendMessageToTarget", {
          sessionId: this.sessionId,
          message: JSON.stringify({
            id,
            method: "Runtime.evaluate",
            params: {
              expression,
              returnByValue: true,
              awaitPromise: true,
              userGesture: true,
            },
          }),
        })
        .catch((error) => {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error);
        });
    });
    if (reply.error || reply.result?.exceptionDetails)
      throw new Error(JSON.stringify(reply));
    return reply.result?.result?.value as T;
  }
  async click(text: string) {
    return this.evaluate(
      `(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button||button.disabled)throw new Error('Button missing or disabled');button.click();return true;})()`,
    );
  }
  async fill(placeholder: string, value: string) {
    return this.evaluate(
      `(()=>{const el=document.querySelector('[placeholder='+${JSON.stringify(JSON.stringify(placeholder))}+']');if(!el)throw new Error('Input missing');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`,
    );
  }
  async text() {
    return this.evaluate<string>("document.body.innerText");
  }
}
