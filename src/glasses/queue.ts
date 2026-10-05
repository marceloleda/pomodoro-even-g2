import { BRIDGE_CALL_TIMEOUT_MS } from '../config';

// Every bridge call shares one BLE link: overlapping calls can drop the
// connection and the SDK forbids concurrent image sends, so run them one at
// a time. The timeout keeps one lost reply from stalling everything behind it.
let chain: Promise<unknown> = Promise.resolve();

export function enqueue<T>(label: string, call: () => Promise<T>): Promise<T> {
  const run = chain.then(() => withTimeout(call(), label));
  chain = run.catch(() => {});
  return run;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${BRIDGE_CALL_TIMEOUT_MS}ms`)),
      BRIDGE_CALL_TIMEOUT_MS,
    );
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}
