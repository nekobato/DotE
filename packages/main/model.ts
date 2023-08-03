import { getAllSettings, getUsers } from "./db";

export const setupData = async () => {
  const settings = await getAllSettings();
  const users = await getUsers();
  return { settings, users };
};
