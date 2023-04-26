import { Context, Dict, Schema, h } from "koishi";
import * as utils from "./utils";
import { getValue } from "./utils";
import path from "path";
import OneBotBot from "@koishijs/plugin-adapter-onebot";
export const name = "momona-core";

export interface Config {
  data_path: string;
}

export const Config: Schema<Config> = Schema.object({
  data_path: Schema.string().default("data/"),
});

export interface MomonaData {
  switch_group: Dict<Dict<boolean>>;
  welcome: Dict<Dict<string>>;
}

export const MomonaData: Schema<MomonaData> = Schema.object({
  switch_group: Schema.dict(Schema.dict(Schema.boolean())),
  welcome: Schema.dict(Schema.dict(Schema.string())),
});

const config: Config = new Config();

export function apply(ctx: Context, cfg: Config) {
  //读取数据
  loadData("Momona", MomonaData);
  const logger = ctx.logger("momona-core");

  //bot开关逻辑
  ctx.middleware((session, next) => {
    const botReg: string = utils.commposeBotReg(ctx, session.selfId);
    let bswitch: boolean;
    bswitch = getValue(momona_data["Momona"].switch_group, session.platform)[
      session.channelId
    ];
    if (session.content.match(botReg) || bswitch === undefined || bswitch) {
      return next();
    }
    logger.debug(`message from ${session.channelId} blocked by switch`);
  }, true);

  //修改过长消息为群聊转发
  // ctx.before("send", (session) => {
  //   if (session.content.length > 100) {
  //     console.log(session.content);
  //     return true;
  //   }
  // });

  //bot开关指令
  ctx
    .command("bot [option] [nn:text]", "功能开关")
    .usage("如果梦梦奈打扰到了阁下，可以这样告诉梦梦奈")
    .action(({ session }, option, nn) => {
      if (nn) {
        if (
          ctx.root.config.nickname !== nn &&
          session.selfId.substring(session.selfId.length - 4) !== nn &&
          session.selfId !== nn
        ) {
          return;
        }
      }
      if (option) {
        let switch_data: Dict;
        let switch_id: string;
        if (utils.isGroupAdmin(session)) {
          switch_data = getValue(
            momona_data["Momona"].switch_group,
            session.platform
          );
          switch_id = session.channelId;
        } else {
          //非管理员指令不改变状态
        }
        if (switch_data) {
          if (option.trim().toLowerCase() === "on") {
            switch_data[switch_id] = true;
            return session.text("bot_on");
          } else if (option.trim().toLowerCase() === "off") {
            switch_data[switch_id] = false;
            return session.text("bot_off");
          }
          saveData("Momona");
        }
      }
      //console.log(JSON.stringify(session));
      return session.text("bot");
    });

  //更改欢迎词
  ctx
    .command("welcome [welcome]", "入群欢迎")
    .usage("设置新人入群欢迎词")
    .example(".welcome {@} 欢迎新人")
    .action(({ session }, welcome) => {
      if (welcome !== undefined) {
        welcome = welcome.trim();
      } else {
        welcome = "";
      }
      const welcome_data = getValue(
        momona_data["Momona"].welcome,
        session.platform
      );
      if (!utils.isGroupAdmin(session)) {
        return session.text("welcome_error");
      }
      if (welcome.length > 0) {
        if (welcome_data[session.channelId]) {
          welcome_data[session.channelId] = welcome;
          saveData("Momona");
          return session.text("welcome_change");
        } else {
          welcome_data[session.channelId] = welcome;
          saveData("Momona");
          return session.text("welcome_on");
        }
      } else {
        delete welcome_data[session.channelId];
        saveData("Momona");
        return session.text("welcome_off");
      }
    });

  //欢迎词逻辑
  ctx.on("guild-member-added", (session) => {
    if (session.platform === "onebot") {
      const welcome: string =
        momona_data["Momona"].welcome[session.platform][session.guildId];
      const at = h.at(session.userId);
      if (welcome) {
        const text_list = welcome.split("{@}").flatMap((str, index) => {
          if (index === 0) {
            return [str];
          } else {
            return [at, str];
          }
        });
        session.send(text_list);
      }
    }
  });

  //退群指令
  ctx
    .platform("onebot")
    .command("dismiss [nn]", "退群指令")
    .example(`.dismiss ${ctx.root.config.nickname}`)
    .action(async ({ session }, nn) => {
      if (nn) {
        if (
          !ctx.root.config.nickname.includes(nn) &&
          session.selfId.substring(session.selfId.length - 4) !== nn &&
          session.selfId !== nn
        ) {
          logger.debug(`bot名称${nn}匹配失败，未执行退群`);
          return;
        }
      }

      if (utils.isGroupAdmin(session)) {
        await session.send(session.text("dismiss"));
        logger.info(`退出群${session.guildId}`);
        (session.bot as OneBotBot).internal.setGroupLeave(session.guildId);
      } else {
        return session.text("dismiss_failed");
      }
    });

  //hello world!
  ctx.on("message", (session) => {
    if (session.content === "天王盖地虎") {
      session.send("宝塔镇河妖");
    }
  });
}

export function loadData(fileName: string, schema: Schema) {
  const data = utils.readJson(
    path.join(config.data_path, fileName.concat(".txt"))
  );
  if (schema(data)) {
    momona_data[fileName] = schema(data);
  } else {
    momona_data[fileName] = new schema();
  }
  return momona_data[fileName];
}

export function saveData(fileName: string) {
  utils.writeJson(
    path.join(config.data_path, fileName.concat(".txt")),
    config.data_path,
    momona_data[fileName]
  );
}

export const momona_data: Object = {};
