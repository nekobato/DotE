import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllSettings = async () => {
  const settings = await prisma.settings.findMany();
  return settings.reduce((acc, cur) => {
    return { ...acc, [cur.key]: cur.value };
  }, {});
};

export const getUsers = () => {
  return prisma.user.findMany({
    include: {
      instance: true,
    },
  });
};

export const upsertUser = async (user: User) => {
  if (!user.instanceId) throw new Error("instanceId is required");
  if (!user.token) throw new Error("token is required");
  if (!user.name) throw new Error("name is required");
  if (!user.username) throw new Error("username is required");

  const existingUser = await prisma.user.findFirst({
    where: {
      name: user.name,
      instanceId: user.instanceId,
    },
  });

  if (existingUser) {
    return await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        token: user.token,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    });
  } else {
    return await prisma.user.create({
      data: {
        token: user.token,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        instanceId: user.instanceId,
      },
    });
  }
};

export const deleteUser = async (userId: number) => {
  if (!userId) throw new Error("userId is required");

  return await prisma.user.delete({
    where: {
      id: Number(userId),
    },
  });
};

export const setSetting = async (key: string, value: string) => {
  if (!key) throw new Error("key is required");
  if (!value) throw new Error("value is required");

  return await prisma.settings.upsert({
    where: {
      key: key,
    },
    update: {
      value: value,
    },
    create: {
      key: key,
      value: value,
    },
  });
};

export const getSetting = async (key: string) => {
  if (!key) throw new Error("key is required");

  const result = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });

  return result?.value;
};

export function setTimeline(data: { id?: number; userId: number; channel: string; options: string }): any {
  const { id, userId, channel, options } = data;

  if (!userId) throw new Error("userId is required");
  if (!channel) throw new Error("channel is required");
  if (!options) throw new Error("options is required");

  if (id) {
    return prisma.timeline.update({
      where: {
        id: id,
      },
      data: {
        options: options,
      },
    });
  } else {
    return prisma.timeline.create({
      data: {
        userId: userId,
        channel: channel,
        options: options,
      },
    });
  }
}

export function getTimelineAll() {
  return prisma.timeline.findMany();
}

export const getInstanceAll = async () => {
  return await prisma.instance.findMany();
};

export const upsertInstance = async (instance: {
  id?: number;
  type: "misskey" | "mastodon";
  name: string;
  url: string;
  iconUrl: string;
}) => {
  const { id, type, name, url, iconUrl } = instance;

  if (!type) throw new Error("type is required");
  if (!name) throw new Error("name is required");
  if (!url) throw new Error("url is required");
  if (!iconUrl) throw new Error("iconUrl is required");

  if (id) {
    return await prisma.instance.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        url: url,
        iconUrl: iconUrl,
      },
    });
  } else {
    return await prisma.instance.create({
      data: {
        type: type,
        name: name,
        url: url,
        iconUrl: iconUrl,
      },
    });
  }
};
