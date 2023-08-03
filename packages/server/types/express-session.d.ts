import 'express-session';

type SessionUser = {
  id?: string;
  name?: string;
  verifier?: string;
};

declare module 'express-session' {
  interface SessionData {
    user: SessionUser;
  }
}
