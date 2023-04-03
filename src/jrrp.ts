import { Context, Dict, Random, Schema, h } from "koishi";
import * as MomonaCore from "./momona";
export const name = "momona-jrrp";

export interface Config {
  endpoint: string;
  proxy: string;
}

export const Config: Schema<Config> = Schema.object({
  endpoint: Schema.string().default("https://api.lolicon.app/setu/v2"),
  proxy: Schema.string().default("setubot-flandrecirno.herokuapp.com"),
});

export interface JrrpData {
  date: Date;
  jrrp: Dict;
}

export const JrrpData: Schema<JrrpData> = Schema.object({
  date: Schema.date().default(new Date()),
  jrrp: Schema.dict(Schema.number()),
});

export function apply(ctx: Context) {
  MomonaCore.loadData("Jrrp", JrrpData);
  ctx
    .command("setu [...tags]", "色图")
    .usage("根据Pixiv tag搜索色图")
    .example(".setu 长门")
    .action(({ session }, ...tags) => {
      let r18 = 0;
      let taglist = [];

      for (let i in tags) {
        if (tags[i].toString().toLowerCase() === "r18") {
          r18 = 1;
        } else {
          taglist.push(tags[i].toString());
        }
      }
      const params = {
        size1200: true,
        proxy: ctx.config.proxy,
        size: ["regular"],
        r18: r18,
        tag: taglist,
      };
      ctx
        .http("POST", ctx.config.endpoint, { data: params })
        .then((response) => {
          if (response["data"] && response["data"].length > 0) {
            let imgurl = response["data"][0]["urls"]["regular"];
            if (session.platform === "discord") {
              session.send(h("image", { url: imgurl }));
            }
          } else {
            session.send(session.text("setu_error"));
          }
        });
    });

  ctx
    .command("jrrp", "今日人品")
    .userFields(["name"])
    .action(({ session }) => {
      const timenow = new Date();

      //日期变更清除数据
      if (MomonaCore.momona_data["Jrrp"].date.getDay() != timenow.getDay()) {
        MomonaCore.momona_data["Jrrp"].date = timenow;
        MomonaCore.momona_data["Jrrp"].jrrp = {};
      }
      let rp = MomonaCore.momona_data["Jrrp"].jrrp[session.userId];

      if (rp === undefined) {
        rp = Random.int(1, 101);
        MomonaCore.momona_data["Jrrp"].jrrp[session.userId] = rp;
        MomonaCore.saveData("Jrrp");
      }
      return session.text("jrrp", [session.user.name || session.username, rp]);
    });
}
