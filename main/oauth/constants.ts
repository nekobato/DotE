import { BLUESKY_REDIRECT_URI } from "../../shared/bluesky-oauth";

const redirectUriUrl = new URL(BLUESKY_REDIRECT_URI);

export const APP_PROTOCOL_SCHEME = redirectUriUrl.protocol.replace(":", "");
export const APP_PROTOCOL_PREFIX = `${APP_PROTOCOL_SCHEME}:/`;

export const BLUESKY_CUSTOM_REDIRECT_URI = BLUESKY_REDIRECT_URI;
export const APP_LOOPBACK_REDIRECT_URI = "http://127.0.0.1:17600/callback";
