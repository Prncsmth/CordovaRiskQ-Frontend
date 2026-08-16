export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "citizen" | "responder";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};
