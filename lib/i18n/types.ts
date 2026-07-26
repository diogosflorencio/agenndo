export type Locale = "pt" | "en" | "es";

export type MessageTree = {
  [key: string]: string | MessageTree;
};
