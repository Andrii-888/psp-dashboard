// src/app/webhooks/psp/route.ts
// Backward-compatible alias: /webhooks/psp -> /api/webhooks/psp
// Реэкспорт handlers без fetch-прокси (стабильно для Next dev)

export const runtime = "nodejs";

// ВАЖНО: путь относительно этого файла
import {
  GET as ApiGET,
  POST as ApiPOST,
  DELETE as ApiDELETE,
} from "../../api/webhooks/psp/route";

export const GET = ApiGET;
export const POST = ApiPOST;
export const DELETE = ApiDELETE;
