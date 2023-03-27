import { Context, Dict, Schema } from "koishi";
import * as utils from "./utils";
import path from "path";
export const name = "momona-core";

export interface Config {
  data_path: string;
}

export const Config: Schema<Config> = Schema.object({
  data_path: Schema.string().default("data/"),
});

export interface MomonaData {
  switch_group: Dict;
  switch_buddy: Dict;
  welcome: Dict;
}

export const MomonaData: Schema<MomonaData> = Schema.object({
  switch_group: Schema.dict(Schema.boolean()),
  switch_buddy: Schema.dict(Schema.boolean()),
  welcome: Schema.dict(Schema.string()),
});

const config: Config = new Config();

export function apply(ctx: Context, cfg: Config) {
  //读取数据
  loadData("Momona", MomonaData);

  //bot开关逻辑
  ctx.middleware((session, next) => {
    if (session.type != "message") next();
    const botReg: string = utils.commposeBotReg(ctx, session.selfId);
    let bswitch: boolean;
    if (utils.isGroup(session)) {
      bswitch = momona_data["Momona"].switch_group[session.channelId];
    } else {
      bswitch = momona_data["Momona"].switch_buddy[session.userId];
    }
    if (session.content.match(botReg) || bswitch === undefined || bswitch) {
      return next();
    }
  }, true);

  //bot开关指令
  ctx
    .command("bot [option] [nn]", "功能开关")
    .usage("如果梦梦奈打扰到了阁下，可以这样告诉梦梦奈")
    .action(({ session }, option, nn) => {
      if (option) {
        let switch_data: Dict;
        let switch_id: string;
        if (utils.isGroup(session)) {
          if (utils.isGroupAdmin(session)) {
            switch_data = momona_data["Momona"].switch_group;
            switch_id = session.channelId;
          }
        } else {
          switch_data = momona_data["Momona"].switch_buddy;
          switch_id = session.userId;
        }
        if (switch_data) {
          if (option.trim().toLowerCase() === "on") {
            switch_data[switch_id] = true;
            return session.text("bot_on");
          } else if (option.trim().toLowerCase() === "off") {
            switch_data[switch_id] = false;
            return session.text("bot_off");
          }
        }
      }
      return session.text("bot");
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
