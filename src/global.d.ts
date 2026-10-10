import type { MochiApi } from "./types";

declare global {
  interface Window {
    mochi: MochiApi;
  }
}

export {};
