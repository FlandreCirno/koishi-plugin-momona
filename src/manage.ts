import { Context, Dict, Schema, Session, h } from "koishi";
import * as MomonaCore from "./momona";
import {} from "@koishijs/plugin-help";
import OneBotBot from "@koishijs/plugin-adapter-onebot";
import { getArrayValue } from "./utils";
export const name = "momona-manage";

export interface Config {
  qqadmin: string;
}

export const Config: Schema<Config> = Schema.object({
  qqadmin: Schema.string().default("353252500"),
});

export interface ManageData {
  trust: Dict<Array<string>>;
}

export const ManageData: Schema<ManageData> = Schema.object({
  trust: Schema.dict(Schema.array(Schema.string())).default({
    discord: [],
    onebot: [],
  }),
});

export function apply(ctx: Context) {
  MomonaCore.loadData("Manage", ManageData);
  const logger = ctx.logger("momona-core");
  ctx
    .command("trust <uid:text>", "信任用户", {
      authority: 4,
      hidden: true,
    })
    .action(({ session }, uid) => {
      const trust = getArrayValue(
        MomonaCore.momona_data["Manage"]["trust"],
        session.platform
      );
      if (!trust.includes(uid)) {
        trust.push(uid);
        MomonaCore.saveData("Manage");
        session.bot.sendPrivateMessage(uid, uid + "阁下已被加入信任列表！");
        return "添加信任成功！";
      } else {
        return uid + "阁下已被加入信任列表！";
      }
    });

  ctx
    .command("untrust <uid:text>", "删除信任用户", {
      authority: 4,
      hidden: true,
    })
    .action(({ session }, uid) => {
      const trust = getArrayValue(
        MomonaCore.momona_data["Manage"]["trust"],
        session.platform
      );
      if (trust.includes(uid)) {
        const index = trust.indexOf(uid);
        trust.splice(index, 1);
        MomonaCore.saveData("Manage");
        return "删除信任成功！";
      } else {
        return "删除信任失败，号码无效！";
      }
    });

  // 好友请求通过/拒绝逻辑
  ctx.on("friend-request", (session) => {
    if (session.platform === "onebot") {
      const bot = session.bot as OneBotBot;
      if (isTrusted(session)) {
        logger.info(
          `passing friend request ${session.messageId} from ${session.userId}`
        );
        bot.handleFriendRequest(session.messageId, true);
      } else {
        logger.info(
          `rejecting friend request ${session.messageId} from ${session.userId}`
        );
        bot.handleFriendRequest(
          session.messageId,
          false,
          "阁下请先加群671410966申请信任"
        );
      }
    }
  });

  // 群邀请通过/拒绝逻辑
  ctx.on("guild-request", (session) => {
    if (session.platform === "onebot") {
      const bot = session.bot as OneBotBot;
      if (isTrusted(session)) {
        logger.info(
          `passing guild request ${session.messageId} from ${session.userId}`
        );
        bot.handleGuildRequest(session.messageId, true);
      } else {
        logger.info(
          `rejecting guild request ${session.messageId} from ${session.userId}`
        );
        bot.handleFriendRequest(
          session.messageId,
          false,
          "阁下请先加群671410966申请信任"
        );
      }
    }
  });

  ctx
    .platform("onebot")
    .command("apply <msg:text>", "申请使用", {
      hidden: true,
    })
    .action(({ session }, msg) => {
      logger.info(`received apply from ${session.username}(${session.userId})`);
      // session.bot.sendPrivateMessage(
      //   ctx.config.qqadmin,
      //   `收到来自${session.username}(${session.userId})的消息：${msg}`
      // );
      session.bot.sendMessage(
        "247747205",
        `收到来自${session.username}(${session.userId})的消息：${msg}`
      );
      return "申请发送成功，请等待申请通过";
    });
}

export function isTrusted(session: Session) {
  const trust: Array<string> = getArrayValue(
    MomonaCore.momona_data["Manage"]["trust"],
    session.platform
  );
  return trust.includes(session.userId);
}
